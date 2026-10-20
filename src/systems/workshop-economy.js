import {VEHICLES} from '../config.js';
export const UPGRADES=[
 {id:'steering',slot:'handling',name:'Carve steering',price:100,detail:'12% more steering authority · 4% more grip',yaw:1.12,grip:1.04},
 {id:'engine',slot:'engine',name:'Launch tune',price:180,detail:'8% stronger acceleration · original speed ceiling',power:1.08},
 {id:'ride',slot:'ride',name:'Ride control',price:140,detail:'12% more damping for softer hull reactions',damping:1.12},
 {id:'pro-engine',slot:'engine',name:'Clean-air power kit',price:420,detail:'15% stronger acceleration · original speed ceiling',power:1.15,base:'engine',require:{distinct:3,air:1},goal:'Bank 3 different moves, including a clean aerial landing'},
 {id:'pro-steering',slot:'handling',name:'Bow & spray steering',price:350,detail:'20% more steering authority · 8% more grip',yaw:1.20,grip:1.08,base:'steering',require:{bow:3,carve:6},goal:'Bank 3 Bow riders and 6 Spray carves'},
];
const number=x=>Number.isFinite(x)?Math.max(0,Math.min(1e9,Math.floor(x))):0;
const fresh=()=>({balance:0,earned:0,moves:{},tricks:{},boats:{}});
const kind=label=>label==='Bow rider'?'bow':label==='Rooster tail donut'?'donut':label==='Spray carve'?'carve':/landed$|^Clean air$/.test(label)?'air':null;
function clean(raw){
 const data=fresh();data.balance=number(raw?.balance);data.earned=Math.max(data.balance,number(raw?.earned));
 for(const k of ['bow','donut','carve','air'])data.moves[k]=number(raw?.moves?.[k]);
 for(const label of Object.keys(raw?.tricks||{}).slice(0,20))if(label.length<=48&&kind(label))data.tricks[label]=number(raw.tricks[label]);
 for(const type of Object.keys(VEHICLES)){const b=raw?.boats?.[type];if(!b)continue;const owned=UPGRADES.filter(u=>Array.isArray(b.owned)&&b.owned.includes(u.id)).map(u=>u.id),active={};for(const slot of ['engine','handling','ride'])if(owned.includes(b.active?.[slot])&&UPGRADES.some(u=>u.id===b.active[slot]&&u.slot===slot))active[slot]=b.active[slot];data.boats[type]={owned,active};}return data;
}
export class WorkshopEconomy{
 constructor(storage){this.storage=storage;this.memory=new Map();this.canSave=true;this.last=new Map();this.switchAccount(null);}
 switchAccount(id){this.account=id||'guest';this.key='estuary-rats-workshop-v1:'+this.account;this.last.clear();if(this.memory.has(this.key)){this.data=this.memory.get(this.key);return;}
  try{const storage=this.storage??globalThis.localStorage;this.data=clean(JSON.parse(storage?.getItem(this.key)||'null'));}catch{this.data=fresh();this.canSave=false;}this.memory.set(this.key,this.data);
 }
 save(){this.memory.set(this.key,this.data);try{(this.storage??globalThis.localStorage)?.setItem(this.key,JSON.stringify(this.data));}catch{this.canSave=false;}}
 earn(label,points,time){const move=kind(label);if(!move||!Number.isFinite(points)||points<=0||!Number.isFinite(time)||time-(this.last.get(label)??-100)<3)return 0;this.last.set(label,time);const coins=Math.max(1,Math.floor(points/5));this.data.balance=number(this.data.balance+coins);this.data.earned=number(this.data.earned+coins);if(Object.keys(this.data.tricks).length<20||this.data.tricks[label])this.data.tricks[label.slice(0,48)]=number((this.data.tricks[label.slice(0,48)]||0)+1);this.data.moves[move]=number((this.data.moves[move]||0)+1);this.save();return coins;}
 boat(type){if(!Object.hasOwn(VEHICLES,type))throw Error('Unknown craft');return this.data.boats[type]??={owned:[],active:{}};}
 eligible(type,item){const b=this.boat(type),moves=this.data.moves;if(item.base&&!b.owned.includes(item.base))return 'Install '+UPGRADES.find(u=>u.id===item.base).name+' first';for(const [key,n]of Object.entries(item.require||{})){const count=key==='distinct'?Object.keys(this.data.tricks).length:moves[key]||0;if(count<n)return item.goal;}return '';}
 transact(type,id){const item=UPGRADES.find(u=>u.id===id);if(!item)throw Error('Unknown upgrade');const b=this.boat(type);
  if(b.owned.includes(id)){if(b.active[item.slot]===id)delete b.active[item.slot];else b.active[item.slot]=id;this.save();return 'Equipment changed';}
  const locked=this.eligible(type,item);if(locked)throw Error(locked);if(this.data.balance<item.price)throw Error('Earn more trick money first');
  this.data.balance-=item.price;b.owned.push(id);b.active[item.slot]=id;this.save();return item.name+' installed';
 }
 effects(type){const b=this.boat(type),result={power:1,yaw:1,grip:1,damping:1};for(const id of Object.values(b.active)){const item=UPGRADES.find(u=>u.id===id&&b.owned.includes(id));if(item)for(const key of Object.keys(result))result[key]*=item[key]||1;}return result;}
 get status(){return{balance:this.data.balance,earned:this.data.earned,moves:{...this.data.moves},distinct:Object.keys(this.data.tricks).length,saved:this.canSave,account:this.account};}
}
