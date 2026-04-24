(function () {
  const state = {
    user: null,
    membership: null,
    establishment: null,
    plan: null,
    features: [],
    orders: [],
    products: [],
    categories: [],
    tickets: [],
    tables: [],
    inventoryMovements: [],
    finance: null,
    manualOrderItems: [],
    currentScreen: "dashboard"
  };

  const screenMeta = {
    dashboard: {
      title: "Central da loja",
      copy: "Tudo o que sua operação precisa no dia a dia, com foco em praticidade."
    },
    orders: {
      title: "Pedidos",
      copy: "Acompanhe, pesquise e atualize o andamento dos pedidos."
    },
    products: {
      title: "Cardápio",
      copy: "Gerencie produtos, preços e disponibilidade."
    },
    categories: {
      title: "Categorias",
      copy: "Organize melhor o cardápio da sua loja."
    },
    inventory: {
      title: "Estoque",
      copy: "Controle quantidades, custos e itens com baixa."
    },
    tables: {
      title: "Mesas",
      copy: "Gestão prática para atendimento por QR code."
    },
    finance: {
      title: "Financeiro",
      copy: "Veja receita, custo, comissão Dooki e lucro estimado."
    },
    support: {
      title: "Suporte",
      copy: "Abra tickets e acompanhe o atendimento da sua loja."
    },
    settings: {
      title: "Configurações",
      copy: "Atualize os principais dados do estabelecimento."
    }
  };

  const PLAN_FEATURES_FALLBACK = {
    standard: [
      "digital_menu",
      "delivery_orders",
      "establishment_panel",
      "full_dashboard",
      "inventory_management",
      "ticket_support",
      "menu_qr_code",
      "dooki_watermark"
    ],
    premium: [
      "digital_menu",
      "delivery_orders",
      "establishment_panel",
      "full_dashboard",
      "inventory_management",
      "ticket_support",
      "menu_qr_code",
      "table_qr_code",
      "table_ordering",
      "profit_analysis",
      "dooki_watermark"
    ],
    enterprise: [
      "digital_menu",
      "delivery_orders",
      "establishment_panel",
      "full_dashboard",
      "inventory_management",
      "ticket_support",
      "menu_qr_code",
      "table_qr_code",
      "table_ordering",
      "profit_analysis",
      "split_bill",
      "group_orders",
      "support_24h",
      "custom_packaging",
      "table_qr_stands"
    ]
  };

  const FEATURE_UPGRADE_RULES = {
    inventory_management: {
      minPlan: "standard",
      label: "Gestão de estoque"
    },
    ticket_support: {
      minPlan: "standard",
      label: "Suporte por ticket"
    },
    table_qr_code: {
      minPlan: "premium",
      label: "QR code por mesa"
    },
    table_ordering: {
      minPlan: "premium",
      label: "Pedidos por mesa"
    },
    profit_analysis: {
      minPlan: "premium",
      label: "Análise de gastos e ganhos"
    },
    split_bill: {
      minPlan: "enterprise",
      label: "Divisão de conta"
    },
    group_orders: {
      minPlan: "enterprise",
      label: "Pedidos interligados por grupo"
    },
    support_24h: {
      minPlan: "enterprise",
      label: "Suporte 24h"
    },
    custom_packaging: {
      minPlan: "enterprise",
      label: "Embalagens personalizadas"
    },
    table_qr_stands: {
      minPlan: "enterprise",
      label: "Suportes físicos de QR"
    }
  };

  document.addEventListener("DOMContentLoaded", async function () {
    try {
      const context = await window.EstablishmentAuth.requireAuth();
      if (!context) return;

      state.user = context.user;
      state.membership = context.membership;

      bindBaseEvents();
      await bootstrap();
      openScreen("dashboard");
    } catch (error) {
      console.error("Erro ao iniciar painel do estabelecimento:", error);
      alert(error.message || "Não foi possível carregar o painel.");
      window.location.href = "/establishment/establishment-login.html";
    }
  });

  function getClient() {
    if (!window.supabaseClient) {
      throw new Error("Supabase não configurado.");
    }
    return window.supabaseClient;
  }

  function getPlanName() {
    return String(
      state.plan?.plan_name ||
      state.plan?.plan_display_name ||
      state.establishment?.plan_name ||
      state.establishment?.plan ||
      state.establishment?.current_plan_name ||
      "Standard"
    );
  }

  function getPlanKey() {
    return getPlanName().toLowerCase();
  }

  function getPlanLevel(planKey) {
    if (planKey === "standard") return 1;
    if (planKey === "premium") return 2;
    if (planKey === "enterprise") return 3;
    return 0;
  }

  function getPlanLabel() {
    return (
      state.plan?.plan_display_name ||
      state.plan?.plan_name ||
      state.establishment?.plan_name ||
      state.establishment?.plan ||
      state.establishment?.current_plan_name ||
      "Standard"
    );
  }

  function getCommissionPercent() {
    const raw = state.plan?.commission_percent ?? state.establishment?.current_commission_percent;
    if (raw != null && raw !== "") return Number(raw || 0);

    const planKey = getPlanKey();
    if (planKey === "standard") return 2;
    if (planKey === "premium") return 1.5;
    if (planKey === "enterprise") return 1;
    return 0;
  }

  function hasFeature(featureKey) {
    return state.features.some(function (feature) {
      return feature.feature_key === featureKey && feature.enabled;
    });
  }


  function getOrderStorageKey(type, scope) {
    const establishmentId = state.membership?.establishment_id || state.establishment?.id || "global";
    return `dooki:${establishmentId}:${type}:${scope || "all"}:order`;
  }

  function readStoredOrder(type, scope) {
    try {
      const raw = localStorage.getItem(getOrderStorageKey(type, scope));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (_) {
      return [];
    }
  }

  function saveStoredOrder(type, records, scope) {
    try {
      const order = records
        .map(function (item) { return normalizeUuidValue(item.id); })
        .filter(Boolean)
        .map(String);

      localStorage.setItem(getOrderStorageKey(type, scope), JSON.stringify(order));
    } catch (_) {}
  }

  function applyStoredOrder(records, type, scope) {
    const storedOrder = readStoredOrder(type, scope);

    if (!storedOrder.length) return [...records];

    return [...records].sort(function (a, b) {
      const aId = String(normalizeUuidValue(a.id));
      const bId = String(normalizeUuidValue(b.id));
      const aIndex = storedOrder.indexOf(aId);
      const bIndex = storedOrder.indexOf(bId);

      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
      if (aIndex >= 0) return -1;
      if (bIndex >= 0) return 1;

      return getSortableNumber(a.sort_order, 999999) - getSortableNumber(b.sort_order, 999999) ||
        String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
    });
  }

  function getSortableNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function sortCategoriesForMenu(categories) {
    const base = [...categories].sort(function (a, b) {
      return getSortableNumber(a.sort_order, 999999) - getSortableNumber(b.sort_order, 999999) ||
        String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
    });

    return applyStoredOrder(base, "categories", "all");
  }

  function sortProductsForMenu(products) {
    const base = [...products].sort(function (a, b) {
      return getSortableNumber(a.sort_order, 999999) - getSortableNumber(b.sort_order, 999999) ||
        String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
    });

    const scope = products.length ? getProductOrderScope(products[0]) : "all";
    return applyStoredOrder(base, "products", scope);
  }

  async function updateSortOrder(tableName, records, scope) {
    const type = tableName === "products" ? "products" : "categories";
    saveStoredOrder(type, records, scope || "all");

    const client = getClient();

    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      const id = normalizeUuidValue(record.id);
      if (!id) continue;

      const { error } = await client
        .from(tableName)
        .update({ sort_order: index + 1 })
        .eq("id", id)
        .eq("establishment_id", state.membership.establishment_id);

      if (error) {
        const message = String(error.message || "").toLowerCase();

        if (
          message.includes("sort_order") ||
          message.includes("schema cache") ||
          message.includes("column")
        ) {
          console.warn(`Coluna sort_order ausente em ${tableName}. Ordem salva localmente neste navegador.`);
          return { persistedLocallyOnly: true };
        }

        throw error;
      }
    }

    return { persistedLocallyOnly: false };
  }

  function moveItemInList(list, itemId, direction) {
    const safeId = normalizeUuidValue(itemId);
    const index = list.findIndex(function (item) {
      return String(normalizeUuidValue(item.id)) === String(safeId);
    });

    if (index < 0) return list;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return list;

    const copy = [...list];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    return copy;
  }

  function getProductOrderScope(product) {
    const categoryId = normalizeUuidValue(product?.category_id);
    return categoryId || "__sem_categoria__";
  }

  function getProductsFromSameScope(productId) {
    const current = state.products.find(function (product) {
      return String(normalizeUuidValue(product.id)) === String(normalizeUuidValue(productId));
    });

    if (!current) return [];

    const scope = getProductOrderScope(current);

    return sortProductsForMenu(
      state.products.filter(function (product) {
        return getProductOrderScope(product) === scope;
      })
    );
  }

  function getCategoryDisplayName(categoryId) {
    const safeCategoryId = normalizeUuidValue(categoryId);
    if (!safeCategoryId) return "Sem categoria";

    const category = state.categories.find(function (item) {
      return String(normalizeUuidValue(item.id)) === String(safeCategoryId);
    });

    return category?.name || "Sem categoria";
  }

  function getUpgradeBadgeText(featureKey) {
    const rule = FEATURE_UPGRADE_RULES[featureKey];
    if (!rule) return "Upgrade";

    if (rule.minPlan === "premium") return "Premium";
    if (rule.minPlan === "enterprise") return "Enterprise";
    return "Upgrade";
  }

  function getUpgradeMessage(featureKey) {
    const rule = FEATURE_UPGRADE_RULES[featureKey];

    if (!rule) {
      return `Faça upgrade do plano para liberar este recurso. Seu plano atual: ${getPlanLabel()}.`;
    }

    const minPlanLabel =
      rule.minPlan === "premium"
        ? "Premium"
        : rule.minPlan === "enterprise"
          ? "Enterprise"
          : "Standard";

    return `${rule.label} disponível a partir do plano ${minPlanLabel}. Seu plano atual: ${getPlanLabel()}.`;
  }

  function ensureLockedTooltip() {
    let tooltip = document.getElementById("locked-tooltip");

    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "locked-tooltip";
      tooltip.className = "locked-tooltip";
      document.body.appendChild(tooltip);
    }

    return tooltip;
  }

  function showLockedTooltip(message, target) {
    const tooltip = ensureLockedTooltip();
    tooltip.textContent = message;

    const rect = target.getBoundingClientRect();
    tooltip.style.left = `${rect.right + 12}px`;
    tooltip.style.top = `${rect.top}px`;
    tooltip.classList.add("visible");
  }

  function hideLockedTooltip() {
    const tooltip = document.getElementById("locked-tooltip");
    if (tooltip) {
      tooltip.classList.remove("visible");
    }
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value || 0));
  }

  function formatDate(value) {
    if (!value) return "—";

    try {
      return new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "—";
    }
  }

  function isWatermarkEnabled() {
    if (state.plan?.watermark_enabled != null) {
      return state.plan.watermark_enabled !== false;
    }
    return getPlanKey() !== "enterprise";
  }

  function bindBaseEvents() {
    const logoutButton = document.getElementById("establishment-logout");
    if (logoutButton) {
      logoutButton.addEventListener("click", async function () {
        try {
          await window.EstablishmentAuth.signOut();
        } catch (error) {
          console.error("Erro ao sair:", error);
        } finally {
          window.location.href = "/establishment/establishment-login.html";
        }
      });
    }

    const toggleButton = document.getElementById("sidebar-toggle");
    if (toggleButton) {
      toggleButton.addEventListener("click", function () {
        document.getElementById("establishment-sidebar")?.classList.toggle("sidebar-open");
      });
    }

    const previewProductsButton = document.getElementById("menu-preview-go-products");
    if (previewProductsButton) {
      previewProductsButton.addEventListener("click", function () {
        openScreen("products");
      });
    }

    document.querySelectorAll("[data-screen]").forEach(function (button) {
      button.addEventListener("click", function () {
        const featureKey = button.dataset.feature;

        if (featureKey && !hasFeature(featureKey)) {
          showLockedTooltip(getUpgradeMessage(featureKey), button);
          setTimeout(hideLockedTooltip, 2200);
          return;
        }

        openScreen(button.dataset.screen);
      });

      button.addEventListener("mouseenter", function () {
        const featureKey = button.dataset.feature;
        if (featureKey && !hasFeature(featureKey)) {
          showLockedTooltip(getUpgradeMessage(featureKey), button);
        }
      });

      button.addEventListener("mouseleave", function () {
        hideLockedTooltip();
      });
    });

    const productForm = document.getElementById("product-form");
    if (productForm) productForm.addEventListener("submit", handleCreateProduct);

    const categoryForm = document.getElementById("category-form");
    if (categoryForm) categoryForm.addEventListener("submit", handleCreateCategory);

    const supportForm = document.getElementById("support-form");
    if (supportForm) supportForm.addEventListener("submit", handleCreateTicket);

    const settingsForm = document.getElementById("settings-form");
    if (settingsForm) settingsForm.addEventListener("submit", handleSaveSettings);

    const tableForm = document.getElementById("table-form");
    if (tableForm) tableForm.addEventListener("submit", handleCreateTable);

    const ordersSearch = document.getElementById("orders-search");
    if (ordersSearch) {
      ordersSearch.addEventListener("input", function () {
        renderOrders(this.value || "");
      });
    }
  }

  async function bootstrap() {
    await loadAllData();
    renderHeader();
    renderSidebar();
    renderDashboard();
    renderProducts();
    renderCategories();
    renderInventory();
    renderTables();
    renderFinance();
    renderSupport();
    fillSettingsForm();
    refreshMenuPreview();
    startAutoRefresh();
  }

  async function loadAllData() {
    const client = getClient();
    const establishmentId = state.membership.establishment_id;

    const [
      establishmentRes,
      planRes,
      directPlanRes,
      featuresRes,
      ordersRes,
      productsRes,
      categoriesRes,
      ticketsRes,
      tablesRes,
      movementsRes
    ] = await Promise.all([
      client.from("establishments").select("*").eq("id", establishmentId).single(),
      safeView("v_establishment_active_plan", "establishment_id", establishmentId, true),
      safeActivePlan(establishmentId),
      safeView("v_establishment_features", "establishment_id", establishmentId, false),
      safeTable("orders", establishmentId),
      window.DookiData?.getProductsByEstablishment
        ? window.DookiData.getProductsByEstablishment(establishmentId)
        : safeTable("products", establishmentId),
      window.DookiData?.getCategoriesByEstablishment
        ? window.DookiData.getCategoriesByEstablishment(establishmentId)
        : safeTable("categories", establishmentId),
      safeTable("support_tickets", establishmentId),
      safeTable("establishment_tables", establishmentId),
      safeTable("inventory_movements", establishmentId)
    ]);

    if (establishmentRes.error) throw establishmentRes.error;

    state.establishment = establishmentRes.data || null;

    let resolvedPlan = planRes || directPlanRes || null;
    if (!resolvedPlan && state.establishment?.plan_id) {
      resolvedPlan = await safePlanById(state.establishment.plan_id, state.establishment.id);
    }
    state.plan = resolvedPlan || derivePlanFromEstablishment(state.establishment) || null;

    state.features = normalizeFeatures(featuresRes || [], state.establishment, state.plan);
    state.orders = stabilizeCollection(ordersRes, state.orders);
    state.products = stabilizeCollection(productsRes, state.products);
    state.categories = stabilizeCollection(categoriesRes, state.categories);
    state.tickets = stabilizeCollection(ticketsRes, state.tickets);
    state.tables = stabilizeCollection(tablesRes, state.tables);
    state.inventoryMovements = stabilizeCollection(movementsRes, state.inventoryMovements);
    state.finance = computeFinance();
  }



  async function safePlanById(planId, establishmentId) {
    const client = getClient();

    try {
      const { data, error } = await client
        .from("plans")
        .select("*")
        .eq("id", planId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        establishment_id: establishmentId,
        plan_id: data.id,
        plan_name: data.name || "Standard",
        plan_display_name: data.name || "Standard",
        commission_percent: data.commission_percent ?? 0,
        watermark_enabled: data.watermark_enabled ?? true,
        support_level: data.support_level || "ticket",
        status: "active",
        started_at: null,
        expires_at: null
      };
    } catch (error) {
      console.warn("Falha ao consultar plano por plan_id.", error);
      return null;
    }
  }

  async function safeActivePlan(establishmentId) {
    const client = getClient();

    try {
      const { data, error } = await client
        .from("establishment_subscriptions")
        .select(`
          establishment_id,
          plan_id,
          status,
          started_at,
          expires_at,
          commission_percent_snapshot,
          watermark_enabled_snapshot,
          support_level_snapshot,
          plans ( id, name, commission_percent, watermark_enabled, support_level )
        `)
        .eq("establishment_id", establishmentId)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      return {
        establishment_id: data.establishment_id,
        plan_id: data.plan_id,
        plan_name: data.plans?.name || null,
        plan_display_name: data.plans?.name || null,
        commission_percent: data.commission_percent_snapshot ?? data.plans?.commission_percent ?? 0,
        watermark_enabled: data.watermark_enabled_snapshot ?? data.plans?.watermark_enabled ?? true,
        support_level: data.support_level_snapshot ?? data.plans?.support_level ?? "ticket",
        status: data.status,
        started_at: data.started_at,
        expires_at: data.expires_at
      };
    } catch (error) {
      console.warn("Falha ao consultar subscription ativa.", error);
      return null;
    }
  }

  function derivePlanFromEstablishment(establishment) {
    if (!establishment) return null;

    const planName = establishment.plan_name || establishment.current_plan_name || establishment.plan || null;
    const planId = establishment.plan_id || establishment.current_plan_id || null;

    if (!planName && !planId) return null;

    return {
      establishment_id: establishment.id,
      plan_id: planId,
      plan_name: planName || "Standard",
      plan_display_name: planName || "Standard",
      commission_percent: establishment.current_commission_percent ?? 0,
      watermark_enabled: establishment.watermark_enabled ?? true,
      support_level: establishment.support_level || "ticket"
    };
  }

  async function safeTable(tableName, establishmentId) {
    const client = getClient();

    try {
      const { data, error } = await client
        .from(tableName)
        .select("*")
        .eq("establishment_id", establishmentId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn(`Tabela ${tableName} indisponível.`, error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.warn(`Falha ao consultar ${tableName}.`, error);
      return [];
    }
  }

  async function safeView(viewName, field, value, single) {
    const client = getClient();

    try {
      const query = client.from(viewName).select("*").eq(field, value);

      if (single) {
        const { data, error } = await query.maybeSingle();
        if (error) {
          console.warn(`View ${viewName} indisponível.`, error.message);
          return null;
        }
        return data || null;
      }

      const { data, error } = await query;
      if (error) {
        console.warn(`View ${viewName} indisponível.`, error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.warn(`Falha ao consultar ${viewName}.`, error);
      return single ? null : [];
    }
  }

  function normalizeFeatures(features, establishment, plan) {
    if (features.length) return features;

    const rawPlan = String(
      plan?.plan_name ||
      plan?.plan_display_name ||
      establishment?.plan_name ||
      establishment?.plan ||
      establishment?.current_plan_name ||
      "standard"
    ).toLowerCase();

    const fallback = PLAN_FEATURES_FALLBACK[rawPlan] || PLAN_FEATURES_FALLBACK.standard;

    return fallback.map(function (key) {
      return {
        feature_key: key,
        enabled: true,
        limit_value: null
      };
    });
  }


  function stabilizeCollection(nextValue, currentValue) {
    if (!Array.isArray(nextValue)) return Array.isArray(currentValue) ? currentValue : [];
    if (nextValue.length === 0 && Array.isArray(currentValue) && currentValue.length > 0) {
      return currentValue;
    }
    return nextValue;
  }

  function normalizeUuidValue(value) {
    if (value == null) return null;

    if (typeof value === "object") {
      if (Array.isArray(value)) {
        for (const item of value) {
          const normalized = normalizeUuidValue(item);
          if (normalized) return normalized;
        }
        return null;
      }

      return normalizeUuidValue(value.id ?? value.value ?? value.category_id ?? null);
    }

    const raw = String(value).trim();

    if (
      !raw ||
      raw === "undefined" ||
      raw === "null" ||
      raw === "[object Object]" ||
      raw.includes("[object Object]")
    ) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return normalizeUuidValue(parsed.id ?? parsed.value ?? parsed.category_id ?? null);
      }
    } catch (_) {}

    return raw;
  }

  function computeFinance() {
    const completedOrders = state.orders.filter(function (order) {
      return order.completed_at || ["completed", "delivered"].includes(String(order.status || "").toLowerCase());
    });

    const grossRevenue = completedOrders.reduce(function (acc, order) {
      return acc + Number(order.total_amount || 0);
    }, 0);

    const dookiFee = completedOrders.reduce(function (acc, order) {
      if (order.dooki_commission_amount != null) {
        return acc + Number(order.dooki_commission_amount || 0);
      }
      return acc + (Number(order.total_amount || 0) * getCommissionPercent() / 100);
    }, 0);

    const totalCost = state.products.reduce(function (acc, product) {
      return acc + Number(product.cost_price || 0);
    }, 0);

    return {
      completedOrders: completedOrders.length,
      grossRevenue,
      dookiFee,
      totalCost,
      profitBefore: grossRevenue - totalCost,
      profitAfter: grossRevenue - totalCost - dookiFee
    };
  }


  function resolveMediaUrl(value, fallback) {
    const raw = value == null ? "" : String(value).trim();
    const safeFallback = fallback || "/assets/logo-dooki.png";

    if (!raw || raw === "undefined" || raw === "null") return safeFallback;
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
    if (raw.startsWith("/assets/") || raw.startsWith("./") || raw.startsWith("../")) return raw;
    if (raw.startsWith("/storage/v1/object/public/")) return `https://lvnhwtmdpzwjfjktkmtd.supabase.co${raw}`;
    if (raw.startsWith("storage/v1/object/public/")) return `https://lvnhwtmdpzwjfjktkmtd.supabase.co/${raw}`;
    if (raw.includes("/")) return `https://lvnhwtmdpzwjfjktkmtd.supabase.co/storage/v1/object/public/${raw.replace(/^\/+/, "")}`;
    return raw;
  }

  function applyImageWithFallback(img, src, fallback) {
    if (!img) return;
    const resolvedFallback = fallback || "/assets/logo-dooki.png";
    img.onerror = function () {
      if (img.dataset.fallbackApplied === "true") return;
      img.dataset.fallbackApplied = "true";
      img.src = resolvedFallback;
    };
    img.dataset.fallbackApplied = "false";
    img.src = resolveMediaUrl(src, resolvedFallback);
  }

  function renderHeader() {
    const storeName = state.establishment?.name || "Minha Loja";
    const userEmail = state.user?.email || "—";

    const sidebarStoreName = document.getElementById("sidebar-store-name");
    if (sidebarStoreName) sidebarStoreName.textContent = storeName;

    const sidebarUserName = document.getElementById("sidebar-user-name");
    if (sidebarUserName) sidebarUserName.textContent = storeName;

    const sidebarUserEmail = document.getElementById("sidebar-user-email");
    if (sidebarUserEmail) sidebarUserEmail.textContent = userEmail;

    const planPill = document.getElementById("current-plan-pill");
    if (planPill) planPill.textContent = `Plano ${getPlanLabel()}`;

    const watermarkPill = document.getElementById("watermark-pill");
    if (watermarkPill) {
      watermarkPill.textContent = isWatermarkEnabled()
        ? "Com marca Dooki"
        : "Sem marca d’água";
    }


    renderMenuPreview();
  }

  function renderSidebar() {
    document.querySelectorAll("[data-feature]").forEach(function (button) {
      const featureKey = button.dataset.feature;
      const locked = !hasFeature(featureKey);

      button.classList.toggle("locked-nav-item", locked);
      button.classList.toggle("is-locked", locked);

      if (locked) {
        button.setAttribute("title", getUpgradeMessage(featureKey));
        button.setAttribute("data-upgrade-label", getUpgradeBadgeText(featureKey));
      } else {
        button.removeAttribute("title");
        button.removeAttribute("data-upgrade-label");
      }
    });

    populateCategorySelect();
  }

  function populateCategorySelect() {
    const select = document.getElementById("product-category-select");
    if (!select) return;

    select.innerHTML =
      `<option value="">Sem categoria</option>` +
      state.categories.map(function (category) {
        return `<option value="${normalizeUuidValue(category.id) || ""}">${category.name}</option>`;
      }).join("");
  }

  function toggleMenuPreviewByScreen(screen) {
    const preview = document.querySelector(".menu-preview-sidebar");
    const content = document.querySelector(".establishment-content");

    if (!preview) return;

    const shouldHide = screen === "orders";
    preview.classList.toggle("is-hidden-for-orders", shouldHide);
    document.body.classList.toggle("orders-focus-mode", shouldHide);

    if (content) {
      content.classList.toggle("orders-focus-content", shouldHide);
    }
  }

  function openScreen(screen) {
    state.currentScreen = screen;
    toggleMenuPreviewByScreen(screen);

    document.querySelectorAll(".admin-nav-item").forEach(function (button) {
      button.classList.toggle("active", button.dataset.screen === screen);
    });

    document.querySelectorAll(".admin-screen").forEach(function (panel) {
      panel.classList.toggle("active", panel.dataset.panel === screen);
    });

    const meta = screenMeta[screen] || screenMeta.dashboard;
    const screenTitle = document.getElementById("screen-title");
    const screenCopy = document.getElementById("screen-copy");

    if (screenTitle) screenTitle.textContent = meta.title;
    if (screenCopy) screenCopy.textContent = meta.copy;

    if (screen === "dashboard") renderDashboard();
    if (screen === "orders") renderOrders();
    if (screen === "products") renderProducts();
    if (screen === "categories") renderCategories();

    if (screen === "inventory") {
      const panel = document.querySelector('[data-panel="inventory"]');
      if (!hasFeature("inventory_management")) {
        if (panel) panel.innerHTML = lockedFeatureCard(getUpgradeMessage("inventory_management"));
        return;
      }
      renderInventory();
    }

    if (screen === "tables") {
      const panel = document.querySelector('[data-panel="tables"]');
      if (!hasFeature("table_qr_code")) {
        if (panel) panel.innerHTML = lockedFeatureCard(getUpgradeMessage("table_qr_code"));
        return;
      }
      renderTables();
    }

    if (screen === "finance") {
      const panel = document.querySelector('[data-panel="finance"]');
      if (!hasFeature("profit_analysis") && getPlanKey() === "standard") {
        if (panel) panel.innerHTML = lockedFeatureCard(getUpgradeMessage("profit_analysis"));
        return;
      }
      renderFinance();
    }

    if (screen === "support") {
      const panel = document.querySelector('[data-panel="support"]');
      if (!hasFeature("ticket_support")) {
        if (panel) panel.innerHTML = lockedFeatureCard(getUpgradeMessage("ticket_support"));
        return;
      }
      renderSupport();
    }

    if (screen === "settings") fillSettingsForm();
  }


  function getBaseOrigin() {
    return window.location.origin || "";
  }

  function getDeliveryMenuLink() {
    const establishmentId = state.membership?.establishment_id || state.establishment?.id || "";
    return `${getBaseOrigin()}/menu/menu.html?establishment=${encodeURIComponent(establishmentId)}`;
  }

  function getTableMenuLink(tableNumber) {
    const establishmentId = state.membership?.establishment_id || state.establishment?.id || "";
    const table = tableNumber || 1;
    return `${getBaseOrigin()}/menu/menu.html?establishment=${encodeURIComponent(establishmentId)}&mode=table&table=${encodeURIComponent(table)}`;
  }

  function getQrImageUrl(value) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
  }

  async function copyToClipboard(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      alert(`${label || "Link"} copiado com sucesso.`);
    } catch (error) {
      console.warn("Clipboard indisponível.", error);
      window.prompt("Copie o link:", value);
    }
  }

  function copyDeliveryMenuLink() {
    copyToClipboard(getDeliveryMenuLink(), "Link do cardápio delivery");
  }

  function copyTableMenuLink(tableNumber) {
    copyToClipboard(getTableMenuLink(tableNumber), `Link da mesa ${tableNumber || 1}`);
  }

  function renderMenuLinksPanel() {
    const deliveryLink = getDeliveryMenuLink();
    const defaultTable = 1;
    const tableLink = getTableMenuLink(defaultTable);

    return `
      <section class="menu-links-panel" id="menu-links-panel">
        <div class="menu-links-head">
          <div>
            <span class="panel-kicker">Links do cardápio</span>
            <h3>Compartilhe o cardápio da loja</h3>
            <p>Use o link de delivery para clientes externos e o QR de mesa para pedidos presenciais.</p>
          </div>
        </div>

        <div class="menu-links-grid">
          <article class="menu-link-card">
            <div>
              <strong>Delivery via link</strong>
              <span>Cliente acessa, escolhe os produtos e o pedido chega como delivery.</span>
            </div>

            <div class="menu-link-url">${deliveryLink}</div>

            <div class="menu-link-actions">
              <button type="button" class="primary-button small" onclick="window.EstablishmentPanel.copyDeliveryMenuLink()">Copiar link</button>
              <a class="ghost-button small" href="${deliveryLink}" target="_blank" rel="noopener">Abrir</a>
            </div>
          </article>

          <article class="menu-link-card qr-card">
            <div>
              <strong>QR Code de mesa</strong>
              <span>O pedido chega identificado como presencial e com o número da mesa.</span>
            </div>

            <div class="qr-preview">
              <img src="${getQrImageUrl(tableLink)}" alt="QR Code Mesa ${defaultTable}">
            </div>

            <label class="field">
              <span>Número da mesa</span>
              <input class="input" id="table-qr-number" type="number" min="1" value="${defaultTable}" oninput="window.EstablishmentPanel.updateTableQrPreview(this.value)">
            </label>

            <div class="menu-link-url" id="table-qr-link">${tableLink}</div>

            <div class="menu-link-actions">
              <button type="button" class="primary-button small" onclick="window.EstablishmentPanel.copyCurrentTableMenuLink()">Copiar link da mesa</button>
              <a class="ghost-button small" id="table-qr-open" href="${tableLink}" target="_blank" rel="noopener">Abrir</a>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function injectMenuLinksPanel() {
    const dashboardPanel = document.querySelector('[data-panel="dashboard"]');
    if (!dashboardPanel) return;

    let panel = document.getElementById("menu-links-panel");

    if (!panel) {
      dashboardPanel.insertAdjacentHTML("afterbegin", renderMenuLinksPanel());
      return;
    }

    panel.outerHTML = renderMenuLinksPanel();
  }

  function updateTableQrPreview(tableNumber) {
    const table = tableNumber || 1;
    const link = getTableMenuLink(table);
    const qrImage = document.querySelector(".qr-preview img");
    const linkBox = document.getElementById("table-qr-link");
    const openLink = document.getElementById("table-qr-open");

    if (qrImage) {
      qrImage.src = getQrImageUrl(link);
      qrImage.alt = `QR Code Mesa ${table}`;
    }

    if (linkBox) linkBox.textContent = link;
    if (openLink) openLink.href = link;
  }

  function copyCurrentTableMenuLink() {
    const tableNumber = document.getElementById("table-qr-number")?.value || 1;
    copyTableMenuLink(tableNumber);
  }

  function renderDashboard() {
    injectMenuLinksPanel();

    const completedOrdersEl = document.getElementById("kpi-orders-completed");
    if (completedOrdersEl) completedOrdersEl.textContent = String(state.finance.completedOrders);

    const grossRevenueEl = document.getElementById("kpi-gross-revenue");
    if (grossRevenueEl) grossRevenueEl.textContent = formatMoney(state.finance.grossRevenue);

    const dookiFeeEl = document.getElementById("kpi-dooki-fee");
    if (dookiFeeEl) dookiFeeEl.textContent = formatMoney(state.finance.dookiFee);

    const productsActiveEl = document.getElementById("kpi-products-active");
    if (productsActiveEl) {
      productsActiveEl.textContent = String(
        state.products.filter(function (product) { return product.active !== false; }).length
      );
    }

    const quickActionsGrid = document.getElementById("quick-actions-grid");
    if (quickActionsGrid) {
      quickActionsGrid.innerHTML = [
        quickActionButton("Novo produto", "products", true),
        quickActionButton("Nova categoria", "categories", true),
        quickActionButton("Ver pedidos", "orders", true),
        quickActionButton("Abrir suporte", "support", hasFeature("ticket_support")),
        quickActionButton("Gerenciar mesas", "tables", hasFeature("table_qr_code")),
        quickActionButton("Financeiro", "finance", true)
      ].join("");
    }

    const featureList = document.getElementById("dashboard-feature-list");
    if (featureList) {
      featureList.innerHTML = state.features.length
  ? state.features
      .filter(function (feature) {
        if (!feature.enabled) return false;

        if (feature.feature_key === "dooki_watermark") {
          return getPlanKey() === "enterprise";
        }

        return true;
      })
      .map(function (feature) {
        return `
          <article class="pro-list-card">
            <div class="pro-list-main">
              <div class="pro-list-content">
                <strong>${humanizeFeature(feature.feature_key)}</strong>
                <span>Liberado no plano ${getPlanLabel()}.</span>
              </div>
              <span class="pro-status-badge success">Ativo</span>
            </div>
          </article>
        `;
      }).join("")
  : emptyState("Nenhum recurso ativo encontrado.");
    }

    const recentOrders = document.getElementById("dashboard-recent-orders");
    if (recentOrders) {
      recentOrders.innerHTML = state.orders.length
        ? state.orders.slice(0, 6).map(function (order) {
            return `
              <article class="pro-store-row">
                <div class="pro-store-row-left">
                  <div class="pro-avatar">#</div>
                  <div class="pro-store-row-content">
                    <strong>Pedido #${String(order.id).slice(0, 8)}</strong>
                    <span>${order.customer_name || "Cliente"} • ${formatDate(order.created_at)}</span>
                  </div>
                </div>
                <div class="pro-store-row-right">
                  <span class="pro-status-badge ${getOrderStatusClass(order.status)}">${order.status || "pendente"}</span>
                  <strong>${formatMoney(order.total_amount || 0)}</strong>
                </div>
              </article>
            `;
          }).join("")
        : emptyState("Nenhum pedido cadastrado ainda.");
    }

    const summaryList = document.getElementById("dashboard-summary-list");
    if (summaryList) {
      summaryList.innerHTML = [
        summaryItem("Cidade", state.establishment?.city || "—"),
        summaryItem("Pedidos cadastrados", String(state.orders.length)),
        summaryItem("Categorias", String(state.categories.length)),
        summaryItem("Tickets abertos", String(
          state.tickets.filter(function (ticket) {
            return !["fechado", "resolvido", "closed"].includes(String(ticket.status || "").toLowerCase());
          }).length
        ))
      ].join("");
    }

    const lowStock = state.products.filter(function (product) {
      return product.track_inventory !== false &&
        Number(product.stock_quantity || 0) <= Number(product.stock_min_quantity || 0);
    });

    const lowStockContainer = document.getElementById("dashboard-low-stock");
    if (lowStockContainer) {
      lowStockContainer.innerHTML = lowStock.length
        ? lowStock.slice(0, 6).map(function (product) {
            return `
              <article class="pro-list-card">
                <div class="pro-list-main">
                  <div class="pro-list-content">
                    <strong>${product.name || "Produto"}</strong>
                    <span>Atual: ${Number(product.stock_quantity || 0)} • mínimo: ${Number(product.stock_min_quantity || 0)}</span>
                  </div>
                  <span class="pro-status-badge warning">Baixo</span>
                </div>
              </article>
            `;
          }).join("")
        : emptyState("Nenhum item com estoque baixo.");
    }

    const planSummary = document.getElementById("dashboard-plan-summary");
    if (planSummary) {
      planSummary.innerHTML = [
        summaryItem("Plano atual", getPlanLabel()),
        summaryItem("Comissão da plataforma", `${String(getCommissionPercent()).replace(".", ",")}%`),
        summaryItem("Marca d’água", isWatermarkEnabled() ? "Ativada" : "Desativada"),
        summaryItem("Suporte", hasFeature("support_24h") ? "24h" : "Ticket")
      ].join("");
    }
  }


  function getManualOrderTotal() {
    return state.manualOrderItems.reduce(function (acc, item) {
      return acc + (getProductPrice(item.product) * Number(item.quantity || 1));
    }, 0);
  }

  function renderManualOrderItems() {
    if (!state.manualOrderItems.length) {
      return `<div class="manual-order-empty">Nenhum item adicionado ao pedido.</div>`;
    }

    return state.manualOrderItems.map(function (item, index) {
      return `
        <div class="manual-order-item">
          <div>
            <strong>${item.product.name || "Produto"}</strong>
            <span>${Number(item.quantity || 1)} x ${formatMoney(getProductPrice(item.product))}</span>
          </div>

          <b>${formatMoney(getProductPrice(item.product) * Number(item.quantity || 1))}</b>

          <button type="button" class="manual-order-remove" onclick="window.EstablishmentPanel.removeManualOrderItem(${index})">
            Remover
          </button>
        </div>
      `;
    }).join("");
  }

  function renderManualOrderForm() {
    const activeProducts = sortProductsForMenu(
      state.products.filter(function (product) {
        return isProductActive(product);
      })
    );

    const options = activeProducts.map(function (product) {
      const stock = getProductStock(product);
      const category = getCategoryDisplayName(product.category_id);

      return `
        <option value="${normalizeUuidValue(product.id)}">
          ${product.name || "Produto"} • ${category} • ${formatMoney(getProductPrice(product))} • Estoque: ${stock}
        </option>
      `;
    }).join("");

    return `
      <section class="manual-order-panel">
        <div class="manual-order-head">
          <div>
            <span class="panel-kicker">Pedido manual</span>
            <h3>Adicionar pedido balcão/telefone</h3>
            <p>Inclua pedidos manualmente e atualize receita, estoque e indicadores.</p>
          </div>

          <strong>${formatMoney(getManualOrderTotal())}</strong>
        </div>

        <form class="manual-order-form" onsubmit="event.preventDefault(); window.EstablishmentPanel.createManualOrder(this);">
          <div class="manual-order-grid">
            <label class="field">
              <span>Cliente</span>
              <input class="input" name="customer_name" placeholder="Nome do cliente" />
            </label>

            <label class="field">
              <span>Telefone</span>
              <input class="input" name="customer_phone" placeholder="WhatsApp ou telefone" />
            </label>
          </div>

          <div class="manual-order-add-row">
            <label class="field">
              <span>Produto</span>
              <select class="input" id="manual-order-product-select">
                <option value="">Selecione um produto</option>
                ${options}
              </select>
            </label>

            <label class="field manual-order-qty">
              <span>Qtd.</span>
              <input class="input" id="manual-order-quantity" type="number" min="1" value="1" />
            </label>

            <button type="button" class="ghost-button manual-order-add-button" onclick="window.EstablishmentPanel.addManualOrderItem()">
              Adicionar item
            </button>
          </div>

          <div class="manual-order-items">
            ${renderManualOrderItems()}
          </div>

          <label class="field">
            <span>Observações</span>
            <textarea class="input" name="notes" placeholder="Ex.: retirar cebola, pagamento no balcão..."></textarea>
          </label>

          <div class="manual-order-footer">
            <span>Total: <strong>${formatMoney(getManualOrderTotal())}</strong></span>
            <button type="submit" class="primary-button">
              Salvar pedido
            </button>
          </div>
        </form>
      </section>
    `;
  }

  function addManualOrderItem() {
    const select = document.getElementById("manual-order-product-select");
    const qtyInput = document.getElementById("manual-order-quantity");

    const productId = normalizeUuidValue(select?.value);
    const quantity = Math.max(1, Number(qtyInput?.value || 1));

    if (!productId) {
      alert("Selecione um produto.");
      return;
    }

    const product = state.products.find(function (item) {
      return String(normalizeUuidValue(item.id)) === String(productId);
    });

    if (!product) {
      alert("Produto não encontrado.");
      return;
    }

    const currentStock = getProductStock(product);
    if (currentStock > 0 && quantity > currentStock) {
      const confirmed = window.confirm(`O estoque atual é ${currentStock}. Deseja adicionar mesmo assim?`);
      if (!confirmed) return;
    }

    const existing = state.manualOrderItems.find(function (item) {
      return String(normalizeUuidValue(item.product.id)) === String(productId);
    });

    if (existing) {
      existing.quantity = Number(existing.quantity || 1) + quantity;
    } else {
      state.manualOrderItems.push({ product, quantity });
    }

    renderOrders(document.getElementById("orders-search")?.value || "");
  }

  function removeManualOrderItem(index) {
    state.manualOrderItems.splice(index, 1);
    renderOrders(document.getElementById("orders-search")?.value || "");
  }

  async function createManualOrder(form) {
    if (!state.manualOrderItems.length) {
      alert("Adicione ao menos um produto ao pedido.");
      return;
    }

    const formData = new FormData(form);
    const customerName = String(formData.get("customer_name") || "").trim();
    const customerPhone = String(formData.get("customer_phone") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    const totalAmount = getManualOrderTotal();

    try {
      const order = await insertOrderWithFallback(
        buildManualOrderPayload(customerName, customerPhone, notes, totalAmount)
      );

      await insertOrderItemsWithFallback(order?.id, state.manualOrderItems);
      await decrementProductStock(state.manualOrderItems);

      state.manualOrderItems = [];
      form.reset();

      await loadAllData();
      renderOrders();
      renderDashboard();
      renderInventory();
      renderFinance();
      refreshMenuPreview();

      alert("Pedido manual cadastrado com sucesso.");
    } catch (error) {
      console.error("Erro ao criar pedido manual:", error);
      alert(error.message || "Não foi possível criar o pedido manual.");
    }
  }


  function normalizeOrderStatus(status) {
    const value = String(status || "pending").toLowerCase();

    const map = {
      pendente: "pending",
      pending: "pending",
      recebido: "pending",
      accepted: "confirmed",
      aprovado: "confirmed",
      confirmed: "confirmed",
      confirmado: "confirmed",
      kitchen: "kitchen",
      cozinha: "kitchen",
      preparing: "preparing",
      preparo: "preparing",
      pronto: "ready",
      ready: "ready",
      delivery: "delivery",
      entregador: "delivery",
      delivering: "delivery",
      delivered: "delivered",
      entregue: "delivered",
      completed: "completed",
      concluido: "completed",
      concluído: "completed",
      cancelled: "cancelled",
      cancelado: "cancelled",
      refused: "refused",
      recusado: "refused"
    };

    return map[value] || value;
  }

  function getOrderStatusLabel(status) {
    const value = normalizeOrderStatus(status);

    const map = {
      pending: "Pendente",
      confirmed: "Aceito",
      kitchen: "Na cozinha",
      preparing: "Preparando",
      ready: "Pronto",
      delivery: "Com entregador",
      delivered: "Entregue",
      completed: "Concluído",
      cancelled: "Cancelado",
      refused: "Recusado"
    };

    return map[value] || status || "Pendente";
  }

  function isHistoryOrder(order) {
    const status = normalizeOrderStatus(order.status);
    return ["completed", "delivered", "cancelled", "refused"].includes(status);
  }

  function getOrderSourceLabel(order) {
    const source = String(order.source || order.order_source || order.channel || "").toLowerCase();
    const tableNumber = order.table_number || order.tableNumber || order.table || null;

    if (source === "manual") return "Pedido manual";
    if (source === "balcao" || source === "balcão") return "Balcão";
    if (source === "delivery") return "Delivery";
    if (source === "table" || source === "mesa" || source === "presencial") {
      return tableNumber ? `Mesa ${tableNumber}` : "Mesa";
    }

    return tableNumber ? `Mesa ${tableNumber}` : (source ? source : "Cardápio digital");
  }

  function getActiveOrderTab() {
    return document.getElementById("orders-workspace")?.dataset?.activeTab || "active";
  }

  function setOrdersTab(tab) {
    const workspace = document.getElementById("orders-workspace");
    if (workspace) workspace.dataset.activeTab = tab;
    renderOrders(document.getElementById("orders-search")?.value || "");
  }

  async function safeReadOrderItems(orderId) {
    const client = getClient();
    const safeOrderId = normalizeUuidValue(orderId);

    if (!safeOrderId) return [];

    try {
      const { data, error } = await client
        .from("order_items")
        .select("*")
        .eq("order_id", safeOrderId);

      if (error) {
        console.warn("Itens do pedido indisponíveis.", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.warn("Falha ao consultar itens do pedido.", error);
      return [];
    }
  }

  async function showOrderDetails(orderId) {
    const order = state.orders.find(function (item) {
      return String(normalizeUuidValue(item.id)) === String(normalizeUuidValue(orderId));
    });

    if (!order) {
      alert("Pedido não encontrado.");
      return;
    }

    const items = await safeReadOrderItems(order.id);
    const modal = ensureOrderDetailsModal();
    const body = modal.querySelector(".order-details-body");

    const itemsHtml = items.length
      ? items.map(function (item) {
          const itemName = item.product_name || item.name || "Produto";
          const quantity = Number(item.quantity || 1);
          const unitPrice = Number(item.unit_price || item.price || 0);
          const total = Number(item.total_price || item.total_amount || (quantity * unitPrice));

          return `
            <div class="order-detail-item">
              <div>
                <strong>${itemName}</strong>
                <span>${quantity} x ${formatMoney(unitPrice)}</span>
              </div>
              <b>${formatMoney(total)}</b>
            </div>
          `;
        }).join("")
      : `<div class="order-detail-empty">Nenhum item detalhado foi encontrado para esse pedido.</div>`;

    body.innerHTML = `
      <div class="order-details-head">
        <div>
          <span class="panel-kicker">${getOrderSourceLabel(order)}</span>
          <h3>Pedido #${String(order.id).slice(0, 8)}</h3>
          <p>${formatDate(order.created_at)}</p>
        </div>
        <span class="order-status ${getOrderStatusClass(order.status)}">${getOrderStatusLabel(order.status)}</span>
      </div>

      <div class="order-details-grid">
        <div>
          <span>Cliente</span>
          <strong>${order.customer_name || "Cliente não informado"}</strong>
        </div>
        <div>
          <span>Telefone</span>
          <strong>${order.customer_phone || "—"}</strong>
        </div>
        <div>
          <span>Valor total</span>
          <strong>${formatMoney(order.total_amount || 0)}</strong>
        </div>
        <div>
          <span>Data</span>
          <strong>${formatDate(order.created_at)}</strong>
        </div>
      </div>

      <div class="order-details-section">
        <h4>Itens</h4>
        <div class="order-detail-items">${itemsHtml}</div>
      </div>

      <div class="order-details-section">
        <h4>Observações</h4>
        <p>${order.notes || order.observations || "Sem observações."}</p>
      </div>

      <div class="order-details-actions">
        ${getOrderActionButtons(order)}
      </div>
    `;

    modal.classList.add("active");
    document.body.classList.add("has-order-details-modal");
  }

  function closeOrderDetails() {
    const modal = document.getElementById("order-details-modal");
    if (modal) modal.classList.remove("active");
    document.body.classList.remove("has-order-details-modal");
  }

  function ensureOrderDetailsModal() {
    let modal = document.getElementById("order-details-modal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "order-details-modal";
      modal.className = "order-details-modal";
      modal.innerHTML = `
        <div class="order-details-backdrop" onclick="window.EstablishmentPanel.closeOrderDetails()"></div>
        <div class="order-details-dialog">
          <button type="button" class="order-details-close" onclick="window.EstablishmentPanel.closeOrderDetails()">×</button>
          <div class="order-details-body"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    return modal;
  }

  function getOrderActionButtons(order) {
    const status = normalizeOrderStatus(order.status);
    const id = order.id;

    if (["completed", "delivered", "cancelled", "refused"].includes(status)) {
      return `<span class="order-flow-note">Pedido finalizado no histórico.</span>`;
    }

    const buttons = [];

    if (status === "pending") {
      buttons.push(`<button class="primary-button small" onclick="window.EstablishmentPanel.updateOrderStatus('${id}','confirmed')">Aceitar</button>`);
      buttons.push(`<button class="ghost-button small danger" onclick="window.EstablishmentPanel.updateOrderStatus('${id}','refused')">Recusar</button>`);
    }

    if (["pending", "confirmed"].includes(status)) {
      buttons.push(`<button class="ghost-button small" onclick="window.EstablishmentPanel.updateOrderStatus('${id}','kitchen')">Enviar cozinha</button>`);
    }

    if (["confirmed", "kitchen"].includes(status)) {
      buttons.push(`<button class="ghost-button small" onclick="window.EstablishmentPanel.updateOrderStatus('${id}','preparing')">Preparando</button>`);
    }

    if (["kitchen", "preparing"].includes(status)) {
      buttons.push(`<button class="ghost-button small" onclick="window.EstablishmentPanel.updateOrderStatus('${id}','ready')">Pronto</button>`);
    }

    if (["ready", "preparing"].includes(status)) {
      buttons.push(`<button class="ghost-button small" onclick="window.EstablishmentPanel.updateOrderStatus('${id}','delivery')">Entregador</button>`);
    }

    if (["ready", "delivery"].includes(status)) {
      buttons.push(`<button class="ghost-button small success" onclick="window.EstablishmentPanel.updateOrderStatus('${id}','completed')">Concluir</button>`);
    }

    return buttons.join("");
  }


  function getActiveOrdersForAlert(orders) {
    return orders.filter(function (order) {
      return ["pending", "confirmed"].includes(normalizeOrderStatus(order.status));
    });
  }

  function renderOrders(searchTerm) {
    const table = document.getElementById("orders-table");
    if (!table) return;

    const term = String(searchTerm || "").trim().toLowerCase();
    const activeTab = getActiveOrderTab();

    const searchedOrders = state.orders.filter(function (order) {
      if (!term) return true;

      const haystack = [
        order.id,
        order.customer_name,
        order.status,
        order.customer_phone,
        getOrderSourceLabel(order)
      ].join(" ").toLowerCase();

      return haystack.includes(term);
    });

    const activeOrders = searchedOrders.filter(function (order) {
      return !isHistoryOrder(order);
    });

    const historyOrders = searchedOrders.filter(function (order) {
      return isHistoryOrder(order);
    });

    const urgentOrders = getActiveOrdersForAlert(activeOrders);

    const normalActiveOrders = activeOrders.filter(function (order) {
      return !["pending", "confirmed"].includes(normalizeOrderStatus(order.status));
    });

    const visibleOrders = activeTab === "history" ? historyOrders : normalActiveOrders;

    const pending = activeOrders.filter(o => normalizeOrderStatus(o.status) === "pending").length;
    const kitchen = activeOrders.filter(o => ["kitchen", "preparing"].includes(normalizeOrderStatus(o.status))).length;
    const ready = activeOrders.filter(o => ["ready", "delivery"].includes(normalizeOrderStatus(o.status))).length;
    const completedToday = historyOrders.filter(o => ["completed", "delivered"].includes(normalizeOrderStatus(o.status))).length;

    const summaryHTML = `
      <div class="orders-summary">
        <div class="orders-summary-card warning">
          <strong>${pending}</strong>
          <span>Aguardando</span>
        </div>
        <div class="orders-summary-card info">
          <strong>${kitchen}</strong>
          <span>Cozinha</span>
        </div>
        <div class="orders-summary-card success">
          <strong>${ready}</strong>
          <span>Prontos/entrega</span>
        </div>
        <div class="orders-summary-card neutral">
          <strong>${completedToday}</strong>
          <span>Histórico</span>
        </div>
      </div>
    `;

    const tabsHTML = `
      <div class="orders-tabs" id="orders-workspace" data-active-tab="${activeTab}">
        <button type="button" class="${activeTab === "active" ? "active" : ""}" onclick="window.EstablishmentPanel.setOrdersTab('active')">
          Gestão de pedidos
          <span>${activeOrders.length}</span>
        </button>

        <button type="button" class="${activeTab === "history" ? "active" : ""}" onclick="window.EstablishmentPanel.setOrdersTab('history')">
          Histórico de pedidos
          <span>${historyOrders.length}</span>
        </button>
      </div>
    `;

    const urgentHTML = activeTab === "active" && urgentOrders.length
      ? `
        <section class="incoming-orders-alert">
          <div class="incoming-orders-head">
            <div>
              <span class="panel-kicker">Pedidos chegando</span>
              <h3>${urgentOrders.length} pedido(s) precisam de atualização</h3>
              <p>Esses pedidos ficam no topo até serem aceitos, enviados para preparo ou finalizados.</p>
            </div>
            <strong>⚡</strong>
          </div>

          <div class="incoming-orders-list">
            ${urgentOrders.map(function (order) {
              const status = normalizeOrderStatus(order.status);

              return `
                <article class="incoming-order-card incoming-order-square">
                  <div class="incoming-order-top">
                    <div class="incoming-order-pulse">!</div>
                    <span class="order-status ${getOrderStatusClass(status)}">${getOrderStatusLabel(status)}</span>
                  </div>

                  <div class="incoming-order-content">
                    <strong>Pedido #${String(order.id).slice(0, 8)}</strong>
                    <span>${order.customer_name || "Cliente"}</span>
                    <small>${getOrderSourceLabel(order)} • ${formatDate(order.created_at)}</small>
                    <b>${formatMoney(order.total_amount || 0)}</b>
                  </div>

                  <div class="incoming-order-actions">
                    <button class="ghost-button small" onclick="window.EstablishmentPanel.showOrderDetails('${order.id}')">Detalhes</button>
                    ${getOrderActionButtons(order)}
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        </section>
      `
      : "";

    const listHTML = visibleOrders.length
      ? visibleOrders.map(function (order) {
          const status = normalizeOrderStatus(order.status);

          return `
            <article class="order-card order-management-card">
              <div class="order-left">
                <div class="order-avatar">#</div>

                <div class="order-content">
                  <strong>Pedido #${String(order.id).slice(0, 8)}</strong>
                  <span>${order.customer_name || "Cliente"} • ${getOrderSourceLabel(order)} • ${formatDate(order.created_at)}</span>
                  <span class="order-price">${formatMoney(order.total_amount || 0)}</span>
                </div>
              </div>

              <div class="order-right">
                <span class="order-status ${getOrderStatusClass(status)}">
                  ${getOrderStatusLabel(status)}
                </span>

                <div class="order-actions order-flow-actions">
                  <button class="ghost-button small" onclick="window.EstablishmentPanel.showOrderDetails('${order.id}')">
                    Detalhes
                  </button>

                  ${activeTab === "active" ? getOrderActionButtons(order) : ""}
                </div>
              </div>
            </article>
          `;
        }).join("")
      : emptyState(activeTab === "history" ? "Nenhum pedido no histórico." : "Nenhum pedido em andamento.");

    table.innerHTML = summaryHTML + tabsHTML + urgentHTML + renderManualOrderForm() + `<div class="orders-list">${listHTML}</div>`;
  }


 function renderProducts() {
  const table = document.getElementById("products-table");
  if (!table) return;

  const orderedCategories = sortCategoriesForMenu(state.categories);
  const productsByCategory = [];

  orderedCategories.forEach(function (category) {
    const categoryId = normalizeUuidValue(category.id);
    const items = sortProductsForMenu(
      state.products.filter(function (product) {
        return String(normalizeUuidValue(product.category_id)) === String(categoryId);
      })
    );

    if (items.length) {
      productsByCategory.push({
        id: categoryId,
        name: category.name || "Categoria",
        items
      });
    }
  });

  const uncategorized = sortProductsForMenu(
    state.products.filter(function (product) {
      return !normalizeUuidValue(product.category_id);
    })
  );

  if (uncategorized.length) {
    productsByCategory.push({
      id: "__sem_categoria__",
      name: "Sem categoria",
      items: uncategorized
    });
  }

  table.innerHTML = productsByCategory.length
    ? productsByCategory.map(function (group) {
        return `
          <section class="catalog-order-group">
            <div class="catalog-order-head">
              <strong>${group.name}</strong>
              <span>${group.items.length} produto(s)</span>
            </div>

            <div class="catalog-order-list">
              ${group.items.map(function (product, index) {
                const isFirst = index === 0;
                const isLast = index === group.items.length - 1;

                return `
                  <article class="catalog-card product-row-enhanced">
                    <div class="catalog-card-left">
                      <div class="catalog-order-controls" aria-label="Ordenar produto">
                        <button
                          type="button"
                          class="order-icon-button"
                          ${isFirst ? "disabled" : ""}
                          onclick="window.EstablishmentPanel.moveProduct('${product.id}', 'up')"
                          title="Subir produto"
                        >↑</button>

                        <button
                          type="button"
                          class="order-icon-button"
                          ${isLast ? "disabled" : ""}
                          onclick="window.EstablishmentPanel.moveProduct('${product.id}', 'down')"
                          title="Descer produto"
                        >↓</button>
                      </div>

                      <div class="catalog-avatar product-avatar-enhanced">
                        ${(product.name || "P").charAt(0).toUpperCase()}
                      </div>

                      <div class="catalog-card-content">
                        <div class="catalog-card-title-row">
                          <strong>${product.name || "Produto"}</strong>
                          <span class="pro-status-badge ${isProductActive(product) ? "success" : "neutral"}">
                            ${isProductActive(product) ? "Ativo" : "Inativo"}
                          </span>
                        </div>

                        <div class="catalog-meta">
                  <span>${getCategoryDisplayName(product.category_id)}</span>
                </div>
                      </div>
                    </div>

                    <div class="catalog-card-right">
                      <div class="product-price-block">
                        <small>Preço</small>
                        <strong>${formatMoney(getProductPrice(product))}</strong>
                      </div>

                      <div class="catalog-actions">
                        <button
                          type="button"
                          class="ghost-button small"
                          onclick="window.EstablishmentPanel.editProduct('${product.id}')"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          class="ghost-button small danger"
                          onclick="window.EstablishmentPanel.deleteProduct('${product.id}')"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </article>
                `;
              }).join("")}
            </div>
          </section>
        `;
      }).join("")
    : emptyState("Nenhum produto cadastrado.");
}

function renderCategories() {
  const table = document.getElementById("categories-table");
  if (!table) return;

  const categories = sortCategoriesForMenu(state.categories);

  table.innerHTML = categories.length
    ? categories.map(function (category, index) {
        const linkedProducts = state.products.filter(function (product) {
          return String(normalizeUuidValue(product.category_id)) === String(normalizeUuidValue(category.id));
        }).length;

        const isFirst = index === 0;
        const isLast = index === categories.length - 1;

        return `
          <article class="catalog-card category-row-enhanced">
            <div class="catalog-card-left">
              <div class="catalog-order-controls" aria-label="Ordenar categoria">
                <button
                  type="button"
                  class="order-icon-button"
                  ${isFirst ? "disabled" : ""}
                  onclick="window.EstablishmentPanel.moveCategory('${category.id}', 'up')"
                  title="Subir categoria"
                >↑</button>

                <button
                  type="button"
                  class="order-icon-button"
                  ${isLast ? "disabled" : ""}
                  onclick="window.EstablishmentPanel.moveCategory('${category.id}', 'down')"
                  title="Descer categoria"
                >↓</button>
              </div>

              <div class="catalog-avatar category-avatar-enhanced">
                ${(category.name || "C").charAt(0).toUpperCase()}
              </div>

              <div class="catalog-card-content">
                <div class="catalog-card-title-row">
                  <strong>${category.name || "Categoria"}</strong>
                  <span class="pro-status-badge ${category.active === false ? "neutral" : "success"}">
                    ${category.active === false ? "Inativa" : "Ativa"}
                  </span>
                </div>

                <div class="catalog-meta">
                  <span>${category.description || "Sem descrição"}</span>
                  <span>•</span>
                  <span>${linkedProducts} produto(s)</span>
                </div>
              </div>
            </div>

            <div class="catalog-card-right">
              <div class="catalog-actions">
                <button
                  type="button"
                  class="ghost-button small"
                  onclick="window.EstablishmentPanel.editCategory('${category.id}')"
                >
                  Editar
                </button>

                <button
                  type="button"
                  class="ghost-button small danger"
                  onclick="window.EstablishmentPanel.deleteCategory('${category.id}')"
                >
                  Excluir
                </button>
              </div>
            </div>
          </article>
        `;
      }).join("")
    : emptyState("Nenhuma categoria cadastrada.");
}

  function renderInventory() {
    const inventoryTable = document.getElementById("inventory-table");
    const movementsList = document.getElementById("inventory-movements-list");
    if (!inventoryTable || !movementsList) return;

    if (!hasFeature("inventory_management")) {
      inventoryTable.innerHTML = lockedFeatureCard("Este recurso faz parte do plano Standard e superiores.");
      movementsList.innerHTML = "";
      return;
    }

    inventoryTable.innerHTML = state.products.length
      ? state.products.map(function (product) {
          const low = Number(product.stock_quantity || 0) <= Number(product.stock_min_quantity || 0);

          return `
            <article class="pro-store-row">
              <div class="pro-store-row-left">
                <div class="pro-avatar">${(product.name || "I").charAt(0).toUpperCase()}</div>
                <div class="pro-store-row-content">
                  <strong>${product.name || "Produto"}</strong>
                  <span>Custo: ${formatMoney(product.cost_price || 0)} • Venda: ${formatMoney(product.sale_price || 0)}</span>
                </div>
              </div>

              <div class="pro-store-row-right">
                <span class="pro-status-badge ${low ? "warning" : "success"}">
                  Estoque ${Number(product.stock_quantity || 0)}
                </span>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Sem produtos para controle de estoque.");

    movementsList.innerHTML = state.inventoryMovements.length
      ? state.inventoryMovements.slice(0, 8).map(function (movement) {
          return `
            <article class="pro-list-card">
              <div class="pro-list-main">
                <div class="pro-list-content">
                  <strong>${humanizeMovement(movement.movement_type || "movimentação")}</strong>
                  <span>Qtd: ${movement.quantity || 0} • ${formatDate(movement.created_at)}</span>
                </div>
                <span class="pro-status-badge neutral">${formatMoney(movement.total_cost || 0)}</span>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Nenhuma movimentação de estoque encontrada.");
  }

  function renderTables() {
    const tablesTable = document.getElementById("tables-table");
    if (!tablesTable) return;

    if (!hasFeature("table_qr_code")) {
      tablesTable.innerHTML = lockedFeatureCard("O módulo de mesas fica disponível a partir do plano Premium.");
      return;
    }

    tablesTable.innerHTML = state.tables.length
      ? state.tables.map(function (table) {
          return `
            <article class="pro-store-row">
              <div class="pro-store-row-left">
                <div class="pro-avatar">M</div>
                <div class="pro-store-row-content">
                  <strong>Mesa ${table.table_number || "—"}</strong>
                  <span>${table.qr_code_url || table.qr_code_value || "QR code não gerado"}</span>
                </div>
              </div>

              <div class="pro-store-row-right">
                <span class="pro-status-badge ${table.active === false ? "neutral" : "success"}">
                  ${table.active === false ? "Inativa" : "Ativa"}
                </span>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Nenhuma mesa cadastrada para a loja.");
  }

  function renderFinance() {
    const revenue = document.getElementById("finance-revenue");
    const cost = document.getElementById("finance-cost");
    const profitBefore = document.getElementById("finance-profit-before");
    const profitAfter = document.getElementById("finance-profit-after");
    const summary = document.getElementById("finance-summary-list");

    if (revenue) revenue.textContent = formatMoney(state.finance.grossRevenue);
    if (cost) cost.textContent = formatMoney(state.finance.totalCost);
    if (profitBefore) profitBefore.textContent = formatMoney(state.finance.profitBefore);
    if (profitAfter) profitAfter.textContent = formatMoney(state.finance.profitAfter);

    if (summary) {
      const items = [
        summaryItem("Plano atual", getPlanLabel()),
        summaryItem("Comissão Dooki", `${String(getCommissionPercent()).replace(".", ",")}%`),
        summaryItem("Marca d’água", isWatermarkEnabled() ? "Com Dooki" : "Sem marca"),
        summaryItem("Suporte", hasFeature("support_24h") ? "24h" : "Ticket padrão")
      ];

      if (hasFeature("profit_analysis")) {
        items.push(summaryItem("Análise de gastos/ganhos", "Liberada"));
      }

      if (hasFeature("split_bill")) {
        items.push(summaryItem("Divisão de conta", "Liberada"));
      }

      if (hasFeature("custom_packaging")) {
        items.push(summaryItem("Embalagens Dooki", "Incluídas"));
      }

      summary.innerHTML = items.join("");
    }
  }

  function renderSupport() {
    const table = document.getElementById("support-tickets-table");
    if (!table) return;

    if (!hasFeature("ticket_support")) {
      table.innerHTML = lockedFeatureCard("O suporte por ticket não está disponível para este plano.");
      return;
    }

    table.innerHTML = state.tickets.length
      ? state.tickets.map(function (ticket) {
          const priorityClass = getPriorityClass(ticket.priority);

          return `
            <article class="pro-support-card">
              <div class="pro-support-main">
                <div class="pro-store-row-content">
                  <strong>${ticket.subject || "Sem assunto"}</strong>
                  <span>${ticket.last_message || "Sem mensagem"} • ${formatDate(ticket.created_at)}</span>
                </div>
                <div class="pro-action-group">
                  <span class="pro-priority-badge ${priorityClass}">${ticket.priority || "Baixa"}</span>
                  <span class="pro-status-badge ${getTicketStatusClass(ticket.status)}">${ticket.status || "aberto"}</span>
                </div>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Nenhum ticket aberto pela loja.");
  }

  function fillSettingsForm() {
    const settingsName = document.getElementById("settings-name");
    const settingsCity = document.getElementById("settings-city");
    const settingsEmail = document.getElementById("settings-email");
    const settingsWhatsapp = document.getElementById("settings-whatsapp");
    const settingsLogoUrl = document.getElementById("settings-logo-url");
    const settingsBannerUrl = document.getElementById("settings-banner-url");

    if (settingsName) settingsName.value = state.establishment?.name || "";
    if (settingsCity) settingsCity.value = state.establishment?.city || "";
    if (settingsEmail) settingsEmail.value = state.establishment?.email || "";
    if (settingsWhatsapp) settingsWhatsapp.value = state.establishment?.whatsapp || "";
    if (settingsLogoUrl) settingsLogoUrl.value = state.establishment?.logo_url || "";
    if (settingsBannerUrl) settingsBannerUrl.value = state.establishment?.banner_url || "";
  }

  function quickActionButton(label, screen, enabled) {
    return `
      <button class="quick-action-card ${enabled ? "" : "locked"}" type="button" onclick="window.EstablishmentPanel.goTo('${screen}')">
        <strong>${label}</strong>
        <span>${enabled ? "Abrir módulo" : "Disponível em outro plano"}</span>
      </button>
    `;
  }

  function summaryItem(label, value) {
    return `
      <div class="pro-summary-item">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `;
  }

  function emptyState(message) {
    return `
      <div class="pro-empty-state">
        <strong>Nada por aqui ainda</strong>
        <span>${message}</span>
      </div>
    `;
  }

  function lockedFeatureCard(message) {
    return `
      <div class="locked-feature-card">
        <h3>Recurso indisponível no seu plano</h3>
        <p>${message}</p>
      </div>
    `;
  }

  function humanizeFeature(key) {
    const map = {
    digital_menu: "Cardápio digital",
    delivery_orders: "Pedidos por delivery",
    establishment_panel: "Painel do estabelecimento",
    full_dashboard: "Dashboard completo",
    inventory_management: "Gestão de estoque",
    ticket_support: "Suporte por ticket",
    menu_qr_code: "QR do cardápio",
    table_qr_code: "QR por mesa",
    table_ordering: "Pedidos na mesa",
    profit_analysis: "Análise de gastos e ganhos",
    split_bill: "Divisão de conta",
    group_orders: "Pedidos interligados por grupo",
    support_24h: "Suporte 24h",
    custom_packaging: "Embalagens personalizadas",
    table_qr_stands: "Suportes físicos QR",
    dooki_watermark: "Remoção da marca d’água da Dooki"
  };

  return map[key] || key;
}

  function humanizeMovement(type) {
    const map = {
      sale: "Venda",
      purchase: "Compra",
      manual_adjustment: "Ajuste manual",
      waste: "Perda",
      return: "Devolução"
    };

    return map[type] || type;
  }

  function getOrderStatusClass(status) {
    const value = String(status || "").toLowerCase();
    if (["completed", "delivered", "ready"].includes(value)) return "success";
    if (["preparing", "confirmed", "kitchen", "delivery"].includes(value)) return "info";
    if (["pending", "pendente"].includes(value)) return "warning";
    if (["cancelled", "refused"].includes(value)) return "danger";
    return "neutral";
  }

  function getTicketStatusClass(status) {
    const value = String(status || "").toLowerCase();
    if (["aberto", "open"].includes(value)) return "warning";
    if (["resolvido", "fechado", "closed"].includes(value)) return "success";
    if (["andamento", "em andamento", "progress"].includes(value)) return "info";
    return "neutral";
  }

  function getPriorityClass(priority) {
    const value = String(priority || "").toLowerCase();
    if (["crítica", "critica", "alta", "high", "critical"].includes(value)) return "danger";
    if (["média", "media", "medium"].includes(value)) return "warning";
    return "neutral";
  }


  function getProductPrice(product) {
    return Number(
      product?.sale_price ??
      product?.price ??
      product?.unit_price ??
      0
    );
  }

  function getProductStock(product) {
    return Number(product?.stock_quantity ?? product?.stock ?? 0);
  }

  function getProductMinStock(product) {
    return Number(product?.stock_min_quantity ?? product?.min_stock ?? 0);
  }

  function buildManualOrderPayload(customerName, customerPhone, notes, totalAmount) {
    return {
      establishment_id: state.membership.establishment_id,
      customer_name: customerName || "Pedido manual",
      customer_phone: customerPhone || null,
      status: "pending",
      source: "manual",
      notes: notes || null,
      total_amount: totalAmount,
      completed_at: null
    };
  }

  function isMissingColumnError(error) {
    const message = String(error?.message || "").toLowerCase();
    return message.includes("column") || message.includes("schema cache") || message.includes("could not find");
  }

  async function insertOrderWithFallback(payload) {
    const client = getClient();

    let { data, error } = await client
      .from("orders")
      .insert([payload])
      .select()
      .single();

    if (!error) return data;

    if (!isMissingColumnError(error)) throw error;

    const fallbackPayload = {
      establishment_id: payload.establishment_id,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      status: payload.status,
      total_amount: payload.total_amount
    };

    const retry = await client
      .from("orders")
      .insert([fallbackPayload])
      .select()
      .single();

    if (retry.error) throw retry.error;
    return retry.data;
  }

  async function insertOrderItemsWithFallback(orderId, items) {
    const client = getClient();
    if (!orderId || !items.length) return;

    const rows = items.map(function (item) {
      return {
        order_id: orderId,
        establishment_id: state.membership.establishment_id,
        product_id: normalizeUuidValue(item.product.id),
        product_name: item.product.name || "Produto",
        quantity: Number(item.quantity || 1),
        unit_price: getProductPrice(item.product),
        total_price: getProductPrice(item.product) * Number(item.quantity || 1)
      };
    });

    const { error } = await client.from("order_items").insert(rows);

    if (!error) return;

    if (!isMissingColumnError(error)) {
      console.warn("Não foi possível salvar itens do pedido.", error);
      return;
    }

    const fallbackRows = rows.map(function (row) {
      return {
        order_id: row.order_id,
        product_id: row.product_id,
        quantity: row.quantity,
        unit_price: row.unit_price,
        total_price: row.total_price
      };
    });

    const retry = await client.from("order_items").insert(fallbackRows);
    if (retry.error) {
      console.warn("Não foi possível salvar itens do pedido com fallback.", retry.error);
    }
  }

  async function decrementProductStock(items) {
    const client = getClient();

    for (const item of items) {
      const productId = normalizeUuidValue(item.product.id);
      if (!productId) continue;

      const currentStock = getProductStock(item.product);
      const nextStock = Math.max(0, currentStock - Number(item.quantity || 1));

      const { error } = await client
        .from("products")
        .update({ stock_quantity: nextStock })
        .eq("id", productId)
        .eq("establishment_id", state.membership.establishment_id);

      if (error) {
        console.warn("Não foi possível atualizar estoque do produto.", error);
      }
    }
  }

  function isProductActive(product) {
    if (product?.active != null) return product.active !== false;
    if (product?.is_active != null) return product.is_active !== false;
    return true;
  }

  function getCategoryNameById(categoryId) {
    const category = state.categories.find(function (item) {
      return String(normalizeUuidValue(item.id)) === String(normalizeUuidValue(categoryId));
    });
    return category?.name || "";
  }

  async function createProductRecord(payload) {
    const client = getClient();

    const safePayload = {
      establishment_id: payload.establishment_id,
      name: payload.name,
      category_id: normalizeUuidValue(payload.category_id),
      description: payload.description,
      sale_price: Number(payload.sale_price || 0),
      cost_price: Number(payload.cost_price || 0),
      stock_quantity: Number(payload.stock_quantity || 0),
      stock_min_quantity: Number(payload.stock_min_quantity || 0),
      active: payload.active !== false
    };

    const { data, error } = await client
      .from("products")
      .insert([safePayload])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function updateProductRecord(productId, payload) {
    const client = getClient();
    const safeProductId = normalizeUuidValue(productId);

    if (!safeProductId) {
      throw new Error("ID do produto inválido.");
    }

    const safePayload = {
      name: payload.name,
      category_id: normalizeUuidValue(payload.category_id),
      description: payload.description,
      sale_price: Number(payload.sale_price || 0),
      cost_price: Number(payload.cost_price || 0),
      stock_quantity: Number(payload.stock_quantity || 0),
      stock_min_quantity: Number(payload.stock_min_quantity || 0),
      active: payload.active !== false
    };

    const { data, error } = await client
      .from("products")
      .update(safePayload)
      .eq("id", safeProductId)
      .eq("establishment_id", state.membership.establishment_id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function deleteProductRecord(productId) {
    const client = getClient();
    const safeProductId = normalizeUuidValue(productId);

    if (!safeProductId) {
      throw new Error("ID do produto inválido.");
    }

    const { error } = await client
      .from("products")
      .delete()
      .eq("id", safeProductId)
      .eq("establishment_id", state.membership.establishment_id);

    if (error) throw error;
    return true;
  }

  async function createCategoryRecord(payload) {
    if (window.DookiData?.createCategory) {
      return window.DookiData.createCategory(payload);
    }

    const client = getClient();
    const { data, error } = await client.from("categories").insert([payload]).select().single();
    if (error) throw error;
    return data;
  }

  async function updateCategoryRecord(categoryId, payload) {
    const safeCategoryId = normalizeUuidValue(categoryId);

    if (!safeCategoryId) {
      throw new Error("ID da categoria inválido.");
    }

    if (window.DookiData?.updateCategory) {
      return window.DookiData.updateCategory(safeCategoryId, payload, state.membership.establishment_id);
    }

    const client = getClient();
    const { data, error } = await client
      .from("categories")
      .update(payload)
      .eq("id", safeCategoryId)
      .eq("establishment_id", state.membership.establishment_id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function deleteCategoryRecord(categoryId) {
    const safeCategoryId = normalizeUuidValue(categoryId);

    if (!safeCategoryId) {
      throw new Error("ID da categoria inválido.");
    }

    if (window.DookiData?.deleteCategory) {
      return window.DookiData.deleteCategory(safeCategoryId, state.membership.establishment_id);
    }

    const client = getClient();
    const { error } = await client
      .from("categories")
      .delete()
      .eq("id", safeCategoryId)
      .eq("establishment_id", state.membership.establishment_id);

    if (error) throw error;
    return true;
  }

  function getPublicMenuUrl() {
    const establishmentId = state.membership?.establishment_id || state.establishment?.id || "";
    const search = establishmentId ? `?establishment=${encodeURIComponent(establishmentId)}` : "";
    return `/menu/menu.html${search}`;
  }

  function refreshMenuPreview() {
    const activeCategoryId = document.getElementById("menu-preview-tabs")?.dataset?.activeCategoryId || "";
    renderMenuPreview(activeCategoryId);
  }

  function renderMenuPreview(activeCategoryId) {
    const banner = document.getElementById("menu-preview-banner");
    const logo = document.getElementById("menu-preview-logo");
    const name = document.getElementById("menu-preview-name");
    const city = document.getElementById("menu-preview-city");
    const description = document.getElementById("menu-preview-description");
    const tabs = document.getElementById("menu-preview-tabs");
    const list = document.getElementById("menu-preview-list");
    const openLink = document.getElementById("menu-preview-open");

    if (!banner || !logo || !name || !city || !description || !tabs || !list) return;

    const bannerUrl = resolveMediaUrl(state.establishment?.banner_url, "");
    const logoUrl = resolveMediaUrl(state.establishment?.logo_url, "/assets/logo-dooki.png");

    banner.style.backgroundImage = bannerUrl && bannerUrl !== "/assets/logo-dooki.png"
      ? `linear-gradient(135deg, rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.02)), url("${bannerUrl}")`
      : 'linear-gradient(135deg, rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.02)), linear-gradient(135deg, rgba(218, 165, 32, 0.38), rgba(184, 134, 11, 0.52))';
    applyImageWithFallback(logo, logoUrl, "/assets/logo-dooki.png");
    name.textContent = state.establishment?.name || "Minha Loja";
    city.textContent = "";
    description.textContent = state.establishment?.description || "";

    if (openLink) {
      openLink.href = getPublicMenuUrl();
    }

    const categories = sortCategoriesForMenu(
      state.categories.filter(function (category) { return category.active !== false; })
    );

    const visibleProducts = state.products.filter(function (product) {
      return isProductActive(product);
    });

    const groups = categories.map(function (category) {
      const items = sortProductsForMenu(
        visibleProducts.filter(function (product) {
          return String(normalizeUuidValue(product.category_id) || "") === String(normalizeUuidValue(category.id));
        })
      );
      return { category, items };
    }).filter(function (group) {
      return group.items.length > 0;
    });


    const currentCategoryId = activeCategoryId || tabs.dataset.activeCategoryId || groups[0]?.category?.id || "";

    tabs.innerHTML = groups.length
      ? groups.map(function (group) {
          const active = String(normalizeUuidValue(group.category.id) || group.category.id) === String(normalizeUuidValue(currentCategoryId) || currentCategoryId);
          return `<button type="button" class="menu-preview-tab ${active ? "active" : ""}" data-preview-category-id="${group.category.id}">${group.category.name}</button>`;
        }).join("")
      : "";

    tabs.dataset.activeCategoryId = currentCategoryId;

    const selectedGroups = groups.length
      ? groups.filter(function (group) {
          return !currentCategoryId || String(normalizeUuidValue(group.category.id) || group.category.id) === String(normalizeUuidValue(currentCategoryId) || currentCategoryId);
        })
      : [];

    list.innerHTML = selectedGroups.length
      ? selectedGroups.map(function (group) {
          return `
            <section class="menu-preview-category">
              <div class="menu-preview-category-title">${group.category.name}</div>
              ${group.items.slice(0, 8).map(function (product) {
                return `
                  <article class="menu-preview-item">
                    <div>
                      <strong>${product.name || "Produto"}</strong>
                      <p>${product.description || "Descrição não informada."}</p>
                    </div>
                    <div class="menu-preview-price">${formatMoney(getProductPrice(product))}</div>
                  </article>
                `;
              }).join("")}
            </section>
          `;
        }).join("")
      : `<div class="menu-preview-empty">Cadastre categorias e produtos para visualizar o cardápio digital aqui.</div>`;

    tabs.querySelectorAll("[data-preview-category-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        renderMenuPreview(button.dataset.previewCategoryId);
      });
    });
  }

  function rerenderAllPanels() {
    renderHeader();
    renderSidebar();
    renderDashboard();
    renderProducts();
    renderCategories();
    renderInventory();
    renderTables();
    renderFinance();
    renderSupport();
    fillSettingsForm();
    refreshMenuPreview();
  }

  async function refreshAllData(options = {}) {
    if (state.refreshInFlight) return;
    state.refreshInFlight = true;

    try {
      await loadAllData();
      rerenderAllPanels();
    } catch (error) {
      if (!options.silent) {
        console.error("Erro ao atualizar painel do estabelecimento:", error);
      }
    } finally {
      state.refreshInFlight = false;
    }
  }

  function startAutoRefresh() {
    if (state.refreshHandle) return;

    const client = getClient();
    const establishmentId = state.membership?.establishment_id;

    if (client?.channel && establishmentId) {
      try {
        const channel = client
          .channel(`establishment-live-${establishmentId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "establishments", filter: `id=eq.${establishmentId}` },
            function () { refreshAllData({ silent: true }); }
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "establishment_subscriptions", filter: `establishment_id=eq.${establishmentId}` },
            function () { refreshAllData({ silent: true }); }
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "categories", filter: `establishment_id=eq.${establishmentId}` },
            function () { refreshAllData({ silent: true }); }
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "products", filter: `establishment_id=eq.${establishmentId}` },
            function () { refreshAllData({ silent: true }); }
          )
          .subscribe();

        state.refreshChannel = channel;
      } catch (error) {
        console.warn("Realtime do estabelecimento indisponível, usando atualização periódica.", error);
      }
    }

    state.refreshHandle = window.setInterval(function () {
      if (!document.hidden) {
        refreshAllData({ silent: true });
      }
    }, 12000);

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        refreshAllData({ silent: true });
      }
    });

    window.addEventListener("focus", function () {
      refreshAllData({ silent: true });
    });
  }

  async function handleCreateProduct(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const editingId = form.dataset.editingId || null;
  const selectedCategoryId = normalizeUuidValue(
    formData.get("category_id") ||
    document.getElementById("product-category-select")?.value ||
    form.querySelector('[name="category_id"]')?.value
  );

  const payload = {
    establishment_id: state.membership.establishment_id,
    name: String(formData.get("name") || "").trim(),
    category_id: selectedCategoryId,
    description: String(formData.get("description") || "").trim(),
    sale_price: Number(formData.get("sale_price") || 0),
    cost_price: Number(formData.get("cost_price") || 0),
    stock_quantity: Number(formData.get("stock_quantity") || 0),
    stock_min_quantity: Number(formData.get("stock_min_quantity") || 0),
    active: true
  };

  if (!payload.name) {
    alert("Informe o nome do produto.");
    return;
  }

  try {
    if (editingId) {
      await updateProductRecord(editingId, {
        name: payload.name,
        category_id: payload.category_id,
        description: payload.description,
        sale_price: payload.sale_price,
        cost_price: payload.cost_price,
        stock_quantity: payload.stock_quantity,
        stock_min_quantity: payload.stock_min_quantity,
        active: true
      });
    } else {
      await createProductRecord(payload);
    }

    form.reset();
    delete form.dataset.editingId;
    resetProductFormMode();

    await loadAllData();
    populateCategorySelect();
    renderProducts();
    renderDashboard();
    renderInventory();
    refreshMenuPreview();

    alert(editingId ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.");
  } catch (error) {
    console.error("Erro ao salvar produto:", error);
    alert(error.message || "Não foi possível salvar o produto.");
  }
}

function resetProductFormMode() {
  const form = document.getElementById("product-form");
  if (!form) return;

  delete form.dataset.editingId;

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "Cadastrar produto";
  }

  const cancelButton = document.getElementById("product-cancel-edit");
  if (cancelButton) {
    cancelButton.remove();
  }
}

function ensureProductCancelButton() {
  const form = document.getElementById("product-form");
  if (!form) return null;

  let cancelButton = document.getElementById("product-cancel-edit");
  if (cancelButton) return cancelButton;

  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) return null;

  cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.id = "product-cancel-edit";
  cancelButton.className = "ghost-button";
  cancelButton.textContent = "Cancelar edição";
  cancelButton.style.marginTop = "12px";

  cancelButton.addEventListener("click", function () {
    form.reset();
    resetProductFormMode();
  });

  submitButton.insertAdjacentElement("afterend", cancelButton);
  return cancelButton;
}

function editProduct(productId) {
  const product = state.products.find(function (item) {
    return String(normalizeUuidValue(item.id)) === String(normalizeUuidValue(productId));
  });

  if (!product) {
    alert("Produto não encontrado.");
    return;
  }

  const form = document.getElementById("product-form");
  if (!form) return;

  const nameInput = form.querySelector('[name="name"]');
  const categoryInput = form.querySelector('[name="category_id"]');
  const salePriceInput = form.querySelector('[name="sale_price"]');
  const costPriceInput = form.querySelector('[name="cost_price"]');
  const stockQuantityInput = form.querySelector('[name="stock_quantity"]');
  const stockMinQuantityInput = form.querySelector('[name="stock_min_quantity"]');
  const descriptionInput = form.querySelector('[name="description"]');
  const submitButton = form.querySelector('button[type="submit"]');

  if (nameInput) nameInput.value = product.name || "";
  if (categoryInput) categoryInput.value = normalizeUuidValue(product.category_id) || "";
  if (salePriceInput) salePriceInput.value = product.sale_price ?? 0;
  if (costPriceInput) costPriceInput.value = product.cost_price ?? 0;
  if (stockQuantityInput) stockQuantityInput.value = product.stock_quantity ?? 0;
  if (stockMinQuantityInput) stockMinQuantityInput.value = product.stock_min_quantity ?? 0;
  if (descriptionInput) descriptionInput.value = product.description || "";

  form.dataset.editingId = product.id;

  if (submitButton) {
    submitButton.textContent = "Salvar produto";
  }

  ensureProductCancelButton();
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteProduct(productId) {
  const product = state.products.find(function (item) {
    return String(normalizeUuidValue(item.id)) === String(normalizeUuidValue(productId));
  });

  if (!product) {
    alert("Produto não encontrado.");
    return;
  }

  const confirmed = window.confirm(`Deseja excluir o produto "${product.name}"?`);
  if (!confirmed) return;

  try {
    await deleteProductRecord(productId);

    state.products = state.products.filter(function (item) {
      return String(normalizeUuidValue(item.id)) !== String(normalizeUuidValue(productId));
    });

    await loadAllData();
    populateCategorySelect();
    renderProducts();
    renderDashboard();
    renderInventory();
    refreshMenuPreview();
    resetProductFormMode();

    alert("Produto excluído com sucesso.");
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    alert(error.message || "Não foi possível excluir o produto.");
  }
}

 async function handleCreateCategory(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  const editingId = form.dataset.editingId || null;

  const payload = {
    establishment_id: state.membership.establishment_id,
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    active: true
  };

  if (!payload.name) {
    alert("Informe o nome da categoria.");
    return;
  }

  try {
    if (editingId) {
      await updateCategoryRecord(editingId, {
        name: payload.name,
        description: payload.description,
        active: payload.active
      });
    } else {
      await createCategoryRecord(payload);
    }

    form.reset();
    delete form.dataset.editingId;
    resetCategoryFormMode();

    await loadAllData();
    populateCategorySelect();
    renderCategories();
    renderProducts();
    renderDashboard();
    refreshMenuPreview();

    alert(editingId ? "Categoria atualizada com sucesso." : "Categoria cadastrada com sucesso.");
  } catch (error) {
    console.error("Erro ao salvar categoria:", error);
    alert(error.message || "Não foi possível salvar a categoria.");
  }
}

function resetCategoryFormMode() {
  const form = document.getElementById("category-form");
  if (!form) return;

  delete form.dataset.editingId;

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "Cadastrar categoria";
  }

  let cancelButton = document.getElementById("category-cancel-edit");
  if (cancelButton) {
    cancelButton.remove();
  }
}

function ensureCategoryCancelButton() {
  const form = document.getElementById("category-form");
  if (!form) return;

  let cancelButton = document.getElementById("category-cancel-edit");
  if (cancelButton) return cancelButton;

  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) return null;

  cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.id = "category-cancel-edit";
  cancelButton.className = "ghost-button";
  cancelButton.textContent = "Cancelar edição";
  cancelButton.style.marginTop = "12px";

  cancelButton.addEventListener("click", function () {
    form.reset();
    resetCategoryFormMode();
  });

  submitButton.insertAdjacentElement("afterend", cancelButton);
  return cancelButton;
}

function editCategory(categoryId) {
  const category = state.categories.find(function (item) {
    return String(normalizeUuidValue(item.id)) === String(normalizeUuidValue(categoryId));
  });

  if (!category) {
    alert("Categoria não encontrada.");
    return;
  }

  const form = document.getElementById("category-form");
  if (!form) return;

  const nameInput = form.querySelector('[name="name"]');
  const descriptionInput = form.querySelector('[name="description"]');
  const submitButton = form.querySelector('button[type="submit"]');

  if (nameInput) nameInput.value = category.name || "";
  if (descriptionInput) descriptionInput.value = category.description || "";

  form.dataset.editingId = category.id;

  if (submitButton) {
    submitButton.textContent = "Salvar categoria";
  }

  ensureCategoryCancelButton();
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteCategory(categoryId) {
  const category = state.categories.find(function (item) {
    return String(normalizeUuidValue(item.id)) === String(normalizeUuidValue(categoryId));
  });

  if (!category) {
    alert("Categoria não encontrada.");
    return;
  }

  const confirmed = window.confirm(`Deseja excluir a categoria "${category.name}"?`);
  if (!confirmed) return;

  try {
    await deleteCategoryRecord(categoryId);

    state.categories = state.categories.filter(function (item) {
      return String(normalizeUuidValue(item.id)) !== String(normalizeUuidValue(categoryId));
    });

    await loadAllData();
    populateCategorySelect();
    renderCategories();
    renderProducts();
    renderDashboard();
    refreshMenuPreview();
    resetCategoryFormMode();

    alert("Categoria excluída com sucesso.");
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    alert(error.message || "Não foi possível excluir a categoria.");
  }
}

  async function handleCreateTable(event) {
    event.preventDefault();

    if (!hasFeature("table_qr_code")) {
      alert("Este recurso está disponível a partir do plano Premium.");
      return;
    }

    const client = getClient();
    const formData = new FormData(event.target);

    const payload = {
      establishment_id: state.membership.establishment_id,
      table_number: String(formData.get("table_number") || "").trim(),
      seats: Number(formData.get("seats") || 0) || null,
      qr_code_value: String(formData.get("qr_code_value") || "").trim() || null,
      qr_code_url: String(formData.get("qr_code_url") || "").trim() || null,
      active: true
    };

    try {
      const { error } = await client.from("establishment_tables").insert([payload]);
      if (error) throw error;

      event.target.reset();
      await loadAllData();
      renderTables();
      alert("Mesa cadastrada com sucesso.");
    } catch (error) {
      console.error("Erro ao cadastrar mesa:", error);
      alert(error.message || "Não foi possível cadastrar a mesa.");
    }
  }

  async function handleCreateTicket(event) {
    event.preventDefault();

    const client = getClient();
    const formData = new FormData(event.target);

    const payload = {
      establishment_id: state.membership.establishment_id,
      store_name: state.establishment?.name || "Loja",
      subject: String(formData.get("subject") || "").trim(),
      priority: String(formData.get("priority") || "Baixa"),
      status: "aberto",
      last_message: String(formData.get("message") || "").trim()
    };

    try {
      const { data, error } = await client
        .from("support_tickets")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (data?.id) {
        await client.from("support_ticket_messages").insert([{
          ticket_id: data.id,
          sender_type: "establishment",
          sender_name: state.establishment?.name || "Estabelecimento",
          message: payload.last_message
        }]);
      }

      event.target.reset();
      await loadAllData();
      renderSupport();
      renderDashboard();
      alert("Ticket aberto com sucesso.");
    } catch (error) {
      console.error("Erro ao abrir ticket:", error);
      alert(error.message || "Não foi possível abrir o ticket.");
    }
  }

  async function handleSaveSettings(event) {
    event.preventDefault();

    const client = getClient();
    const formData = new FormData(event.target);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      whatsapp: String(formData.get("whatsapp") || "").trim(),
      logo_url: String(formData.get("logo_url") || "").trim(),
      banner_url: String(formData.get("banner_url") || "").trim()
    };

    try {
      const { error } = await client
        .from("establishments")
        .update(payload)
        .eq("id", state.membership.establishment_id);

      if (error) throw error;

      await loadAllData();
      renderHeader();
      fillSettingsForm();
      refreshMenuPreview();
      alert("Dados do estabelecimento atualizados com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      alert(error.message || "Não foi possível salvar as configurações.");
    }
  }

  async function moveProduct(productId, direction) {
    const current = state.products.find(function (product) {
      return String(normalizeUuidValue(product.id)) === String(normalizeUuidValue(productId));
    });

    if (!current) {
      alert("Produto não encontrado.");
      return;
    }

    const sameScopeProducts = getProductsFromSameScope(productId);
    const reorderedScope = moveItemInList(sameScopeProducts, productId, direction);

    if (reorderedScope === sameScopeProducts) return;

    try {
      await updateSortOrder("products", reorderedScope, getProductOrderScope(current));

      state.products = state.products.map(function (product) {
        const updatedIndex = reorderedScope.findIndex(function (item) {
          return String(normalizeUuidValue(item.id)) === String(normalizeUuidValue(product.id));
        });

        return updatedIndex >= 0
          ? { ...product, sort_order: updatedIndex + 1 }
          : product;
      });

      renderProducts();
      refreshMenuPreview();
    } catch (error) {
      console.error("Erro ao ordenar produto:", error);
      alert(error.message || "Não foi possível ordenar o produto.");
    }
  }

  async function moveCategory(categoryId, direction) {
    const categories = sortCategoriesForMenu(state.categories);
    const reordered = moveItemInList(categories, categoryId, direction);

    if (reordered === categories) return;

    try {
      await updateSortOrder("categories", reordered, "all");

      state.categories = state.categories.map(function (category) {
        const updatedIndex = reordered.findIndex(function (item) {
          return String(normalizeUuidValue(item.id)) === String(normalizeUuidValue(category.id));
        });

        return updatedIndex >= 0
          ? { ...category, sort_order: updatedIndex + 1 }
          : category;
      });

      populateCategorySelect();
      renderCategories();
      renderProducts();
      refreshMenuPreview();
    } catch (error) {
      console.error("Erro ao ordenar categoria:", error);
      alert(error.message || "Não foi possível ordenar a categoria.");
    }
  }

  async function updateOrderStatus(orderId, status) {
    const client = getClient();
    const payload = { status: status };

    if (["completed", "delivered"].includes(status)) {
      payload.completed_at = new Date().toISOString();
    }

    if (["cancelled", "refused"].includes(status)) {
      payload.completed_at = null;
    }

    try {
      const { error } = await client
        .from("orders")
        .update(payload)
        .eq("id", orderId)
        .eq("establishment_id", state.membership.establishment_id);

      if (error) throw error;

      await loadAllData();
      const ordersSearch = document.getElementById("orders-search");
      renderOrders(ordersSearch ? ordersSearch.value || "" : "");
      renderDashboard();
      renderFinance();
      alert("Status do pedido atualizado.");
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      alert(error.message || "Não foi possível atualizar o pedido.");
    }
  }

  function goTo(screen) {
    openScreen(screen);
  }

  window.EstablishmentPanel = {
  goTo,
  updateOrderStatus,
  editCategory,
  deleteCategory,
  editProduct,
  deleteProduct,
  moveProduct,
  moveCategory,
  addManualOrderItem,
  removeManualOrderItem,
  createManualOrder,
  setOrdersTab,
  showOrderDetails,
  closeOrderDetails,
  copyDeliveryMenuLink,
  copyTableMenuLink,
  copyCurrentTableMenuLink,
  updateTableQrPreview
};
})();