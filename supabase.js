import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const config = window.OSHILINK_CONFIG;

if (!config?.SUPABASE_URL || !config?.SUPABASE_ANON_KEY) {
  throw new Error('supabase-config.js が未設定です。supabase-config.example.js をコピーして値を設定してください。');
}

export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}
