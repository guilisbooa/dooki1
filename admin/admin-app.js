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
  selectedTicketMessages: []
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
    window.location.href = "../public/login.html";
    return false;
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("id", user.id)
    .eq("is_active", true)
    .single();

  if (!profile) {
    alert("Sem permissão para acessar o admin.");
    window.location.href = "../public/login.html";
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
  window.location.href = "../public/login.html";
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

  if (status) status.innerText = "Dados atualizados";
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
  fillPaymentSelects();
  renderDashboard();
  renderStores();
  renderPlans();
  renderPayments();
  renderSupport();
  renderReports();
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
              <span>${store.city || "Cidade"} • ${store.plan || "Plano não definido"}</span>
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
              <span>${store.city || "Cidade"} • ${store.plan || "Plano"}</span>
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

window.selectStore = (id) => {
  state.selectedStoreId = id;
  renderStoreDetail();
  renderStoreProfile();
  navigate("store-profile");
};

function renderStoreDetail() {
  const container = document.querySelector("[data-store-detail]");
  if (!container) return;

  const store = state.snapshot.establishments.find((s) => s.id === state.selectedStoreId);

  container.innerHTML = store
    ? `
      <article class="detail-card-box">
        <strong>${store.name}</strong>
        <span>${store.city || "Cidade não informada"}</span>
        <span>${store.email || "Sem email"}</span>
        <span>${store.plan || "Sem plano"}</span>
      </article>
    `
    : `
      <div class="pro-empty-state">
        <strong>Nenhuma loja selecionada</strong>
        <span>Escolha um estabelecimento na lista para ver os detalhes.</span>
      </div>
    `;
}

function renderStoreProfile() {
  const container = document.querySelector("[data-store-profile]");
  const title = document.querySelector("[data-store-profile-title]");
  if (!container || !title) return;

  const store = state.snapshot.establishments.find((s) => s.id === state.selectedStoreId);

  if (!store) {
    title.innerText = "Detalhes do estabelecimento";
    container.innerHTML = `
      <div class="pro-empty-state">
        <strong>Nenhuma loja selecionada</strong>
        <span>Selecione uma conta para abrir este painel.</span>
      </div>
    `;
    return;
  }

  title.innerText = store.name || "Detalhes do estabelecimento";

  container.innerHTML = `
    <article class="detail-grid">
      <div class="detail-item"><span>Nome</span><strong>${store.name || "—"}</strong></div>
      <div class="detail-item"><span>Cidade</span><strong>${store.city || "—"}</strong></div>
      <div class="detail-item"><span>Plano</span><strong>${store.plan || "—"}</strong></div>
      <div class="detail-item"><span>Status</span><strong>${store.status || "—"}</strong></div>
      <div class="detail-item"><span>Email</span><strong>${store.email || "—"}</strong></div>
      <div class="detail-item"><span>Telefone</span><strong>${store.phone || "—"}</strong></div>
    </article>
  `;
}

async function handleStoreCreate(event) {
  event.preventDefault();
  alert("Cadastro rápido preservado. Na próxima etapa, eu conecto o submit completo ao banco sem mudar o layout.");
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
              <span>${plan.benefits || "Sem benefícios cadastrados"}</span>
            </div>
            <span class="pro-status-badge neutral">${formatMoney(plan.price || plan.monthlyPrice || 0)}</span>
          </div>
        </article>
      `).join("")
    : `<div class="pro-empty-state"><strong>Nenhum plano</strong><span>Sem planos cadastrados no snapshot.</span></div>`;
}

async function handlePlanCreate(event) {
  event.preventDefault();
  alert("Formulário de plano preservado. Na próxima etapa, eu conecto o submit completo ao banco.");
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
              <span>${payment.reference || "Sem referência"} • ${payment.planName || "Plano"}</span>
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
  alert("Formulário de pagamento preservado. Na próxima etapa, eu conecto o submit completo ao banco.");
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
  alert("Resposta preservada. Na próxima etapa, eu conecto o envio completo ao banco.");
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