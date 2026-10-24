'use strict';
const cases=[
 ['preserva fonte e tamanho permitidos','<font face="Georgia" size="4">Leitura</font>',html=>html.includes('font-family: georgia')&&html.includes('font-size: 18px')&&!html.includes('<font')],
 ['descarta fontes externas e tamanhos arbitrários','<span style="font-family:attacker;font-size:99999px;background:url(https://example.com)">Texto</span>',html=>!html.includes('font-family')&&!html.includes('font-size')&&!html.includes('url(')],
 ['preserva negrito, lista e acentos','<p>Ação <strong>correta</strong></p><ul><li>Opção</li></ul>',html=>html.includes('<strong>correta</strong>')&&html.includes('Ação')],
 ['remove script e atributos de eventos','<p onclick="alert(1)">Texto<script>alert(1)</script><img src=x onerror=alert(1)></p>',html=>!html.includes('script')&&!html.includes('onclick')&&!html.includes('onerror')&&!html.includes('<img')],
 ['remove SVG, MathML e iframes','<svg onload="alert(1)"><a>ataque</a></svg><math><mtext>ataque</mtext></math><iframe srcdoc="<script>alert(1)</script>"></iframe>',html=>html===''],
 ['resiste a fechamento da antiga raiz','</div><div><p onmouseover="alert(1)">Seguro</p></div>',html=>html.includes('Seguro')&&!html.includes('onmouseover')],
 ['resiste a marcação malformada','<math><mtext><table><mglyph><style><!--</style><img title="--><img src=1 onerror=alert(1)>">',html=>!/<img|onerror|<style|<math/i.test(html)],
 ['bloqueia link javascript e data','<a href="javascript:alert(1)">A</a><a href="data:text/html,attack">B</a>',html=>!html.includes('href=')],
 ['preserva HTTPS e adiciona isolamento de nova aba','<a href="https://example.com/a" onclick="alert(1)">Fonte</a>',html=>html.includes('href="https://example.com/a"')&&html.includes('noopener noreferrer')&&!html.includes('onclick')],
 ['remove CSS perigoso, preserva cor de texto','<span style="color:rgb(18,102,129);position:fixed;background:url(javascript:alert(1))">Texto</span>',html=>html.includes('color:')&&!html.includes('position')&&!html.includes('url(')],
 ['sanitização é idempotente','<div><a href="https://example.com">Fonte</a><b>Revisão</b></div>',html=>safeRich(html)===html],
 ['resiste a elemento template e formulário','<template><img src=x onerror=alert(1)></template><form action="https://example.com"><input name=x></form><p>Fim</p>',html=>html==='<p>Fim</p>'],
 ['preserva texto e cor gerados pela barra do editor','<font color="#126681">Palavra colorida</font>',html=>html.includes('Palavra colorida')&&html.includes('color:')&&!html.includes('<font')],
 ['preserva texto de formatação externa sem executar atributos','<mark onclick="alert(1)">Texto destacado</mark>',html=>html==='Texto destacado'],
 ['limita profundidade sem perder texto','<div>'.repeat(500)+'Texto profundo'+'</div>'.repeat(500),html=>html.includes('Texto profundo')]
];
let passed=0;
for(const [name,input,verify] of cases){
 const item=document.createElement('li');try{if(!verify(safeRich(input)))throw new Error('Resultado inesperado');item.textContent='PASSOU — '+name;passed++}catch(error){item.textContent='FALHOU — '+name+': '+error.message}
 document.querySelector('#results').append(item);
}
document.querySelector('#summary').textContent=passed+'/'+cases.length+' verificações aprovadas';
