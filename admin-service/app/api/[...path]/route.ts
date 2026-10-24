import {env} from 'cloudflare:workers';
import {handlePasswordRequest} from '@/lib/password-api.mjs';
export const dynamic='force-dynamic';
async function handle(request:Request){
 return handlePasswordRequest(request,env);
}
export {handle as GET,handle as POST};
