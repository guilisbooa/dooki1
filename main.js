
const ADMIN_SESSION_KEY = "dooki-admin-session";
const ADMIN_DB_KEY = "dooki-admin-db-v1";

const defaultDb = {
  plans: [
    { id: "p1", name: "Start", price: 120, discount: 0, annualPrice: 1290, annualDiscount: 10, trialDays: 7, description: "Plano de entrada para operacoes menores." },
    { id: "p2", name: "Pro", price: 300, discount: 10, annualPrice: 3060, annualDiscount: 15, trialDays: 10, description: "Plano com recursos mais completos para lojas em crescimento." },
    { id: "p3", name: "Growth", price: 560, discount: 15, annualPrice: 5710, annualDiscount: 18, trialDays: 14, description: "Plano premium para operacoes de maior volume." }
  ],
  stores: [
    { id: "s1", name: "Burger Prime", city: "Sao Paulo", segment: "Hamburgueria", plan: "Pro", status: "Ativo", ordersToday: 182, email: "contato@burgerprime.com", health: "Saudavel", trial: null },
    { id: "s2", name: "Tokyo Wave", city: "Campinas", segment: "Japones", plan: "Start", status: "Aprovacao", ordersToday: 64, email: "oi@tokyowave.com", health: "Pendente", trial: null },
    { id: "s3", name: "Pizza Moderna", city: "Curitiba", segment: "Pizzaria", plan: "Growth", status: "Upgrade", ordersToday: 211, email: "contato@pizzamoderna.com", health: "Crescendo", trial: null },
    { id: "s4", name: "Cafe Aurora", city: "Belo Horizonte", segment: "Cafeteria", plan: "Start", status: "Ativo", ordersToday: 43, email: "time@cafeaurora.com", health: "Saudavel", trial: null },
    { id: "s5", name: "Sabor da Praca", city: "Santos", segment: "Restaurante", plan: "Pro", status: "Ativo", ordersToday: 128, email: "contato@sabordapraca.com", health: "Crescendo", trial: { planId: "p2", planName: "Pro", days: 5, startsAt: "2026-04-13T09:00:00.000Z", endsAt: "2026-04-18T09:00:00.000Z" } }
  ],
  tickets: [
    { id: "t1", storeName: "Burger Prime", subject: "Configuracao de QR por mesa", priority: "Media", status: "aberto" },
    { id: "t2", storeName: "Tokyo Wave", subject: "Duvida sobre aprovacao da loja", priority: "Alta", status: "andamento" },
    { id: "t3", storeName: "Cafe Aurora", subject: "Alteracao de plano e cobranca", priority: "Baixa", status: "resolvido" }
  ]
};

const appState = {
  db: loadDb(),
  storeSearch: "",
  storeStatus: "all",
  ticketStatus: "all",
  selectedStoreId: null,
  selectedPlanId: null,
  storesPage: 1,
  storesPerPage: 4,
  activeScreen: "dashboard"
};

function loadDb() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ADMIN_DB_KEY));
    return normalizeDb(parsed || structuredClone(defaultDb));
  } catch {
    return normalizeDb(structuredClone(defaultDb));
  }
}

function normalizeDb(db) {
  const plans = (db?.plans || defaultDb.plans).map((plan, index) => normalizePlan(plan, index));
  const stores = (db?.stores || defaultDb.stores).map((store, index) => normalizeStore(store, index, plans));
  const tickets = Array.isArray(db?.tickets) ? db.tickets : structuredClone(defaultDb.tickets);
  return { plans, stores, tickets };
}

function normalizePlan(plan, index) {
  const price = Number(plan?.price || 0);
  return {
    id: plan?.id || `p${index + 1}`,
    name: plan?.name || `Plano ${index + 1}`,
    price,
    discount: Number(plan?.discount || 0),
    annualPrice: Number(plan?.annualPrice || price * 12),
    annualDiscount: Number(plan?.annualDiscount || 0),
    trialDays: Number(plan?.trialDays || 0),
    description: plan?.description || ""
  };
}

function normalizeStore(store, index, plans) {
  const matchedPlan = plans.find((item) => item.name === store?.plan) || plans[0];
  const normalized = {
    id: store?.id || `s${index + 1}`,
    name: store?.name || "",
    city: store?.city || "",
    segment: store?.segment || "",
    plan: matchedPlan?.name || "Start",
    status: store?.status || "Ativo",
    ordersToday: Number(store?.ordersToday || 0),
    email: store?.email || "",
    health: store?.health || "Saudavel",
    trial: null
  };

  if (!store?.trial) return normalized;

  const trialPlan = plans.find((item) => item.id === store.trial.planId) || plans.find((item) => item.name === store.trial.planName) || matchedPlan || plans[0];
  const startsAt = store.trial.startsAt || new Date().toISOString();
  const days = Number(store.trial.days || trialPlan?.trialDays || 0);

  normalized.trial = {
    planId: trialPlan?.id || `trial-${index + 1}`,
    planName: trialPlan?.name || normalized.plan,
    days,
    startsAt,
    endsAt: store.trial.endsAt || addDays(startsAt, days)
  };

  return normalized;
}

function saveDb() {
  localStorage.setItem(ADMIN_DB_KEY, JSON.stringify(appState.db));
}

function getAdminSession() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY));
  } catch {
    return null;
  }
}

function setAdminSession(session) {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

function protectAdminPage() {
  if (document.body.dataset.adminRequired !== "true") return;
  const session = getAdminSession();
  if (!session || session.role !== "admin") window.location.href = "index.html";
}

function bindAdminLogin() {
  const form = document.querySelector("[data-admin-login-form]");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString().trim();
    const error = document.querySelector("[data-admin-login-error]");

    if (email !== "admin@dooki.com" || password !== "123456") {
      if (error) {
        error.hidden = false;
        error.textContent = "Email ou senha invalidos.";
      }
      return;
    }

    setAdminSession({ role: "admin", name: "Admin Dooki", email });
    window.location.href = "admin.html";
  });
}

function bindAdminLogout() {
  document.querySelectorAll("[data-admin-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      clearAdminSession();
      window.location.href = "index.html";
    });
  });
}

function bindAdminNavigation() {
  const buttons = document.querySelectorAll("[data-admin-screen]");
  if (!buttons.length) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => setActiveScreen(button.dataset.adminScreen));
  });
}

function bindSidebarToggle() {
  const button = document.querySelector("[data-sidebar-toggle]");
  const app = document.querySelector(".admin-app");
  if (!button || !app) return;

  button.addEventListener("click", () => {
    app.classList.toggle("sidebar-open");
  });
}

function setActiveScreen(screen) {
  const titles = {
    dashboard: "Visao geral",
    stores: "Estabelecimentos",
    plans: "Planos",
    support: "Suporte",
    reports: "Relatorios",
    "store-profile": "Loja selecionada"
  };

  appState.activeScreen = screen;
  document.querySelectorAll("[data-admin-screen]").forEach((item) => {
    item.classList.toggle("active", item.dataset.adminScreen === screen);
  });
  document.querySelectorAll("[data-screen-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.screenPanel === screen);
  });
  const title = document.querySelector("[data-screen-title]");
  if (title) title.textContent = titles[screen] || "Painel admin";
  document.querySelector(".admin-app")?.classList.remove("sidebar-open");
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString();
}

function daysBetween(from, to) {
  const start = new Date(from);
  const end = new Date(to);
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function getPlanByName(name) {
  return appState.db.plans.find((item) => item.name === name);
}

function getPlanById(id) {
  return appState.db.plans.find((item) => item.id === id);
}

function populatePlanSelect(select, selectedValue) {
  if (!select) return;
  select.innerHTML = appState.db.plans.map((plan) => `
    <option value="${plan.name}" ${selectedValue === plan.name ? "selected" : ""}>${plan.name}</option>
  `).join("");
}

function syncPlanSelects() {
  populatePlanSelect(document.querySelector('[data-store-form] select[name="plan"]'));
  populatePlanSelect(document.querySelector('[data-store-modal-form] select[name="plan"]'));
}

function planPrice(planName) {
  const found = getPlanByName(planName);
  return found ? Number(found.price || 0) : 0;
}
function calculateMetrics() {
  const activeStores = appState.db.stores.filter((store) => store.status === "Ativo").length;
  const ordersToday = appState.db.stores.reduce((sum, store) => sum + Number(store.ordersToday || 0), 0);
  const pendingApprovals = appState.db.stores.filter((store) => store.status === "Aprovacao").length;
  const openTickets = appState.db.tickets.filter((ticket) => ticket.status !== "resolvido").length;
  return { activeStores, ordersToday, pendingApprovals, openTickets };
}

function getPlanBreakdown() {
  return appState.db.plans.map((plan) => {
    const stores = appState.db.stores.filter((store) => store.plan === plan.name);
    const monthlyValue = Number(plan.price || 0) * (1 - Number(plan.discount || 0) / 100);
    const annualValue = Number(plan.annualPrice || 0) * (1 - Number(plan.annualDiscount || 0) / 100);
    return {
      plan: plan.name,
      count: stores.length,
      revenue: stores.length * monthlyValue,
      annualRevenue: stores.length * annualValue
    };
  });
}

function ensureStorePlanIntegrity() {
  const fallbackPlan = appState.db.plans[0]?.name || "Start";
  appState.db.stores.forEach((store) => {
    if (!getPlanByName(store.plan)) store.plan = fallbackPlan;
    if (store.trial && !getPlanById(store.trial.planId) && !getPlanByName(store.trial.planName)) {
      store.trial = null;
    }
  });
}

function renderDashboard() {
  const metrics = calculateMetrics();
  setKpi("activeStores", metrics.activeStores);
  setKpi("ordersToday", metrics.ordersToday.toLocaleString("pt-BR"));
  setKpi("pendingApprovals", metrics.pendingApprovals);
  setKpi("openTickets", metrics.openTickets);

  const highlightsNode = document.querySelector("[data-dashboard-highlights]");
  if (highlightsNode) {
    const highlights = [...appState.db.stores].sort((a, b) => b.ordersToday - a.ordersToday).slice(0, 3);
    highlightsNode.innerHTML = highlights.map((store) => `
      <div class="list-card">
        <div><strong>${store.name}</strong><p>${store.plan} - ${store.city} - ${store.segment}</p></div>
        <span class="tag ${tagClassForHealth(store.health)}">${store.health}</span>
      </div>
    `).join("");
  }

  const summaryNode = document.querySelector("[data-dashboard-summary]");
  if (summaryNode) {
    const topPlan = getPlanBreakdown().sort((a, b) => b.count - a.count)[0];
    const avgOrders = Math.round(metrics.ordersToday / Math.max(appState.db.stores.length, 1));
    summaryNode.innerHTML = `
      <div class="summary-row"><span>Crescimento semanal</span><strong>+14%</strong></div>
      <div class="summary-row"><span>Plano dominante</span><strong>${topPlan?.plan || "-"}</strong></div>
      <div class="summary-row"><span>Media de pedidos por loja</span><strong>${avgOrders}</strong></div>
      <div class="summary-row"><span>Lojas prontas para upgrade</span><strong>${appState.db.stores.filter((item) => item.status === "Upgrade").length}</strong></div>
    `;
  }

  const priorityNode = document.querySelector("[data-priority-tickets]");
  if (priorityNode) {
    const tickets = appState.db.tickets.filter((ticket) => ticket.status !== "resolvido").slice(0, 3);
    priorityNode.innerHTML = tickets.map((ticket) => `
      <div class="list-card compact-card">
        <div><strong>${ticket.storeName}</strong><p>${ticket.subject}</p></div>
        <span class="tag ${tagClassForPriority(ticket.priority)}">${ticket.priority}</span>
      </div>
    `).join("") || `<div class="empty-box">Sem tickets prioritarios agora.</div>`;
  }

  const ringNode = document.querySelector("[data-growth-ring]");
  if (ringNode) {
    const avg = Math.min(95, Math.max(54, Math.round((metrics.activeStores / Math.max(appState.db.stores.length, 1)) * 100)));
    ringNode.textContent = `${avg}%`;
    const chart = document.querySelector(".ring-chart");
    if (chart) {
      chart.style.background = `conic-gradient(var(--gold) 0 ${avg}%, #eee7d7 ${avg}% 100%)`;
    }
  }

  const legendNode = document.querySelector("[data-growth-legend]");
  if (legendNode) {
    legendNode.innerHTML = `
      <div class="legend-row"><strong>Contas ativas</strong><span>${metrics.activeStores}</span></div>
      <div class="legend-row"><strong>Aprovacoes pendentes</strong><span>${metrics.pendingApprovals}</span></div>
      <div class="legend-row"><strong>Tickets abertos</strong><span>${metrics.openTickets}</span></div>
    `;
  }

  const cardsNode = document.querySelector("[data-dashboard-store-cards]");
  if (cardsNode) {
    const topStores = [...appState.db.stores].sort((a, b) => b.ordersToday - a.ordersToday).slice(0, 3);
    cardsNode.innerHTML = topStores.map((store) => `
      <button class="store-mini-card" type="button" data-open-profile="${store.id}">
        <strong>${store.name}</strong>
        <p>${store.city} - ${store.segment}</p>
        <div class="summary-row"><span>Pedidos hoje</span><strong>${store.ordersToday}</strong></div>
      </button>
    `).join("");
  }

  const supportSummary = document.querySelector("[data-support-summary]");
  if (supportSummary) {
    supportSummary.innerHTML = `
      <div class="summary-row"><span>Abertos</span><strong>${appState.db.tickets.filter((item) => item.status === "aberto").length}</strong></div>
      <div class="summary-row"><span>Em andamento</span><strong>${appState.db.tickets.filter((item) => item.status === "andamento").length}</strong></div>
      <div class="summary-row"><span>Resolvidos</span><strong>${appState.db.tickets.filter((item) => item.status === "resolvido").length}</strong></div>
      <div class="summary-row"><span>Prioridade alta</span><strong>${appState.db.tickets.filter((item) => item.priority === "Alta").length}</strong></div>
    `;
  }

  document.querySelectorAll("[data-open-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      appState.selectedStoreId = button.dataset.openProfile;
      renderStoreProfile();
      setActiveScreen("store-profile");
    });
  });
}

function renderStores() {
  const filtered = appState.db.stores.filter((store) => {
    const text = `${store.name} ${store.city}`.toLowerCase();
    const matchSearch = !appState.storeSearch || text.includes(appState.storeSearch.toLowerCase());
    const matchStatus = appState.storeStatus === "all" || store.status === appState.storeStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / appState.storesPerPage));
  if (appState.storesPage > totalPages) appState.storesPage = totalPages;
  const start = (appState.storesPage - 1) * appState.storesPerPage;
  const pageItems = filtered.slice(start, start + appState.storesPerPage);

  const table = document.querySelector("[data-stores-table]");
  if (table) {
    table.innerHTML = `
      <div class="table-row table-head-row">
        <span>Loja</span>
        <span>Segmento</span>
        <span>Plano</span>
        <span>Status</span>
      </div>
      ${pageItems.map((store) => `
        <button class="table-row clickable-row" type="button" data-store-row="${store.id}">
          <span><strong>${store.name}</strong><small>${store.city}</small></span>
          <span>${store.segment}</span>
          <span>${store.plan}</span>
          <span class="tag ${tagClassForStatus(store.status)}">${store.status}</span>
        </button>
      `).join("")}
    `;
  }

  const pagination = document.querySelector("[data-stores-pagination]");
  if (pagination) {
    pagination.innerHTML = `
      <button type="button" data-page-action="prev" ${appState.storesPage === 1 ? "disabled" : ""}>Anterior</button>
      <span>Pagina ${appState.storesPage} de ${totalPages}</span>
      <button type="button" data-page-action="next" ${appState.storesPage === totalPages ? "disabled" : ""}>Proxima</button>
    `;
  }

  document.querySelectorAll("[data-page-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.pageAction === "prev" && appState.storesPage > 1) appState.storesPage -= 1;
      if (button.dataset.pageAction === "next" && appState.storesPage < totalPages) appState.storesPage += 1;
      renderStores();
    });
  });

  document.querySelectorAll("[data-store-row]").forEach((button) => {
    button.addEventListener("click", () => {
      appState.selectedStoreId = button.dataset.storeRow;
      renderStoreDetail();
      renderStoreProfile();
      setActiveScreen("store-profile");
    });
  });

  renderStoreDetail();
}

function renderStoreDetail() {
  const detail = document.querySelector("[data-store-detail]");
  if (!detail) return;

  const selected = appState.db.stores.find((store) => store.id === appState.selectedStoreId) || appState.db.stores[0];
  if (!selected) {
    detail.innerHTML = '<div class="empty-box">Nenhum estabelecimento cadastrado.</div>';
    return;
  }

  appState.selectedStoreId = selected.id;

  detail.innerHTML = `
    <span class="panel-kicker">Detalhe da conta</span>
    <h3>${selected.name}</h3>
    <div class="summary-list">
      <div class="summary-row"><span>Cidade</span><strong>${selected.city}</strong></div>
      <div class="summary-row"><span>Segmento</span><strong>${selected.segment}</strong></div>
      <div class="summary-row"><span>Plano</span><strong>${selected.plan}</strong></div>
      <div class="summary-row"><span>Status</span><strong>${selected.status}</strong></div>
      <div class="summary-row"><span>Pedidos hoje</span><strong>${selected.ordersToday}</strong></div>
      <div class="summary-row"><span>Email</span><strong>${selected.email || "-"}</strong></div>
      <div class="summary-row"><span>Trial</span><strong>${selected.trial ? `${selected.trial.planName} ate ${formatDate(selected.trial.endsAt)}` : "Sem trial"}</strong></div>
    </div>
    <div class="inline-actions detail-actions">
      <button class="primary-button" type="button" data-store-action="edit">Editar em modal</button>
      <button class="ghost-button" type="button" data-store-action="view-profile">Abrir perfil</button>
      <button class="ghost-button" type="button" data-store-action="toggle-status">${selected.status === "Ativo" ? "Mover para upgrade" : "Ativar conta"}</button>
      <button class="ghost-button" type="button" data-store-action="upgrade-plan">Avancar plano</button>
      <button class="ghost-button danger-ghost" type="button" data-store-action="delete">Excluir loja</button>
    </div>
  `;

  detail.querySelectorAll("[data-store-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const store = appState.db.stores.find((item) => item.id === selected.id);
      if (!store) return;

      if (button.dataset.storeAction === "edit") {
        openStoreModal(store.id);
        return;
      }
      if (button.dataset.storeAction === "view-profile") {
        renderStoreProfile();
        setActiveScreen("store-profile");
        return;
      }
      if (button.dataset.storeAction === "toggle-status") {
        store.status = store.status === "Ativo" ? "Upgrade" : "Ativo";
      }
      if (button.dataset.storeAction === "upgrade-plan") {
        store.plan = nextPlan(store.plan);
        store.status = "Upgrade";
      }
      if (button.dataset.storeAction === "delete") {
        const confirmed = window.confirm(`Excluir ${store.name}?`);
        if (!confirmed) return;
        appState.db.stores = appState.db.stores.filter((item) => item.id !== store.id);
        appState.selectedStoreId = appState.db.stores[0]?.id || null;
      }

      saveDb();
      renderAllAdminData();
    });
  });
}
function renderStoreProfile() {
  const store = appState.db.stores.find((item) => item.id === appState.selectedStoreId) || appState.db.stores[0];
  if (!store) return;

  appState.selectedStoreId = store.id;

  const profileName = document.querySelector("[data-profile-name]");
  const profileHeading = document.querySelector("[data-profile-heading]");
  const profileSummary = document.querySelector("[data-profile-summary]");
  const profileStatus = document.querySelector("[data-profile-status]");
  const profileStats = document.querySelector("[data-profile-stats]");
  const profileDetails = document.querySelector("[data-profile-details]");

  if (profileName) profileName.textContent = store.name;
  if (profileHeading) profileHeading.textContent = `${store.name} em foco`;
  if (profileSummary) profileSummary.textContent = `${store.segment} em ${store.city} com plano ${store.plan} e operacao ${store.status.toLowerCase()}.`;
  if (profileStatus) {
    profileStatus.textContent = store.status;
    profileStatus.className = `tag ${tagClassForStatus(store.status)}`;
  }
  if (profileStats) {
    profileStats.innerHTML = `
      <article class="panel stat-card"><span>Pedidos hoje</span><strong>${store.ordersToday}</strong></article>
      <article class="panel stat-card"><span>Plano</span><strong>${store.plan}</strong></article>
      <article class="panel stat-card"><span>Receita estimada</span><strong>${money(planPrice(store.plan))}</strong></article>
    `;
  }
  if (profileDetails) {
    profileDetails.innerHTML = `
      <div class="summary-row"><span>Cidade</span><strong>${store.city}</strong></div>
      <div class="summary-row"><span>Segmento</span><strong>${store.segment}</strong></div>
      <div class="summary-row"><span>Email</span><strong>${store.email || "-"}</strong></div>
      <div class="summary-row"><span>Saude da conta</span><strong>${store.health}</strong></div>
      <div class="summary-row"><span>Trial ativo</span><strong>${store.trial ? `${store.trial.planName} ate ${formatDate(store.trial.endsAt)}` : "Nao"}</strong></div>
    `;
  }
}

function renderPlans() {
  const plansNode = document.querySelector("[data-plans-list]");
  const revenueNode = document.querySelector("[data-revenue-summary]");
  const barsNode = document.querySelector("[data-plan-bars]");
  const trialsNode = document.querySelector("[data-trials-list]");
  const storeSelect = document.querySelector("[data-trial-store-select]");
  const planSelect = document.querySelector("[data-trial-plan-select]");
  const breakdown = getPlanBreakdown();

  if (plansNode) {
    plansNode.innerHTML = appState.db.plans.map((plan) => `
      <div class="list-card plan-list-card">
        <div>
          <strong>${plan.name}</strong>
          <p>${plan.description || "Sem descricao."}</p>
          <div class="plan-price-grid">
            <span>Mensal: <strong>${money(plan.price)}</strong></span>
            <span>Desconto: <strong>${Number(plan.discount || 0)}%</strong></span>
            <span>Anual: <strong>${money(plan.annualPrice)}</strong></span>
            <span>Desc. anual: <strong>${Number(plan.annualDiscount || 0)}%</strong></span>
            <span>Trial padrao: <strong>${Number(plan.trialDays || 0)} dias</strong></span>
          </div>
        </div>
        <div class="inline-actions">
          <button class="ghost-button" type="button" data-plan-action="edit" data-plan-id="${plan.id}">Editar</button>
          <button class="ghost-button danger-ghost" type="button" data-plan-action="delete" data-plan-id="${plan.id}">Excluir</button>
        </div>
      </div>
    `).join("");
  }

  if (revenueNode) {
    const mrr = breakdown.reduce((sum, item) => sum + item.revenue, 0);
    const arr = breakdown.reduce((sum, item) => sum + item.annualRevenue, 0);
    revenueNode.innerHTML = `
      <div class="summary-row"><span>MRR atual</span><strong>${money(mrr)}</strong></div>
      <div class="summary-row"><span>ARR contratado</span><strong>${money(arr)}</strong></div>
      <div class="summary-row"><span>Receita projetada</span><strong>${money(mrr * 1.18)}</strong></div>
      <div class="summary-row"><span>Trials ativos</span><strong>${appState.db.stores.filter((store) => store.trial).length}</strong></div>
    `;
  }

  if (barsNode) {
    const max = Math.max(...breakdown.map((item) => item.count), 1);
    barsNode.innerHTML = breakdown.map((item) => `
      <div class="bar-row">
        <div class="bar-meta">
          <strong>${item.plan}</strong>
          <span>${item.count} conta(s) - ${money(item.revenue)}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${(item.count / max) * 100}%"></div></div>
      </div>
    `).join("");
  }

  if (storeSelect) {
    storeSelect.innerHTML = appState.db.stores.map((store) => `<option value="${store.id}">${store.name}</option>`).join("");
  }

  if (planSelect) {
    planSelect.innerHTML = appState.db.plans.map((plan) => `<option value="${plan.id}">${plan.name}</option>`).join("");
  }

  if (trialsNode) {
    const trialStores = appState.db.stores.filter((store) => store.trial);
    trialsNode.innerHTML = trialStores.map((store) => `
      <div class="list-card">
        <div>
          <strong>${store.name}</strong>
          <p>${store.trial.planName} de ${formatDate(store.trial.startsAt)} ate ${formatDate(store.trial.endsAt)}</p>
        </div>
        <span class="tag featured-tag">${daysBetween(new Date().toISOString(), store.trial.endsAt)} dia(s) restantes</span>
      </div>
    `).join("") || `<div class="empty-box">Nenhum trial ativo no momento.</div>`;
  }

  document.querySelectorAll("[data-plan-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const planId = button.dataset.planId;
      if (button.dataset.planAction === "edit") {
        openPlanModal(planId);
        return;
      }
      if (button.dataset.planAction === "delete") {
        deletePlan(planId);
      }
    });
  });
}

function renderSupport() {
  const list = document.querySelector("[data-support-list]");
  if (!list) return;

  const filtered = appState.db.tickets.filter((ticket) => appState.ticketStatus === "all" || ticket.status === appState.ticketStatus);
  list.innerHTML = filtered.map((ticket) => `
    <div class="list-card support-card">
      <div>
        <strong>${ticket.storeName}</strong>
        <p>${ticket.subject}</p>
      </div>
      <div class="ticket-actions">
        <span class="tag ${tagClassForPriority(ticket.priority)}">${ticket.priority}</span>
        <select class="input ticket-select" data-ticket-status="${ticket.id}">
          <option value="aberto" ${ticket.status === "aberto" ? "selected" : ""}>Aberto</option>
          <option value="andamento" ${ticket.status === "andamento" ? "selected" : ""}>Em andamento</option>
          <option value="resolvido" ${ticket.status === "resolvido" ? "selected" : ""}>Resolvido</option>
        </select>
      </div>
    </div>
  `).join("") || `<div class="empty-box">Nenhum ticket nesse filtro.</div>`;

  document.querySelectorAll("[data-ticket-status]").forEach((select) => {
    select.addEventListener("change", () => {
      const ticket = appState.db.tickets.find((item) => item.id === select.dataset.ticketStatus);
      if (!ticket) return;
      ticket.status = select.value;
      saveDb();
      renderAllAdminData();
    });
  });
}

function renderReports() {
  const reportSummary = document.querySelector("[data-report-summary]");
  const reportActions = document.querySelector("[data-report-actions]");
  const totalOrders = appState.db.stores.reduce((sum, store) => sum + Number(store.ordersToday || 0), 0);
  const avgOrders = Math.round(totalOrders / Math.max(appState.db.stores.length, 1));

  if (reportSummary) {
    reportSummary.innerHTML = `
      <div class="summary-row"><span>Pedidos via mesa</span><strong>39%</strong></div>
      <div class="summary-row"><span>Pedidos via link</span><strong>61%</strong></div>
      <div class="summary-row"><span>Media de pedidos por loja</span><strong>${avgOrders}</strong></div>
      <div class="summary-row"><span>Tempo medio de preparo</span><strong>18 min</strong></div>
    `;
  }

  if (reportActions) {
    reportActions.innerHTML = `
      <li>Filtro por cidade e segmento com exportacao</li>
      <li>Gestao de cobranca por conta com historico</li>
      <li>Historico detalhado de suporte por loja</li>
      <li>Visao individual de cada restaurante com timeline</li>
    `;
  }
}
function bindStoreControls() {
  const searchInput = document.querySelector("[data-store-search]");
  const statusSelect = document.querySelector("[data-store-filter-status]");
  const form = document.querySelector("[data-store-form]");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      appState.storeSearch = searchInput.value;
      appState.storesPage = 1;
      renderStores();
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener("change", () => {
      appState.storeStatus = statusSelect.value;
      appState.storesPage = 1;
      renderStores();
    });
  }

  if (form) {
    syncPlanSelects();
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      appState.db.stores.unshift({
        id: `s${Date.now()}`,
        name: data.get("name")?.toString().trim() || "",
        city: data.get("city")?.toString().trim() || "",
        segment: data.get("segment")?.toString().trim() || "",
        plan: data.get("plan")?.toString() || appState.db.plans[0]?.name || "Start",
        status: data.get("status")?.toString() || "Ativo",
        ordersToday: Number(data.get("ordersToday") || 0),
        email: data.get("email")?.toString().trim() || "",
        health: "Saudavel",
        trial: null
      });
      saveDb();
      form.reset();
      syncPlanSelects();
      appState.storesPage = 1;
      renderAllAdminData();
    });
  }

  document.querySelectorAll("[data-back-to-stores]").forEach((button) => {
    button.addEventListener("click", () => setActiveScreen("stores"));
  });

  document.querySelectorAll("[data-profile-upgrade]").forEach((button) => {
    button.addEventListener("click", () => {
      const store = appState.db.stores.find((item) => item.id === appState.selectedStoreId);
      if (!store) return;
      store.plan = nextPlan(store.plan);
      store.status = "Upgrade";
      saveDb();
      renderAllAdminData();
    });
  });

  document.querySelectorAll("[data-profile-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const store = appState.db.stores.find((item) => item.id === appState.selectedStoreId);
      if (!store) return;
      const confirmed = window.confirm(`Excluir ${store.name}?`);
      if (!confirmed) return;
      appState.db.stores = appState.db.stores.filter((item) => item.id !== store.id);
      appState.selectedStoreId = appState.db.stores[0]?.id || null;
      saveDb();
      setActiveScreen("stores");
      renderAllAdminData();
    });
  });
}

function bindTicketControls() {
  const filter = document.querySelector("[data-ticket-filter]");
  const form = document.querySelector("[data-ticket-form]");

  if (filter) {
    filter.addEventListener("change", () => {
      appState.ticketStatus = filter.value;
      renderSupport();
    });
  }

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      appState.db.tickets.unshift({
        id: `t${Date.now()}`,
        storeName: data.get("storeName")?.toString().trim() || "",
        subject: data.get("subject")?.toString().trim() || "",
        priority: data.get("priority")?.toString() || "Media",
        status: "aberto"
      });
      saveDb();
      form.reset();
      renderAllAdminData();
    });
  }
}

function bindPlanControls() {
  const planForm = document.querySelector("[data-plan-form]");
  const trialForm = document.querySelector("[data-trial-form]");

  if (planForm) {
    planForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(planForm);
      const name = data.get("name")?.toString().trim() || "";
      if (!name) return;

      const existing = appState.db.plans.find((item) => item.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        existing.price = Number(data.get("price") || 0);
        existing.discount = Number(data.get("discount") || 0);
        existing.annualPrice = Number(data.get("annualPrice") || 0);
        existing.annualDiscount = Number(data.get("annualDiscount") || 0);
        existing.trialDays = Number(data.get("trialDays") || 0);
        existing.description = data.get("description")?.toString().trim() || "";
      } else {
        appState.db.plans.push({
          id: `p${Date.now()}`,
          name,
          price: Number(data.get("price") || 0),
          discount: Number(data.get("discount") || 0),
          annualPrice: Number(data.get("annualPrice") || 0),
          annualDiscount: Number(data.get("annualDiscount") || 0),
          trialDays: Number(data.get("trialDays") || 0),
          description: data.get("description")?.toString().trim() || ""
        });
      }

      saveDb();
      planForm.reset();
      planForm.elements.discount.value = "0";
      planForm.elements.annualDiscount.value = "12";
      planForm.elements.trialDays.value = "7";
      renderAllAdminData();
    });
  }

  if (trialForm) {
    trialForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(trialForm);
      const store = appState.db.stores.find((item) => item.id === data.get("storeId"));
      const plan = appState.db.plans.find((item) => item.id === data.get("planId"));
      if (!store || !plan) return;

      const startsAt = new Date().toISOString();
      const days = Number(data.get("days") || 0);
      store.trial = {
        planId: plan.id,
        planName: plan.name,
        days,
        startsAt,
        endsAt: addDays(startsAt, days)
      };

      saveDb();
      renderAllAdminData();
    });
  }
}

function renderAllAdminData() {
  ensureStorePlanIntegrity();
  renderDashboard();
  renderStores();
  renderPlans();
  renderSupport();
  renderReports();
  renderStoreProfile();
  syncPlanSelects();
}

function nextPlan(plan) {
  const index = appState.db.plans.findIndex((item) => item.name === plan);
  if (index === -1) return appState.db.plans[0]?.name || "Start";
  return appState.db.plans[Math.min(index + 1, appState.db.plans.length - 1)]?.name || plan;
}

function setKpi(name, value) {
  const node = document.querySelector(`[data-kpi="${name}"]`);
  if (node) node.textContent = value;
}

function tagClassForStatus(status) {
  if (status === "Ativo") return "active-tag";
  if (status === "Upgrade") return "featured-tag";
  return "";
}

function tagClassForHealth(health) {
  if (health === "Saudavel") return "active-tag";
  if (health === "Crescendo") return "featured-tag";
  return "";
}

function tagClassForPriority(priority) {
  if (priority === "Alta") return "featured-tag";
  if (priority === "Baixa") return "active-tag";
  return "";
}
function planUsage(plan) {
  const storesUsingPlan = appState.db.stores.filter((store) => store.plan === plan.name);
  const storesInTrial = appState.db.stores.filter((store) => store.trial && (store.trial.planId === plan.id || store.trial.planName === plan.name));
  return { storesUsingPlan, storesInTrial };
}

function deletePlan(planId) {
  const plan = getPlanById(planId);
  if (!plan) return;

  const usage = planUsage(plan);
  if (usage.storesUsingPlan.length || usage.storesInTrial.length) {
    window.alert(`Nao e possivel excluir o plano ${plan.name} porque ele esta em uso por estabelecimentos ou trials ativos.`);
    return;
  }

  const confirmed = window.confirm(`Excluir o plano ${plan.name}?`);
  if (!confirmed) return;

  appState.db.plans = appState.db.plans.filter((item) => item.id !== planId);
  if (appState.selectedPlanId === planId) appState.selectedPlanId = null;
  saveDb();
  renderAllAdminData();
}

function openStoreModal(storeId) {
  const modal = document.querySelector("[data-store-modal]");
  const form = document.querySelector("[data-store-modal-form]");
  const store = appState.db.stores.find((item) => item.id === storeId);
  if (!modal || !form || !store) return;

  appState.selectedStoreId = store.id;
  form.elements.name.value = store.name;
  form.elements.city.value = store.city;
  form.elements.segment.value = store.segment;
  populatePlanSelect(form.elements.plan, store.plan);
  form.elements.status.value = store.status;
  form.elements.ordersToday.value = store.ordersToday;
  form.elements.email.value = store.email || "";
  modal.hidden = false;
}

function closeStoreModal() {
  const modal = document.querySelector("[data-store-modal]");
  if (modal) modal.hidden = true;
}

function bindStoreModal() {
  const form = document.querySelector("[data-store-modal-form]");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const store = appState.db.stores.find((item) => item.id === appState.selectedStoreId);
      if (!store) return;

      const data = new FormData(form);
      store.name = data.get("name")?.toString().trim() || store.name;
      store.city = data.get("city")?.toString().trim() || "";
      store.segment = data.get("segment")?.toString().trim() || "";
      store.plan = data.get("plan")?.toString() || appState.db.plans[0]?.name || "Start";
      store.status = data.get("status")?.toString() || "Ativo";
      store.ordersToday = Number(data.get("ordersToday") || 0);
      store.email = data.get("email")?.toString().trim() || "";
      saveDb();
      closeStoreModal();
      renderAllAdminData();
    });
  }

  document.querySelectorAll("[data-close-store-modal]").forEach((button) => {
    button.addEventListener("click", closeStoreModal);
  });

  const modal = document.querySelector("[data-store-modal]");
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeStoreModal();
    });
  }

  document.querySelectorAll("[data-open-store-modal]").forEach((button) => {
    button.addEventListener("click", () => openStoreModal(appState.selectedStoreId));
  });
}

function openPlanModal(planId) {
  const modal = document.querySelector("[data-plan-modal]");
  const form = document.querySelector("[data-plan-modal-form]");
  const plan = getPlanById(planId);
  if (!modal || !form || !plan) return;

  appState.selectedPlanId = plan.id;
  form.elements.name.value = plan.name;
  form.elements.price.value = plan.price;
  form.elements.discount.value = plan.discount;
  form.elements.annualPrice.value = plan.annualPrice;
  form.elements.annualDiscount.value = plan.annualDiscount;
  form.elements.trialDays.value = plan.trialDays;
  form.elements.description.value = plan.description || "";
  modal.hidden = false;
}

function closePlanModal() {
  const modal = document.querySelector("[data-plan-modal]");
  if (modal) modal.hidden = true;
}

function bindPlanModal() {
  const form = document.querySelector("[data-plan-modal-form]");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const plan = getPlanById(appState.selectedPlanId);
      if (!plan) return;

      const oldName = plan.name;
      const data = new FormData(form);
      plan.name = data.get("name")?.toString().trim() || plan.name;
      plan.price = Number(data.get("price") || 0);
      plan.discount = Number(data.get("discount") || 0);
      plan.annualPrice = Number(data.get("annualPrice") || 0);
      plan.annualDiscount = Number(data.get("annualDiscount") || 0);
      plan.trialDays = Number(data.get("trialDays") || 0);
      plan.description = data.get("description")?.toString().trim() || "";

      appState.db.stores.forEach((store) => {
        if (store.plan === oldName) store.plan = plan.name;
        if (store.trial && (store.trial.planId === plan.id || store.trial.planName === oldName)) {
          store.trial.planId = plan.id;
          store.trial.planName = plan.name;
        }
      });

      saveDb();
      closePlanModal();
      renderAllAdminData();
    });
  }

  document.querySelectorAll("[data-close-plan-modal]").forEach((button) => {
    button.addEventListener("click", closePlanModal);
  });

  const modal = document.querySelector("[data-plan-modal]");
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closePlanModal();
    });
  }
}

protectAdminPage();
bindAdminLogin();
bindAdminLogout();
bindAdminNavigation();
bindSidebarToggle();
renderAllAdminData();
bindStoreControls();
bindTicketControls();
bindStoreModal();
bindPlanControls();
bindPlanModal();
