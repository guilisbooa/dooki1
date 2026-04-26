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

    const { data: establishment, error: establishmentError } = await supabaseAdmin
      .from("establishments")
      .select("id, name")
      .eq("id", establishment_id)
      .maybeSingle();

    if (establishmentError) throw establishmentError;

    if (!establishment) {
      return res.status(404).json({
        error: "Estabelecimento não encontrado."
      });
    }

    const { data: paymentDb, error: insertError } = await supabaseAdmin
      .from("plan_payments")
      .insert({
        establishment_id,
        plan_name,
        amount,
        status: "pending"
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": paymentDb.id
      },
      body: JSON.stringify({
        transaction_amount: Number(amount),
        description: `Plano Dooki - ${plan_name}`,
        payment_method_id: "pix",
        payer: {
          email: payer_email || "cliente@dooki.online"
        }
      })
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Erro Mercado Pago:", mpData);

      await supabaseAdmin
        .from("plan_payments")
        .update({
          status: "failed"
        })
        .eq("id", paymentDb.id);

      return res.status(400).json({
        error: "Erro ao gerar Pix.",
        details: mpData
      });
    }

    const tx = mpData.point_of_interaction?.transaction_data || {};

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const { error: updateError } = await supabaseAdmin
      .from("plan_payments")
      .update({
        mercado_pago_payment_id: String(mpData.id),
        pix_qr_code: tx.qr_code || null,
        pix_qr_code_base64: tx.qr_code_base64 || null,
        pix_ticket_url: tx.ticket_url || null,
        expires_at: expiresAt.toISOString()
      })
      .eq("id", paymentDb.id);

    if (updateError) throw updateError;

    return res.status(200).json({
      payment_id: paymentDb.id,
      mercado_pago_payment_id: mpData.id,
      amount,
      qr_code: tx.qr_code,
      qr_code_base64: tx.qr_code_base64,
      ticket_url: tx.ticket_url,
      status: mpData.status
    });
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);

    return res.status(500).json({
      error: error.message || "Erro interno."
    });
  }
}