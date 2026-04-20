// =====================================================
// DOOKI DATA LAYER
// =====================================================

function getSupabaseClient() {
  return window.supabaseClient || window.DookiSupabase?.client || null;
}

function normalizeStore(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name || row.store_name || "Sem nome",
    city: row.city || row.store_city || "-",
    status: row.status || "active",
    email: row.email || null,
    whatsapp: row.whatsapp || row.phone || null,
    phone: row.phone || row.whatsapp || null,
    owner_name: row.owner_name || row.responsible_name || null,
    plan_id: row.plan_id || row.current_plan_id || null,
    plan: row.plan || row.plan_name || row.current_plan_name || null,
    plan_name: row.plan_name || row.current_plan_name || row.plan || null,
    current_plan_id: row.current_plan_id || row.plan_id || null,
    current_plan_name: row.current_plan_name || row.plan_name || row.plan || null,
    logo_url: row.logo_url || row.logo || null,
    banner_url: row.banner_url || row.banner || null,
    code: row.code || row.establishment_code || null,
    created_at: row.created_at || null,
    raw: row
  };
}

function normalizePlan(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name || row.plan_name || "Plano",
    price: Number(
      row.price ??
      row.monthly_price ??
      row.price_monthly ??
      row.valor ??
      row.value ??
      0
    ),
    discount: Number(
      row.discount ??
      row.monthly_discount ??
      row.desconto ??
      0
    ),
    annualPrice: Number(
      row.annual_price ??
      row.annualPrice ??
      row.yearly_price ??
      row.price_yearly ??
      row.valor_anual ??
      0
    ),
    annualDiscount: Number(
      row.annual_discount ??
      row.annualDiscount ??
      row.yearly_discount ??
      row.desconto_anual ??
      0
    ),
    trialDays: Number(
      row.trial_days ??
      row.trialDays ??
      row.trial ??
      row.dias_trial ??
      0
    ),
    description: row.description || row.descricao || "",
    created_at: row.created_at || null,
    raw: row
  };
}

function normalizePayment(row) {
  if (!row) return null;

  return {
    id: row.id,
    establishment_id: row.establishment_id || null,
    establishment_name: row.establishment_name || row.store_name || row.storeName || "Loja",
    direction: row.direction || "charge",
    category: row.category || "Mensalidade",
    amount: Number(row.amount || 0),
    status: row.status || "pending",
    due_date: row.due_date || row.dueDate || null,
    pix_key: row.pix_key || row.pixKey || null,
    notes: row.notes || "",
    created_at: row.created_at || null,
    raw: row
  };
}

function normalizeTicket(row) {
  if (!row) return null;

  return {
    id: row.id,
    establishment_id: row.establishment_id || null,
    storeName: row.store_name || row.establishment_name || row.storeName || "Loja",
    subject: row.subject || "Sem assunto",
    priority: row.priority || "Baixa",
    status: row.status || "aberto",
    assigned_to: row.assigned_to || null,
    closed_at: row.closed_at || null,
    updated_at: row.updated_at || null,
    last_message: row.last_message || null,
    created_at: row.created_at || null,
    raw: row
  };
}

function normalizeMessage(row) {
  if (!row) return null;

  return {
    id: row.id,
    ticket_id: row.ticket_id,
    sender_type: row.sender_type,
    sender_name: row.sender_name || "",
    message: row.message || "",
    created_at: row.created_at || null,
    raw: row
  };
}

function isMissingColumnError(error, columnName) {
  if (!error) return false;
  const message = String(error.message || error.details || error.hint || "").toLowerCase();
  const target = String(columnName || "").toLowerCase();
  return message.includes("column") && message.includes(target);
}

function pickLatestSubscription(subscriptions) {
  if (!Array.isArray(subscriptions) || !subscriptions.length) return null;

  const priority = {
    active: 4,
    trialing: 3,
    trial: 3,
    pending: 2,
    overdue: 1,
    canceled: 0,
    cancelled: 0,
    inactive: 0,
    expired: 0
  };

  return [...subscriptions].sort((a, b) => {
    const scoreA = priority[String(a.status || "").toLowerCase()] ?? -1;
    const scoreB = priority[String(b.status || "").toLowerCase()] ?? -1;
    if (scoreA !== scoreB) return scoreB - scoreA;

    const dateA = new Date(a.updated_at || a.created_at || a.started_at || 0).getTime();
    const dateB = new Date(b.updated_at || b.created_at || b.started_at || 0).getTime();
    return dateB - dateA;
  })[0] || null;
}

async function enrichStoresWithPlans(client, stores, plans) {
  if (!client || !Array.isArray(stores) || !stores.length) return stores || [];

  const establishmentIds = stores.map((store) => store.id).filter(Boolean);
  if (!establishmentIds.length) return stores;

  try {
    const { data, error } = await client
      .from("establishment_subscriptions")
      .select("*")
      .in("establishment_id", establishmentIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const grouped = new Map();
    (data || []).forEach((row) => {
      const key = String(row.establishment_id || "");
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });

    const planNameById = new Map((plans || []).map((plan) => [String(plan.id), plan.name]));

    return stores.map((store) => {
      const subscription = pickLatestSubscription(grouped.get(String(store.id)) || []);
      if (!subscription) return store;

      const planId = subscription.plan_id || store.plan_id || store.current_plan_id || null;
      const planName =
        subscription.plan_name ||
        planNameById.get(String(planId || "")) ||
        store.plan_name ||
        store.current_plan_name ||
        store.plan ||
        null;

      return normalizeStore({
        ...store.raw,
        ...store,
        plan_id: planId,
        current_plan_id: planId,
        plan_name: planName,
        current_plan_name: planName
      });
    });
  } catch (error) {
    console.warn("Não foi possível enriquecer estabelecimentos com assinaturas.", error);
    return stores;
  }
}

async function syncEstablishmentPlan(client, establishmentId, planId) {
  if (!client || !establishmentId) return null;

  try {
    const { data: existingRows, error: existingError } = await client
      .from("establishment_subscriptions")
      .select("id, establishment_id, plan_id, status")
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false });

    if (existingError) throw existingError;

    const existing = pickLatestSubscription(existingRows || []);

    if (existing?.id) {
      const { error: updateError } = await client
        .from("establishment_subscriptions")
        .update({
          plan_id: planId,
          status: existing.status || "active",
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);

      if (updateError) throw updateError;
      return true;
    }

    const { error: insertError } = await client
      .from("establishment_subscriptions")
      .insert([{
        establishment_id: establishmentId,
        plan_id: planId,
        status: "active"
      }]);

    if (insertError) throw insertError;
    return true;
  } catch (error) {
    console.warn("Não foi possível sincronizar assinatura do estabelecimento.", error);
    return null;
  }
}

async function getSnapshot() {
  const client = getSupabaseClient();

  if (!client) {
    console.warn("Supabase não configurado, usando fallback.");
    return {
      establishments: [],
      plans: [],
      orders: [],
      payments: [],
      tickets: []
    };
  }

  try {
    const [
      establishmentsRes,
      plansRes,
      ordersRes,
      paymentsRes,
      ticketsRes
    ] = await Promise.all([
      client.from("establishments").select("*").order("created_at", { ascending: false }),
      client.from("plans").select("*").order("created_at", { ascending: false }),
      client.from("orders").select("*").order("created_at", { ascending: false }),
      client.from("payments").select("*").order("created_at", { ascending: false }),
      client.from("support_tickets").select("*").order("created_at", { ascending: false })
    ]);

    if (establishmentsRes.error) throw establishmentsRes.error;
    if (plansRes.error) throw plansRes.error;
    if (ordersRes.error) throw ordersRes.error;
    if (paymentsRes.error) throw paymentsRes.error;
    if (ticketsRes.error) throw ticketsRes.error;

    const normalizedPlans = (plansRes.data || []).map(normalizePlan);
    const normalizedStores = (establishmentsRes.data || []).map(normalizeStore);
    const enrichedStores = await enrichStoresWithPlans(client, normalizedStores, normalizedPlans);

    return {
      establishments: enrichedStores,
      plans: normalizedPlans,
      orders: ordersRes.data || [],
      payments: (paymentsRes.data || []).map(normalizePayment),
      tickets: (ticketsRes.data || []).map(normalizeTicket)
    };
  } catch (error) {
    console.error("Erro ao carregar snapshot:", error);
    throw error;
  }
}

async function createStore(payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const planId = payload.plan_id || payload.current_plan_id || null;

  const preparedPayload = {
    name: payload.name || "Nova loja",
    city: payload.city || null,
    status: payload.status || "active",
    email: payload.email || null,
    whatsapp: payload.whatsapp || payload.phone || null,
    owner_name: payload.owner_name || null,
    logo_url: payload.logo_url || payload.logoUrl || null,
    banner_url: payload.banner_url || payload.bannerUrl || null,
    ...(planId ? { plan_id: planId } : {})
  };

  let response = await client
    .from("establishments")
    .insert([preparedPayload])
    .select()
    .single();

  if (response.error && isMissingColumnError(response.error, "plan_id")) {
    delete preparedPayload.plan_id;
    response = await client
      .from("establishments")
      .insert([preparedPayload])
      .select()
      .single();
  }

  if (response.error) throw response.error;

  if (planId && response.data?.id) {
    await syncEstablishmentPlan(client, response.data.id, planId);
  }

  return normalizeStore({
    ...response.data,
    plan_id: planId || response.data?.plan_id || null,
    current_plan_id: planId || response.data?.plan_id || null
  });
}

async function updateStore(id, payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const planId = payload.plan_id || payload.current_plan_id || null;

  const preparedPayload = {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.city !== undefined ? { city: payload.city } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.email !== undefined ? { email: payload.email } : {}),
    ...(payload.whatsapp !== undefined ? { whatsapp: payload.whatsapp } : {}),
    ...(payload.phone !== undefined ? { whatsapp: payload.phone } : {}),
    ...(payload.owner_name !== undefined ? { owner_name: payload.owner_name } : {}),
    ...(payload.logo_url !== undefined ? { logo_url: payload.logo_url } : {}),
    ...(payload.logoUrl !== undefined ? { logo_url: payload.logoUrl } : {}),
    ...(payload.banner_url !== undefined ? { banner_url: payload.banner_url } : {}),
    ...(payload.bannerUrl !== undefined ? { banner_url: payload.bannerUrl } : {}),
    ...(payload.plan_id !== undefined ? { plan_id: payload.plan_id } : {})
  };

  let response = await client
    .from("establishments")
    .update(preparedPayload)
    .eq("id", id)
    .select()
    .single();

  if (response.error && isMissingColumnError(response.error, "plan_name")) {
    delete preparedPayload.plan_name;
    response = await client
      .from("establishments")
      .update(preparedPayload)
      .eq("id", id)
      .select()
      .single();
  }

  if (response.error && isMissingColumnError(response.error, "plan_id")) {
    delete preparedPayload.plan_id;
    response = await client
      .from("establishments")
      .update(preparedPayload)
      .eq("id", id)
      .select()
      .single();
  }

  if (response.error) throw response.error;

  if (payload.plan_id !== undefined) {
    await syncEstablishmentPlan(client, id, planId);
  }

  return normalizeStore({
    ...response.data,
    plan_id: planId || response.data?.plan_id || null,
    current_plan_id: planId || response.data?.plan_id || null
  });
}

async function deleteStore(id, options = {}) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const {
    deletedByEmail = null,
    deletedByName = null,
    deleteReason = "Exclusão manual pelo admin",
    deleteOrigin = "admin_portal"
  } = options || {};

  try {
    const { data, error } = await client.rpc("admin_delete_establishment", {
      p_establishment_id: id,
      p_deleted_by_email: deletedByEmail,
      p_deleted_by_name: deletedByName,
      p_delete_reason: deleteReason,
      p_delete_origin: deleteOrigin
    });

    if (error) throw error;

    if (data?.success === false) {
      throw new Error(data.message || "Não foi possível excluir o estabelecimento.");
    }

    return true;
  } catch (rpcError) {
    console.warn("Falha ao excluir via RPC. Tentando fallback manual:", rpcError);

    const { data: existingStore, error: fetchError } = await client
      .from("establishments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingStore) throw new Error("Estabelecimento não encontrado.");

    const { error: auditError } = await client
      .from("deleted_establishments_audit")
      .insert({
        establishment_id: existingStore.id,
        establishment_name: existingStore.name || null,
        establishment_code: existingStore.code || null,
        deleted_by_email: deletedByEmail,
        deleted_by_name: deletedByName,
        delete_reason: deleteReason,
        delete_origin: deleteOrigin,
        snapshot: existingStore
      });

    if (auditError) {
      console.warn("Erro ao salvar auditoria manual:", auditError);
    }

    const { error: deleteError } = await client
      .from("establishments")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return true;
  }
}

async function createPlan(payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const preparedPayload = {
    name: payload.name || "Novo plano",
    price: Number(payload.price || 0),
    discount: Number(payload.discount || 0),
    annual_price: Number(payload.annualPrice || payload.annual_price || 0),
    annual_discount: Number(payload.annualDiscount || payload.annual_discount || 0),
    trial_days: Number(payload.trialDays || payload.trial_days || 0),
    description: payload.description || ""
  };

  const { data, error } = await client
    .from("plans")
    .insert([preparedPayload])
    .select()
    .single();

  if (error) throw error;
  return normalizePlan(data);
}

async function updatePlan(id, payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const preparedPayload = {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.price !== undefined ? { price: Number(payload.price || 0) } : {}),
    ...(payload.discount !== undefined ? { discount: Number(payload.discount || 0) } : {}),
    ...(payload.annualPrice !== undefined ? { annual_price: Number(payload.annualPrice || 0) } : {}),
    ...(payload.annualDiscount !== undefined ? { annual_discount: Number(payload.annualDiscount || 0) } : {}),
    ...(payload.trialDays !== undefined ? { trial_days: Number(payload.trialDays || 0) } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {})
  };

  const { data, error } = await client
    .from("plans")
    .update(preparedPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return normalizePlan(data);
}

async function deletePlan(id) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const { error } = await client
    .from("plans")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

async function createPayment(payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const preparedPayload = {
    establishment_id: payload.establishment_id || payload.storeId || null,
    establishment_name: payload.establishment_name || payload.storeName || null,
    direction: payload.direction || "charge",
    category: payload.category || "Mensalidade",
    amount: Number(payload.amount || 0),
    status: payload.status || "pending",
    due_date: payload.due_date || payload.dueDate || null,
    pix_key: payload.pix_key || payload.pixKey || null,
    notes: payload.notes || ""
  };

  const { data, error } = await client
    .from("payments")
    .insert([preparedPayload])
    .select()
    .single();

  if (error) throw error;
  return normalizePayment(data);
}

async function updatePaymentStatus(id, status) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const { error } = await client
    .from("payments")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
  return true;
}

async function createSupportTicket(payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const preparedPayload = {
    establishment_id: payload.establishment_id || null,
    store_name: payload.storeName || payload.store_name || "Loja",
    subject: payload.subject || "Sem assunto",
    priority: payload.priority || "Baixa",
    status: payload.status || "aberto",
    assigned_to: payload.assigned_to || null,
    last_message: payload.last_message || null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await client
    .from("support_tickets")
    .insert([preparedPayload])
    .select()
    .single();

  if (error) throw error;
  return normalizeTicket(data);
}

async function updateSupportTicket(id, payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const preparedPayload = {
    ...(payload.storeName !== undefined ? { store_name: payload.storeName } : {}),
    ...(payload.subject !== undefined ? { subject: payload.subject } : {}),
    ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.assigned_to !== undefined ? { assigned_to: payload.assigned_to } : {}),
    ...(payload.last_message !== undefined ? { last_message: payload.last_message } : {}),
    updated_at: new Date().toISOString()
  };

  if (payload.status === "fechado" || payload.status === "resolvido") {
    preparedPayload.closed_at = new Date().toISOString();
  }

  const { error } = await client
    .from("support_tickets")
    .update(preparedPayload)
    .eq("id", id);

  if (error) throw error;
  return true;
}

async function getTicketMessages(ticketId) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const { data, error } = await client
    .from("support_ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizeMessage);
}

async function sendTicketMessage(ticketId, payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const preparedPayload = {
    ticket_id: ticketId,
    sender_type: payload.sender_type || "admin",
    sender_name: payload.sender_name || "Admin",
    message: payload.message || ""
  };

  const { data, error } = await client
    .from("support_ticket_messages")
    .insert([preparedPayload])
    .select()
    .single();

  if (error) throw error;

  await updateSupportTicket(ticketId, {
    last_message: payload.message
  });

  return normalizeMessage(data);
}

window.DookiData = {
  getSnapshot,
  createStore,
  createEstablishment: createStore,
  updateStore,
  updateEstablishment: updateStore,
  deleteStore,
  deleteEstablishment: deleteStore,
  createPlan,
  updatePlan,
  deletePlan,
  createPayment,
  updatePaymentStatus,
  createSupportTicket,
  updateSupportTicket,
  getTicketMessages,
  sendTicketMessage
};