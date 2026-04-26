import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const paymentId =
      req.query?.id ||
      req.query?.["data.id"] ||
      req.body?.data?.id ||
      req.body?.id;

    const type = req.query?.type || req.body?.type;

    if (!paymentId || (type && type !== "payment")) {
      return res.status(200).json({ ok: true });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    });

    const payment = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Erro ao consultar pagamento MP:", payment);
      return res.status(200).json({ ok: true });
    }

    const localPaymentId = payment.external_reference;
    if (!localPaymentId) return res.status(200).json({ ok: true });

    const { data: localPayment } = await supabaseAdmin
      .from("plan_payments")
      .select("*")
      .eq("id", localPaymentId)
      .maybeSingle();

    if (!localPayment) return res.status(200).json({ ok: true });

    if (payment.status === "approved") {
      const now = new Date();
      const nextDueDate = new Date();
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      await supabaseAdmin
        .from("plan_payments")
        .update({
          status: "paid",
          mercado_pago_payment_id: String(payment.id),
          paid_at: now.toISOString()
        })
        .eq("id", localPaymentId);

      await supabaseAdmin
        .from("establishment_subscriptions")
        .update({
          status: "active",
          payment_status: "paid",
          next_due_date: nextDueDate.toISOString(),
          blocked_at: null
        })
        .eq("establishment_id", localPayment.establishment_id);

      await supabaseAdmin
        .from("establishments")
        .update({
          status: "active"
        })
        .eq("id", localPayment.establishment_id);
    }

    if (["rejected", "cancelled", "expired"].includes(payment.status)) {
      await supabaseAdmin
        .from("plan_payments")
        .update({
          status: payment.status
        })
        .eq("id", localPaymentId);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Erro webhook MP:", error);
    return res.status(200).json({ ok: true });
  }
}