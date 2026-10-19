import {expect} from '@playwright/test';
import {database,rpc,users} from './multiplayer-fixture.js';
const host='https://tqvgqtgxwgxdxpbvuatf.supabase.co';
function session(id,email,metadata={}){
 const exp=Math.floor(Date.now()/1000)+3600;
 const part=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 return {access_token:`${part({alg:'HS256',typ:'JWT'})}.${part({sub:id,role:'authenticated',aud:'authenticated',exp})}.fixture`,token_type:'bearer',expires_in:3600,expires_at:exp,refresh_token:`fixture-${id}`,user:{id,email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:metadata,created_at:new Date().toISOString()}};
}
export async function installAccountRoutes(p,f,id,email){
 f.metadata??=new Map();
 await p.addInitScript(()=>{if(!localStorage.getItem('estuary-rats-v1'))localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false,seaState:'calm',oceanVersion:1,dayMode:'day'}));});
 await p.route(`${host}/**`,async route=>{
  const req=route.request(),url=new URL(req.url());const data=req.postDataJSON()||{};
  let response;
  try{
   if(url.pathname==='/auth/v1/token')response=session(id,email,f.metadata.get(id));
   else if(url.pathname==='/auth/v1/logout')response={};
   else if(url.pathname==='/auth/v1/user'){if(req.method()==='PUT')f.metadata.set(id,{...f.metadata.get(id),...data.data});response=session(id,email,f.metadata.get(id)).user;}
   else if(url.pathname.startsWith('/rest/v1/rpc/')){
    const token=req.headers().authorization?.slice(7);let uid='';try{uid=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;}catch{}
    response=await rpc(f,uid,url.pathname.split('/').at(-1),data);
   }else throw Error('Unhandled fixture endpoint '+url.pathname);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response),headers:{'access-control-allow-origin':'*'}});
  }catch(e){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:e.message,code:'FIXTURE_ERROR'})});}
 });
}
export async function bootAccount(p,f,id,email){await installAccountRoutes(p,f,id,email);
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready,null,{timeout:120000});
 await p.locator('.launch-card').getByRole('button',{name:'ONLINE / ACCOUNT',exact:true}).click();
 await p.locator('#online-email').fill(email);await p.locator('#online-password').fill('Fixture-password-123');await p.locator('#online-account').getByRole('button',{name:'SIGN IN',exact:true}).click();
 await expect(p.locator('#online-signed-in')).toBeVisible();
}
export async function installCreatorBrowser(p){const f=await database();await f.db.query('insert into public.er_creators(user_id) values($1)',[users[0]]);f.metadata=new Map([[users[0],{game_name:'Ewan'}]]);await installAccountRoutes(p,f,users[0],'creator@example.test');await p.addInitScript(s=>{if(!localStorage.getItem('estuary-rats-auth-v1'))localStorage.setItem('estuary-rats-auth-v1',JSON.stringify(s));},session(users[0],'creator@example.test',{game_name:'Ewan'}));return f;}
