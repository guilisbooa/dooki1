// =============================
// DOOKI ADMIN APP (REFORMULADO)
// =============================

const state = {
  admin: null,
  snapshot: {
    establishments: [],
    plans: [],
    orders: [],
    payments: [],
    tickets: []
  },
  selectedStoreId: null,
  selectedTicketId: null,
  selectedTicketMessages: [],
  selectedStoreCategories: [],
  selectedStoreProducts: [],
  editingCategoryId: null,
  editingProductId: null
};

const screenMeta = {
  dashboard: {
    title: "Visão geral",
    copy: "Centralize operação, crescimento, contas e suporte em uma única camada."
  },
  stores: {
    title: "Estabelecimentos",
    copy: "Gerencie a base de lojas, aprovações e dados principais."
  },
  plans: {
    title: "Planos",
    copy: "Controle monetização, ofertas e benefícios da plataforma."
  },
  payments: {
    title: "Pagamentos",
    copy: "Registre cobranças, acompanhe status e organize lançamentos."
  },
  support: {
    title: "Suporte",
    copy: "Visualize tickets e acompanhe o atendimento da operação."
  },
  reports: {
    title: "Relatórios",
    copy: "Acompanhe a saúde da plataforma e próximos passos."
  },
  "store-profile": {
    title: "Loja selecionada",
    copy: "Detalhes mais completos da conta escolhida."
  }
};

// =============================
// API HELPERS
// =============================

const api = {
  async createEstablishment(payload) {
    if (window.DookiData?.createEstablishment) {
      return window.DookiData.createEstablishment(payload);
    }

    const { data, error } = await window.supabaseClient
      .from("establishments")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEstablishment(id, payload) {
    if (window.DookiData?.updateEstablishment) {
      return window.DookiData.updateEstablishment(id, payload);
    }

    const { data, error } = await window.supabaseClient
      .from("establishments")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEstablishment(id) {
    if (window.DookiData?.deleteEstablishment) {
      return window.DookiData.deleteEstablishment(id);
    }

    const { error } = await window.supabaseClient
      .from("establishments")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  async createPlan(payload) {
    if (window.DookiData?.createPlan) {
      return window.DookiData.createPlan(payload);
    }

    const { data, error } = await window.supabaseClient
      .from("plans")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createPayment(payload) {
    if (window.DookiData?.createPayment) {
      return window.DookiData.createPayment(payload);
    }

    const { data, error } = await window.supabaseClient
      .from("payments")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

 async getStoreCategories(storeId) {
    if (!storeId) return [];

    try {
      const store = state.snapshot.establishments.find(
        (item) => String(item.id) === String(storeId)
      );

      if (store) {
        const embeddedCategories = [
          ...(Array.isArray(store.categories) ? store.categories : []),
          ...(Array.isArray(store.product_categories) ? store.product_categories : []),
          ...(Array.isArray(store.menu_categories) ? store.menu_categories : [])
        ];

        if (embeddedCategories.length) {
          return embeddedCategories.map(normalizeCategoryRecord);
        }
      }

      if (window.DookiData?.getCategoriesByEstablishment) {
        const result = await window.DookiData.getCategoriesByEstablishment(storeId);
        if (Array.isArray(result)) {
          return result.map(normalizeCategoryRecord);
        }
      }

      if (window.DookiData?.getStoreCategories) {
        const result = await window.DookiData.getStoreCategories(storeId);
        if (Array.isArray(result)) {
          return result.map(normalizeCategoryRecord);
        }
      }

      if (window.DookiData?.getCategories) {
        const result = await window.DookiData.getCategories();
        if (Array.isArray(result)) {
          return result
            .filter((item) =>
              String(item.establishment_id || item.store_id || item.restaurant_id || "") === String(storeId)
            )
            .map(normalizeCategoryRecord);
        }
      }

      return [];
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      return [];
    }
  },

  async createCategory(payload) {
    if (window.DookiData?.createCategory) {
      return window.DookiData.createCategory(payload);
    }

    const { data, error } = await window.supabaseClient
      .from("product_categories")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCategory(id, payload) {
    if (window.DookiData?.updateCategory) {
      return window.DookiData.updateCategory(id, payload);
    }

    const { data, error } = await window.supabaseClient
      .from("product_categories")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCategory(id) {
    if (window.DookiData?.deleteCategory) {
      return window.DookiData.deleteCategory(id);
    }

    const { error } = await window.supabaseClient
      .from("product_categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

 async getStoreProducts(storeId) {
    if (!storeId) return [];

    try {
      const store = state.snapshot.establishments.find(
        (item) => String(item.id) === String(storeId)
      );

      if (store) {
        const embeddedProducts = [
          ...(Array.isArray(store.products) ? store.products : []),
          ...(Array.isArray(store.items) ? store.items : []),
          ...(Array.isArray(store.menu_items) ? store.menu_items : [])
        ];

        if (embeddedProducts.length) {
          return embeddedProducts.map(normalizeProductRecord);
        }
      }

      if (window.DookiData?.getProductsByEstablishment) {
        const result = await window.DookiData.getProductsByEstablishment(storeId);
        if (Array.isArray(result)) {
          return result.map(normalizeProductRecord);
        }
      }

      if (window.DookiData?.getStoreProducts) {
        const result = await window.DookiData.getStoreProducts(storeId);
        if (Array.isArray(result)) {
          return result.map(normalizeProductRecord);
        }
      }

      if (window.DookiData?.getProducts) {
        const result = await window.DookiData.getProducts();
        if (Array.isArray(result)) {
          return result
            .filter((item) =>
              String(item.establishment_id || item.store_id || item.restaurant_id || "") === String(storeId)
            )
            .map(normalizeProductRecord);
        }
      }

      return [];
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      return [];
    }
  },

  async createProduct(payload) {
    if (window.DookiData?.createProduct) {
      return window.DookiData.createProduct(payload);
    }

    const { data, error } = await window.supabaseClient
      .from("products")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProduct(id, payload) {
    if (window.DookiData?.updateProduct) {
      return window.DookiData.updateProduct(id, payload);
    }

    const { data, error } = await window.supabaseClient
      .from("products")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProduct(id) {
    if (window.DookiData?.deleteProduct) {
      return window.DookiData.deleteProduct(id);
    }

    const { error } = await window.supabaseClient
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  async replyTicket(ticketId, payload) {
    if (window.DookiData?.createTicketMessage) {
      return window.DookiData.createTicketMessage(ticketId, payload);
    }

    const { data, error } = await window.supabaseClient
      .from("ticket_messages")
      .insert([
        {
          ticket_id: ticketId,
          sender_type: "admin",
          message: payload.message || ""
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// =============================
// INIT
// =============================

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await loadAdminSession();
  if (!ok) return;

  bindEvents();
  await refreshSnapshot();
  renderAll();
});

// =============================
// AUTH
// =============================

async function loadAdminSession() {
  const supabase = window.supabaseClient;

  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    window.location.href = "/login.html";
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (profileError || !profile) {
    alert("Sem permissão para acessar o admin.");
    window.location.href = "/login.html";
    return false;
  }

  if (!profile) {
    alert("Sem permissão para acessar o admin.");
    window.location.href = "/login.html";
    return false;
  }

  state.admin = profile;
  renderAdminInfo();
  return true;
}

function renderAdminInfo() {
  const name = document.querySelector("[data-admin-name]");
  const email = document.querySelector("[data-admin-email]");

  if (name) name.innerText = state.admin.name || "Admin Dooki";
  if (email) email.innerText = state.admin.email || "admin@dooki.com";
}

async function logoutAdmin() {
  await window.supabaseClient.auth.signOut();
  window.location.href = "/login.html";
}

// =============================
// SNAPSHOT
// =============================

async function refreshSnapshot() {
  const status = document.querySelector("[data-remote-status]");
  if (status) status.innerText = "Sincronizando dados";

  const data = await window.DookiData.getSnapshot();
  state.snapshot = {
    establishments: data.establishments || [],
    plans: data.plans || [],
    orders: data.orders || [],
    payments: data.payments || [],
    tickets: data.tickets || []
  };

  if (!state.selectedStoreId && state.snapshot.establishments.length) {
    state.selectedStoreId = state.snapshot.establishments[0].id;
  }

  await refreshSelectedStoreResources();

  if (status) status.innerText = "Dados atualizados";
}

async function refreshSelectedStoreResources() {
  if (!state.selectedStoreId) {
    state.selectedStoreCategories = [];
    state.selectedStoreProducts = [];
    renderCategoriesList();
    renderProductsList();
    fillProductCategorySelect();
    return;
  }

  try {
    const [categories, products] = await Promise.all([
      api.getStoreCategories(state.selectedStoreId),
      api.getStoreProducts(state.selectedStoreId)
    ]);

    state.selectedStoreCategories = Array.isArray(categories) ? categories : [];
    state.selectedStoreProducts = Array.isArray(products) ? products : [];
  } catch (error) {
    console.error("Erro ao atualizar dados da loja selecionada:", error);
    state.selectedStoreCategories = [];
    state.selectedStoreProducts = [];
  }

  renderCategoriesList();
  renderProductsList();
  fillProductCategorySelect();
}

// =============================
// EVENTS
// =============================

function bindEvents() {
  document.querySelectorAll("[data-admin-screen]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.adminScreen));
  });

  const logoutButton = document.querySelector("[data-admin-logout]");
  if (logoutButton) {
    logoutButton.addEventListener("click", logoutAdmin);
  }

  const toggleButton = document.querySelector("[data-sidebar-toggle]");
  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      document.getElementById("admin-sidebar")?.classList.toggle("sidebar-open");
    });
  }

  const storeSearch = document.querySelector("[data-store-search]");
  if (storeSearch) {
    storeSearch.addEventListener("input", renderStores);
  }

  const storeFilterCity = document.querySelector("[data-store-filter-city]");
  if (storeFilterCity) {
    storeFilterCity.addEventListener("change", renderStores);
  }

  const storeForm = document.getElementById("store-form");
  if (storeForm) {
    storeForm.addEventListener("submit", handleStoreCreate);
  }

  const storeEditForm = document.getElementById("store-edit-form");
  if (storeEditForm) {
    storeEditForm.addEventListener("submit", handleStoreUpdate);
  }

  const deleteStoreButton = document.getElementById("delete-store-button");
  if (deleteStoreButton) {
    deleteStoreButton.addEventListener("click", handleStoreDelete);
  }

  const planForm = document.getElementById("plan-form");
  if (planForm) {
    planForm.addEventListener("submit", handlePlanCreate);
  }

  const paymentForm = document.getElementById("payment-form");
  if (paymentForm) {
    paymentForm.addEventListener("submit", handlePaymentCreate);
  }

  const supportReplyForm = document.getElementById("support-reply-form");
  if (supportReplyForm) {
    supportReplyForm.addEventListener("submit", handleSupportReply);
  }

  const categoryForm = document.getElementById("admin-category-form");
  if (categoryForm) {
    categoryForm.addEventListener("submit", handleCategorySubmit);
  }

  const categoryCancelButton = document.getElementById("admin-category-cancel");
  if (categoryCancelButton) {
    categoryCancelButton.addEventListener("click", resetCategoryForm);
  }

  const productForm = document.getElementById("admin-product-form");
  if (productForm) {
    productForm.addEventListener("submit", handleProductSubmit);
  }

  const productCancelButton = document.getElementById("admin-product-cancel");
  if (productCancelButton) {
    productCancelButton.addEventListener("click", resetProductForm);
  }
}

// =============================
// NAVIGATION
// =============================

function navigate(screen) {
  document.querySelectorAll(".admin-nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.adminScreen === screen);
  });

  document.querySelectorAll(".admin-screen").forEach((el) => {
    el.classList.toggle("active", el.dataset.screenPanel === screen);
  });

  const meta = screenMeta[screen] || screenMeta.dashboard;
  const title = document.querySelector("[data-screen-title]");
  const copy = document.querySelector("[data-screen-copy]");

  if (title) title.innerText = meta.title;
  if (copy) copy.innerText = meta.copy;

  if (screen === "dashboard") renderDashboard();
  if (screen === "stores") renderStores();
  if (screen === "plans") renderPlans();
  if (screen === "payments") renderPayments();
  if (screen === "support") renderSupport();
  if (screen === "reports") renderReports();
  if (screen === "store-profile") renderStoreProfile();
}

// =============================
// RENDER ALL
// =============================

function renderAll() {
  fillCityFilter();
  fillPlanSelects();
  fillPaymentSelects();
  renderDashboard();
  renderStores();
  renderPlans();
  renderPayments();
  renderSupport();
  renderReports();
  renderStoreProfile();
}

// =============================
// HELPERS
// =============================

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function statusBadgeClass(status) {
  const value = String(status || "").toLowerCase();

  if (["active", "ativo", "paid", "pago", "resolvido", "closed"].includes(value)) return "success";
  if (["pending", "pendente", "approval", "aberto"].includes(value)) return "warning";
  if (["overdue", "atrasado", "upgrade"].includes(value)) return "danger";
  return "neutral";
}

function setKpi(key, value) {
  const el = document.querySelector(`[data-kpi="${key}"]`);
  if (el) el.innerText = value;
}

function getPlanLabelFromStore(store) {
  if (!store) return "—";

  const planById = state.snapshot.plans.find((plan) => String(plan.id) === String(store.plan_id));
  return planById?.name || store.plan || store.plan_name || "—";
}

function getSelectedStore() {
  return state.snapshot.establishments.find((s) => String(s.id) === String(state.selectedStoreId));
}

function normalizeTextareaLines(text) {
  return String(text || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

function normalizeCategoryRecord(category) {
  if (!category) return category;

  return {
    ...category,
    id: category.id || category.category_id || `cat-${Math.random().toString(36).slice(2)}`,
    establishment_id: category.establishment_id || category.store_id || category.restaurant_id || null,
    name: category.name || category.title || "Categoria",
    description: category.description || category.details || ""
  };
}

function normalizeProductRecord(product) {
  if (!product) return product;

  return {
    ...product,
    id: product.id || product.product_id || `prod-${Math.random().toString(36).slice(2)}`,
    establishment_id: product.establishment_id || product.store_id || product.restaurant_id || null,
    category_id: product.category_id || product.product_category_id || null,
    name: product.name || product.title || "Produto",
    description: product.description || product.details || "",
    sale_price: product.sale_price ?? product.price ?? product.unit_price ?? 0,
    cost_price: product.cost_price ?? product.cost ?? 0,
    stock_quantity: product.stock_quantity ?? product.stock ?? product.quantity ?? 0,
    stock_min_quantity: product.stock_min_quantity ?? product.minimum_stock ?? product.min_stock ?? 0
  };
}

// =============================
// DASHBOARD
// =============================

function renderDashboard() {
  renderKpis();
  renderDashboardHighlights();
  renderDashboardSummary();
  renderPriorityTickets();
  renderSupportSummary();
  renderGrowthBlock();
  renderTopStores();
}

function renderKpis() {
  const stores = state.snapshot.establishments;
  const orders = state.snapshot.orders;
  const tickets = state.snapshot.tickets;

  const activeStores = stores.filter((s) => String(s.status).toLowerCase() === "active").length;
  const openTickets = tickets.filter((t) => ["aberto", "open"].includes(String(t.status).toLowerCase())).length;
  const pendingApprovals = stores.filter((s) => String(s.status).toLowerCase() === "approval").length;

  setKpi("activeStores", activeStores);
  setKpi("ordersToday", orders.length);
  setKpi("pendingApprovals", pendingApprovals);
  setKpi("openTickets", openTickets);
}

function renderDashboardHighlights() {
  const container = document.querySelector("[data-dashboard-highlights]");
  if (!container) return;

  const stores = state.snapshot.establishments.slice(0, 5);

  container.innerHTML = stores.length
    ? stores.map((store) => `
        <article class="pro-list-card">
          <div class="pro-list-main">
            <div class="pro-list-content">
              <strong>${store.name || "Loja"}</strong>
              <span>${store.city || "Cidade"} • ${getPlanLabelFromStore(store)}</span>
            </div>
            <span class="pro-status-badge ${statusBadgeClass(store.status)}">${store.status || "—"}</span>
          </div>
        </article>
      `).join("")
    : `<div class="pro-empty-state"><strong>Nenhuma loja</strong><span>Sem estabelecimentos em destaque.</span></div>`;
}

function renderDashboardSummary() {
  const container = document.querySelector("[data-dashboard-summary]");
  if (!container) return;

  const stores = state.snapshot.establishments;
  const plans = state.snapshot.plans;
  const payments = state.snapshot.payments;

  const totalRevenue = payments.reduce((acc, item) => acc + Number(item.amount || 0), 0);

  container.innerHTML = [
    summaryItem("Base de lojas", stores.length),
    summaryItem("Planos cadastrados", plans.length),
    summaryItem("Receita registrada", formatMoney(totalRevenue)),
    summaryItem("Pagamentos lançados", payments.length)
  ].join("");
}

function renderPriorityTickets() {
  const container = document.querySelector("[data-priority-tickets]");
  if (!container) return;

  const tickets = state.snapshot.tickets.slice(0, 4);

  container.innerHTML = tickets.length
    ? tickets.map((ticket) => `
        <article class="pro-list-card">
          <div class="pro-list-main">
            <div class="pro-list-content">
              <strong>${ticket.subject || "Sem assunto"}</strong>
              <span>${ticket.store_name || "Loja"} • ${ticket.priority || "Sem prioridade"}</span>
            </div>
            <span class="pro-status-badge ${statusBadgeClass(ticket.status)}">${ticket.status || "aberto"}</span>
          </div>
        </article>
      `).join("")
    : `<div class="pro-empty-state"><strong>Nenhum ticket</strong><span>Sem chamados prioritários no momento.</span></div>`;
}

function renderSupportSummary() {
  const container = document.querySelector("[data-support-summary]");
  if (!container) return;

  const tickets = state.snapshot.tickets;
  const open = tickets.filter((t) => ["aberto", "open"].includes(String(t.status).toLowerCase())).length;
  const closed = tickets.filter((t) => ["fechado", "closed", "resolvido"].includes(String(t.status).toLowerCase())).length;

  container.innerHTML = [
    summaryItem("Abertos", open),
    summaryItem("Resolvidos", closed),
    summaryItem("Total", tickets.length)
  ].join("");
}

function renderGrowthBlock() {
  const ring = document.querySelector("[data-growth-ring]");
  const legend = document.querySelector("[data-growth-legend]");
  if (ring) ring.innerText = "84%";

  if (legend) {
    legend.innerHTML = `
      <div class="chart-legend-item"><span class="legend-dot success"></span><strong>Lojas ativas</strong><small>base saudável</small></div>
      <div class="chart-legend-item"><span class="legend-dot warning"></span><strong>Tickets</strong><small>atenção moderada</small></div>
      <div class="chart-legend-item"><span class="legend-dot neutral"></span><strong>Pagamentos</strong><small>monitoramento</small></div>
    `;
  }
}

function renderTopStores() {
  const container = document.querySelector("[data-dashboard-store-cards]");
  if (!container) return;

  const stores = state.snapshot.establishments.slice(0, 4);

  container.innerHTML = stores.length
    ? stores.map((store) => `
        <article class="store-mini-card">
          <strong>${store.name || "Loja"}</strong>
          <span>${store.city || "Cidade"}</span>
          <div class="store-mini-footer">
            <span class="pro-status-badge ${statusBadgeClass(store.status)}">${store.status || "—"}</span>
            <button class="ghost-button small" onclick="window.selectStore('${store.id}')">Ver</button>
          </div>
        </article>
      `).join("")
    : `<div class="pro-empty-state"><strong>Nenhuma loja</strong><span>Sem contas para destacar.</span></div>`;
}

// =============================
// STORES
// =============================

function fillCityFilter() {
  const select = document.querySelector("[data-store-filter-city]");
  if (!select) return;

  const cities = [...new Set(state.snapshot.establishments.map((item) => item.city).filter(Boolean))].sort();

  select.innerHTML = `<option value="all">Todas as cidades</option>` + cities.map((city) => {
    return `<option value="${city}">${city}</option>`;
  }).join("");
}

function fillPlanSelects() {
  const options = [`<option value="">Selecione</option>`]
    .concat(
      state.snapshot.plans.map((plan) => `<option value="${plan.id}">${plan.name}</option>`)
    )
    .join("");

  const createSelect = document.querySelector("[data-store-plan-select]");
  const editSelect = document.querySelector("[data-store-edit-plan-select]");

  if (createSelect) createSelect.innerHTML = options;
  if (editSelect) editSelect.innerHTML = options;
}

function getFilteredStores() {
  const search = String(document.querySelector("[data-store-search]")?.value || "").toLowerCase();
  const city = document.querySelector("[data-store-filter-city]")?.value || "all";

  return state.snapshot.establishments.filter((store) => {
    const matchesSearch = !search || String(store.name || "").toLowerCase().includes(search);
    const matchesCity = city === "all" || store.city === city;
    return matchesSearch && matchesCity;
  });
}

function renderStores() {
  const container = document.querySelector("[data-stores-table]");
  if (!container) return;

  const stores = getFilteredStores();

  container.innerHTML = stores.length
    ? stores.map((store) => `
        <article class="pro-store-row">
          <div class="pro-store-row-left">
            <div class="pro-avatar">${String(store.name || "L").charAt(0).toUpperCase()}</div>
            <div class="pro-store-row-content">
              <strong>${store.name || "Loja"}</strong>
              <span>${store.city || "Cidade"} • ${getPlanLabelFromStore(store)}</span>
            </div>
          </div>

          <div class="pro-store-row-right">
            <span class="pro-status-badge ${statusBadgeClass(store.status)}">${store.status || "—"}</span>
            <button class="ghost-button small" onclick="window.selectStore('${store.id}')">Ver</button>
          </div>
        </article>
      `).join("")
    : `<div class="pro-empty-state"><strong>Nenhum estabelecimento</strong><span>Nenhuma loja encontrada para este filtro.</span></div>`;

  renderStoreDetail();
}

window.selectStore = async (id) => {
  state.selectedStoreId = id;
  await refreshSelectedStoreResources();
  renderStoreDetail();
  renderStoreProfile();
  navigate("store-profile");
};

function renderStoreDetail() {
  const container = document.querySelector("[data-store-detail]");
  if (!container) return;

  const store = getSelectedStore();

  container.innerHTML = store
    ? `
      <article class="detail-card-box">
        <strong>${store.name}</strong>
        <span>${store.city || "Cidade não informada"}</span>
        <span>${store.email || "Sem email"}</span>
        <span>${getPlanLabelFromStore(store)}</span>
      </article>
    `
    : `
      <div class="pro-empty-state">
        <strong>Nenhuma loja selecionada</strong>
        <span>Escolha um estabelecimento na lista para ver os detalhes.</span>
      </div>
    `;
}

function populateStoreEditForm(store) {
  const form = document.getElementById("store-edit-form");
  if (!form || !store) return;

  form.name.value = store.name || "";
  form.city.value = store.city || "";
  form.plan_id.value = store.plan_id || "";
  form.status.value = store.status || "active";
  form.email.value = store.email || "";
  form.phone.value = store.phone || "";
  form.owner_name.value = store.owner_name || "";
  form.logo_url.value = store.logo_url || "";
  form.banner_url.value = store.banner_url || "";
}

function renderStoreProfile() {
  const container = document.querySelector("[data-store-profile]");
  const title = document.querySelector("[data-store-profile-title]");
  if (!container || !title) return;

  const store = getSelectedStore();

  if (!store) {
    title.innerText = "Detalhes do estabelecimento";
    container.innerHTML = `
      <div class="pro-empty-state">
        <strong>Nenhuma loja selecionada</strong>
        <span>Selecione uma conta para abrir este painel.</span>
      </div>
    `;
    resetCategoryForm();
    resetProductForm();
    renderCategoriesList();
    renderProductsList();
    fillProductCategorySelect();
    return;
  }

  title.innerText = store.name || "Detalhes do estabelecimento";

  container.innerHTML = `
    <article class="detail-grid">
      <div class="detail-item"><span>Nome</span><strong>${store.name || "—"}</strong></div>
      <div class="detail-item"><span>Cidade</span><strong>${store.city || "—"}</strong></div>
      <div class="detail-item"><span>Plano</span><strong>${getPlanLabelFromStore(store)}</strong></div>
      <div class="detail-item"><span>Status</span><strong>${store.status || "—"}</strong></div>
      <div class="detail-item"><span>Email</span><strong>${store.email || "—"}</strong></div>
      <div class="detail-item"><span>Telefone</span><strong>${store.phone || "—"}</strong></div>
    </article>
  `;

  populateStoreEditForm(store);
  fillPlanSelects();
  renderCategoriesList();
  renderProductsList();
  fillProductCategorySelect();
}

async function handleStoreCreate(event) {
  event.preventDefault();

  const form = event.currentTarget;

  const payload = {
    name: form.name.value.trim(),
    city: form.city.value.trim(),
    plan_id: form.plan_id.value || null,
    status: form.status.value || "active",
    email: form.email.value.trim() || null,
    phone: form.phone.value.trim() || null,
    logo_url: form.logo_url.value.trim() || null,
    banner_url: form.banner_url.value.trim() || null
  };

  try {
    await api.createEstablishment(payload);
    form.reset();
    await refreshSnapshot();
    fillCityFilter();
    fillPlanSelects();
    fillPaymentSelects();
    renderStores();
    renderDashboard();
    renderReports();
    alert("Estabelecimento cadastrado com sucesso.");
  } catch (error) {
    console.error(error);
    alert(`Erro ao cadastrar estabelecimento: ${error.message || "erro desconhecido"}`);
  }
}

async function handleStoreUpdate(event) {
  event.preventDefault();

  const store = getSelectedStore();
  if (!store?.id) {
    alert("Selecione um estabelecimento para editar.");
    return;
  }

  const form = event.currentTarget;

  const payload = {
    name: form.name.value.trim(),
    city: form.city.value.trim() || null,
    plan_id: form.plan_id.value || null,
    status: form.status.value || "active",
    email: form.email.value.trim() || null,
    phone: form.phone.value.trim() || null,
    owner_name: form.owner_name.value.trim() || null,
    logo_url: form.logo_url.value.trim() || null,
    banner_url: form.banner_url.value.trim() || null
  };

  try {
    await api.updateEstablishment(store.id, payload);
    await refreshSnapshot();
    renderAll();
    navigate("store-profile");
    alert("Estabelecimento atualizado com sucesso.");
  } catch (error) {
    console.error(error);
    alert(`Erro ao atualizar estabelecimento: ${error.message || "erro desconhecido"}`);
  }
}

async function handleStoreDelete() {
  const store = getSelectedStore();
  if (!store?.id) {
    alert("Selecione um estabelecimento para excluir.");
    return;
  }

  const confirmed = window.confirm(`Deseja realmente excluir o estabelecimento "${store.name}"?`);
  if (!confirmed) return;

  try {
    await api.deleteEstablishment(store.id);

    if (state.selectedStoreId === store.id) {
      state.selectedStoreId = null;
      state.selectedStoreCategories = [];
      state.selectedStoreProducts = [];
    }

    await refreshSnapshot();
    renderAll();
    navigate("stores");
    alert("Estabelecimento excluído com sucesso.");
  } catch (error) {
    console.error(error);
    alert(`Erro ao excluir estabelecimento: ${error.message || "erro desconhecido"}`);
  }
}

// =============================
// PLANS
// =============================

function renderPlans() {
  const container = document.querySelector("[data-plans-table]");
  if (!container) return;

  const plans = state.snapshot.plans || [];

  container.innerHTML = plans.length
    ? plans.map((plan) => `
        <article class="pro-list-card">
          <div class="pro-list-main">
            <div class="pro-list-content">
              <strong>${plan.name || "Plano"}</strong>
              <span>${plan.benefits || plan.description || "Sem benefícios cadastrados"}</span>
            </div>
            <span class="pro-status-badge neutral">${formatMoney(plan.price || plan.monthlyPrice || 0)}</span>
          </div>
        </article>
      `).join("")
    : `<div class="pro-empty-state"><strong>Nenhum plano</strong><span>Sem planos cadastrados no snapshot.</span></div>`;
}

async function handlePlanCreate(event) {
  event.preventDefault();

  const form = event.currentTarget;

  const payload = {
    name: form.name.value.trim(),
    price: Number(form.price.value || 0),
    discount: Number(form.discount.value || 0),
    description: normalizeTextareaLines(form.description.value),
    benefits: normalizeTextareaLines(form.description.value)
  };

  try {
    await api.createPlan(payload);
    form.reset();
    await refreshSnapshot();
    fillPlanSelects();
    fillPaymentSelects();
    renderPlans();
    renderDashboard();
    renderReports();
    alert("Plano salvo com sucesso.");
  } catch (error) {
    console.error(error);
    alert(`Erro ao salvar plano: ${error.message || "erro desconhecido"}`);
  }
}

// =============================
// PAYMENTS
// =============================

function fillPaymentSelects() {
  const storeSelect = document.querySelector("[data-payment-store-select]");
  const planSelect = document.querySelector("[data-payment-plan-select]");

  if (storeSelect) {
    storeSelect.innerHTML = `<option value="">Selecione</option>` + state.snapshot.establishments.map((store) => {
      return `<option value="${store.id}">${store.name}</option>`;
    }).join("");
  }

  if (planSelect) {
    planSelect.innerHTML = `<option value="">Selecione</option>` + state.snapshot.plans.map((plan) => {
      return `<option value="${plan.name}">${plan.name}</option>`;
    }).join("");
  }
}

function renderPayments() {
  const container = document.querySelector("[data-payments-table]");
  if (!container) return;

  const payments = state.snapshot.payments || [];

  container.innerHTML = payments.length
    ? payments.map((payment) => `
        <article class="pro-store-row">
          <div class="pro-store-row-left">
            <div class="pro-avatar">R$</div>
            <div class="pro-store-row-content">
              <strong>${formatMoney(payment.amount || 0)}</strong>
              <span>${payment.reference || payment.category || "Sem referência"} • ${payment.planName || "Plano"}</span>
            </div>
          </div>

          <div class="pro-store-row-right">
            <span class="pro-status-badge ${statusBadgeClass(payment.status)}">${payment.status || "pendente"}</span>
          </div>
        </article>
      `).join("")
    : `<div class="pro-empty-state"><strong>Nenhum pagamento</strong><span>Sem lançamentos registrados.</span></div>`;
}

async function handlePaymentCreate(event) {
  event.preventDefault();

  const form = event.currentTarget;

  const payload = {
    establishment_id: form.establishment_id.value,
    direction: form.direction.value || "charge",
    category: form.category.value.trim() || null,
    amount: Number(form.amount.value || 0),
    status: form.status.value || "pending",
    due_date: form.due_date.value || null,
    notes: form.notes.value.trim() || null
  };

  try {
    await api.createPayment(payload);
    form.reset();
    await refreshSnapshot();
    renderPayments();
    renderDashboard();
    renderReports();
    alert("Pagamento registrado com sucesso.");
  } catch (error) {
    console.error(error);
    alert(`Erro ao registrar pagamento: ${error.message || "erro desconhecido"}`);
  }
}

// =============================
// SUPPORT
// =============================

function renderSupport() {
  const container = document.querySelector("[data-support-table]");
  if (!container) return;

  const tickets = state.snapshot.tickets || [];

  container.innerHTML = tickets.length
    ? tickets.map((ticket) => `
        <article class="pro-store-row">
          <div class="pro-store-row-left">
            <div class="pro-avatar">S</div>
            <div class="pro-store-row-content">
              <strong>${ticket.subject || "Ticket"}</strong>
              <span>${ticket.store_name || "Loja"} • ${ticket.priority || "Sem prioridade"}</span>
            </div>
          </div>

          <div class="pro-store-row-right">
            <span class="pro-status-badge ${statusBadgeClass(ticket.status)}">${ticket.status || "aberto"}</span>
            <button class="ghost-button small" onclick="window.openTicket('${ticket.id}')">Abrir</button>
          </div>
        </article>
      `).join("")
    : `<div class="pro-empty-state"><strong>Nenhum ticket</strong><span>Sem chamados registrados.</span></div>`;

  renderTicket();
}

window.openTicket = async (id) => {
  state.selectedTicketId = id;
  state.selectedTicketMessages = await window.DookiData.getTicketMessages(id);
  renderTicket();
};

function renderTicket() {
  const container = document.querySelector("[data-support-thread]");
  if (!container) return;

  if (!state.selectedTicketId) {
    container.innerHTML = `
      <div class="pro-empty-state">
        <strong>Nenhum ticket selecionado</strong>
        <span>Escolha um ticket na lista para abrir a conversa.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = state.selectedTicketMessages.length
    ? state.selectedTicketMessages.map((message) => `
        <article class="thread-message ${message.sender_type === "admin" ? "is-admin" : ""}">
          <strong>${message.sender_type || "sistema"}</strong>
          <p>${message.message || ""}</p>
        </article>
      `).join("")
    : `
      <div class="pro-empty-state">
        <strong>Sem mensagens</strong>
        <span>Este ticket ainda não possui mensagens carregadas.</span>
      </div>
    `;
}

async function handleSupportReply(event) {
  event.preventDefault();

  if (!state.selectedTicketId) {
    alert("Selecione um ticket para responder.");
    return;
  }

  const form = event.currentTarget;
  const message = form.message.value.trim();

  if (!message) {
    alert("Digite uma resposta antes de enviar.");
    return;
  }

  try {
    await api.replyTicket(state.selectedTicketId, { message });
    form.reset();
    state.selectedTicketMessages = await window.DookiData.getTicketMessages(state.selectedTicketId);
    renderTicket();
    alert("Resposta enviada com sucesso.");
  } catch (error) {
    console.error(error);
    alert(`Erro ao responder ticket: ${error.message || "erro desconhecido"}`);
  }
}

// =============================
// STORE CATEGORIES
// =============================

function fillProductCategorySelect() {
  const select = document.getElementById("admin-product-category-select");
  if (!select) return;

  select.innerHTML =
    `<option value="">Sem categoria</option>` +
    state.selectedStoreCategories.map((category) => {
      return `<option value="${category.id}">${category.name || "Categoria"}</option>`;
    }).join("");
}

function renderCategoriesList() {
  const container = document.getElementById("admin-store-categories-list");
  if (!container) return;

  if (!state.selectedStoreId) {
    container.innerHTML = `
      <div class="pro-empty-state">
        <strong>Nenhuma loja selecionada</strong>
        <span>Selecione uma loja para gerenciar as categorias.</span>
      </div>
    `;
    return;
  }

  const categories = state.selectedStoreCategories || [];

  container.innerHTML = categories.length
    ? categories.map((category) => `
        <article class="pro-store-row">
          <div class="pro-store-row-left">
            <div class="pro-avatar">C</div>
            <div class="pro-store-row-content">
              <strong>${category.name || "Categoria"}</strong>
              <span>${category.description || "Sem descrição"}</span>
            </div>
          </div>

          <div class="pro-store-row-right">
            <button class="ghost-button small" onclick="window.editAdminCategory('${category.id}')">Editar</button>
            <button class="ghost-button small" onclick="window.deleteAdminCategory('${category.id}')">Excluir</button>
          </div>
        </article>
      `).join("")
    : `
      <div class="pro-empty-state">
        <strong>Nenhuma categoria</strong>
        <span>Cadastre a primeira categoria desta loja.</span>
      </div>
    `;
}

function resetCategoryForm() {
  const form = document.getElementById("admin-category-form");
  if (!form) return;

  form.reset();
  state.editingCategoryId = null;
}

window.editAdminCategory = (id) => {
  const category = state.selectedStoreCategories.find((item) => String(item.id) === String(id));
  const form = document.getElementById("admin-category-form");
  if (!category || !form) return;

  state.editingCategoryId = category.id;
  form.name.value = category.name || "";
  form.description.value = category.description || "";
};

window.deleteAdminCategory = async (id) => {
  const confirmed = window.confirm("Deseja excluir esta categoria?");
  if (!confirmed) return;

  try {
    await api.deleteCategory(id);
    await refreshSelectedStoreResources();
    renderCategoriesList();
    fillProductCategorySelect();

    if (state.editingCategoryId === id) {
      resetCategoryForm();
    }

    alert("Categoria excluída com sucesso.");
  } catch (error) {
    console.error(error);
    alert(`Erro ao excluir categoria: ${error.message || "erro desconhecido"}`);
  }
};

async function handleCategorySubmit(event) {
  event.preventDefault();

  if (!state.selectedStoreId) {
    alert("Selecione uma loja para salvar a categoria.");
    return;
  }

  const form = event.currentTarget;
  const payload = {
    establishment_id: state.selectedStoreId,
    name: form.name.value.trim(),
    description: form.description.value.trim() || null
  };

  try {
    if (state.editingCategoryId) {
      await api.updateCategory(state.editingCategoryId, payload);
      alert("Categoria atualizada com sucesso.");
    } else {
      await api.createCategory(payload);
      alert("Categoria criada com sucesso.");
    }

    resetCategoryForm();
    await refreshSelectedStoreResources();
    renderCategoriesList();
    fillProductCategorySelect();
  } catch (error) {
    console.error(error);
    alert(`Erro ao salvar categoria: ${error.message || "erro desconhecido"}`);
  }
}

// =============================
// STORE PRODUCTS
// =============================

function renderProductsList() {
  const container = document.getElementById("admin-store-products-list");
  if (!container) return;

  if (!state.selectedStoreId) {
    container.innerHTML = `
      <div class="pro-empty-state">
        <strong>Nenhuma loja selecionada</strong>
        <span>Selecione uma loja para gerenciar os produtos.</span>
      </div>
    `;
    return;
  }

  const categoriesById = new Map(
    (state.selectedStoreCategories || []).map((category) => [String(category.id), category])
  );

  const products = state.selectedStoreProducts || [];

  container.innerHTML = products.length
    ? products.map((product) => {
        const categoryName = product.category_id
          ? categoriesById.get(String(product.category_id))?.name || "Categoria não encontrada"
          : "Sem categoria";

        return `
          <article class="pro-store-row">
            <div class="pro-store-row-left">
              <div class="pro-avatar">P</div>
              <div class="pro-store-row-content">
                <strong>${product.name || "Produto"}</strong>
                <span>
                  ${categoryName} •
                  Venda: ${formatMoney(product.sale_price || 0)} •
                  Estoque: ${Number(product.stock_quantity || 0)}
                </span>
              </div>
            </div>

            <div class="pro-store-row-right">
              <button class="ghost-button small" onclick="window.editAdminProduct('${product.id}')">Editar</button>
              <button class="ghost-button small" onclick="window.deleteAdminProduct('${product.id}')">Excluir</button>
            </div>
          </article>
        `;
      }).join("")
    : `
      <div class="pro-empty-state">
        <strong>Nenhum produto</strong>
        <span>Cadastre o primeiro produto desta loja.</span>
      </div>
    `;
}

function resetProductForm() {
  const form = document.getElementById("admin-product-form");
  if (!form) return;

  form.reset();
  state.editingProductId = null;

  const categorySelect = document.getElementById("admin-product-category-select");
  if (categorySelect) {
    categorySelect.value = "";
  }
}

window.editAdminProduct = (id) => {
  const product = state.selectedStoreProducts.find((item) => String(item.id) === String(id));
  const form = document.getElementById("admin-product-form");
  if (!product || !form) return;

  state.editingProductId = product.id;

  form.name.value = product.name || "";
  form.category_id.value = product.category_id || "";
  form.sale_price.value = product.sale_price ?? "";
  form.cost_price.value = product.cost_price ?? "";
  form.stock_quantity.value = product.stock_quantity ?? "";
  form.stock_min_quantity.value = product.stock_min_quantity ?? "";
  form.description.value = product.description || "";
};

window.deleteAdminProduct = async (id) => {
  const confirmed = window.confirm("Deseja excluir este produto?");
  if (!confirmed) return;

  try {
    await api.deleteProduct(id);
    await refreshSelectedStoreResources();
    renderProductsList();

    if (state.editingProductId === id) {
      resetProductForm();
    }

    alert("Produto excluído com sucesso.");
  } catch (error) {
    console.error(error);
    alert(`Erro ao excluir produto: ${error.message || "erro desconhecido"}`);
  }
};

async function handleProductSubmit(event) {
  event.preventDefault();

  if (!state.selectedStoreId) {
    alert("Selecione uma loja para salvar o produto.");
    return;
  }

  const form = event.currentTarget;

  const payload = {
    establishment_id: state.selectedStoreId,
    category_id: form.category_id.value || null,
    name: form.name.value.trim(),
    description: form.description.value.trim() || null,
    sale_price: Number(form.sale_price.value || 0),
    cost_price: Number(form.cost_price.value || 0),
    stock_quantity: Number(form.stock_quantity.value || 0),
    stock_min_quantity: Number(form.stock_min_quantity.value || 0)
  };

  try {
    if (state.editingProductId) {
      await api.updateProduct(state.editingProductId, payload);
      alert("Produto atualizado com sucesso.");
    } else {
      await api.createProduct(payload);
      alert("Produto criado com sucesso.");
    }

    resetProductForm();
    await refreshSelectedStoreResources();
    renderProductsList();
  } catch (error) {
    console.error(error);
    alert(`Erro ao salvar produto: ${error.message || "erro desconhecido"}`);
  }
}

// =============================
// REPORTS
// =============================

function renderReports() {
  const summary = document.querySelector("[data-report-summary]");
  const actions = document.querySelector("[data-report-actions]");

  if (summary) {
    summary.innerHTML = [
      summaryItem("Estabelecimentos", state.snapshot.establishments.length),
      summaryItem("Planos", state.snapshot.plans.length),
      summaryItem("Pagamentos", state.snapshot.payments.length),
      summaryItem("Tickets", state.snapshot.tickets.length)
    ].join("");
  }

  if (actions) {
    actions.innerHTML = `
      <article class="pro-list-card">
        <div class="pro-list-main">
          <div class="pro-list-content">
            <strong>Revisar aprovações</strong>
            <span>Priorize contas com status de aprovação.</span>
          </div>
        </div>
      </article>

      <article class="pro-list-card">
        <div class="pro-list-main">
          <div class="pro-list-content">
            <strong>Acompanhar pagamentos</strong>
            <span>Verifique cobranças pendentes e atrasadas.</span>
          </div>
        </div>
      </article>

      <article class="pro-list-card">
        <div class="pro-list-main">
          <div class="pro-list-content">
            <strong>Monitorar suporte</strong>
            <span>Mantenha tickets abertos sob controle.</span>
          </div>
        </div>
      </article>
    `;
  }
}

// =============================
// UI HELPERS
// =============================

function summaryItem(label, value) {
  return `
    <div class="pro-summary-item">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}