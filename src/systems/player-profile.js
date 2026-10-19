export function playerName(value){return typeof value==='string'?value.replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,20):'';}
const key=id=>`estuary-rats-name-v1:${id}`;
export function savedPlayerName(user,storage){
 if(!user?.id)return '';
 try{storage??=globalThis.localStorage;const local=playerName(storage?.getItem(key(user.id)));if(local)return local;}catch{/* Account metadata is the fallback when local storage is blocked. */}
 return playerName(user.user_metadata?.game_name);
}
export function savePlayerName(userId,name,storage){
 const clean=playerName(name);if(!userId||!clean)return '';
 try{storage??=globalThis.localStorage;storage?.setItem(key(userId),clean);}catch{/* Joining still works with storage disabled. */}
 return clean;
}
