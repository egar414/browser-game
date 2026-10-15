import {formatCode} from './protocol.js';
export class OnlinePanel {
 constructor(session,callbacks={}){
  this.session=session;this.callbacks=callbacks;this.visible=false;this.busy=false;this.recovery=false;
  const button=document.createElement('button');button.id='online-button';button.className='online-button';button.textContent='ONLINE';button.setAttribute('aria-label','Online worlds and account');document.querySelector('#app').appendChild(button);button.addEventListener('click',()=>this.open());
  const root=document.createElement('section');root.id='online-panel';root.className='overlay hidden';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','online-title');
  root.innerHTML=`<div class="dialog online-dialog"><button id="online-close" class="online-close" aria-label="Close online worlds">✕</button><p class="eyebrow">BRING YOUR CREW</p><h2 id="online-title">Same water.<br>More rats.</h2><p id="online-message" class="subtle" role="status"></p><div id="online-setup" class="online-notice hidden">Online hosting is being prepared. You can keep playing single-player with the current game.</div><div id="online-auth"><div class="online-tabs"><button id="auth-signin-tab" class="secondary">SIGN IN</button><button id="auth-signup-tab" class="secondary">CREATE ACCOUNT</button></div><form id="online-auth-form"><label id="online-name-label" class="hidden">DISPLAY NAME<input id="online-name" autocomplete="nickname" minlength="2" maxlength="20" placeholder="Your skipper name"></label><label>EMAIL<input id="online-email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com"></label><label>PASSWORD<input id="online-password" type="password" autocomplete="current-password" required maxlength="128" placeholder="Your password"></label><p id="password-hint" class="fine-print hidden">Use at least 10 characters. Your email is kept out of the public world.</p><button id="online-auth-submit" class="play-button" type="submit">SIGN IN ↗</button></form><button id="online-forgot" class="text-button">Forgot your password?</button></div><div id="online-signed-in" class="hidden"><p id="online-pilot" class="online-pilot"></p><div class="online-room-status"><strong id="online-world"></strong><span id="online-count"></span></div><button id="online-public" class="play-button">JOIN THE PUBLIC WORLD ↗</button><p class="fine-print">Everyone signed in shares this public world. Private rooms separate your crew.</p><div class="online-private"><button id="online-create" class="secondary">CREATE A PRIVATE ROOM</button><form id="online-join-form"><label>INVITE CODE<input id="online-code-input" autocomplete="off" autocapitalize="characters" maxlength="14" placeholder="ABCD-1234-EF56" required></label><button id="online-join" class="secondary" type="submit">JOIN</button></form><div id="online-invite" class="hidden"><span>SHARE WITH YOUR CREW</span><strong id="online-code"></strong><button id="online-copy" class="secondary">COPY CODE</button><small>Codes last 24 hours. Share them only with people you want in your room.</small></div></div><button id="online-signout" class="text-button">SIGN OUT</button></div><form id="online-recovery" class="hidden"><label>NEW PASSWORD<input id="online-new-password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label><button class="play-button" type="submit">SAVE NEW PASSWORD ↗</button></form><p id="online-error" class="online-error" role="alert"></p><button id="online-back" class="secondary">BACK TO THE WATER</button></div>`;
  document.querySelector('#app').appendChild(root);this.root=root;this.button=button;this.signingUp=false;
  const on=(id,fn)=>root.querySelector('#'+id).addEventListener('click',fn);
  on('online-close',()=>this.close());on('online-back',()=>this.close());on('auth-signin-tab',()=>this.authMode(false));on('auth-signup-tab',()=>this.authMode(true));
  on('online-public',()=>this.run(()=>session.publicWorld()));on('online-create',()=>this.run(()=>session.createRoom()));on('online-signout',()=>this.run(()=>session.signOut()));
  on('online-forgot',()=>this.run(async()=>{const email=this.value('online-email');if(!email||!root.querySelector('#online-email').checkValidity())throw new Error('Enter your email address first.');await session.resetPassword(email);}));
  on('online-copy',()=>this.run(async()=>{const code=formatCode(session.status.code);try{await navigator.clipboard.writeText(code);session.notify('Invite code copied.');}catch{session.notify('Select the code above and copy it to share.');}}));
  root.querySelector('#online-auth-form').addEventListener('submit',e=>{e.preventDefault();this.run(async()=>{
   const email=this.value('online-email'),password=this.value('online-password');
   if(this.signingUp){if(password.length<10)throw new Error('Use a password with at least 10 characters.');await session.signUp(email,password,this.value('online-name'));}
   else await session.signIn(email,password);
   root.querySelector('#online-password').value='';
  });});
  root.querySelector('#online-join-form').addEventListener('submit',e=>{e.preventDefault();this.run(()=>session.joinRoom(this.value('online-code-input')));});
  root.querySelector('#online-recovery').addEventListener('submit',e=>{e.preventDefault();this.run(async()=>{await session.updatePassword(this.value('online-new-password'));root.querySelector('#online-new-password').value='';this.recovery=false;this.render(session.status);});});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.close();return;}if(e.key!=='Tab')return;const focusable=[...root.querySelectorAll('button,input')].filter(el=>!el.disabled&&el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}});
  this.render(session.status);
 }
 value(id){const el=this.root.querySelector('#'+id);return el.type==='password'?el.value:el.value.trim();}
 message(text){this.root.querySelector('#online-message').textContent=text;}
 authMode(signingUp){this.signingUp=signingUp;this.root.querySelector('#online-name-label').classList.toggle('hidden',!signingUp);this.root.querySelector('#online-name').required=signingUp;this.root.querySelector('#password-hint').classList.toggle('hidden',!signingUp);const input=this.root.querySelector('#online-password');input.autocomplete=signingUp?'new-password':'current-password';input.minLength=signingUp?10:1;this.root.querySelector('#online-auth-submit').textContent=signingUp?'CREATE ACCOUNT ↗':'SIGN IN ↗';this.root.querySelector('#online-forgot').classList.toggle('hidden',signingUp);}
 async run(action){
  if(this.busy)return;if(!this.session.status.configured){this.message('Online hosting is not configured yet. Single-player is ready.');return;}
  this.busy=true;this.root.querySelector('#online-error').textContent='';this.render(this.session.status);
  try{await action();}catch(error){this.root.querySelector('#online-error').textContent=error.message||'Could not connect. Try again.';}finally{this.busy=false;this.render(this.session.status);}
 }
 render(s){
  this.button.textContent=s.connected?`ONLINE · ${s.count}`:s.connecting?'CONNECTING…':'ONLINE';this.button.classList.toggle('connected',s.connected);
  this.message(s.message);this.root.querySelector('#online-setup').classList.toggle('hidden',s.configured);
  this.root.querySelector('#online-auth').classList.toggle('hidden',s.signedIn||this.recovery||!s.configured);
  this.root.querySelector('#online-signed-in').classList.toggle('hidden',!s.signedIn||this.recovery);
  this.root.querySelector('#online-recovery').classList.toggle('hidden',!this.recovery);
  this.root.querySelector('#online-pilot').textContent=`SIGNED IN · ${s.nickname||'Skipper'}`;
  this.root.querySelector('#online-world').textContent=s.world==='public'?'PUBLIC ESTUARY':'PRIVATE CREW';this.root.querySelector('#online-count').textContent=s.connected?`${s.count} RIDER${s.count===1?'':'S'} CONNECTED`:'PRESS PLAY TO CONNECT';
  this.root.querySelector('#online-invite').classList.toggle('hidden',!s.code);this.root.querySelector('#online-code').textContent=formatCode(s.code);
  for(const el of this.root.querySelectorAll('form button,#online-create,#online-public,#online-signout,#online-forgot'))el.disabled=this.busy||!s.configured;
 }
 open(recovery=false){if(!this.visible){this.returnFocus=document.activeElement;this.callbacks.open?.();}this.visible=true;this.recovery=recovery;this.root.classList.remove('hidden');this.render(this.session.status);this.root.querySelector('#online-close').focus();}
 close(){this.root.classList.add('hidden');this.visible=false;for(const el of this.root.querySelectorAll('input[type="password"]'))el.value='';this.callbacks.close?.();this.returnFocus?.focus();}
}
