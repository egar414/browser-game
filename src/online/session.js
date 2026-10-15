import {ONLINE_TUNING,validatePose,packPose,pilotId,inviteCode} from './protocol.js';
export class OnlineSession {
 constructor(client,hooks={}){
  this.client=client;this.hooks=hooks;this.authQueue=Promise.resolve();this.clockOffset=0;this.epoch=globalThis.crypto.randomUUID();this.sequence=0;this.session=null;this.nickname='';this.active=false;this.suspended=false;this.world='public';this.room=null;this.generation=0;this.peers=new Map();this.channels=[];this.connections=new Set();this.elapsed=0;this.lastSent='';this.sinceSent=0;this.connected=false;this.message=client?'Sign in to join the shared world.':'Online hosting is not configured yet. Single-player is available.';
 }
 get status(){return {configured:!!this.client,signedIn:!!this.session,nickname:this.nickname,connected:this.connected,connecting:this.active&&!!this.session&&!this.connected,world:this.world,code:this.room?.code||'',expiresAt:this.room?.expiresAt||null,count:this.connected?this.peers.size+1:0,message:this.message};}
 notify(message){if(message!==undefined)this.message=message;this.hooks.onStatus?.(this.status);}
 async init(){
  if(!this.client){this.notify();return;}
  this.subscription=this.client.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY')this.hooks.onRecovery?.();queueMicrotask(()=>this.setSession(session).catch(e=>this.notify(e.message)));}).data.subscription;
  const {data,error}=await this.client.auth.getSession();if(error){this.notify('Could not restore sign-in. Please sign in again.');return;}await this.setSession(data.session);
 }
 setSession(session){this.authQueue=this.authQueue.catch(()=>{}).then(()=>this.applySession(session));return this.authQueue;}
 now(){return Date.now()/1000+this.clockOffset;}
 async applySession(session){
  if(this.session?.user.id===session?.user.id){this.session=session;return;}
  await this.disconnect();this.session=session;this.world='public';this.room=null;this.nickname='';
  if(session){const {data,error}=await this.client.rpc('ensure_pilot',{display_name:/^[^<>\x00-\x1f]{2,20}$/.test(session.user.user_metadata?.nickname||'')?session.user.user_metadata.nickname:null});if(error){this.notify('Account connected, but world setup is incomplete.');return;}this.nickname=data.nickname;const started=Date.now(),clock=await this.client.rpc('boating_clock');if(!clock.error&&Number.isFinite(clock.data))this.clockOffset=clock.data-(started+Date.now())/2000;this.notify('Signed in. Play to enter the shared public world.');if(this.active)await this.joinWorld('public');}
  else this.notify('Signed out. Single-player is available.');
 }
 async signIn(email,password){const {error}=await this.client.auth.signInWithPassword({email:email.trim(),password});if(error)throw new Error('Could not sign in. Check your email/password and confirm your email if needed.');}
 async signUp(email,password,nickname){
  if(password.length<10||password.length>128)throw new Error('Use a password with 10 to 128 characters.');
  if(!/^[^<>\x00-\x1f]{2,20}$/.test(nickname))throw new Error('Use a display name of 2 to 20 characters, without angle brackets.');
  const {data,error}=await this.client.auth.signUp({email:email.trim(),password,options:{data:{nickname},emailRedirectTo:location.origin+location.pathname}});
  if(error)throw new Error(error.status===429?'Too many attempts. Please try again later.':'Could not create the account. Check the details or try signing in.');
  if(data.session){await this.setSession(data.session);const result=await this.client.rpc('ensure_pilot',{display_name:nickname||null});if(result.error)throw new Error('Account created; display name could not be saved.');this.nickname=result.data.nickname;this.notify('Account ready. Play to join everyone.');}
  else this.notify('Check your email for the confirmation link, then sign in.');
 }
 async resetPassword(email){const {error}=await this.client.auth.resetPasswordForEmail(email.trim(),{redirectTo:location.origin+location.pathname});if(error)throw new Error('Could not request a reset. Please try again later.');this.notify('If that address has an account, a reset link has been requested.');}
 async updatePassword(password){const {error}=await this.client.auth.updateUser({password});if(error)throw new Error('Could not update the password. Request a fresh reset link.');this.notify('Password updated.');}
 async signOut(){const {error}=await this.client.auth.signOut();if(error)throw new Error('Could not sign out. Try again when connected.');await this.setSession(null);}
 async play(){this.active=true;if(this.session&&!this.connected)await this.joinWorld(this.world,this.room);else this.notify();}
 async suspend(){this.suspended=true;await this.disconnect();this.notify('Online paused while this tab is hidden.');}
 async resumeNetwork(){this.suspended=false;if(this.active&&this.session)await this.joinWorld(this.world,this.room);}
 async stop(){this.active=false;await this.disconnect();if(!this.active)this.notify(this.session?'At the garage. Play to reconnect.':undefined);}
 async createRoom(){
  this.requireAccount();const {data,error}=await this.client.rpc('create_boating_room');if(error||data?.error)throw new Error(data?.error||'Could not create a private room.');await this.joinWorld(data.id,data);return data;
 }
 async joinRoom(code){
  this.requireAccount();code=inviteCode(code);if(!/^[A-F0-9]{12}$/.test(code))throw new Error('Enter the 12-character invite code.');
  const {data,error}=await this.client.rpc('join_boating_room',{invite:code});if(error||data?.error)throw new Error(data?.error||'Could not join that private room.');await this.joinWorld(data.id,data);
 }
 requireAccount(){if(!this.session)throw new Error('Sign in to use online worlds.');}
 async publicWorld(){this.requireAccount();if(this.world!=='public')await this.client.rpc('leave_boating_room',{room_id_text:this.world});await this.joinWorld('public');}
 async disconnect(){
  this.generation++;this.connected=false;this.connections.clear();const channels=this.channels.splice(0);this.peers.clear();this.hooks.onClear?.();
  if(this.client)await Promise.allSettled(channels.map(c=>this.client.removeChannel(c)));
 }
 async joinWorld(world,room=null){
  await this.disconnect();this.world=world;this.room=room;this.elapsed=0;this.lastSent='';this.sinceSent=10;
  if(!this.active||this.suspended){this.notify(world==='public'?'Public world selected. Press Play.':'Private room ready. Share its code, then press Play.');return;}
  this.requireAccount();const generation=this.generation;await this.client.realtime.setAuth(this.session.access_token);if(generation!==this.generation)return;
  this.hooks.onWorld?.(world);
  this.notify('Connecting to the water…');
  const ownTopic=`estuary:pilot:${world}:${this.session.user.id}`,lobbyTopic=`estuary:world:${world}`;
  this.own=this.client.channel(ownTopic,{config:{private:true,broadcast:{self:false,ack:false}}});
  this.lobby=this.client.channel(lobbyTopic,{config:{private:true,presence:{key:this.session.user.id}}});
  this.channels.push(this.own,this.lobby);
  this.lobby.on('presence',{event:'sync'},()=>{if(generation===this.generation)this.syncPeers(generation).catch(()=>this.notify('Some riders could not be loaded.'));});
  const connect=channel=>new Promise((resolve,reject)=>{
   let done=false;const timer=setTimeout(()=>{if(!done){done=true;reject(new Error('World connection timed out. Check your connection or try again.'));}},15000);
   channel.subscribe(status=>{
    if(generation!==this.generation)return;
    if(status==='SUBSCRIBED'){
     this.connections.add(channel.topic);this.connected=this.connections.size===2;
     if(channel===this.lobby)channel.track({id:this.session.user.id}).catch(()=>{});
     if(!done){done=true;clearTimeout(timer);resolve();}this.notify(this.connected?(world==='public'?'Shared public world':'Private invite-only room'):'Connecting…');
    }else if(['TIMED_OUT','CHANNEL_ERROR','CLOSED'].includes(status)){
     this.connections.delete(channel.topic);this.connected=false;this.notify('Connection interrupted. Reconnecting…');
    }
   });
  });
  try{await Promise.all([connect(this.own),connect(this.lobby)]);}catch(error){if(generation===this.generation){await this.disconnect();this.notify(error.message);}}
 }
 async syncPeers(generation){
  const ids=Object.keys(this.lobby.presenceState()).filter(id=>pilotId(id)&&id!==this.session.user.id).slice(0,ONLINE_TUNING.maxPeers);
  for(const [id,peer]of this.peers)if(!ids.includes(id)){this.peers.delete(id);this.channels=this.channels.filter(c=>c!==peer.channel);await this.client.removeChannel(peer.channel);this.hooks.onRemove?.(id);}
  if(generation!==this.generation)return;
  for(const id of ids){
   if(this.peers.has(id))continue;this.lastSent='';this.sinceSent=ONLINE_TUNING.heartbeat;
   const channel=this.client.channel(`estuary:pilot:${this.world}:${id}`,{config:{private:true}}),peer={channel,nickname:'Skipper',sequence:-1};this.peers.set(id,peer);this.channels.push(channel);
   channel.on('broadcast',{event:'pose'},({payload})=>{if(generation!==this.generation)return;const p=validatePose(payload);if(!p||(p.epoch===peer.epoch&&p.seq<=peer.sequence))return;peer.epoch=p.epoch;peer.sequence=p.seq;this.hooks.onPose?.(id,p,peer.nickname);});channel.subscribe();
   this.client.from('pilots').select('nickname').eq('id',id).maybeSingle().then(({data})=>{if(data&&generation===this.generation)peer.nickname=data.nickname;}).catch(()=>{});
  }
  if(generation===this.generation)this.notify();
 }
 tick(dt,v,settings,playing){
  if(this.suspended||!this.connected||!this.own||!this.session||!this.peers.size)return;this.elapsed+=dt;this.sinceSent+=dt;
  if(this.room?.expiresAt&&Date.now()>Date.parse(this.room.expiresAt)){this.publicWorld().catch(e=>this.notify(e.message));return;}
  if(this.elapsed<ONLINE_TUNING.sendInterval)return;this.elapsed=0;
  const packet=packPose(v,settings,this.sequence,!playing,this.epoch);if(!packet)return;
  const signature=JSON.stringify({...packet,seq:0});if(signature===this.lastSent&&this.sinceSent<ONLINE_TUNING.heartbeat)return;
  this.sequence++;this.lastSent=signature;this.sinceSent=0;
  this.own.send({type:'broadcast',event:'pose',payload:packet}).catch(()=>this.notify('Sending interrupted. Reconnecting…'));
 }
 async dispose(){await this.disconnect();this.subscription?.unsubscribe();}
}
