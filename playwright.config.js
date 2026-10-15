import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests',testMatch:'**/*.spec.js',workers:1,timeout:90000,
  use:{baseURL:'http://127.0.0.1:5173',viewport:{width:1280,height:800},headless:true,
    launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']},
  },
  webServer:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:true},
});
