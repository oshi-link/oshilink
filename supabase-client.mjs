import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';

const SUPABASE_URL='https://zoprqzivoqpfylujdaun.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_3jd1bZmi1ac3OkOfww4uUQ_iQsuA9W0';

export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true
  }
});
