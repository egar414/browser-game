import {creatorSetupSQL} from './creator-grant.js';
// All server/user messages use textContent; account credentials never enter game storage.
export class OnlineUI{
 constructor(client,{open,close,launch}){
  this.client=client;this.launch=launch;
  this.root=document.createElement('section');this.root.id='online-panel';this.root.className='overlay hidden';this.root.setAttribute('aria-label','Online accounts and rooms');
  this.root.innerHTML=`<div class="dialog online-dialog" role="dialog" aria-modal="true" aria-labelledby="online-title"><p class="eyebrow">PLAY TOGETHER · OPTIONAL</p><h2 id="online-title">Online estuary.</h2><p id="online-message" role="status" aria-live="polite"></p><p class="fine-print">Up to 8 players per world. Email and password go to Supabase Auth. Other players see your chosen name and craft, never your email. Keep private room codes between friends.</p>
  <form id="online-account"><label>Email<input id="online-email" type="email" autocomplete="email" required maxlength="254"></label><label>Password<input id="online-password" type="password" autocomplete="current-password" minlength="8" maxlength="128" required></label><div class="online-actions"><button type="submit" class="play-button">SIGN IN</button><button type="button" data-online="signup" class="secondary">CREATE ACCOUNT</button><button type="button" data-online="reset" class="text-button">RESET PASSWORD</button></div></form>
  <div id="online-signed-in" hidden><p>Account signed in.</p><label>Player name<input id="online-name" maxlength="20" autocomplete="nickname" value="Estuary Rat" pattern="[a-zA-Z0-9 _-]{1,20}"></label><div class="online-actions"><button data-online="public" class="play-button">JOIN PUBLIC WORLD</button><button data-online="create" class="secondary">CREATE PRIVATE ROOM</button></div><label>Private room code<input id="online-code" maxlength="8" autocomplete="off" placeholder="8-letter room code" spellcheck="false"></label><button data-online="join" class="secondary">JOIN PRIVATE ROOM</button><p id="online-room"></p><div class="online-actions"><button data-online="drive" class="play-button" hidden>DRIVE WITH FRIENDS ↗</button><button data-online="leave" class="secondary" hidden>LEAVE ROOM</button><button data-online="logout" class="secondary">SIGN OUT</button></div><details><summary>Set a new password after opening your reset email</summary><label>New password<input id="online-new-password" type="password" autocomplete="new-password" minlength="8" maxlength="128"></label><button data-online="password" class="secondary">SAVE NEW PASSWORD</button></details></div>
  <p class="fine-print">Player boats are shared. Local AI traffic, fishing catches, races and spray sinking are still simulated on each device; online players cannot be sunk by other players in this release. Movement is client-simulated. A private code is an invitation, not an extra password.</p><div class="online-actions"><a class="secondary" href="./multiplayer-setup.html" target="_blank" rel="noopener">OWNER SETUP GUIDE ↗</a><button data-online="close" class="secondary">BACK TO GAME</button></div></div>`;
  document.getElementById('app').append(this.root);
  this.root.addEventListener('keydown',event=>{
   if(event.key!=='Tab')return;
   const items=[...this.root.querySelectorAll('button,input,a,summary')].filter(el=>!el.disabled&&el.getClientRects().length);
   const first=items[0],last=items.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  });
  this.statusButton=document.createElement('button');this.statusButton.id='online-status';this.statusButton.className='secondary';this.statusButton.textContent='ONLINE / ACCOUNT';this.statusButton.addEventListener('click',()=>this.show());document.getElementById('app').append(this.statusButton);
  for(const selector of ['.launch-card','.settings-footer']){
   const button=document.createElement('button');button.textContent='ONLINE / ACCOUNT';button.className='secondary';button.addEventListener('click',()=>this.show());document.querySelector(selector)?.append(button);
  }
  this.onOpen=open;this.onClose=close;
  this.root.querySelector('form').addEventListener('submit',event=>{event.preventDefault();this.run(async()=>{await client.signIn(this.value('email'),this.value('password'));this.root.querySelector('#online-password').value='';});});
  const perks=document.createElement('p');perks.id='online-creator-perks';perks.className='creator-perks';perks.hidden=true;perks.textContent='★ CREATOR · All garage designs and tuning unlocked · 2× garage XP';this.root.querySelector('#online-signed-in').prepend(perks);
  const refresh=document.createElement('button');refresh.className='secondary';refresh.textContent='REFRESH ACCOUNT';refresh.addEventListener('click',()=>this.run(()=>client.refreshPerks()));this.root.querySelector('#online-signed-in').append(refresh);
  const nameField=this.root.querySelector('#online-name');nameField.addEventListener('input',()=>{this.nameDirty=true;});
  const saveName=document.createElement('button');saveName.id='online-save-name';saveName.className='secondary';saveName.textContent='SAVE NAME';saveName.addEventListener('click',()=>{if(!nameField.reportValidity())return;this.run(async()=>{await client.saveName(nameField.value);this.nameDirty=false;this.render(client.status);});});nameField.parentElement.after(saveName);
  const creatorHelp=document.createElement('div');creatorHelp.id='online-creator-help';creatorHelp.innerHTML='<p id="online-creator-status" role="status"></p><p class="fine-print">Account ID: <span id="online-account-id"></span></p><button id="online-copy-creator" class="secondary">COPY MY CREATOR SETUP</button> <a class="secondary" href="https://supabase.com/dashboard/project/tqvgqtgxwgxdxpbvuatf/sql/new" target="_blank" rel="noopener">OPEN SUPABASE SQL EDITOR ↗</a><p class="fine-print">Project owner only: copy the setup, paste into SQL Editor, click Run, then Refresh Account. The public game key cannot assign badges.</p>';
  this.root.querySelector('#online-signed-in').append(creatorHelp);
  creatorHelp.querySelector('button').addEventListener('click',()=>this.run(async()=>{
   const response=await fetch(`${import.meta.env?.BASE_URL||'/'}creator.sql`,{cache:'no-cache'});if(!response.ok)throw Error('Could not load Creator setup. Please reload and try again.');
   const sql=creatorSetupSQL(await response.text(),client.status.accountId);
   try{await navigator.clipboard.writeText(sql);this.message('Creator setup copied. Paste it into your Supabase SQL Editor, click Run, then Refresh Account.');}
   catch{let field=creatorHelp.querySelector('textarea');if(!field){field=document.createElement('textarea');field.readOnly=true;field.setAttribute('aria-label','Your Creator setup SQL');creatorHelp.append(field);}field.value=sql;field.focus();field.select();this.message('Copy the selected Creator setup with Ctrl+C / Command+C, run it in Supabase SQL Editor, then Refresh Account.');}
  }));
  this.root.querySelectorAll('[data-online]').forEach(button=>button.addEventListener('click',()=>{
   const action=button.dataset.online;
   if(action==='close'){this.hide();return;}
   if(action==='drive'){this.hide();launch();return;}
   this.run(async()=>{
    if(action==='signup'){if(!this.root.querySelector('form').reportValidity())return;await client.signUp(this.value('email'),this.value('password'));this.root.querySelector('#online-password').value='';}
    if(action==='reset'){if(!this.root.querySelector('#online-email').reportValidity())return;await client.resetPassword(this.value('email'));}
    if(action==='password'){const p=this.value('new-password');if(p.length<8)throw Error('Use at least 8 characters');await client.changePassword(p);this.root.querySelector('#online-new-password').value='';}
    if(['public','create','join'].includes(action)){
     const name=this.root.querySelector('#online-name');if(!name.reportValidity())return;
     const code=this.value('code').trim().toUpperCase();if(action==='join'&&!/^[A-F0-9]{8}$/.test(code))throw Error('Enter the 8-character room code');
     await client.join(name.value,action==='join'?code:'PUBLIC',action==='create');
    }
    if(action==='leave')await client.leave();if(action==='logout')await client.signOut();
   });
  }));
  const previous=client.onChange;client.onChange=status=>{previous(status);this.render(status);};this.render(client.status);
 }
 value(id){return this.root.querySelector(`#online-${id}`).value;}
 async run(action){if(this.busy)return;this.busy=true;this.root.querySelectorAll('button:not([data-online="close"])').forEach(b=>b.disabled=true);try{await action();}catch(e){this.message(accountError(e));}finally{this.busy=false;this.root.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 message(text){this.root.querySelector('#online-message').textContent=text;}
 render(s){
  // Keep an error visible until the next deliberate action instead of clearing it at 3 Hz.
  if(s.message!==this.previousMessage){this.message(s.message);this.previousMessage=s.message;}
  this.root.querySelector('#online-account').hidden=s.signedIn;this.root.querySelector('#online-signed-in').hidden=!s.signedIn;
  const nameField=this.root.querySelector('#online-name');if(this.accountId!==s.accountId){this.accountId=s.accountId;this.nameDirty=false;nameField.value=s.playerName||'Estuary Rat';}else if(!this.nameDirty&&document.activeElement!==nameField)nameField.value=s.playerName||'Estuary Rat';
  this.root.querySelector('#online-room').textContent=s.room?`${s.room.public?'PUBLIC WORLD':'ROOM '+s.room.code} · ${s.room.players}/8 players${s.connected?'':' · reconnecting'}`:'';
  for(const a of ['drive','leave'])this.root.querySelector(`[data-online="${a}"]`).hidden=!s.room;
  this.statusButton.textContent=s.room?`${s.room.public?'PUBLIC':s.room.code} · ${s.room.players}/8${s.connected?'':' · RETRYING'}`:'ONLINE / ACCOUNT';
  this.statusButton.classList.toggle('is-creator',s.creator);if(s.creator)this.statusButton.textContent='★ CREATOR · '+this.statusButton.textContent;
  this.root.querySelector('#online-creator-perks').hidden=!s.creator;
  const messages={active:'★ Creator tag active on this account. It appears above your saved name in chase view.',inactive:'Creator tag is not assigned to this account yet. Use the owner setup below.',missing:'The Creator database update is not installed yet. Use the owner setup below.',checking:'Checking your account’s Creator tag…',error:'Could not check your Creator tag. Check your connection and press Refresh Account.'};
  this.root.querySelector('#online-creator-status').textContent=messages[s.creatorState]||'Sign in to check your Creator tag.';
  this.root.querySelector('#online-account-id').textContent=s.accountId||'';
  this.root.querySelector('#online-creator-help').hidden=!s.signedIn||s.creator;
  const guide=this.root.querySelector('a[href*="multiplayer-setup"]');guide.href=`./multiplayer-setup.html${s.accountId?'#creator='+encodeURIComponent(s.accountId):''}`;
  guide.textContent=s.signedIn?'OWNER SETUP / CREATOR TAG ↗':'OWNER SETUP GUIDE ↗';
 }
 async show(){this.onOpen();this.root.classList.remove('hidden');this.root.querySelector('[data-online="close"]').focus();await this.run(()=>this.client.readiness());}
 hide(){this.root.classList.add('hidden');this.onClose();}
}
export function accountError(error){
 if(error.code==='over_email_send_rate_limit'||/email.*rate.*limit|email.*limit.*exceed/i.test(error.message))return 'Supabase email sending limit reached. Please stop retrying for now. The project owner can turn off Confirm email (addresses will not be verified), or configure a custom SMTP sender in Supabase. See the Owner Setup Guide → Email problems.';
 if(error.code==='email_not_confirmed'||/email not confirmed/i.test(error.message))return 'Your email is not confirmed yet. Open the confirmation email. If email sending is limited, see Owner Setup Guide → Email problems.';
 return error.message||'Could not complete that action. Please try again.';
}
