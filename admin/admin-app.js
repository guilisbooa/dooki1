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

const screenTitles = {
  dashboard: "Visão geral",
  stores: "Estabelecimentos",
  plans: "Planos",
  payments: "Pagamentos",
  support: "Suporte",
  reports: "Relatórios",
  "store-profile": "Loja selecionada"
};

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await loadAdminSession();
  if (!ok) return;

  bindEvents();
  await refreshSnapshot();
  renderDashboard();
});

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
    .maybeSingle();

  if (!profile) {
    alert("Sem permissão de administrador.");
    window.location.href = "../public/login.html";
    return false;
  }

  state.admin = profile;
  renderAdminInfo();
  return true;
}

function renderAdminInfo() {
  const nameEl = document.querySelector("[data-admin-name]");
  const emailEl = document.querySelector("[data-admin-email]");

  if (nameEl) nameEl.innerText = state.admin.name || "Admin Dooki";
  if (emailEl) emailEl.innerText = state.admin.email || "admin@dooki.com";
}

async function logoutAdmin() {
  await window.supabaseClient.auth.signOut();
  window.location.href = "../public/login.html";
}

async function refreshSnapshot() {
  const data = await window.DookiData.getSnapshot();
  state.snapshot = data;
}

function bindEvents() {
  document.querySelectorAll("[data-admin-screen]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.adminScreen));
  });

  const logoutBtn = document.querySelector("[data-admin-logout]");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutAdmin);
  }

  const sidebarToggle = document.querySelector("[data-sidebar-toggle]");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      document.getElementById("admin-sidebar")?.classList.toggle("sidebar-open");
    });
  }
}

function navigate(screen) {
  document.querySelectorAll(".admin-nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.adminScreen === screen);
  });

  document.querySelectorAll(".admin-screen").forEach((el) => {
    el.classList.remove("active");
  });

  document.querySelector(`[data-screen-panel="${screen}"]`)?.classList.add("active");

  const title = document.querySelector("[data-screen-title]");
  if (title) {
    title.innerText = screenTitles[screen] || "Painel";
  }

  if (screen === "dashboard") renderDashboard();
  if (screen === "stores") renderStores();
  if (screen === "plans") renderPlans();
  if (screen === "payments") renderPayments();
  if (screen === "support") renderSupport();
  if (screen === "reports") renderReports();
}

function renderDashboard() {
  renderKpis();
  renderDashboardHighlights();
  renderDashboardSummary();
  renderPriorityTickets();
  renderSupportSummary();
}

function renderKpis() {
  const stores = state.snapshot.establishments || [];
  const orders = state.snapshot.orders || [];
  const tickets = state.snapshot.tickets || [];

  const activeStores = stores.filter((s) => s.status === "active").length;
  const openTickets = tickets.filter((t) => String(t.status || "").toLowerCase() === "aberto").length;
  const pendingApprovals = stores.filter((s) => String(s.status || "").toLowerCase() === "approval").length;

  setKpi("activeStores", activeStores);
  setKpi("ordersToday", orders.length);
  setKpi("pendingApprovals", pendingApprovals);
  setKpi("openTickets", openTickets);
}

function setKpi(key, value) {
  const el = document.querySelector(`[data-kpi="${key}"]`);
  if (el) el.innerText = value;
}

function renderDashboardHighlights() {
  const container = document.querySelector("[data-dashboard-highlights]");
  if (!container) return;

  const stores = state.snapshot.establishments || [];

  if (!stores.length) {
    container.innerHTML = `<div class="pro-empty-state"><strong>Nada por aqui ainda</strong><span>Nenhum estabelecimento encontrado.</span></div>`;
    return;
  }

  container.innerHTML = stores.slice(0, 5).map((store) => `
    <article class="pro-store-row">
      <div class="pro-store-row-left">
        <div class="pro-avatar">${(store.name || "L").charAt(0).toUpperCase()}</div>
        <div class="pro-store-row-content">
          <strong>${store.name || "Loja"}</strong>
          <span>${store.city || "Sem cidade"} • ${store.plan || "Sem plano"}</span>
        </div>
      </div>
      <div class="pro-store-row-right">
        <span class="pro-status-badge ${getStatusClass(store.status)}">${store.status || "—"}</span>
        <button class="ghost-button small" onclick="window.selectStore('${store.id}')">Ver</button>
      </div>
    </article>
  `).join("");
}

function renderDashboardSummary() {
  const container = document.querySelector("[data-dashboard-summary]");
  if (!container) return;

  const stores = state.snapshot.establishments || [];
  const plans = state.snapshot.plans || [];
  const payments = state.snapshot.payments || [];

  container.innerHTML = [
    summaryItem("Estabelecimentos", stores.length),
    summaryItem("Planos cadastrados", plans.length),
    summaryItem("Pagamentos registrados", payments.length),
    summaryItem("Tickets totais", (state.snapshot.tickets || []).length)
  ].join("");
}

function renderPriorityTickets() {
  const container = document.querySelector("[data-priority-tickets]");
  if (!container) return;

  const tickets = state.snapshot.tickets || [];

  if (!tickets.length) {
    container.innerHTML = `<div class="pro-empty-state"><strong>Sem chamados</strong><span>Nenhum ticket aberto no momento.</span></div>`;
    return;
  }

  container.innerHTML = tickets.slice(0, 5).map((ticket) => `
    <article class="pro-support-card">
      <div class="pro-support-main">
        <div class="pro-store-row-content">
          <strong>${ticket.subject || "Sem assunto"}</strong>
          <span>${ticket.store_name || "Loja"} • ${ticket.status || "aberto"}</span>
        </div>
        <div class="pro-action-group">
          <span class="pro-status-badge ${getStatusClass(ticket.status)}">${ticket.status || "aberto"}</span>
          <button class="ghost-button small" onclick="window.openTicket('${ticket.id}')">Abrir</button>
        </div>
      </div>
    </article>
  `).join("");
}

function renderSupportSummary() {
  const container = document.querySelector("[data-support-summary]");
  if (!container) return;

  const tickets = state.snapshot.tickets || [];
  const abertos = tickets.filter((t) => String(t.status || "").toLowerCase() === "aberto").length;
  const fechados = tickets.filter((t) => ["fechado", "resolvido"].includes(String(t.status || "").toLowerCase())).length;

  container.innerHTML = [
    summaryItem("Abertos", abertos),
    summaryItem("Fechados", fechados),
    summaryItem("Total", tickets.length)
  ].join("");
}

function renderStores() {
  const container = document.querySelector("[data-stores-table]");
  if (!container) return;

  const stores = state.snapshot.establishments || [];

  if (!stores.length) {
    container.innerHTML = `<div class="pro-empty-state"><strong>Nenhuma loja</strong><span>Sem estabelecimentos cadastrados.</span></div>`;
    return;
  }

  container.innerHTML = stores.map((store) => `
    <article class="pro-store-row">
      <div class="pro-store-row-left">
        <div class="pro-avatar">${(store.name || "L").charAt(0).toUpperCase()}</div>
        <div class="pro-store-row-content">
          <strong>${store.name}</strong>
          <span>${store.city || "Sem cidade"} • ${store.plan || "Sem plano"}</span>
        </div>
      </div>
      <div class="pro-store-row-right">
        <span class="pro-status-badge ${getStatusClass(store.status)}">${store.status || "—"}</span>
        <button class="ghost-button small" onclick="window.selectStore('${store.id}')">Ver</button>
      </div>
    </article>
  `).join("");
}

window.selectStore = (id) => {
  state.selectedStoreId = id;
  renderStoreDetail();
};

function renderStoreDetail() {
  const container = document.querySelector("[data-store-detail]");
  if (!container) return;

  const store = (state.snapshot.establishments || []).find((s) => s.id === state.selectedStoreId);

  if (!store) {
    container.innerHTML = `<div class="pro-empty-state"><strong>Nenhuma loja selecionada</strong><span>Selecione um estabelecimento para ver os detalhes.</span></div>`;
    return;
  }

  container.innerHTML = `
    <div class="summary-list">
      ${summaryItem("Nome", store.name || "—")}
      ${summaryItem("Cidade", store.city || "—")}
      ${summaryItem("Plano", store.plan || "—")}
      ${summaryItem("Status", store.status || "—")}
      ${summaryItem("Email", store.email || "—")}
      ${summaryItem("WhatsApp", store.phone || "—")}
    </div>
  `;
}

function renderPlans() {
  const container = document.querySelector("[data-plans-table]");
  if (!container) return;

  const plans = state.snapshot.plans || [];

  if (!plans.length) {
    container.innerHTML = `<div class="pro-empty-state"><strong>Nenhum plano</strong><span>Sem planos cadastrados.</span></div>`;
    return;
  }

  container.innerHTML = plans.map((p) => `
    <article class="pro-list-card">
      <div class="pro-list-main">
        <div class="pro-list-content">
          <strong>${p.name || "Plano"}</strong>
          <span>${p.description || "Plano cadastrado na plataforma"}</span>
        </div>
        <span class="pro-status-badge info">R$ ${Number(p.price || 0).toFixed(2)}</span>
      </div>
    </article>
  `).join("");
}

function renderPayments() {
  const container = document.querySelector("[data-payments-table]");
  if (!container) return;

  const payments = state.snapshot.payments || [];

  if (!payments.length) {
    container.innerHTML = `<div class="pro-empty-state"><strong>Nenhum pagamento</strong><span>Sem pagamentos registrados.</span></div>`;
    return;
  }

  container.innerHTML = payments.map((p) => `
    <article class="pro-list-card">
      <div class="pro-list-main">
        <div class="pro-list-content">
          <strong>${p.reference || "Pagamento"}</strong>
          <span>${p.plan_name || "Plano"} • ${p.store_name || "Loja"}</span>
        </div>
        <div class="pro-action-group">
          <span class="pro-status-badge ${getStatusClass(p.status)}">${p.status || "pendente"}</span>
          <strong>R$ ${Number(p.amount || 0).toFixed(2)}</strong>
        </div>
      </div>
    </article>
  `).join("");
}

function renderSupport() {
  const container = document.querySelector("[data-support-table]");
  if (!container) return;

  const tickets = state.snapshot.tickets || [];

  if (!tickets.length) {
    container.innerHTML = `<div class="pro-empty-state"><strong>Nenhum ticket</strong><span>Sem tickets registrados.</span></div>`;
    return;
  }

  container.innerHTML = tickets.map((t) => `
    <article class="pro-support-card">
      <div class="pro-support-main">
        <div class="pro-store-row-content">
          <strong>${t.subject}</strong>
          <span>${t.store_name || "Loja"} • ${t.status || "aberto"}</span>
        </div>
        <div class="pro-action-group">
          <span class="pro-status-badge ${getStatusClass(t.status)}">${t.status || "aberto"}</span>
          <button class="ghost-button small" onclick="window.openTicket('${t.id}')">Abrir</button>
        </div>
      </div>
    </article>
  `).join("");
}

window.openTicket = async (id) => {
  state.selectedTicketId = id;
  state.selectedTicketMessages = await window.DookiData.getTicketMessages(id);
  renderTicket();
};

function renderTicket() {
  const container = document.querySelector("[data-support-thread]");
  if (!container) return;

  if (!state.selectedTicketMessages.length) {
    container.innerHTML = `<div class="pro-empty-state"><strong>Nenhum ticket selecionado</strong><span>Abra um ticket para ver as mensagens.</span></div>`;
    return;
  }

  container.innerHTML = state.selectedTicketMessages.map((m) => `
    <article class="pro-list-card">
      <div class="pro-list-main">
        <div class="pro-list-content">
          <strong>${m.sender_type || "remetente"}</strong>
          <span>${m.message || ""}</span>
        </div>
      </div>
    </article>
  `).join("");
}

function renderReports() {
  const reportSummary = document.querySelector("[data-report-summary]");
  const reportActions = document.querySelector("[data-report-actions]");

  if (reportSummary) {
    reportSummary.innerHTML = [
      summaryItem("Lojas ativas", (state.snapshot.establishments || []).filter((s) => s.status === "active").length),
      summaryItem("Pedidos", (state.snapshot.orders || []).length),
      summaryItem("Tickets", (state.snapshot.tickets || []).length)
    ].join("");
  }

  if (reportActions) {
    reportActions.innerHTML = `
      <article class="pro-list-card">
        <div class="pro-list-main">
          <div class="pro-list-content">
            <strong>Revisar aprovações pendentes</strong>
            <span>Verifique lojas em status de aprovação.</span>
          </div>
        </div>
      </article>
      <article class="pro-list-card">
        <div class="pro-list-main">
          <div class="pro-list-content">
            <strong>Acompanhar suporte</strong>
            <span>Monitore tickets abertos e tempos de resposta.</span>
          </div>
        </div>
      </article>
    `;
  }
}

function summaryItem(label, value) {
  return `
    <div class="pro-summary-item">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (["active", "paid", "fechado", "resolvido"].includes(value)) return "success";
  if (["approval", "pending", "aberto"].includes(value)) return "warning";
  if (["upgrade"].includes(value)) return "info";
  return "neutral";
}