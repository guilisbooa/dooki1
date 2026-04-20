// =====================================================
// DOOKI DATA LAYER
// =====================================================

function getSupabaseClient() {
  return window.supabaseClient || window.DookiSupabase?.client || null;
}

function sanitizeEntityId(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized || normalized === 'undefined' || normalized === 'null') return null;
  return normalized;
}

function sanitizeForeignKey(value) {
  const normalized = sanitizeEntityId(value);
  return normalized || null;
}

function normalizeStore(row) {
  if (!row) return null;

  return {
    id: sanitizeEntityId(row.id) || null,
    name: row.name || row.store_name || "Sem nome",
    city: row.city || row.store_city || "-",
    status: row.status || "active",
    email: row.email || null,
    whatsapp: row.whatsapp || row.phone || null,
    plan_id: row.plan_id || row.current_plan_id || row.raw?.plan_id || null,
    plan: row.plan || row.plan_name || row.current_plan_name || null,
    plan_name: row.plan_name || row.current_plan_name || row.plan || null,
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

function normalizeCategory(row) {
  if (!row) return null;

  return {
    id: sanitizeEntityId(row.id || row.category_id) || null,
    establishment_id: sanitizeForeignKey(row.establishment_id || row.store_id || row.restaurant_id),
    name: row.name || row.title || 'Categoria',
    description: row.description || row.details || '',
    active: row.active ?? row.is_active ?? true,
    sort_order: Number(row.sort_order ?? row.position ?? row.display_order ?? 0),
    raw: row
  };
}

function normalizeProduct(row) {
  if (!row) return null;

  return {
    id: sanitizeEntityId(row.id || row.product_id) || null,
    establishment_id: sanitizeForeignKey(row.establishment_id || row.store_id || row.restaurant_id),
    category_id: sanitizeForeignKey(row.category_id || row.product_category_id || row.menu_category_id),
    name: row.name || row.title || 'Produto',
    description: row.description || row.details || '',
    sale_price: Number(row.sale_price ?? row.price ?? row.unit_price ?? 0),
    cost_price: Number(row.cost_price ?? row.cost ?? 0),
    stock_quantity: Number(row.stock_quantity ?? row.stock ?? row.quantity ?? 0),
    stock_min_quantity: Number(row.stock_min_quantity ?? row.minimum_stock ?? 0),
    image_url: row.image_url || row.photo_url || row.image || null,
    active: row.active ?? row.is_active ?? true,
    sort_order: Number(row.sort_order ?? row.position ?? row.display_order ?? 0),
    raw: row
  };
}

async function fetchTableRows(tableName, establishmentId) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado.');

  const { data, error } = await client
    .from(tableName)
    .select('*')
    .eq('establishment_id', establishmentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchOptionalTableRows(tableName, establishmentId) {
  try {
    return await fetchTableRows(tableName, establishmentId);
  } catch (error) {
    console.warn(`Tabela ${tableName} indisponível para estabelecimento ${establishmentId}.`, error?.message || error);
    return [];
  }
}

async function getCategoriesByEstablishment(establishmentId) {
  const rows = await fetchOptionalTableRows('categories', establishmentId);
  if (rows.length) return rows.map(normalizeCategory);

  const fallbackRows = await fetchOptionalTableRows('product_categories', establishmentId);
  return fallbackRows.map(normalizeCategory);
}

async function getProductsByEstablishment(establishmentId) {
  const rows = await fetchOptionalTableRows('products', establishmentId);
  return rows.map(normalizeProduct);
}

async function createCategory(payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado.');

  const preparedPayload = {
    establishment_id: payload.establishment_id,
    name: payload.name || 'Nova categoria',
    description: payload.description || '',
    active: payload.active ?? true,
    sort_order: Number(payload.sort_order || 0)
  };

  let result = await client.from('categories').insert([preparedPayload]).select().single();
  if (result.error) {
    const fallbackPayload = {
      establishment_id: preparedPayload.establishment_id,
      name: preparedPayload.name,
      description: preparedPayload.description,
      active: preparedPayload.active
    };
    result = await client.from('product_categories').insert([fallbackPayload]).select().single();
    if (result.error) throw result.error;
  }

  return normalizeCategory(result.data);
}

async function updateCategory(categoryId, payload, establishmentId) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado.');

  const preparedPayload = {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.active !== undefined ? { active: payload.active } : {}),
    ...(payload.sort_order !== undefined ? { sort_order: Number(payload.sort_order || 0) } : {})
  };

  let result = await client.from('categories').update(preparedPayload).eq('id', categoryId).eq('establishment_id', establishmentId).select().single();
  if (result.error) {
    const fallbackPayload = { ...preparedPayload };
    delete fallbackPayload.sort_order;
    result = await client.from('product_categories').update(fallbackPayload).eq('id', categoryId).eq('establishment_id', establishmentId).select().single();
    if (result.error) throw result.error;
  }

  return normalizeCategory(result.data);
}

async function deleteCategory(categoryId, establishmentId) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado.');

  let result = await client.from('categories').delete().eq('id', categoryId).eq('establishment_id', establishmentId);
  if (result.error) {
    result = await client.from('product_categories').delete().eq('id', categoryId).eq('establishment_id', establishmentId);
    if (result.error) throw result.error;
  }

  return true;
}

async function createProduct(payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado.');

  const preparedPayload = {
    establishment_id: payload.establishment_id,
    category_id: sanitizeForeignKey(payload.category_id),
    name: payload.name || 'Novo produto',
    description: payload.description || '',
    sale_price: Number(payload.sale_price ?? payload.price ?? 0),
    cost_price: Number(payload.cost_price ?? 0),
    stock_quantity: Number(payload.stock_quantity ?? 0),
    stock_min_quantity: Number(payload.stock_min_quantity ?? 0),
    active: payload.active ?? true,
    image_url: payload.image_url || null,
    sort_order: Number(payload.sort_order || 0)
  };

  const primary = await client.from('products').insert([preparedPayload]).select().single();
  if (primary.error) {
    const fallbackPayload = {
      establishment_id: preparedPayload.establishment_id,
      category_id: preparedPayload.category_id,
      name: preparedPayload.name,
      description: preparedPayload.description,
      price: preparedPayload.sale_price,
      cost_price: preparedPayload.cost_price,
      stock_quantity: preparedPayload.stock_quantity,
      stock_min_quantity: preparedPayload.stock_min_quantity,
      active: preparedPayload.active,
      image_url: preparedPayload.image_url
    };
    const fallback = await client.from('products').insert([fallbackPayload]).select().single();
    if (fallback.error) throw primary.error;
    return normalizeProduct(fallback.data);
  }

  return normalizeProduct(primary.data);
}

async function updateProduct(productId, payload, establishmentId) {
  const safeProductId = sanitizeEntityId(productId);
  if (!safeProductId) throw new Error('Produto sem ID válido.');
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado.');

  const preparedPayload = {
    ...(payload.category_id !== undefined ? { category_id: sanitizeForeignKey(payload.category_id) } : {}),
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.sale_price !== undefined ? { sale_price: Number(payload.sale_price || 0) } : {}),
    ...(payload.price !== undefined ? { sale_price: Number(payload.price || 0) } : {}),
    ...(payload.cost_price !== undefined ? { cost_price: Number(payload.cost_price || 0) } : {}),
    ...(payload.stock_quantity !== undefined ? { stock_quantity: Number(payload.stock_quantity || 0) } : {}),
    ...(payload.stock_min_quantity !== undefined ? { stock_min_quantity: Number(payload.stock_min_quantity || 0) } : {}),
    ...(payload.active !== undefined ? { active: payload.active } : {}),
    ...(payload.image_url !== undefined ? { image_url: payload.image_url } : {}),
    ...(payload.sort_order !== undefined ? { sort_order: Number(payload.sort_order || 0) } : {})
  };

  let result = await client.from('products').update(preparedPayload).eq('id', safeProductId).eq('establishment_id', establishmentId).select().single();
  if (result.error) {
    const fallbackPayload = { ...preparedPayload };
    if (fallbackPayload.sale_price !== undefined) {
      fallbackPayload.price = fallbackPayload.sale_price;
      delete fallbackPayload.sale_price;
    }
    delete fallbackPayload.sort_order;
    result = await client.from('products').update(fallbackPayload).eq('id', safeProductId).eq('establishment_id', establishmentId).select().single();
    if (result.error) throw result.error;
  }

  return normalizeProduct(result.data);
}

async function deleteProduct(productId, establishmentId) {
  const safeProductId = sanitizeEntityId(productId);
  if (!safeProductId) throw new Error('Produto sem ID válido.');
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado.');

  const { error } = await client.from('products').delete().eq('id', safeProductId).eq('establishment_id', establishmentId);
  if (error) throw error;
  return true;
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
    const planNameById = new Map(normalizedPlans.map(function (plan) {
      return [String(plan.id), plan.name || null];
    }));

    const normalizedEstablishments = (establishmentsRes.data || []).map(function (row) {
      const store = normalizeStore(row);
      if (store?.plan_id && !store.plan_name) {
        const linkedPlanName = planNameById.get(String(store.plan_id)) || null;
        if (linkedPlanName) {
          store.plan = linkedPlanName;
          store.plan_name = linkedPlanName;
          store.current_plan_name = linkedPlanName;
        }
      }
      return store;
    });

    return {
      establishments: normalizedEstablishments,
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

async function getPlanById(planId) {
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

function isSubscriptionRlsError(error) {
  const message = String(error?.message || error?.details || "").toLowerCase();
  return message.includes("row-level security") || message.includes("violates row-level security policy");
}

async function syncActiveSubscription(establishmentId, planId) {
  const client = getSupabaseClient();
  if (!client || !establishmentId) return null;

  const now = new Date().toISOString();

  try {
    const deactivateRes = await client
      .from("establishment_subscriptions")
      .update({ status: "inactive" })
      .eq("establishment_id", establishmentId)
      .eq("status", "active")
      .neq("plan_id", planId || "00000000-0000-0000-0000-000000000000");

    if (deactivateRes.error && !isSubscriptionRlsError(deactivateRes.error)) {
      throw deactivateRes.error;
    }

    if (!planId) return null;

    const planRow = await getPlanById(planId);

    const { data: existing, error: existingError } = await client
      .from("establishment_subscriptions")
      .select("id, started_at")
      .eq("establishment_id", establishmentId)
      .eq("plan_id", planId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError && !isSubscriptionRlsError(existingError)) throw existingError;

    const payload = {
      establishment_id: establishmentId,
      plan_id: planId,
      status: "active",
      started_at: existing?.started_at || now,
      expires_at: null
    };

    if (planRow) {
      if (Object.prototype.hasOwnProperty.call(planRow, "commission_percent")) payload.commission_percent_snapshot = planRow.commission_percent;
      if (Object.prototype.hasOwnProperty.call(planRow, "watermark_enabled")) payload.watermark_enabled_snapshot = planRow.watermark_enabled;
      if (Object.prototype.hasOwnProperty.call(planRow, "support_level")) payload.support_level_snapshot = planRow.support_level;
    }

    if (existing?.id) {
      const { error } = await client
        .from("establishment_subscriptions")
        .update(payload)
        .eq("id", existing.id);

      if (error) {
        if (isSubscriptionRlsError(error)) {
          console.warn("RLS bloqueou update em establishment_subscriptions. Mantendo plano salvo em establishments.");
          return existing.id;
        }
        throw error;
      }

      return existing.id;
    }

    const { data, error } = await client
      .from("establishment_subscriptions")
      .insert([payload])
      .select("id")
      .single();

    if (error) {
      if (isSubscriptionRlsError(error)) {
        console.warn("RLS bloqueou insert em establishment_subscriptions. Mantendo plano salvo em establishments.");
        return null;
      }
      throw error;
    }

    return data?.id || null;
  } catch (error) {
    if (isSubscriptionRlsError(error)) {
      console.warn("RLS bloqueou sincronização da assinatura. O plano seguirá pelo plan_id em establishments.");
      return null;
    }
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
    banner_url: payload.banner_url || payload.bannerUrl || null,
    ...(payload.plan_id !== undefined ? { plan_id: payload.plan_id || null } : {})
  };

  const { data, error } = await client
    .from("establishments")
    .insert([preparedPayload])
    .select()
    .single();

  if (error) throw error;

  if (payload.plan_id) {
    await syncActiveSubscription(data.id, payload.plan_id);
  }

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
    ...(payload.logo_url !== undefined ? { logo_url: payload.logo_url } : {}),
    ...(payload.logoUrl !== undefined ? { logo_url: payload.logoUrl } : {}),
    ...(payload.banner_url !== undefined ? { banner_url: payload.banner_url } : {}),
    ...(payload.bannerUrl !== undefined ? { banner_url: payload.bannerUrl } : {}),
    ...(payload.plan_id !== undefined ? { plan_id: payload.plan_id || null } : {})
  };

  const { data, error } = await client
    .from("establishments")
    .update(preparedPayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  if (payload.plan_id !== undefined) {
    await syncActiveSubscription(id, payload.plan_id || null);
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

window.DookiData = {
  getSnapshot,
  createStore,
  updateStore,
  deleteStore,
  createEstablishment: createStore,
  updateEstablishment: updateStore,
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
  getCategoriesByEstablishment,
  getProductsByEstablishment,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct
};
