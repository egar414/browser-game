import {createClient} from '@supabase/supabase-js';
import {onlineConfig} from './settings.js';
export {onlineConfig} from './settings.js';
export function onlineClient(){const config=onlineConfig(import.meta.env);return config?createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},realtime:{params:{eventsPerSecond:12}}}):null;}
