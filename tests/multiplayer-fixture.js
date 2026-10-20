import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
export const migration=await readFile(new URL('../supabase/migrations/001_multiplayer.sql',import.meta.url),'utf8');
export const creatorMigration=await readFile(new URL('../supabase/migrations/002_creator.sql',import.meta.url),'utf8');
export const combatMigration=await readFile(new URL('../supabase/migrations/003_spray_combat.sql',import.meta.url),'utf8');
export const fleetMigration=await readFile(new URL('../supabase/migrations/004_tinny_fleet.sql',import.meta.url),'utf8');
export const users=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
export async function database(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
 await db.exec(migration);await db.exec(migration);
 await db.exec(creatorMigration);await db.exec(creatorMigration);
 await db.exec(combatMigration);await db.exec(combatMigration);
 await db.exec(fleetMigration);await db.exec(fleetMigration);
 for(const id of users)await db.query('insert into auth.users(id) values($1)',[id]);
 let pending=Promise.resolve();
 const as=(id,sql,args=[])=>{const work=pending.then(()=>db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);return tx.query(sql,args);}));pending=work.catch(()=>{});return work;};
 const owner=sql=>{const work=pending.then(()=>db.exec(sql));pending=work.catch(()=>{});return work;};
 return {db,as,owner};
}
export async function rpc(fixture,id,name,args={}){
 const calls={er_my_perks:['select public.er_my_perks() as result',[]],er_backend_version:['select public.er_backend_version() as result',[]],er_snapshot:['select public.er_snapshot() as result',[]],er_join:['select public.er_join($1,$2,$3) as result',[args.p_name,args.p_code,args.p_create]],er_exchange:['select public.er_exchange($1::jsonb,$2::bigint) as result',[JSON.stringify(args.p_pose),args.p_seq]],er_leave:['select public.er_leave() as result',[]]};
 if(!calls[name])throw Error('Unknown RPC');const [sql,params]=calls[name];return (await fixture.as(id,sql,params)).rows[0].result;
}
