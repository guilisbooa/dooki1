(() => {
  const SUPABASE_URL = "https://lvnhwtmdpzwjfjktkmtd.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_OcPB-sa5X56hJoCLfttj_Q_V1vEsHjy";

  if (!window.supabase?.createClient) {
    console.error("SDK do Supabase não carregado.");

    window.DookiSupabase = {
      client: null,
      enabled: false,
      warning: "SDK do Supabase nao carregado."
    };

    window.supabaseClient = null;
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    }
  );

  window.DookiSupabase = {
    url: SUPABASE_URL,
    client,
    enabled: true
  };

  window.supabaseClient = client;

  console.log("Supabase conectado com sucesso.");
})();