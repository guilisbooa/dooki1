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
    plan_id: row.plan_id || row.current_plan_id || null,
    plan: row.plan || row.plan_name || row.current_plan_name || null,
    plan_name: row.plan_name || row.current_plan_name || row.plan || null,
    current_plan_name: row.current_plan_name || row.plan_name || row.plan || null,
    current_plan_id: row.current_plan_id || row.plan_id || null,
    logo_url: row.logo_url || row.logo || null,
    banner_url: row.banner_url || row.banner || null,
    description: row.description || "",
    code: row.code || row.establishment_code || null,
    created_at: row.created_at || null,
    raw: row
  };
}


async function getPlanRecordById(planId) {
  const client = getSupabaseClient();
  if (!client || !planId) return null;

  const { data, error } = await client
    .from("plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function syncEstablishmentSubscription(establishmentId, planId, planRow = null) {
  const client = getSupabaseClient();
  if (!client || !establishmentId || !planId) return null;

  const resolvedPlan = planRow || await getPlanRecordById(planId);
  const commissionPercent = Number(
    resolvedPlan?.commission_percent ??
    resolvedPlan?.commission ??
    resolvedPlan?.commission_rate ??
    0
  );
  const watermarkEnabled = resolvedPlan?.watermark_enabled ?? resolvedPlan?.watermarkEnabled ?? true;
  const supportLevel = resolvedPlan?.support_level || resolvedPlan?.supportLevel || "ticket";

  const subscriptionPayload = {
    plan_id: planId,
    status: "active",
    started_at: new Date().toISOString(),
    expires_at: null,
    commission_percent_snapshot: commissionPercent,
    watermark_enabled_snapshot: watermarkEnabled,
    support_level_snapshot: supportLevel
  };

  const { data: activeRow, error: activeError } = await client
    .from("establishment_subscriptions")
    .select("id")
    .eq("establishment_id", establishmentId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeError) throw activeError;

  if (activeRow?.id) {
    const { data, error } = await client
      .from("establishment_subscriptions")
      .update(subscriptionPayload)
      .eq("id", activeRow.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  const { error: deactivateError } = await client
    .from("establishment_subscriptions")
    .update({ status: "inactive" })
    .eq("establishment_id", establishmentId)
    .neq("status", "inactive");

  if (deactivateError) throw deactivateError;

  const { data, error } = await client
    .from("establishment_subscriptions")
    .insert([{ establishment_id: establishmentId, ...subscriptionPayload }])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data || null;
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
    logo_url: payload.logo_url || payload.logoUrl || null,
    banner_url: payload.banner_url || payload.bannerUrl || null
  };

  if (payload.plan_id !== undefined) {
    preparedPayload.plan_id = payload.plan_id || null;
  }

  if (payload.plan || payload.plan_name) {
    preparedPayload.plan_name = payload.plan_name || payload.plan;
  }

  let { data, error } = await client
    .from("establishments")
    .insert([preparedPayload])
    .select()
    .single();

  if (error) throw error;

  if (preparedPayload.plan_id) {
    const planRow = await getPlanRecordById(preparedPayload.plan_id);

    if (planRow?.name) {
      const { data: syncedStore, error: syncStoreError } = await client
        .from("establishments")
        .update({ plan_name: planRow.name })
        .eq("id", data.id)
        .select()
        .single();

      if (syncStoreError) throw syncStoreError;
      data = syncedStore;
    }

    await syncEstablishmentSubscription(data.id, preparedPayload.plan_id, planRow);
  }

  return normalizeStore(data);
}

async function updateStore(id, payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const { data: existingStore, error: existingError } = await client
    .from("establishments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (existingError) throw existingError;

  const preparedPayload = {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.city !== undefined ? { city: payload.city } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.email !== undefined ? { email: payload.email } : {}),
    ...(payload.whatsapp !== undefined ? { whatsapp: payload.whatsapp } : {}),
    ...(payload.phone !== undefined ? { whatsapp: payload.phone } : {}),
    ...(payload.logo_url !== undefined ? { logo_url: payload.logo_url } : {}),
    ...(payload.logoUrl !== undefined ? { logo_url: payload.logoUrl } : {}),
    ...(payload.banner_url !== undefined ? { banner_url: payload.banner_url } : {}),
    ...(payload.bannerUrl !== undefined ? { banner_url: payload.bannerUrl } : {})
  };

  if (payload.plan_id !== undefined) {
    preparedPayload.plan_id = payload.plan_id || null;
  }

  if (payload.plan !== undefined || payload.plan_name !== undefined) {
    preparedPayload.plan_name = payload.plan_name || payload.plan || null;
  }

  if (Object.prototype.hasOwnProperty.call(existingStore || {}, "phone") && payload.phone !== undefined) {
    preparedPayload.phone = payload.phone || null;
  }

  let resolvedPlan = null;

  if (payload.plan_id) {
    resolvedPlan = await getPlanRecordById(payload.plan_id);
    const resolvedPlanName = resolvedPlan?.name || payload.plan_name || payload.plan || null;

    if (resolvedPlanName) {
      preparedPayload.plan_name = resolvedPlanName;

      if (Object.prototype.hasOwnProperty.call(existingStore || {}, "plan")) {
        preparedPayload.plan = resolvedPlanName;
      }

      if (Object.prototype.hasOwnProperty.call(existingStore || {}, "current_plan_name")) {
        preparedPayload.current_plan_name = resolvedPlanName;
      }
    }

    if (Object.prototype.hasOwnProperty.call(existingStore || {}, "current_plan_id")) {
      preparedPayload.current_plan_id = payload.plan_id;
    }
  } else if (payload.plan_id === null || payload.plan_id === "") {
    preparedPayload.plan_name = null;

    if (Object.prototype.hasOwnProperty.call(existingStore || {}, "plan")) {
      preparedPayload.plan = null;
    }

    if (Object.prototype.hasOwnProperty.call(existingStore || {}, "current_plan_name")) {
      preparedPayload.current_plan_name = null;
    }

    if (Object.prototype.hasOwnProperty.call(existingStore || {}, "current_plan_id")) {
      preparedPayload.current_plan_id = null;
    }
  }

  let { data, error } = await client
    .from("establishments")
    .update(preparedPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  if (payload.plan_id !== undefined) {
    if (payload.plan_id) {
      await syncEstablishmentSubscription(id, payload.plan_id, resolvedPlan);
    } else {
      const { error: subscriptionError } = await client
        .from("establishment_subscriptions")
        .update({ status: "inactive" })
        .eq("establishment_id", id)
        .neq("status", "inactive");

      if (subscriptionError) throw subscriptionError;
    }
  }

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


function normalizeCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    establishment_id: row.establishment_id || null,
    name: row.name || "Categoria",
    description: row.description || "",
    sort_order: Number(row.sort_order || 0),
    active: row.active !== false,
    created_at: row.created_at || null,
    raw: row
  };
}

function normalizeProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    establishment_id: row.establishment_id || null,
    category_id: row.category_id || null,
    name: row.name || "Produto",
    description: row.description || "",
    sale_price: Number(row.sale_price ?? row.price ?? 0),
    price: Number(row.price ?? row.sale_price ?? 0),
    cost_price: Number(row.cost_price || 0),
    stock_quantity: Number(row.stock_quantity || 0),
    stock_min_quantity: Number(row.stock_min_quantity || 0),
    active: row.active ?? row.is_active ?? true,
    is_active: row.is_active ?? row.active ?? true,
    image_url: row.image_url || "",
    created_at: row.created_at || null,
    raw: row
  };
}

function shouldRetryLegacyColumn(error, columnNames) {
  const message = String(error?.message || error?.details || "");
  return columnNames.some(function (column) {
    return message.includes(column);
  });
}

async function createCategory(payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const attempt = await client
    .from("categories")
    .insert([{
      establishment_id: payload.establishment_id,
      name: payload.name,
      description: payload.description || "",
      active: payload.active !== false,
      sort_order: Number(payload.sort_order || 0)
    }])
    .select()
    .single();

  if (attempt.error && shouldRetryLegacyColumn(attempt.error, ["sort_order", "active", "description"])) {
    const fallback = await client
      .from("categories")
      .insert([{
        establishment_id: payload.establishment_id,
        name: payload.name
      }])
      .select()
      .single();

    if (fallback.error) {
      if (String(fallback.error.message || "").includes("categories_establishment_id_name_key")) {
        throw new Error("Já existe uma categoria com esse nome na sua loja.");
      }
      throw fallback.error;
    }

    return normalizeCategory(fallback.data);
  }

  if (attempt.error) {
    if (String(attempt.error.message || "").includes("categories_establishment_id_name_key")) {
      throw new Error("Já existe uma categoria com esse nome na sua loja.");
    }
    throw attempt.error;
  }

  return normalizeCategory(attempt.data);
}

async function updateCategory(id, payload, establishmentId = null) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const prepared = {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.active !== undefined ? { active: payload.active } : {}),
    ...(payload.sort_order !== undefined ? { sort_order: Number(payload.sort_order || 0) } : {})
  };

  let query = client.from("categories").update(prepared).eq("id", id);
  if (establishmentId) query = query.eq("establishment_id", establishmentId);
  let result = await query.select().single();

  if (result.error && shouldRetryLegacyColumn(result.error, ["sort_order", "active", "description"])) {
    const fallbackPrepared = {
      ...(payload.name !== undefined ? { name: payload.name } : {})
    };
    let fallbackQuery = client.from("categories").update(fallbackPrepared).eq("id", id);
    if (establishmentId) fallbackQuery = fallbackQuery.eq("establishment_id", establishmentId);
    result = await fallbackQuery.select().single();
  }

  if (result.error) throw result.error;
  return normalizeCategory(result.data);
}

async function deleteCategory(id, establishmentId = null) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  let query = client.from("categories").delete().eq("id", id);
  if (establishmentId) query = query.eq("establishment_id", establishmentId);
  const { error } = await query;
  if (error) throw error;
  return true;
}

async function createProduct(payload, categories = []) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const categoryName = categories.find(function (item) {
    return String(item.id) === String(payload.category_id || "");
  })?.name || "Categoria";

  const modernPayload = {
    establishment_id: payload.establishment_id,
    category_id: payload.category_id || null,
    name: payload.name,
    description: payload.description || "",
    sale_price: Number(payload.sale_price || 0),
    cost_price: Number(payload.cost_price || 0),
    stock_quantity: Number(payload.stock_quantity || 0),
    stock_min_quantity: Number(payload.stock_min_quantity || 0),
    active: payload.active !== false
  };

  let result = await client.from("products").insert([modernPayload]).select().single();

  if (result.error && shouldRetryLegacyColumn(result.error, ["sale_price", "cost_price", "stock_quantity", "stock_min_quantity", "active", "category_id"])) {
    const legacyPayload = {
      establishment_id: payload.establishment_id,
      name: payload.name,
      category: categoryName,
      description: payload.description || "",
      price: Number(payload.sale_price || 0),
      is_active: payload.active !== false
    };

    result = await client.from("products").insert([legacyPayload]).select().single();
  }

  if (result.error) throw result.error;
  return normalizeProduct(result.data);
}

async function updateProduct(id, payload, categories = []) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  const categoryName = categories.find(function (item) {
    return String(item.id) === String(payload.category_id || "");
  })?.name || "Categoria";

  const prepared = {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.category_id !== undefined ? { category_id: payload.category_id || null } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.sale_price !== undefined ? { sale_price: Number(payload.sale_price || 0) } : {}),
    ...(payload.cost_price !== undefined ? { cost_price: Number(payload.cost_price || 0) } : {}),
    ...(payload.stock_quantity !== undefined ? { stock_quantity: Number(payload.stock_quantity || 0) } : {}),
    ...(payload.stock_min_quantity !== undefined ? { stock_min_quantity: Number(payload.stock_min_quantity || 0) } : {}),
    ...(payload.active !== undefined ? { active: payload.active } : {})
  };

  let query = client
    .from("products")
    .update(prepared)
    .eq("id", id);

  if (payload.establishment_id) {
    query = query.eq("establishment_id", payload.establishment_id);
  }

  let result = await query.select().single();

  if (result.error && shouldRetryLegacyColumn(result.error, ["sale_price", "cost_price", "stock_quantity", "stock_min_quantity", "active", "category_id"])) {
    const fallbackPrepared = {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.sale_price !== undefined ? { price: Number(payload.sale_price || 0) } : {}),
      ...(payload.active !== undefined ? { is_active: payload.active } : {}),
      ...(payload.category_id !== undefined ? { category: categoryName } : {})
    };

    result = await client
      .from("products")
      .update(fallbackPrepared)
      .eq("id", id)
      .select()
      .single();
  }

  if (result.error) throw result.error;
  return normalizeProduct(result.data);
}

async function deleteProduct(id, establishmentId = null) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");

  let query = client.from("products").delete().eq("id", id);
  if (establishmentId) query = query.eq("establishment_id", establishmentId);
  const { error } = await query;
  if (error) throw error;
  return true;
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
  sendTicketMessage,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct
};