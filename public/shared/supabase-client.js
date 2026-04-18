(function () {
  const SUPABASE_URL = "https://lvnhwtmdpzwjfjktkmtd.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_OcPB-sa5X56hJoCLfttj_Q_V1vEsHjy";

  if (!window.supabase) {
    console.error("Supabase JS não carregado.");
    return;
  }

  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
})();