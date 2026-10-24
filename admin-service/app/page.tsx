import {requireChatGPTUser} from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Home(){
 await requireChatGPTUser('/');
 return <iframe src="/editor/index.html" title="Administração do Portal INVEST" style={{border:0,width:'100%',height:'100dvh',display:'block'}}/>;
}
