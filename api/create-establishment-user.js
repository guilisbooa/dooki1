import { createClient } from "@supabase/supabase-js";

function send(res, status, payload) {
  res.status(status).json(payload);
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, {
      error: "Método não permitido. Use POST."
    });
  }

  try {
    const supabaseUrl = getSupabaseUrl();
    const serviceRoleKey = getServiceRoleKey();

    if (!supabaseUrl) {
      return send(res, 500, {
        error: "SUPABASE_URL não configurada no Vercel."
      });
    }

    if (!serviceRoleKey) {
      return send(res, 500, {
        error: "SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel."
      });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return send(res, 401, {
        error: "Token admin não enviado."
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    const adminUser = userData?.user;

    if (userError || !adminUser) {
      return send(res, 401, {
        error: userError?.message || "Sessão admin inválida."
      });
    }

    const { data: profile, error: profileError } = await adminClient
      .from("admin_profiles")
      .select("id, is_active")
      .eq("id", adminUser.id)
      .eq("is_active", true)
      .maybeSingle();

    if (profileError) {
      return send(res, 500, {
        error: `Erro ao validar admin: ${profileError.message}`
      });
    }

    if (!profile) {
      return send(res, 403, {
        error: "Usuário sem permissão de admin em admin_profiles."
      });
    }

    const body = req.body || {};
    const establishmentId = String(body.establishment_id || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const name = String(body.name || "").trim();

    if (!establishmentId) {
      return send(res, 400, {
        error: "ID do estabelecimento não informado."
      });
    }

    if (!email) {
      return send(res, 400, {
        error: "Email do usuário não informado."
      });
    }

    if (!password || password.length < 6) {
      return send(res, 400, {
        error: "A senha precisa ter pelo menos 6 caracteres."
      });
    }

    const { data: store, error: storeError } = await adminClient
      .from("establishments")
      .select("id, name, email")
      .eq("id", establishmentId)
      .maybeSingle();

    if (storeError) {
      return send(res, 500, {
        error: `Erro ao buscar estabelecimento: ${storeError.message}`
      });
    }

    if (!store) {
      return send(res, 404, {
        error: "Estabelecimento não encontrado após cadastro."
      });
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || store.name || email,
        establishment_id: establishmentId,
        role: "owner"
      }
    });

    if (createError) {
      return send(res, 400, {
        error: `Erro ao criar usuário no Auth: ${createError.message}`
      });
    }

    const authUser = created?.user;

    if (!authUser?.id) {
      return send(res, 500, {
        error: "Usuário criado no Auth, mas sem ID retornado."
      });
    }

    const { error: membershipError } = await adminClient
      .from("establishment_users")
      .insert([{
        auth_user_id: authUser.id,
        establishment_id: establishmentId,
        role: "owner",
        active: true
      }]);

    if (membershipError) {
      await adminClient.auth.admin.deleteUser(authUser.id);

      return send(res, 400, {
        error: `Erro ao vincular usuário à loja em establishment_users: ${membershipError.message}`
      });
    }

    return send(res, 200, {
      ok: true,
      user: {
        id: authUser.id,
        email: authUser.email
      },
      establishment_id: establishmentId
    });
  } catch (error) {
    console.error("create-establishment-user fatal:", error);

    return send(res, 500, {
      error: error?.message || "Erro interno ao criar usuário."
    });
  }
}
