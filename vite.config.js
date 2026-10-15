import {onlineConfig} from './src/online/settings.js';
import { defineConfig, loadEnv } from 'vite';
export default defineConfig(({mode,command})=>{
  const env=loadEnv(mode,process.cwd(),'VITE_');
  // Refuse privileged keys before they could be embedded into public assets.
  onlineConfig({...env,VITE_SUPABASE_URL:process.env.VITE_SUPABASE_URL||env.VITE_SUPABASE_URL,VITE_SUPABASE_PUBLISHABLE_KEY:process.env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_PUBLISHABLE_KEY,VITE_SUPABASE_ANON_KEY:process.env.VITE_SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY,DEV:command==='serve'});
  return {
  // Relative asset paths work on root domains and GitHub Pages subdirectories.
  base:'./',
  build:{rolldownOptions:{output:{codeSplitting:{groups:[{name:'three',test:/node_modules\/three/}]}}}},
};});
