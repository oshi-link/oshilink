import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data;
}
