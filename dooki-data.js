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
    plan: row.plan || row.plan_name || null,
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
    created_at: row.created_at || null,
    raw: row
  };
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

    return {
      establishments: (establishmentsRes.data || []).map(normalizeStore),
      plans: (plansRes.data || []).map(normalizePlan),
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

  const preparedPayload = {
    name: payload.name || "Nova loja",
    city: payload.city || null,
    status: payload.status || "active",
    email: payload.email || null,
    whatsapp: payload.whatsapp || payload.phone || null,
    plan: payload.plan || null,
    logo_url: payload.logo_url || payload.logoUrl || null,
    banner_url: payload.banner_url || payload.bannerUrl || null
  };

  const { data, error } = await client
    .from("establishments")
    .insert([preparedPayload])
    .select()
    .single();

  if (error) throw error;
  return normalizeStore(data);
}

async function updateStore(id, payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const preparedPayload = {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.city !== undefined ? { city: payload.city } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.email !== undefined ? { email: payload.email } : {}),
    ...(payload.whatsapp !== undefined ? { whatsapp: payload.whatsapp } : {}),
    ...(payload.phone !== undefined ? { whatsapp: payload.phone } : {}),
    ...(payload.plan !== undefined ? { plan: payload.plan } : {}),
    ...(payload.logo_url !== undefined ? { logo_url: payload.logo_url } : {}),
    ...(payload.logoUrl !== undefined ? { logo_url: payload.logoUrl } : {}),
    ...(payload.banner_url !== undefined ? { banner_url: payload.banner_url } : {}),
    ...(payload.bannerUrl !== undefined ? { banner_url: payload.bannerUrl } : {})
  };

  const { data, error } = await client
    .from("establishments")
    .update(preparedPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return normalizeStore(data);
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
    status: payload.status || "aberto"
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
    ...(payload.status !== undefined ? { status: payload.status } : {})
  };

  const { error } = await client
    .from("support_tickets")
    .update(preparedPayload)
    .eq("id", id);

  if (error) throw error;
  return true;
}

window.DookiData = {
  getSnapshot,
  createStore,
  updateStore,
  deleteStore,
  createPlan,
  updatePlan,
  deletePlan,
  createPayment,
  updatePaymentStatus,
  createSupportTicket,
  updateSupportTicket
};