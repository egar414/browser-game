export function creatorSetupSQL(migration,id){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||''))throw Error('Open this page from Online / Account after signing in to your game account.');
 return migration+`\n-- Grant only this signed-in game account. Run as the Supabase project owner.\ninsert into public.er_creators(user_id) values ('${id}') on conflict(user_id) do nothing;\n`;
}
