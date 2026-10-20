// TOTP secrets remain in this menu only. Codes go directly to Supabase Auth.
const unwrap=({data,error})=>{if(error)throw error;return data;};
export class AccountSecurity{
 constructor(owner){this.owner=owner;this.reset();}
 reset(){this.revision=(this.revision||0)+1;this.enabled=false;this.required=false;this.factorId=null;this.pending=null;this.checked=false;}
 get status(){return{enabled:this.enabled,required:this.required,checked:this.checked,enrolling:!!this.pending};}
 async refresh(){
  const o=this.owner;if(!o.session){this.reset();return;}
  const revision=++this.revision,id=o.session.user.id,mfa=o.client.auth.mfa;
  const [assurance,factors]=await Promise.all([mfa.getAuthenticatorAssuranceLevel(),mfa.listFactors()]);
  const level=unwrap(assurance),all=unwrap(factors);if(o.session?.user.id!==id||revision!==this.revision)return;
  this.factorId=all.totp?.[0]?.id||null;this.enabled=!!this.factorId;this.required=(this.enabled||level.nextLevel==='aal2')&&level.currentLevel!=='aal2';this.checked=true;
  if(this.required){o.creator=false;o.creatorState='mfa';o.clearRoom();}o.changed();
 }
 async enroll(){
  const o=this.owner;await o.initialize();if(!o.session)throw Error('Sign in first.');await this.refresh();
  try{if(await o.rpc('er_security_version')!==1)throw Error('missing');}catch{throw Error('The owner database update is needed before setting up 2FA. Copy the owner database update below and run it in Supabase SQL Editor.');}
  if(this.enabled)throw Error('Authenticator 2FA is already enabled.');
  if(this.pending)return this.pending;
  const data=unwrap(await o.client.auth.mfa.enroll({factorType:'totp',friendlyName:'Estuary Rats authenticator',issuer:'Estuary Rats'}));
  this.pending={id:data.id,qr:data.totp.qr_code,secret:data.totp.secret};o.changed('Scan the QR with an authenticator app, then enter its six-digit code. Keep access to the app: it is needed for future sign-ins.');return this.pending;
 }
 async verify(code){
  const o=this.owner;if(!/^\d{6}$/.test(code))throw Error('Enter the six-digit code from your authenticator app.');
  const factorId=this.pending?.id||this.factorId;if(!factorId)throw Error('Set up an authenticator first.');
  unwrap(await o.client.auth.mfa.challengeAndVerify({factorId,code}));this.pending=null;
  o.session=unwrap(await o.client.auth.getSession()).session;await this.refresh();await o.refreshPerks();o.changed('Authenticator verified. Your account is ready.');
 }
 async cancel(){const pending=this.pending;this.pending=null;if(pending)unwrap(await this.owner.client.auth.mfa.unenroll({factorId:pending.id}));this.owner.changed();}
 async disable(){await this.refresh();if(this.required)throw Error('Verify your authenticator code before removing 2FA.');if(!this.factorId)return;
  unwrap(await this.owner.client.auth.mfa.unenroll({factorId:this.factorId}));this.pending=null;await this.refresh();this.owner.changed('Authenticator 2FA removed from this account.');
 }
}
