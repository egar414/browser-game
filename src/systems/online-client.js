import {RemoteStates,nextSequence} from './network-state.js';
import {savedPlayerName,savePlayerName,playerName} from './player-profile.js';

export function publicConfig(config){
 try{
  const url=new URL(config.url),key=String(config.publishableKey||'');
  if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))return null;
  if(key.startsWith('sb_publishable_'))return {url:url.origin,key};
  // Accept legacy anon keys, never a service role key.
  const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  return payload.role==='anon'?{url:url.origin,key}:null;
 }catch{return null;}
}
export class OnlineClient{
 constructor({getPose,onChange=()=>{},createClient,loadConfig}={}){
  this.getPose=getPose;this.onChange=onChange;this.createClient=createClient;this.loadConfig=loadConfig;this.remote=new RemoteStates();this.message='Single player · online is optional';this.room=null;this.session=null;this.creator=false;this.creatorState='signed-out';this.creatorError='';this.seq=0;this.failures=0;this.next=0;
 }
 changed(message){if(message)this.message=message;this.onChange(this.status);}
 get status(){return {configured:!!this.client,connected:!!this.room&&this.failures===0,signedIn:!!this.session,accountId:this.session?.user.id||null,playerName:savedPlayerName(this.session?.user),creator:this.creator,creatorState:this.creatorState,creatorError:this.creatorError,room:this.room?{id:this.room.id,code:this.room.code,public:this.room.public,players:this.room.players?.length||0,capacity:8}:null,message:this.message,remotePlayers:this.remote.players.size};}
 async initialize(){
  if(this.client)return;
  if(this.initializing)return this.initializing;
  this.initializing=this.setup().finally(()=>{this.initializing=null;});return this.initializing;
 }
 async setup(){
  const raw=this.loadConfig?await this.loadConfig():await fetch(`${(import.meta.env?.BASE_URL||'/')}multiplayer-config.json`,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Connection settings unavailable');return r.json();});
  const config=publicConfig({url:import.meta.env?.VITE_SUPABASE_URL||raw.url,publishableKey:import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY||raw.publishableKey});
  if(!config)throw Error('Online connection is not configured. Single player still works.');
  const factory=this.createClient||(await import('@supabase/supabase-js')).createClient;
  this.client=factory(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'estuary-rats-auth-v1'},global:{fetch:async(input,init={})=>fetch(input,{...init,signal:init.signal||AbortSignal.timeout(12000)})}});
  const {data,error}=await this.client.auth.getSession();if(error)throw error;this.session=data.session;
  this.client.auth.onAuthStateChange((_event,session)=>{this.session=session;if(!session){this.creator=false;this.creatorState='signed-out';this.clearRoom();}else setTimeout(()=>this.refreshPerks(),0);this.changed();});
  this.timer=setInterval(()=>this.tick(),100);this.timer.unref?.();
  this.changed(this.session?'Signed in. Choose a world.':'Sign in or create an account to play online.');
 }
 async rpc(name,args){const {data,error}=await this.client.rpc(name,args);if(error){throw Object.assign(Error(error.code==='PGRST202'?'Database setup needed. Open the multiplayer setup guide.':error.message||'Server connection failed'),{code:error.code});}if(data?.error)throw Error(data.error);return data;}
 async readiness(){await this.initialize();if(await this.rpc('er_backend_version')!==1)throw Error('Unsupported multiplayer database version');await this.refreshPerks();}
 async refreshPerks(){const id=this.session?.user.id;if(!id)return;this.creatorState='checking';this.changed();try{const creator=await this.rpc('er_my_perks');if(this.session?.user.id===id){this.creator=creator===true;this.creatorState=this.creator?'active':'inactive';this.creatorError='';this.changed();}}catch(error){if(this.session?.user.id===id){this.creatorState=error.code==='PGRST202'?'missing':'error';this.creatorError=error.message;this.changed();}}}
 async saveName(name){
  const user=this.session?.user;if(!user)throw Error('Sign in first');const clean=playerName(name);if(!clean)throw Error('Choose a player name using letters and numbers');
  savePlayerName(user.id,clean);this.changed();
  if(user.user_metadata?.game_name!==clean){const {data,error}=await this.client.auth.updateUser({data:{game_name:clean}});if(error)throw Error('Name saved on this device. Account sync failed; try SAVE NAME again.');if(this.session?.user.id===user.id)this.session={...this.session,user:data.user};}
  this.changed('Player name saved. It will be used when you join a world.');return clean;
 }
 async signIn(email,password){await this.initialize();const {data,error}=await this.client.auth.signInWithPassword({email,password});if(error)throw error;this.session=data.session;this.changed('Signed in. Choose a world.');}
 async signUp(email,password){await this.initialize();const {data,error}=await this.client.auth.signUp({email,password,options:{emailRedirectTo:this.redirectURL()}});if(error)throw error;this.session=data.session;this.changed(data.session?'Account created. Choose a world.':'Check your email and confirm your account, then sign in here.');}
 redirectURL(){return new URL('./',location.href).href;}
 async resetPassword(email){await this.initialize();const {error}=await this.client.auth.resetPasswordForEmail(email,{redirectTo:this.redirectURL()});if(error)throw error;this.changed('If that account exists, a password reset email is on its way.');}
 async changePassword(password){const {error}=await this.client.auth.updateUser({password});if(error)throw error;this.changed('Password updated.');}
 async signOut(){try{await this.leave();}catch{/* Expired memberships or a dropped network must not prevent local logout. */}const {error}=await this.client.auth.signOut({scope:'local'});if(error)throw error;this.session=null;this.changed('Signed out. Single player is ready.');}
 async join(name,code='PUBLIC',create=false){
  await this.readiness();if(!this.session)throw Error('Sign in first');
  let nameWarning='';try{await this.saveName(name);}catch(error){nameWarning=error.message;}
  // Wait for a previous-room exchange so it cannot overwrite the new roster.
  this.generation=(this.generation||0)+1;await this.pending;
  const room=await this.rpc('er_join',{p_name:name,p_code:code,p_create:create});
  const me=room.players.find(p=>p.id===this.session.user.id);savePlayerName(this.session.user.id,me?.name||name);
  this.remote.clear();this.room=room;if(typeof room.creator==='boolean'){this.creator=room.creator;this.creatorState=this.creator?'active':'inactive';}this.failures=0;this.next=0;this.changed(nameWarning||(room.public?'Public world joined.':'Private room ready. Share the room code with friends.'));
 }
 clearRoom(){this.generation=(this.generation||0)+1;this.room=null;this.remote.clear();}
 async leave(){this.clearRoom();await this.pending;if(this.client&&this.session)await this.rpc('er_leave');this.changed('Left online world. Single player continues.');}
 tick(now=performance.now()){
  if(!this.room||!this.session||this.pending||now<this.next)return;
  const generation=this.generation||0;
  this.next=now+(document.hidden?10000:333);
  this.pending=this.rpc('er_exchange',{p_pose:this.getPose(),p_seq:this.seq=nextSequence(this.seq)}).then(room=>{
   if(generation!==(this.generation||0))return;
   this.room=room;if(typeof room.creator==='boolean'){this.creator=room.creator;this.creatorState=this.creator?'active':'inactive';}this.remote.accept(room.players,this.session.user.id,performance.now());this.failures=0;this.changed();
  }).catch(error=>{
   if(generation!==(this.generation||0))return;
   this.failures++;this.remote.clear();this.next=performance.now()+Math.min(10000,1000*2**Math.min(3,this.failures));
   if(/expired|Sign in/i.test(error.message)){this.clearRoom();this.changed(error.message);}else this.changed('Connection interrupted; retrying. Single player controls still work.');
  }).finally(()=>{this.pending=null;});
 }
 dispose(){clearInterval(this.timer);this.clearRoom();}
}
