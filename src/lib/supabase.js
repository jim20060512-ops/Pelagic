import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = url && key ? createClient(url, key) : null

export function requireSupabase() {
  if (!supabase) throw new Error('尚未設定 Supabase。請建立 .env 並填入 VITE_SUPABASE_URL 與 VITE_SUPABASE_PUBLISHABLE_KEY。')
  return supabase
}
