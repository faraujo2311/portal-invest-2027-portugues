import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {handleAdminRequest} from '@/lib/admin-api.mjs';
export const dynamic='force-dynamic';
async function handle(request:Request){
 const user=await getChatGPTUser();
 return handleAdminRequest(request,env,user?.userId||null);
}
export {handle as GET,handle as POST};
