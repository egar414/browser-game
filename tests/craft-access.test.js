import test from 'node:test';import assert from 'node:assert/strict';
import {canDriveCraft,availableCraft} from '../src/systems/craft-access.js';
import {makeVehicle} from '../src/vehicles/models.js';
import {packPose,RemoteStates} from '../src/systems/network-state.js';
test('Apex requires a verified Creator flag, while ordinary boats remain available',()=>{
 for(const role of[false,undefined,'true',1]){assert(!canDriveCraft('hyper',role));assert.equal(availableCraft('hyper',role),'ski');}
 assert(canDriveCraft('hyper',true));for(const type of['ski','cat','tinny','cruiser','seago','racer'])assert(canDriveCraft(type,false));assert(!canDriveCraft('unknown',true));
 const regular=makeVehicle('hyper','#b9b49b');assert.equal(regular.userData.modelSource,'standard-spark');const apex=makeVehicle('hyper','#b9b49b','classic',{creator:true});assert.notEqual(apex.userData.modelSource,'standard-spark');
});
test('normal accounts cannot advertise Apex; remote owners are visible and revocation removes their Apex',()=>{
 const v={type:'hyper',drive:{}},settings={colour:0,design:'classic'},deck={};assert.equal(packPose(v,settings,deck,true).type,'ski');settings.creatorAccess=true;const pose=packPose(v,settings,deck,true);assert.equal(pose.type,'hyper');const remote=new RemoteStates();
 remote.accept([{id:'a',name:'Ewan',seq:1,creator:false,pose}],null,0);assert.equal(remote.players.size,0);
 remote.accept([{id:'a',name:'Ewan',seq:2,creator:true,pose}],null,10);assert.equal(remote.players.size,1);
 remote.accept([{id:'a',name:'Ewan',seq:3,creator:false,pose}],null,20);assert.equal(remote.players.size,0);
});
