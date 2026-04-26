import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PLAN_PRICES = {
  standard: 29.9,
  standart: 29.9,
  premium: 49.9,
  enterprise: 79.9
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { establishment_id, plan_name, payer_email } = req.body || {};

    if (!establishment_id || !plan_name) {
      return res.status(400).json({ error: "Dados obrigatórios ausentes." });
    }

    const planKey = String(plan_name).toLowerCase();
    const amount = PLAN_PRICES[planKey];

    if (!amount) {
      return res.status(400).json({ error: "Plano inválido." });
    }

    // salva no banco
    const { data: paymentDb, error } = await supabaseAdmin
      .from("plan_payments")
      .insert({
        establishment_id,
        plan_name,
        amount,
        status: "pending"
      })
      .select()
      .single();

    if (error) throw error;

    // CRIA CHECKOUT PRO
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [
          {
            title: `Plano Dooki - ${plan_name}`,
            quantity: 1,
            unit_price: Number(amount)
          }
        ],
        payer: {
          email: payer_email || "cliente@dooki.online"
        },
        external_reference: paymentDb.id,
        notification_url: "https://www.dooki.online/api/mercadopago-webhook",
        back_urls: {
          success: "https://www.dooki.online/success",
          failure: "https://www.dooki.online/failure",
          pending: "https://www.dooki.online/pending"
        },
        auto_return: "approved"
      })
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error(mpData);
      return res.status(400).json({
        error: "Erro ao criar pagamento",
        details: mpData
      });
    }

    // salva link
    await supabaseAdmin
      .from("plan_payments")
      .update({
        mercado_pago_preference_id: mpData.id,
        checkout_url: mpData.init_point
      })
      .eq("id", paymentDb.id);

    return res.status(200).json({
      checkout_url: mpData.init_point
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message
    });
  }
}