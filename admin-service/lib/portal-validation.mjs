'use strict';
// Shared validation for defaults, browser storage and imported backups.
function isRecord(value){return value!==null&&typeof value==='object'&&!Array.isArray(value)}
function textValue(value,fallback='',limit=300000){
 if(value===undefined||value===null)return fallback;
 if(!['string','number','boolean'].includes(typeof value))throw new Error('Campo de texto inválido no backup.');
 const result=String(value);if(result.length>limit)throw new Error('Campo de texto muito extenso.');return result;
}
function listValue(value,limit=500){
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>limit)throw new Error('Lista inválida ou acima do limite no backup.');
 if(value.some(x=>!isRecord(x)))throw new Error('Item inválido no backup.');return value;
}
function safeID(value,fallback){
 const result=textValue(value,fallback,100);
 if(!/^[a-zA-Z0-9_-]+$/.test(result)||['__proto__','prototype','constructor'].includes(result))throw new Error('Identificador de bloco inválido.');return result;
}
function safeImage(value){
 const src=String(value||'');
 if(/^assets\/[a-zA-Z0-9_./-]+$/.test(src)&&!src.split('/').includes('..'))return src;
 if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src)&&src.length<=4000000)return src;
 try{const u=new URL(src);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href}catch(e){}
 return '';
}
function safeLink(value){
 try{const u=new URL(String(value));if(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password)return u.href}catch(e){}return '';
}
function safeRich(input){
 // Parse into a detached document without a wrapper that input could close.
 const doc=new DOMParser().parseFromString(String(input??''),'text/html');
 const allowed=new Set(['DIV','P','BR','STRONG','B','EM','I','U','UL','OL','LI','H2','H3','H4','SPAN','BLOCKQUOTE','A','S']);
 const blocked=new Set(['SCRIPT','STYLE','SVG','MATH','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','SELECT','TEXTAREA','IMG','TEMPLATE','LINK','META','BASE']);
 function clean(parent,depth=0){
  for(let node of Array.from(parent.childNodes)){
   if(node.nodeType===3)continue;
   if(node.nodeType!==1){node.remove();continue}
   if(node.namespaceURI!=='http://www.w3.org/1999/xhtml'||blocked.has(node.tagName)){node.remove();continue}
   if(depth>60){node.replaceWith(doc.createTextNode(node.textContent||''));continue}
   // Browser color formatting can produce FONT; retain its text and safe color.
   if(node.tagName==='FONT'){
    const span=doc.createElement('span');span.style.color=node.getAttribute('color')||node.style.color;
    span.style.fontFamily=node.getAttribute('face')||node.style.fontFamily;
    span.style.fontSize=({'2':'14px','3':'16px','4':'18px','5':'24px'})[node.getAttribute('size')]||node.style.fontSize;
    span.append(...node.childNodes);node.replaceWith(span);node=span;
   }
   if(!allowed.has(node.tagName)){clean(node,depth+1);node.replaceWith(...node.childNodes);continue}
   const href=node.tagName==='A'?safeLink(node.getAttribute('href')):'';
   const color=node.style.color;
   const font=node.style.fontFamily.replace(/["']/g,'').toLowerCase(),size=node.style.fontSize;
   for(const attribute of Array.from(node.attributes))node.removeAttribute(attribute.name);
   if(href){node.setAttribute('href',href);node.setAttribute('target','_blank');node.setAttribute('rel','noopener noreferrer')}
   if(color&&/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i.test(color)&&['SPAN','B','STRONG','I','EM','U'].includes(node.tagName))node.style.color=color;
   if(['arial','georgia','verdana','times new roman','courier new'].includes(font))node.style.fontFamily=font;
   if(['14px','16px','18px','24px'].includes(size))node.style.fontSize=size;
   clean(node,depth+1);
  }
 }
 clean(doc.body);return doc.body.innerHTML;
}
function cleanQuiz(value){return listValue(value,300).map(x=>{
 if(!Array.isArray(x.options)||x.options.length!==4)throw new Error('Cada questão precisa de quatro alternativas.');
 if(!Number.isInteger(x.answer)||x.answer<0||x.answer>3)throw new Error('Gabarito inválido: use índices de 0 a 3.');
 return {q:textValue(x.q),options:x.options.map(v=>textValue(v)),answer:x.answer,explanation:textValue(x.explanation)};
})}
function normalizeModules(value){
 const list=listValue(value,100);if(!list.length)throw new Error('Conteúdo sem blocos.');
 const seen=new Set();return list.map((m,i)=>{
  const moduleId=safeID(m.id,'module'+i);if(seen.has(moduleId))throw new Error('Identificador de bloco duplicado.');seen.add(moduleId);
  if(m.goals!==undefined&&(!Array.isArray(m.goals)||m.goals.length>100))throw new Error('Objetivos inválidos.');
  const infographic=textValue(m.infographic);if(infographic&&!/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(infographic))throw new Error('Caminho de infográfico inválido.');
  const videoIds=new Set();
  return {
   id:moduleId,title:textValue(m.title,'Novo bloco',500),icon:textValue(m.icon,'📘',50),summary:textValue(m.summary),
   goals:(m.goals||[]).map(v=>textValue(v)),infographic,
   theory:listValue(m.theory).map(x=>{
    if(x.points!==undefined&&(!Array.isArray(x.points)||x.points.length>1000))throw new Error('Tópicos inválidos.');
    return {title:textValue(x.title,'Explicação'),points:(x.points||[]).map(v=>textValue(v)),...(typeof x.html==='string'?{html:textValue(x.html)}:{})};
   }),
   examples:listValue(m.examples).map(x=>({title:textValue(x.title,'Exemplo'),content:textValue(x.content)})),
   reading_sets:listValue(m.reading_sets,100).map(x=>({title:textValue(x.title,'Texto'),genre:textValue(x.genre,'Leitura'),text:textValue(x.text),questions:cleanQuiz(x.questions)})),
   quiz:cleanQuiz(m.quiz),
   sources:listValue(m.sources,100).map(x=>{const url=safeLink(x.url);if(!url)throw new Error('Fonte inválida. Use um endereço HTTP ou HTTPS.');return {title:textValue(x.title,'Material de apoio',500),url}}),
   videos:listValue(m.videos,200).map((x,j)=>{
    const videoId=safeID(x.id,'video'+j);if(videoIds.has(videoId))throw new Error('Identificador de vídeo duplicado.');videoIds.add(videoId);
    return {id:videoId,title:textValue(x.title,`Vídeo ${j+1}`),url:textValue(x.url,'',3000)};
   }),
   images:listValue(m.images,100).map((x,j)=>{
    const src=safeImage(textValue(x.src,'',4000000));if(!src)throw new Error('Imagem inválida. Use assets/, HTTPS ou PNG/JPEG/WebP incorporado.');
    return {id:safeID(x.id,'image'+j),src,caption:textValue(x.caption,'Imagem da aula')};
   })
  };
 });
}
function quizFingerprint(questions){
 const source=JSON.stringify(questions);let hash=2166136261;
 for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(16);
}
function quizEntries(modules){return modules.flatMap(m=>[
 ...m.reading_sets.map((r,i)=>[`${m.id}/reading/${i}`,r.questions]),[`${m.id}/main`,m.quiz]
]).filter(([,questions])=>questions.length)}
function normalizeStudy(value,modules){
 if(!isRecord(value))throw new Error('Progresso inválido.');
 const study={currentModuleId:modules.some(m=>m.id===value.currentModuleId)?value.currentModuleId:modules[0].id,checks:{},answers:{},grades:{},attempts:[],selectedVideo:{},quizSignatures:{}};
 const checks=isRecord(value.checks)?value.checks:{};
 const answers=isRecord(value.answers)?value.answers:{};
 const grades=isRecord(value.grades)?value.grades:{};
 const videos=isRecord(value.selectedVideo)?value.selectedVideo:{};
 const signatures=isRecord(value.quizSignatures)?value.quizSignatures:{};
 for(const m of modules){
  const saved=isRecord(checks[m.id])?checks[m.id]:{};
  study.checks[m.id]=Object.fromEntries(['teoria','video','exemplos','questoes'].map(stage=>[stage,saved[stage]===true]));
  if(m.videos.some(v=>v.id===videos[m.id]))study.selectedVideo[m.id]=videos[m.id];
 }
 for(const [key,questions] of quizEntries(modules)){
  const fingerprint=quizFingerprint(questions);study.quizSignatures[key]=fingerprint;
  if(Object.hasOwn(signatures,key)&&signatures[key]!==fingerprint){study.checks[key.split('/')[0]].questoes=false;continue}
  const picks=isRecord(answers[key])?answers[key]:{};
  const safePicks={};questions.forEach((_,i)=>{if(Number.isInteger(picks[i])&&picks[i]>=0&&picks[i]<=3)safePicks[i]=picks[i]});
  if(Object.keys(safePicks).length)study.answers[key]=safePicks;
  if(isRecord(grades[key])&&typeof grades[key].at==='string'&&Number.isFinite(Date.parse(grades[key].at))){
   // Recompute imported scores rather than displaying arbitrary HTML or numbers.
   const correct=questions.reduce((sum,q,i)=>sum+(safePicks[i]===q.answer?1:0),0);
   study.grades[key]={correct,total:questions.length,percent:Math.round(100*correct/questions.length),at:new Date(grades[key].at).toISOString()};
  }
 }
 if(Array.isArray(value.attempts))for(const a of value.attempts.slice(0,200)){
  if(!isRecord(a)||!modules.some(m=>m.id===a.moduleId)||typeof a.key!=='string'||!a.key.startsWith(a.moduleId+'/'))continue;
  if(!Number.isInteger(a.correct)||!Number.isInteger(a.total)||a.total<1||a.total>300||a.correct<0||a.correct>a.total||typeof a.at!=='string'||!Number.isFinite(Date.parse(a.at)))continue;
  study.attempts.push({moduleId:a.moduleId,key:a.key,correct:a.correct,total:a.total,percent:Math.round(100*a.correct/a.total),at:new Date(a.at).toISOString()});
 }
 return study;
}
export {normalizeModules, normalizeStudy, safeImage, safeLink};
