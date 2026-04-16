// =====================================================
// DOOKI DATA LAYER (Supabase + Fallback)
// =====================================================

function getSupabaseClient() {
  return window.supabaseClient || null;
}

// =====================================================
// SNAPSHOT (carrega tudo)
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
      establishments,
      plans,
      orders,
      payments,
      tickets
    ] = await Promise.all([
      client.from("establishments").select("*"),
      client.from("plans").select("*"),
      client.from("orders").select("*"),
      client.from("payments").select("*"),
      client.from("support_tickets").select("*")
    ]);

    return {
      establishments: establishments.data || [],
      plans: plans.data || [],
      orders: orders.data || [],
      payments: payments.data || [],
      tickets: tickets.data || []
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

  const { data, error } = await client
    .from("establishments")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateStore(id, payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const { data, error } = await client
    .from("establishments")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// 🔥 EXCLUSÃO COM AUDITORIA (CORRIGIDA)
// =====================================================

async function deleteStore(id, options = {}) {
  const client = getSupabaseClient();

  if (!client) {
    console.warn("Sem Supabase - exclusão local ignorada");
    return true;
  }

  const {
    deletedByEmail = null,
    deletedByName = null,
    deleteReason = "Exclusão manual pelo admin",
    deleteOrigin = "admin_portal"
  } = options || {};

  try {
    // tenta RPC
    const { data, error } = await client.rpc("admin_delete_establishment", {
      p_establishment_id: id,
      p_deleted_by_email: deletedByEmail,
      p_deleted_by_name: deletedByName,
      p_delete_reason: deleteReason,
      p_delete_origin: deleteOrigin
    });

    if (error) throw error;

    if (data?.success === false) {
      throw new Error(data.message);
    }

    return true;
  } catch (rpcError) {
    console.warn("Fallback delete:", rpcError);

    // busca loja
    const { data: store, error: fetchError } = await client
      .from("establishments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!store) throw new Error("Estabelecimento não encontrado.");

    // auditoria manual
    const { error: auditError } = await client
      .from("deleted_establishments_audit")
      .insert({
        establishment_id: store.id,
        establishment_name: store.name || null,
        establishment_code: store.code || null,
        deleted_by_email: deletedByEmail,
        deleted_by_name: deletedByName,
        delete_reason: deleteReason,
        delete_origin: deleteOrigin,
        snapshot: store
      });

    if (auditError) {
      console.warn("Erro auditoria:", auditError);
    }

    // delete real
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