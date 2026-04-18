import { createClient } from '@supabase/supabase-js';
import { ConversationTurn, JarvisResponse } from '../../../shared/types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function saveConversation(
  userText: string,
  jarvisRes: JarvisResponse
): Promise<void> {
  await supabase.from('conversations').insert({
    user_text: userText,
    jarvis_text: jarvisRes.response,
    intent: jarvisRes.intent,
    actions: jarvisRes.actions,
  });
}

export async function getRecentHistory(limit = 10): Promise<ConversationTurn[]> {
  const { data } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).reverse() as ConversationTurn[];
}

export async function setMemoryKey(key: string, value: unknown): Promise<void> {
  await supabase
    .from('memory')
    .upsert({ key, value }, { onConflict: 'key' });
}

export async function getMemoryKey(key: string): Promise<unknown | null> {
  const { data } = await supabase
    .from('memory')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  return data?.value ?? null;
}
