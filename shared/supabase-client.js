import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const SUPABASE_URL = 'https://lvnhwtmdpzwjfjktkmtd.supabase.co'
const SUPABASE_ANON_KEY = '"sb_publishable_OcPB-sa5X56hJoCLfttj_Q_V1vEsHjy'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)