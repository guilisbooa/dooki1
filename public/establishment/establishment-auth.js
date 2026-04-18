(function () {
  function getClient() {
    if (!window.supabaseClient) {
      throw new Error("Supabase não configurado.");
    }
    return window.supabaseClient;
  }

  async function getSession() {
    const client = getClient();
    const { data, error } = await client.auth.getSession();

    if (error) {
      console.error("Erro ao obter sessão:", error);
      return null;
    }

    return data?.session || null;
  }

  async function getUser() {
    const session = await getSession();

    if (!session?.user) {
      return null;
    }

    return session.user;
  }

  async function getMembershipByUserId(userId) {
    const client = getClient();

    const { data, error } = await client
      .from("establishment_users")
      .select("*")
      .eq("auth_user_id", userId)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar vínculo do estabelecimento:", error);
      throw error;
    }

    return data || null;
  }

  async function getCurrentContext() {
    const user = await getUser();

    if (!user) {
      return { user: null, membership: null };
    }

    const membership = await getMembershipByUserId(user.id);
    return { user, membership };
  }

  async function signIn(email, password) {
    const client = getClient();

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const user = data?.user || data?.session?.user || null;

    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    const membership = await getMembershipByUserId(user.id);

    if (!membership) {
      await client.auth.signOut();
      throw new Error("Seu usuário não está vinculado a um estabelecimento ativo.");
    }

    localStorage.setItem(
      "dooki-establishment-session",
      JSON.stringify({
        userId: user.id,
        email: user.email,
        establishmentId: membership.establishment_id,
        role: membership.role || "owner"
      })
    );

    return { user, membership };
  }

  async function signOut() {
    const client = getClient();
    localStorage.removeItem("dooki-establishment-session");
    await client.auth.signOut();
  }

  async function requireAuth() {
    const context = await getCurrentContext();

    if (!context.user || !context.membership) {
      localStorage.removeItem("dooki-establishment-session");
      window.location.href = "/establishment/establishment-login.html";
      return null;
    }

    return context;
  }

  window.EstablishmentAuth = {
    getSession,
    getUser,
    getMembershipByUserId,
    getCurrentContext,
    signIn,
    signOut,
    requireAuth
  };
})();