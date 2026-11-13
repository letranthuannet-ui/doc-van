import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

export function db(): SupabaseClient {
  if (!supabase) throw new Error('Chưa cấu hình Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  return supabase;
}

export const audioUrl = (path?: string | null) =>
  path && supabase ? supabase.storage.from('audio').getPublicUrl(path).data.publicUrl : null;

export const classLink = (code: string) => `${location.origin}${location.pathname}#/lop/${code}`;
