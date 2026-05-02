import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function isEnterprisePlan(plan) {
  return String(plan || "").toLowerCase() === "enterprise";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  try {
    const { establishment_id } = req.body || {};

    if (!establishment_id) {
      return res.status(400).json({
        error: "establishment_id é obrigatório."
      });
    }

    const { data: establishment, error: establishmentError } = await supabaseAdmin
      .from("establishments")
      .select("id, name, plan, plan_name, current_plan_name")
      .eq("id", establishment_id)
      .single();

    if (establishmentError || !establishment) {
      return res.status(404).json({
        error: "Estabelecimento não encontrado."
      });
    }

    const plan =
      establishment.current_plan_name ||
      establishment.plan_name ||
      establishment.plan;

    if (!isEnterprisePlan(plan)) {
      return res.status(403).json({
        error: "Integração com iFood disponível apenas para o plano Enterprise."
      });
    }

    const statePayload = {
      provider: "ifood",
      establishment_id,
      created_at: Date.now()
    };

    const encodedState = Buffer
      .from(JSON.stringify(statePayload))
      .toString("base64url");

    await supabaseAdmin
      .from("marketplace_integrations")
      .upsert({
        establishment_id,
        provider: "ifood",
        status: "disconnected",
        error_message: null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "establishment_id,provider"
      });

    const params = new URLSearchParams({
      client_id: process.env.IFOOD_CLIENT_ID,
      response_type: "code",
      redirect_uri: process.env.IFOOD_REDIRECT_URI,
      state: encodedState
    });

    const authorizationUrl = `${process.env.IFOOD_AUTHORIZATION_URL}?${params.toString()}`;

    return res.status(200).json({
      authorization_url: authorizationUrl
    });
  } catch (error) {
    console.error("Erro ao iniciar conexão iFood:", error);

    return res.status(500).json({
      error: "Erro interno ao iniciar conexão com iFood."
    });
  }
}