// =====================================================
// DOOKI DATA LAYER
// =====================================================

function getSupabaseClient() {
  return window.supabaseClient || window.DookiSupabase?.client || null;
}

// =====================================================
// SNAPSHOT
// =====================================================

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
      establishments: establishmentsRes.data || [],
      plans: plansRes.data || [],
      orders: ordersRes.data || [],
      payments: paymentsRes.data || [],
      tickets: ticketsRes.data || []
    };
  } catch (error) {
    console.error("Erro ao carregar snapshot:", error);
    throw error;
  }
}

// =====================================================
// ESTABELECIMENTOS
// =====================================================

async function createStore(payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const preparedPayload = {
    name: payload.name || "Nova loja",
    city: payload.city || null,
    status: payload.status || "active",
    email: payload.email || null,
    whatsapp: payload.whatsapp || null,
    plan: payload.plan || null,
    logo_url: payload.logo_url || null,
    banner_url: payload.banner_url || null,
    created_at: payload.created_at || new Date().toISOString()
  };

  const { data, error } = await client
    .from("establishments")
    .insert([preparedPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateStore(id, payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const preparedPayload = {
    ...payload
  };

  const { data, error } = await client
    .from("establishments")
    .update(preparedPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteStore(id, options = {}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase não configurado.");
  }

  const {
    deletedByEmail = null,
    deletedByName = null,
    deleteReason = "Exclusão manual pelo admin",
    deleteOrigin = "admin_portal"
  } = options || {};

  // 1) tenta excluir usando a função RPC
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

    // 2) fallback: busca a loja
    const { data: existingStore, error: fetchError } = await client
      .from("establishments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingStore) throw new Error("Estabelecimento não encontrado.");

    // 3) tenta gravar auditoria
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

    // 4) exclui da tabela principal
    const { error: deleteError } = await client
      .from("establishments")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return true;
  }
}

// =====================================================
// PLANOS
// =====================================================

async function createPlan(payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const { data, error } = await client
    .from("plans")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updatePlan(id, payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const { data, error } = await client
    .from("plans")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
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

// =====================================================
// PEDIDOS
// =====================================================

async function createOrder(payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const { data, error } = await client
    .from("orders")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateOrderStatus(id, status) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const { error } = await client
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
  return true;
}

// =====================================================
// PAGAMENTOS
// =====================================================

async function createPayment(payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const { data, error } = await client
    .from("payments")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
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

// =====================================================
// SUPORTE
// =====================================================

async function createSupportTicket(payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const { data, error } = await client
    .from("support_tickets")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateSupportTicket(id, payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const { error } = await client
    .from("support_tickets")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
  return true;
}

// =====================================================
// EXPORT GLOBAL
// =====================================================

window.DookiData = {
  getSnapshot,
  createStore,
  updateStore,
  deleteStore,
  createPlan,
  updatePlan,
  deletePlan,
  createOrder,
  updateOrderStatus,
  createPayment,
  updatePaymentStatus,
  createSupportTicket,
  updateSupportTicket
};