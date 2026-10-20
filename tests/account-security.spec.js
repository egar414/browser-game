import {test,expect} from '@playwright/test';
import {bootAccount} from './online-browser-fixture.js';
import {database,users} from './multiplayer-fixture.js';
test('authenticator enrolment and fresh sign-in require a code before online play',async({page:p})=>{
 test.setTimeout(180000);const f=await database(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await bootAccount(p,f,users[0],'secure@example.test');await p.locator('#mfa-enable').click();await expect(p.locator('#mfa-qr')).toBeVisible();await expect(p.locator('#mfa-secret')).toHaveValue('FIXTURE-ONLY-SECRET');
  await p.locator('#mfa-code').fill('999999');await p.locator('#mfa-verify button').click();await expect(p.locator('#online-message')).toContainText('Invalid authenticator');
  await p.locator('#mfa-code').fill('123456');await p.locator('#mfa-verify button').click();await expect(p.locator('#mfa-status')).toContainText('enabled');await expect(p.locator('#mfa-secret')).toHaveValue('');
  await p.getByRole('button',{name:'SIGN OUT',exact:true}).click();await p.locator('#online-email').fill('secure@example.test');await p.locator('#online-password').fill('Fixture-password-123');await p.locator('#online-account button[type="submit"]').click();
  await expect(p.locator('#mfa-verify')).toBeVisible();await expect(p.getByRole('button',{name:'JOIN PUBLIC WORLD',exact:true})).toBeDisabled();
  await p.locator('#mfa-code').fill('123456');await p.locator('#mfa-verify button').click();await expect(p.getByRole('button',{name:'JOIN PUBLIC WORLD',exact:true})).toBeEnabled();
  await p.getByRole('button',{name:'JOIN PUBLIC WORLD',exact:true}).click();await expect(p.locator('#online-room')).toContainText('PUBLIC WORLD');await p.screenshot({path:'test-results/authenticator-enabled.png'});
  await p.locator('#mfa-disable').click();await expect(p.locator('#mfa-status')).toContainText('Add an authenticator');expect(errors).toEqual([]);
 }finally{await f.db.close();}
});
