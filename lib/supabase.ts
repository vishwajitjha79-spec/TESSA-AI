import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Database helpers
export async function saveConversation(userId: string, conversation: any) {
  const { data, error } = await supabase
    .from('conversations')
    .upsert({
      user_id: userId,
      conversation_id: conversation.id,
      title: conversation.title,
      messages: conversation.messages,
      mode: conversation.mode,
      mood_history: conversation.moodHistory,
      updated_at: new Date().toISOString(),
    });
  return { data, error };
}

export async function getConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  return { data, error };
}

export async function deleteConversation(userId: string, conversationId: string) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('user_id', userId)
    .eq('conversation_id', conversationId);
  return { error };
}
