import test from 'node:test';
import assert from 'node:assert/strict';
import {playerName,savedPlayerName,savePlayerName} from '../src/systems/player-profile.js';
import {OnlineClient} from '../src/systems/online-client.js';
import {readFile} from 'node:fs/promises';
test('player names persist per account and fall back to account metadata with blocked storage',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 savePlayerName('a','Ewan',storage);assert.equal(savedPlayerName({id:'a'},storage),'Ewan');assert.equal(savedPlayerName({id:'b'},storage),'');
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.equal(savePlayerName('a','Ewan',blocked),'Ewan');assert.equal(savedPlayerName({id:'a',user_metadata:{game_name:'Ewan'}},blocked),'Ewan');assert.equal(playerName('<Ewan>'),'Ewan');assert.equal(playerName(' '.repeat(10)),'');
});
test('role diagnostics distinguish unassigned accounts and unavailable setup; legacy room responses preserve verified roles',async()=>{
 const client=new OnlineClient();client.session={user:{id:'a',user_metadata:{}}};
 client.rpc=async()=>false;await client.refreshPerks();assert.equal(client.status.creatorState,'inactive');
 client.rpc=async()=>{throw Object.assign(Error('Missing function'),{code:'PGRST202'});};await client.refreshPerks();assert.equal(client.status.creatorState,'missing');
 client.rpc=async()=>true;await client.refreshPerks();assert.equal(client.status.creatorState,'active');
 client.readiness=async()=>{};client.saveName=async()=>{};client.rpc=async()=>({id:'room',players:[{id:'a',name:'Ewan'}],public:true});await client.join('Ewan');assert.equal(client.creator,true);
 client.rpc=async()=>({id:'room',players:[{id:'a',name:'Ewan'}],creator:false,public:true});await client.join('Ewan');assert.equal(client.creator,false);
 assert.equal(await readFile(new URL('../public/creator-setup.js',import.meta.url),'utf8'),await readFile(new URL('../src/systems/creator-grant.js',import.meta.url),'utf8'));
});

test('saved sessions restore and verify Creator access without opening Online; storage never grants roles',async()=>{
 const c=new OnlineClient();let calls=0,checked=0;c.initialize=async()=>{calls++;c.session={user:{id:'a'}};};c.rpc=async()=>{checked++;return true;};
 assert.equal(await c.restoreSession({getItem:()=>null}),false);assert.equal(calls,0);
 assert.equal(await c.restoreSession({getItem(){throw Error('blocked');}}),false);assert.equal(calls,0);
 assert.equal(await c.restoreSession({getItem:()=>'{"creator":true}'}),true);assert.equal(calls,1);assert.equal(checked,1);assert.equal(c.creator,true);
 c.rpc=async()=>false;await c.restoreSession({getItem:()=>'{"creator":true}'});assert.equal(c.creator,false);assert.equal(c.creatorState,'inactive');
 c.initialize=async()=>{throw Error('offline');};assert.equal(await c.restoreSession({getItem:()=>'{"creator":true}'}),false);assert.match(c.status.message,/could not reconnect/);
});
