// Auth service — shared with website's auth.js pattern
import { supabase } from './supabase.js';

let cachedUser = null;
let lastFetch = 0;

export async function getUser() {
  const now = Date.now();
  if (cachedUser && (now - lastFetch < 1000)) return cachedUser;
  const { data } = await supabase.auth.getSession();
  cachedUser = data?.session?.user ?? null;
  lastFetch = now;
  return cachedUser;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    cachedUser = session?.user ?? null;
    lastFetch = Date.now();
    callback(session?.user ?? null);
  });
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  cachedUser = data?.user ?? null;
  lastFetch = Date.now();
  return data;
}

export async function signUp(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || email.split('@')[0],
        username: email.split('@')[0]
      }
    }
  });
  if (error) throw error;
  cachedUser = data?.user ?? null;
  lastFetch = Date.now();
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  cachedUser = null;
  lastFetch = 0;
  if (error) console.error("Signout error:", error);
}

export async function getUserProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
  return data;
}

export async function updateUserProfile(profileData) {
  const user = await getUser();
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      ...profileData,
      updated_at: new Date().toISOString()
    });
    
  if (error) throw error;
  return data;
}
