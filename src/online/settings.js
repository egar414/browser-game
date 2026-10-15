export function onlineConfig(env={}){
 const url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY;
 if(!url&&!key)return null;
 if(!url||!key)throw new Error('Online setup needs both the project URL and public publishable key.');
 const parsed=new URL(url);if(parsed.username||parsed.password)throw new Error('Use a public project URL without embedded credentials.');if(parsed.protocol!=='https:'&&!(env.DEV&&['localhost','127.0.0.1'].includes(parsed.hostname)))throw new Error('Online hosting must use HTTPS.');
 if(key.startsWith('sb_secret_'))throw new Error('Use the public publishable key, never a secret service key.');
 if(key.split('.').length===3){try{const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role==='service_role')throw new Error('Secret service keys cannot be placed in the game.');}catch(e){if(e.message.includes('Secret service'))throw e;}}
 return {url,key};
}
