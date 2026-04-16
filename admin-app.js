// =====================================================
// DOOKI ADMIN APP
// =====================================================

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
  selectedPlanId: null,
  selectedTicketId: null,
  selectedTicketMessages: []
};

document.addEventListener("DOMContentLoaded", async () => {
  forceCloseAllModals();

  const ok = await loadAdminSession();
  if (!ok) return;

  bindAdminEvents();
  bindNavigationEvents();
  await refreshSnapshot();
  renderDashboard();
  forceCloseAllModals();
});

async function loadAdminSession() {
  const client = window.supabaseClient;
  if (!client) {
    alert("Supabase não configurado.");
    window.location.href = "index.html";
    return false;
  }

  try {
    const { data, error } = await client.auth.getUser();
    const user = data?.user;

    if (error || !user) {
      localStorage.removeItem("dooki-admin-session");
      window.location.href = "index.html";
      return false;
    }

    const { data: profile, error: profileError } = await client
      .from("admin_profiles")
      .select("*")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (profileError || !profile) {
      localStorage.removeItem("dooki-admin-session");
      alert("Você não tem acesso ao painel admin.");
      window.location.href = "index.html";
      return false;
    }

    state.admin = {
      id: user.id,
      name: profile.name || "Administrador",
      email: profile.email || user.email,
      role: profile.role || "admin"
    };

    localStorage.setItem("dooki-admin-session", JSON.stringify(state.admin));
    renderAdminInfo();
    return true;
  } catch (error) {
    console.error("Erro ao validar sessão:", error);
    localStorage.removeItem("dooki-admin-session");
    window.location.href = "index.html";
    return false;
  }
}

function renderAdminInfo() {
  const nameEl = document.querySelector("[data-admin-name]");
  const emailEl = document.querySelector("[data-admin-email]");

  if (nameEl) nameEl.textContent = state.admin?.name || "Administrador";
  if (emailEl) emailEl.textContent = state.admin?.email || "admin@dooki.com";
}

function setRemoteStatus(text) {
  const el = document.querySelector("[data-remote-status]");
  if (el) el.textContent = text;
}

async function refreshSnapshot() {
  try {
    setRemoteStatus("Sincronizando dados");
    const data = await window.DookiData.getSnapshot();
    state.snapshot = data;
    setRemoteStatus("Dados sincronizados");
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    setRemoteStatus("Erro ao sincronizar");
    alert(error.message || "Erro ao carregar dados.");
  }
}

function renderDashboard() {
  renderKpis();
  renderDashboardHighlights();
  renderDashboardSummary();
  renderPriorityTickets();
  renderSupportSummary();
  renderGrowthLegend();
  renderDashboardStoreCards();
  renderStores();
  renderPlans();
  renderPayments();
  renderSupport();
  renderReports();
  renderStoreSelects();
  renderPlanSelects();
  renderStoreDetail();
}

function renderKpis() {
  const stores = state.snapshot.establishments || [];
  const orders = state.snapshot.orders || [];
  const tickets = state.snapshot.tickets || [];

  const activeStores = stores.filter((item) => item.status === "active" || item.status === "Ativo").length;
  const pendingApprovals = stores.filter((item) =>
    item.status === "approval" ||
    item.status === "Aprovacao" ||
    item.status === "Aprovação"
  ).length;
  const openTickets = tickets.filter((item) =>
    item.status === "aberto" || item.status === "andamento"
  ).length;

  const kpis = {
    activeStores,
    ordersToday: orders.length,
    pendingApprovals,
    openTickets
  };

  Object.entries(kpis).forEach(([key, value]) => {
    const el = document.querySelector(`[data-kpi="${key}"]`);
    if (el) el.textContent = String(value);
  });
}

function renderDashboardHighlights() {
  const container = document.querySelector("[data-dashboard-highlights]");
  if (!container) return;

  const stores = [...(state.snapshot.establishments || [])].slice(0, 5);

  if (!stores.length) {
    container.innerHTML = `
      <div class="pro-empty-state">
        <strong>Nenhum estabelecimento encontrado</strong>
        <span>Cadastre a primeira loja para começar.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = stores.map((store) => `
    <div class="pro-list-card">
      <div class="pro-list-main">
        <div class="pro-avatar">
          ${(store.name || "L").charAt(0).toUpperCase()}
        </div>
        <div class="pro-list-content">
          <strong>${store.name}</strong>
          <span>${store.city || "-"} • ${store.email || "Sem email"}</span>
        </div>
      </div>
      <span class="pro-status-badge ${getStatusClass(store.status)}">${store.status || "-"}</span>
    </div>
  `).join("");
}

function renderDashboardSummary() {
  const container = document.querySelector("[data-dashboard-summary]");
  if (!container) return;

  const stores = state.snapshot.establishments || [];
  const plans = state.snapshot.plans || [];
  const payments = state.snapshot.payments || [];

  const totalRevenue = payments
    .filter((item) => item.direction === "charge")
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  container.innerHTML = `
    <div class="pro-summary-item">
      <span>Lojas cadastradas</span>
      <strong>${stores.length}</strong>
    </div>
    <div class="pro-summary-item">
      <span>Planos cadastrados</span>
      <strong>${plans.length}</strong>
    </div>
    <div class="pro-summary-item">
      <span>Receita lançada</span>
      <strong>R$ ${totalRevenue.toFixed(2)}</strong>
    </div>
  `;
}

function renderPriorityTickets() {
  const container = document.querySelector("[data-priority-tickets]");
  if (!container) return;

  const tickets = (state.snapshot.tickets || [])
    .filter((item) => item.priority === "Alta" || item.priority === "Media" || item.priority === "Média")
    .slice(0, 5);

  if (!tickets.length) {
    container.innerHTML = `
      <div class="pro-empty-state">
        <strong>Nenhum chamado prioritário</strong>
        <span>Os tickets mais críticos aparecerão aqui.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = tickets.map((ticket) => `
    <div class="pro-list-card">
      <div class="pro-list-content">
        <strong>${ticket.subject}</strong>
        <span>${ticket.storeName}</span>
      </div>
      <span class="pro-priority-badge ${getPriorityClass(ticket.priority)}">${ticket.priority}</span>
    </div>
  `).join("");
}

function renderSupportSummary() {
  const container = document.querySelector("[data-support-summary]");
  if (!container) return;

  const tickets = state.snapshot.tickets || [];
  const aberto = tickets.filter((item) => item.status === "aberto").length;
  const andamento = tickets.filter((item) => item.status === "andamento").length;
  const resolvido = tickets.filter((item) => item.status === "resolvido").length;

  container.innerHTML = `
    <div class="pro-summary-item"><span>Abertos</span><strong>${aberto}</strong></div>
    <div class="pro-summary-item"><span>Em andamento</span><strong>${andamento}</strong></div>
    <div class="pro-summary-item"><span>Resolvidos</span><strong>${resolvido}</strong></div>
  `;
}

function renderGrowthLegend() {
  const legend = document.querySelector("[data-growth-legend]");
  const ring = document.querySelector("[data-growth-ring]");
  if (!legend || !ring) return;

  const stores = state.snapshot.establishments || [];
  const active = stores.filter((item) => item.status === "active" || item.status === "Ativo").length;
  const total = stores.length || 1;
  const percent = Math.round((active / total) * 100);

  ring.textContent = `${percent}%`;

  legend.innerHTML = `
    <div class="pro-summary-item"><span>Ativas</span><strong>${active}</strong></div>
    <div class="pro-summary-item"><span>Total</span><strong>${stores.length}</strong></div>
    <div class="pro-summary-item"><span>Saúde da base</span><strong>${percent}%</strong></div>
  `;
}

function renderDashboardStoreCards() {
  const container = document.querySelector("[data-dashboard-store-cards]");
  if (!container) return;

  const stores = [...(state.snapshot.establishments || [])].slice(0, 4);

  if (!stores.length) {
    container.innerHTML = `
      <div class="pro-empty-state">
        <strong>Nenhuma loja encontrada</strong>
      </div>
    `;
    return;
  }

  container.innerHTML = stores.map((store) => `
    <div class="pro-store-card">
      <div class="pro-store-card-top">
        <div class="pro-avatar large">${(store.name || "L").charAt(0).toUpperCase()}</div>
        <span class="pro-status-badge ${getStatusClass(store.status)}">${store.status || "-"}</span>
      </div>
      <div class="pro-store-card-body">
        <h4>${store.name}</h4>
        <p>${store.city || "-"} • ${store.plan || "Sem plano"}</p>
      </div>
      <button class="ghost-button" type="button" onclick="selectStore('${store.id}')">Ver loja</button>
    </div>
  `).join("");
}

function renderStores() {
  const container = document.getElementById("stores-list");
  if (!container) return;

  const stores = state.snapshot.establishments || [];
  const searchEl = document.querySelector("[data-store-search]");
  const cityEl = document.querySelector("[data-store-filter-city]");

  let filtered = [...stores];

  const search = searchEl?.value?.trim().toLowerCase() || "";
  const city = cityEl?.value || "all";

  if (search) {
    filtered = filtered.filter((item) =>
      (item.name || "").toLowerCase().includes(search)
    );
  }

  if (city !== "all") {
    filtered = filtered.filter((item) => (item.city || "") === city);
  }

  if (cityEl) {
    const currentValue = cityEl.value;
    const cities = [...new Set(stores.map((item) => item.city).filter(Boolean))].sort();

    cityEl.innerHTML = `<option value="all">Todas as cidades</option>` +
      cities.map((item) => `<option value="${item}">${item}</option>`).join("");

    cityEl.value = cities.includes(currentValue) ? currentValue : "all";
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="pro-empty-state">
        <strong>Nenhum estabelecimento encontrado.</strong>
        <span>Tente ajustar os filtros ou cadastre uma nova loja.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((store) => `
    <div class="pro-store-row">
      <div class="pro-store-row-left">
        <div class="pro-avatar">${(store.name || "L").charAt(0).toUpperCase()}</div>
        <div class="pro-store-row-content">
          <strong>${store.name}</strong>
          <span>${store.city || "-"} • ${store.email || "Sem email"}</span>
        </div>
      </div>

      <div class="pro-store-row-right">
        <span class="pro-status-badge ${getStatusClass(store.status)}">${store.status || "-"}</span>
        <div class="pro-action-group">
          <button class="ghost-button" type="button" onclick="selectStore('${store.id}')">Ver</button>
          <button class="ghost-button" type="button" onclick="openEditStoreModal('${store.id}')">Editar</button>
          <button class="ghost-button danger-ghost" type="button" onclick="handleDeleteStore('${store.id}')">Excluir</button>
        </div>
      </div>
    </div>
  `).join("");
}

function renderStoreDetail() {
  const detailEl = document.querySelector("[data-store-detail]");
  if (!detailEl) return;

  const stores = state.snapshot.establishments || [];
  const selected = stores.find((item) => item.id === state.selectedStoreId) || stores[0];

  if (!selected) {
    detailEl.innerHTML = `
      <div class="pro-empty-state">
        <strong>Sem dados</strong>
        <span>Nenhuma loja selecionada.</span>
      </div>
    `;
    return;
  }

  detailEl.innerHTML = `
    <div class="pro-summary-item"><span>Loja</span><strong>${selected.name}</strong></div>
    <div class="pro-summary-item"><span>Cidade</span><strong>${selected.city || "-"}</strong></div>
    <div class="pro-summary-item"><span>Status</span><strong>${selected.status || "-"}</strong></div>
    <div class="pro-summary-item"><span>Plano</span><strong>${selected.plan || "-"}</strong></div>
  `;
}

function renderPlans() {
  const container = document.querySelector("[data-plans-list]");
  if (!container) return;

  const plans = state.snapshot.plans || [];

  if (!plans.length) {
    container.innerHTML = `
      <div class="pro-empty-state">
        <strong>Nenhum plano cadastrado.</strong>
        <span>Crie o primeiro plano da plataforma.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = plans.map((plan) => `
    <div class="pro-plan-card">
      <div class="pro-plan-main">
        <div>
          <strong>${plan.name}</strong>
          <span>${plan.description || "Plano ativo da plataforma"}</span>
        </div>

        <div class="pro-plan-price">
          <strong>R$ ${Number(plan.price || 0).toFixed(2)}</strong>
          <span>/ mês</span>
        </div>
      </div>

      <div class="pro-plan-meta">
        <span>Anual: R$ ${Number(plan.annualPrice || 0).toFixed(2)}</span>
        <span>Trial: ${Number(plan.trialDays || 0)} dias</span>
      </div>

      <div class="pro-action-group">
        <button class="ghost-button" type="button" onclick="openEditPlanModal('${plan.id}')">Editar</button>
        <button class="ghost-button danger-ghost" type="button" onclick="handleDeletePlan('${plan.id}')">Excluir</button>
      </div>
    </div>
  `).join("");
}

function renderPayments() {
  const summaryEl = document.querySelector("[data-payments-summary]");
  const listEl = document.querySelector("[data-payments-list]");

  if (summaryEl) {
    const payments = state.snapshot.payments || [];
    const charges = payments.filter((item) => item.direction === "charge").reduce((acc, item) => acc + Number(item.amount || 0), 0);
    const payouts = payments.filter((item) => item.direction === "payout").reduce((acc, item) => acc + Number(item.amount || 0), 0);

    summaryEl.innerHTML = `
      <div class="pro-summary-item"><span>Cobranças</span><strong>R$ ${charges.toFixed(2)}</strong></div>
      <div class="pro-summary-item"><span>Repasses</span><strong>R$ ${payouts.toFixed(2)}</strong></div>
      <div class="pro-summary-item"><span>Lançamentos</span><strong>${payments.length}</strong></div>
    `;
  }

  if (listEl) {
    const payments = [...(state.snapshot.payments || [])].slice(0, 10);

    if (!payments.length) {
      listEl.innerHTML = `
        <div class="pro-empty-state">
          <strong>Nenhum pagamento encontrado.</strong>
          <span>Os lançamentos financeiros aparecerão aqui.</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = payments.map((item) => `
      <div class="pro-payment-card">
        <div class="pro-payment-main">
          <div>
            <strong>${item.category || "Pagamento"}</strong>
            <span>${item.establishment_name || "Loja"} • ${item.direction === "charge" ? "Cobrança" : "Repasse"}</span>
          </div>

          <div class="pro-payment-amount ${item.direction === "charge" ? "negative" : "positive"}">
            ${item.direction === "charge" ? "-" : "+"} R$ ${Number(item.amount || 0).toFixed(2)}
          </div>
        </div>
      </div>
    `).join("");
  }
}

function renderSupport() {
  const listEl = document.querySelector("[data-support-list]");
  if (!listEl) return;

  const filterEl = document.querySelector("[data-ticket-filter]");
  const filter = filterEl?.value || "all";

  let tickets = [...(state.snapshot.tickets || [])];

  if (filter !== "all") {
    tickets = tickets.filter((item) => item.status === filter);
  }

  if (!tickets.length) {
    listEl.innerHTML = `
      <div class="pro-empty-state">
        <strong>Nenhum ticket encontrado.</strong>
        <span>Os chamados de suporte aparecerão aqui.</span>
      </div>
    `;
    renderSelectedTicket();
    return;
  }

  listEl.innerHTML = tickets.map((ticket) => `
    <div class="pro-support-card" onclick="selectSupportTicket('${ticket.id}')" style="cursor:pointer;">
      <div class="pro-support-main">
        <div>
          <strong>${ticket.subject}</strong>
          <span>${ticket.storeName} • ${ticket.priority}</span>
        </div>
        <span class="pro-status-badge ${getTicketStatusClass(ticket.status)}">${ticket.status}</span>
      </div>
    </div>
  `).join("");

  renderSelectedTicket();
}

async function selectSupportTicket(ticketId) {
  state.selectedTicketId = ticketId;

  try {
    state.selectedTicketMessages = await window.DookiData.getTicketMessages(ticketId);
  } catch (error) {
    console.error(error);
    state.selectedTicketMessages = [];
  }

  renderSelectedTicket();
}

function renderSelectedTicket() {
  const detailEl = document.querySelector("[data-ticket-detail]");
  const messagesEl = document.querySelector("[data-ticket-messages]");
  const replyForm = document.querySelector("[data-ticket-reply-form]");

  if (!detailEl || !messagesEl || !replyForm) return;

  const ticket = (state.snapshot.tickets || []).find((item) => item.id === state.selectedTicketId);

  if (!ticket) {
    detailEl.innerHTML = `
      <div class="pro-empty-state">
        <strong>Selecione um ticket</strong>
        <span>Os detalhes e respostas aparecerão aqui.</span>
      </div>
    `;
    messagesEl.innerHTML = "";
    replyForm.reset();
    return;
  }

  detailEl.innerHTML = `
    <div class="pro-summary-item"><span>Loja</span><strong>${ticket.storeName}</strong></div>
    <div class="pro-summary-item"><span>Assunto</span><strong>${ticket.subject}</strong></div>
    <div class="pro-summary-item"><span>Prioridade</span><strong>${ticket.priority}</strong></div>
    <div class="pro-summary-item"><span>Status</span><strong>${ticket.status}</strong></div>
    <div class="pro-summary-item"><span>Responsável</span><strong>${ticket.assigned_to || "-"}</strong></div>
  `;

  if (!state.selectedTicketMessages.length) {
    messagesEl.innerHTML = `
      <div class="pro-empty-state">
        <strong>Sem mensagens</strong>
        <span>Ainda não existem respostas nesse ticket.</span>
      </div>
    `;
  } else {
    messagesEl.innerHTML = state.selectedTicketMessages.map((message) => `
      <div class="pro-support-card">
        <div class="pro-support-main">
          <div>
            <strong>${message.sender_name || message.sender_type}</strong>
            <span>${new Date(message.created_at).toLocaleString("pt-BR")}</span>
          </div>
          <span class="pro-status-badge ${message.sender_type === "admin" ? "info" : "neutral"}">
            ${message.sender_type === "admin" ? "Admin" : "Loja"}
          </span>
        </div>
        <div style="margin-top:10px; color:#334155;">${message.message}</div>
      </div>
    `).join("");
  }

  replyForm.elements.status.value = ticket.status || "aberto";
  replyForm.elements.assigned_to.value = ticket.assigned_to || "";
}

function renderReports() {
  const summaryEl = document.querySelector("[data-report-summary]");
  const actionsEl = document.querySelector("[data-report-actions]");
  const revenueSummaryEl = document.querySelector("[data-revenue-summary]");
  const planBarsEl = document.querySelector("[data-plan-bars]");

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="pro-summary-item"><span>Lojas</span><strong>${state.snapshot.establishments.length}</strong></div>
      <div class="pro-summary-item"><span>Planos</span><strong>${state.snapshot.plans.length}</strong></div>
      <div class="pro-summary-item"><span>Tickets</span><strong>${state.snapshot.tickets.length}</strong></div>
      <div class="pro-summary-item"><span>Pagamentos</span><strong>${state.snapshot.payments.length}</strong></div>
    `;
  }

  if (actionsEl) {
    actionsEl.innerHTML = `
      <li>Revisar performance de lojas inativas.</li>
      <li>Acompanhar tickets com prioridade alta.</li>
      <li>Revisar planos com maior adesão.</li>
    `;
  }

  if (revenueSummaryEl) {
    const total = (state.snapshot.payments || []).reduce((acc, item) => acc + Number(item.amount || 0), 0);
    revenueSummaryEl.innerHTML = `
      <div class="pro-summary-item"><span>Total movimentado</span><strong>R$ ${total.toFixed(2)}</strong></div>
      <div class="pro-summary-item"><span>Planos ativos</span><strong>${state.snapshot.plans.length}</strong></div>
    `;
  }

  if (planBarsEl) {
    const plans = state.snapshot.plans || [];
    planBarsEl.innerHTML = plans.map((plan) => `
      <div class="pro-summary-item">
        <span>${plan.name}</span>
        <strong>R$ ${Number(plan.price || 0).toFixed(2)}</strong>
      </div>
    `).join("");
  }
}

function renderStoreSelects() {
  const selects = document.querySelectorAll("[data-payment-store-select], [data-trial-store-select]");
  const stores = state.snapshot.establishments || [];

  selects.forEach((select) => {
    select.innerHTML = stores.map((store) => `
      <option value="${store.id}">${store.name}</option>
    `).join("");
  });
}

function renderPlanSelects() {
  const select = document.querySelector("[data-trial-plan-select]");
  if (!select) return;

  const plans = state.snapshot.plans || [];
  select.innerHTML = plans.map((plan) => `
    <option value="${plan.id}">${plan.name}</option>
  `).join("");
}

function bindAdminEvents() {
  const searchEl = document.querySelector("[data-store-search]");
  const cityEl = document.querySelector("[data-store-filter-city]");
  const planForm = document.querySelector("[data-plan-form]");
  const paymentForm = document.querySelector("[data-payment-form]");
  const ticketForm = document.querySelector("[data-ticket-form]");
  const trialForm = document.querySelector("[data-trial-form]");
  const storeModalForm = document.querySelector("[data-store-modal-form]");
  const planModalForm = document.querySelector("[data-plan-modal-form]");
  const openStoreModalButton = document.querySelector("[data-open-store-modal]");
  const deleteProfileButton = document.querySelector("[data-profile-delete]");
  const upgradeProfileButton = document.querySelector("[data-profile-upgrade]");
  const ticketFilter = document.querySelector("[data-ticket-filter]");
  const logoutButton = document.querySelector("[data-admin-logout]");
  const ticketReplyForm = document.querySelector("[data-ticket-reply-form]");

  if (searchEl) searchEl.addEventListener("input", renderStores);
  if (cityEl) cityEl.addEventListener("change", renderStores);
  if (ticketFilter) ticketFilter.addEventListener("change", renderSupport);
  if (logoutButton) logoutButton.addEventListener("click", logoutAdmin);

  if (ticketReplyForm) {
  ticketReplyForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.selectedTicketId) {
      alert("Selecione um ticket primeiro.");
      return;
    }

    const formData = new FormData(ticketReplyForm);
    const message = (formData.get("message") || "").toString().trim();
    const status = (formData.get("status") || "aberto").toString();
    const assigned_to = (formData.get("assigned_to") || "").toString().trim();

    try {
      if (message) {
        await window.DookiData.sendTicketMessage(state.selectedTicketId, {
          sender_type: "admin",
          sender_name: state.admin?.name || "Admin",
          message
        });
      }

      await window.DookiData.updateSupportTicket(state.selectedTicketId, {
        status,
        assigned_to,
        last_message: message || undefined
      });

      ticketReplyForm.reset();
      await refreshSnapshot();
      await selectSupportTicket(state.selectedTicketId);
      renderSupport();

      alert("Ticket atualizado com sucesso.");
    } catch (error) {
      console.error(error);
      alert(error.message || "Erro ao atualizar ticket.");
    }
  });
}

  if (planForm) {
    planForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(planForm);

      try {
        await window.DookiData.createPlan({
          name: formData.get("name"),
          price: formData.get("price"),
          discount: formData.get("discount"),
          annualPrice: formData.get("annualPrice"),
          annualDiscount: formData.get("annualDiscount"),
          trialDays: formData.get("trialDays"),
          description: formData.get("description")
        });

        planForm.reset();
        await refreshSnapshot();
        renderDashboard();
        alert("Plano salvo com sucesso.");
      } catch (error) {
        console.error(error);
        alert(error.message || "Erro ao salvar plano.");
      }
    });
  }

  if (paymentForm) {
    paymentForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(paymentForm);
      const storeId = formData.get("storeId");
      const store = (state.snapshot.establishments || []).find((item) => item.id === storeId);

      try {
        await window.DookiData.createPayment({
          storeId,
          storeName: store?.name || "Loja",
          direction: formData.get("direction"),
          category: formData.get("category"),
          amount: formData.get("amount"),
          dueDate: formData.get("dueDate"),
          pixKey: formData.get("pixKey"),
          notes: formData.get("notes")
        });

        paymentForm.reset();
        await refreshSnapshot();
        renderDashboard();
        alert("Lançamento salvo com sucesso.");
      } catch (error) {
        console.error(error);
        alert(error.message || "Erro ao salvar pagamento.");
      }
    });
  }

  if (ticketForm) {
    ticketForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(ticketForm);

      try {
        await window.DookiData.createSupportTicket({
          storeName: formData.get("storeName"),
          priority: formData.get("priority"),
          subject: formData.get("subject"),
          status: "aberto"
        });

        ticketForm.reset();
        await refreshSnapshot();
        renderDashboard();
        alert("Ticket criado com sucesso.");
      } catch (error) {
        console.error(error);
        alert(error.message || "Erro ao criar ticket.");
      }
    });
  }

  if (trialForm) {
    trialForm.addEventListener("submit", (event) => {
      event.preventDefault();
      alert("A lógica de trial pode ser implementada na próxima etapa.");
    });
  }

  if (storeModalForm) {
    storeModalForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!state.selectedStoreId) {
        alert("Nenhuma loja selecionada.");
        return;
      }

      const formData = new FormData(storeModalForm);

      try {
        await window.DookiData.updateStore(state.selectedStoreId, {
          name: formData.get("name"),
          city: formData.get("city"),
          phone: formData.get("phone"),
          plan: formData.get("plan"),
          status: formData.get("status"),
          email: formData.get("email"),
          logoUrl: formData.get("logoUrl"),
          bannerUrl: formData.get("bannerUrl")
        });

        closeStoreModal();
        await refreshSnapshot();
        renderDashboard();
        selectStore(state.selectedStoreId);
        alert("Loja atualizada com sucesso.");
      } catch (error) {
        console.error(error);
        alert(error.message || "Erro ao atualizar loja.");
      }
    });
  }

  if (planModalForm) {
    planModalForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!state.selectedPlanId) {
        alert("Nenhum plano selecionado.");
        return;
      }

      const formData = new FormData(planModalForm);

      try {
        await window.DookiData.updatePlan(state.selectedPlanId, {
          name: formData.get("name"),
          price: formData.get("price"),
          discount: formData.get("discount"),
          annualPrice: formData.get("annualPrice"),
          annualDiscount: formData.get("annualDiscount"),
          trialDays: formData.get("trialDays"),
          description: formData.get("description")
        });

        closePlanModal();
        await refreshSnapshot();
        renderDashboard();
        alert("Plano atualizado com sucesso.");
      } catch (error) {
        console.error(error);
        alert(error.message || "Erro ao atualizar plano.");
      }
    });
  }

  if (openStoreModalButton) {
    openStoreModalButton.addEventListener("click", () => {
      if (!state.selectedStoreId) {
        alert("Selecione uma loja primeiro.");
        return;
      }
      openEditStoreModal(state.selectedStoreId);
    });
  }

  if (deleteProfileButton) {
    deleteProfileButton.addEventListener("click", () => {
      if (!state.selectedStoreId) {
        alert("Selecione uma loja primeiro.");
        return;
      }
      handleDeleteStore(state.selectedStoreId);
    });
  }

  if (upgradeProfileButton) {
    upgradeProfileButton.addEventListener("click", () => {
      if (!state.selectedStoreId) {
        alert("Selecione uma loja primeiro.");
        return;
      }

      const store = (state.snapshot.establishments || []).find((item) => item.id === state.selectedStoreId);
      if (!store) return;

      alert(`Upgrade de plano para ${store.name} pode ser implementado na próxima etapa.`);
    });
  }
}

function bindNavigationEvents() {
  const navButtons = document.querySelectorAll("[data-admin-screen]");
  const titleEl = document.querySelector("[data-screen-title]");
  const sidebarToggle = document.querySelector("[data-sidebar-toggle]");
  const backToStoresButton = document.querySelector("[data-back-to-stores]");
  const closeStoreModalButtons = document.querySelectorAll("[data-close-store-modal]");
  const closePlanModalButtons = document.querySelectorAll("[data-close-plan-modal]");
  const storeModal = document.querySelector("[data-store-modal]");
  const planModal = document.querySelector("[data-plan-modal]");

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setScreen(button.dataset.adminScreen);
    });
  });

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-open");
      const sidebar = document.querySelector(".admin-sidebar");
      if (sidebar) sidebar.classList.toggle("open");
    });
  }

  if (backToStoresButton) {
    backToStoresButton.addEventListener("click", () => {
      setScreen("stores");
      if (titleEl) titleEl.textContent = "Estabelecimentos";
    });
  }

  closeStoreModalButtons.forEach((button) => {
    button.addEventListener("click", closeStoreModal);
  });

  closePlanModalButtons.forEach((button) => {
    button.addEventListener("click", closePlanModal);
  });

  if (storeModal) {
    storeModal.addEventListener("click", (event) => {
      if (event.target === storeModal) closeStoreModal();
    });
  }

  if (planModal) {
    planModal.addEventListener("click", (event) => {
      if (event.target === planModal) closePlanModal();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeStoreModal();
      closePlanModal();
    }
  });
}

function forceCloseAllModals() {
  const storeModal = document.querySelector("[data-store-modal]");
  const planModal = document.querySelector("[data-plan-modal]");

  if (storeModal) storeModal.hidden = true;
  if (planModal) planModal.hidden = true;
}

function openStoreModal() {
  const modal = document.querySelector("[data-store-modal]");
  if (modal) modal.hidden = false;
}

function closeStoreModal() {
  const modal = document.querySelector("[data-store-modal]");
  if (modal) modal.hidden = true;
}

function openPlanModal() {
  const modal = document.querySelector("[data-plan-modal]");
  if (modal) modal.hidden = false;
}

function closePlanModal() {
  const modal = document.querySelector("[data-plan-modal]");
  if (modal) modal.hidden = true;
}

function setScreen(screenName) {
  const navButtons = document.querySelectorAll("[data-admin-screen]");
  const screens = document.querySelectorAll("[data-screen-panel]");
  const titleEl = document.querySelector("[data-screen-title]");

  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.adminScreen === screenName);
  });

  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screenPanel === screenName);
  });

  const activeButton = document.querySelector(`[data-admin-screen="${screenName}"]`);
  if (titleEl && activeButton) {
    titleEl.textContent = activeButton.textContent.trim();
  }
}

function renderStoreProfile(store) {
  const nameEl = document.querySelector("[data-profile-name]");
  const headingEl = document.querySelector("[data-profile-heading]");
  const summaryEl = document.querySelector("[data-profile-summary]");
  const statusEl = document.querySelector("[data-profile-status]");
  const statsEl = document.querySelector("[data-profile-stats]");
  const detailsEl = document.querySelector("[data-profile-details]");
  const avatarEl = document.querySelector("[data-profile-avatar]");

  if (nameEl) nameEl.textContent = store.name;
  if (headingEl) headingEl.textContent = store.name;
  if (summaryEl) summaryEl.textContent = `${store.city || "-"} • ${store.email || "Sem email"}`;
  if (statusEl) {
    statusEl.textContent = store.status || "-";
    statusEl.className = `pro-status-badge ${getStatusClass(store.status)}`;
  }
  if (avatarEl) avatarEl.textContent = (store.name || "L").charAt(0).toUpperCase();

  if (statsEl) {
    statsEl.innerHTML = `
      <article class="panel stat-card"><span>Cidade</span><strong>${store.city || "-"}</strong></article>
      <article class="panel stat-card"><span>Plano</span><strong>${store.plan || "-"}</strong></article>
      <article class="panel stat-card"><span>Email</span><strong>${store.email || "-"}</strong></article>
      <article class="panel stat-card"><span>WhatsApp</span><strong>${store.whatsapp || "-"}</strong></article>
    `;
  }

  if (detailsEl) {
    detailsEl.innerHTML = `
      <div class="pro-summary-item"><span>Nome</span><strong>${store.name}</strong></div>
      <div class="pro-summary-item"><span>Status</span><strong>${store.status || "-"}</strong></div>
      <div class="pro-summary-item"><span>Plano</span><strong>${store.plan || "-"}</strong></div>
      <div class="pro-summary-item"><span>Código</span><strong>${store.code || "-"}</strong></div>
    `;
  }
}

function selectStore(storeId) {
  state.selectedStoreId = storeId;

  const store = (state.snapshot.establishments || []).find((item) => item.id === storeId);
  if (!store) return;

  renderStoreDetail();
  renderStoreProfile(store);
  setScreen("store-profile");
}

function openEditStoreModal(storeId) {
  state.selectedStoreId = storeId;
  const store = (state.snapshot.establishments || []).find((item) => item.id === storeId);
  if (!store) return;

  const form = document.querySelector("[data-store-modal-form]");
  if (!form) return;

  form.elements.name.value = store.name || "";
  form.elements.city.value = store.city || "";
  form.elements.phone.value = store.whatsapp || "";
  form.elements.plan.value = store.plan || "Standard";
  form.elements.status.value = store.status || "active";
  form.elements.email.value = store.email || "";
  form.elements.logoUrl.value = store.logo_url || "";
  form.elements.bannerUrl.value = store.banner_url || "";

  openStoreModal();
}

function openEditPlanModal(planId) {
  state.selectedPlanId = planId;
  const plan = (state.snapshot.plans || []).find((item) => item.id === planId);
  if (!plan) return;

  const form = document.querySelector("[data-plan-modal-form]");
  if (!form) return;

  form.elements.name.value = plan.name || "";
  form.elements.price.value = plan.price || 0;
  form.elements.discount.value = plan.discount || 0;
  form.elements.annualPrice.value = plan.annualPrice || 0;
  form.elements.annualDiscount.value = plan.annualDiscount || 0;
  form.elements.trialDays.value = plan.trialDays || 0;
  form.elements.description.value = plan.description || "";

  openPlanModal();
}

async function handleDeleteStore(storeId) {
  const store = (state.snapshot.establishments || []).find((item) => item.id === storeId);

  if (!store) {
    alert("Estabelecimento não encontrado.");
    return;
  }

  const reason = prompt(`Motivo da exclusão da loja "${store.name}":`, "Exclusão manual");
  if (reason === null) return;

  const confirmed = confirm(`Tem certeza que deseja excluir "${store.name}"?\n\nEssa ação é permanente.\n\nMotivo: ${reason}`);
  if (!confirmed) return;

  try {
    await window.DookiData.deleteStore(store.id, {
      deletedByEmail: state.admin?.email,
      deletedByName: state.admin?.name,
      deleteReason: reason,
      deleteOrigin: "admin_portal"
    });

    if (state.selectedStoreId === store.id) {
      state.selectedStoreId = null;
    }

    await refreshSnapshot();
    renderDashboard();
    setScreen("stores");
    alert("Loja excluída com sucesso.");
  } catch (error) {
    console.error(error);
    alert(error.message || "Erro ao excluir loja.");
  }
}

async function handleDeletePlan(planId) {
  const plan = (state.snapshot.plans || []).find((item) => item.id === planId);
  if (!plan) return;

  const confirmed = confirm(`Deseja excluir o plano "${plan.name}"?`);
  if (!confirmed) return;

  try {
    await window.DookiData.deletePlan(planId);
    await refreshSnapshot();
    renderDashboard();
    closePlanModal();
    alert("Plano excluído com sucesso.");
  } catch (error) {
    console.error(error);
    alert(error.message || "Erro ao excluir plano.");
  }
}

async function logoutAdmin() {
  try {
    if (window.supabaseClient) {
      await window.supabaseClient.auth.signOut();
    }
  } catch (error) {
    console.error("Erro ao sair:", error);
  }

  localStorage.removeItem("dooki-admin-session");
  window.location.href = "index.html";
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value.includes("active") || value.includes("ativo")) return "success";
  if (value.includes("approval") || value.includes("aprova")) return "warning";
  if (value.includes("upgrade")) return "info";
  return "neutral";
}

function getPriorityClass(priority) {
  const value = String(priority || "").toLowerCase();

  if (value.includes("alta")) return "danger";
  if (value.includes("media") || value.includes("média")) return "warning";
  return "neutral";
}

function getTicketStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value.includes("aberto")) return "warning";
  if (value.includes("andamento")) return "info";
  if (value.includes("resolvido")) return "success";
  return "neutral";
}

window.refreshSnapshot = refreshSnapshot;
window.renderDashboard = renderDashboard;
window.renderStores = renderStores;
window.selectStore = selectStore;
window.openEditStoreModal = openEditStoreModal;
window.openEditPlanModal = openEditPlanModal;
window.handleDeleteStore = handleDeleteStore;
window.handleDeletePlan = handleDeletePlan;
window.logoutAdmin = logoutAdmin;
window.selectSupportTicket = selectSupportTicket;