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
  selectedPlanId: null
};

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await loadAdminSession();
  if (!ok) return;

  bindAdminEvents();
  await refreshSnapshot();
  renderDashboard();
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
  const pendingApprovals = stores.filter((item) => item.status === "approval" || item.status === "Aprovacao" || item.status === "Aprovação").length;
  const openTickets = tickets.filter((item) => item.status === "aberto" || item.status === "andamento").length;

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
    container.innerHTML = `<div class="list-item"><strong>Nenhum estabelecimento encontrado</strong></div>`;
    return;
  }

  container.innerHTML = stores.map((store) => `
    <div class="list-item">
      <div>
        <strong>${store.name}</strong>
        <span>${store.city || "-"}</span>
      </div>
      <span>${store.status || "-"}</span>
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
    <div class="summary-item"><span>Lojas cadastradas</span><strong>${stores.length}</strong></div>
    <div class="summary-item"><span>Planos cadastrados</span><strong>${plans.length}</strong></div>
    <div class="summary-item"><span>Receita lançada</span><strong>R$ ${totalRevenue.toFixed(2)}</strong></div>
  `;
}

function renderPriorityTickets() {
  const container = document.querySelector("[data-priority-tickets]");
  if (!container) return;

  const tickets = (state.snapshot.tickets || [])
    .filter((item) => item.priority === "Alta" || item.priority === "Media" || item.priority === "Média")
    .slice(0, 5);

  if (!tickets.length) {
    container.innerHTML = `<div class="list-item"><strong>Nenhum chamado prioritário</strong></div>`;
    return;
  }

  container.innerHTML = tickets.map((ticket) => `
    <div class="list-item">
      <div>
        <strong>${ticket.subject}</strong>
        <span>${ticket.storeName}</span>
      </div>
      <span>${ticket.priority}</span>
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
    <div class="summary-item"><span>Abertos</span><strong>${aberto}</strong></div>
    <div class="summary-item"><span>Em andamento</span><strong>${andamento}</strong></div>
    <div class="summary-item"><span>Resolvidos</span><strong>${resolvido}</strong></div>
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
    <div class="summary-item"><span>Ativas</span><strong>${active}</strong></div>
    <div class="summary-item"><span>Total</span><strong>${stores.length}</strong></div>
    <div class="summary-item"><span>Saúde</span><strong>${percent}%</strong></div>
  `;
}

function renderDashboardStoreCards() {
  const container = document.querySelector("[data-dashboard-store-cards]");
  if (!container) return;

  const stores = [...(state.snapshot.establishments || [])].slice(0, 4);

  if (!stores.length) {
    container.innerHTML = `<div class="panel"><strong>Nenhuma loja encontrada</strong></div>`;
    return;
  }

  container.innerHTML = stores.map((store) => `
    <div class="panel">
      <span class="panel-kicker">${store.city || "-"}</span>
      <h4>${store.name}</h4>
      <p>${store.status || "-"}</p>
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
    container.innerHTML = `<div class="list-item"><strong>Nenhum estabelecimento encontrado.</strong></div>`;
    return;
  }

  container.innerHTML = filtered.map((store) => `
    <div class="list-item">
      <div>
        <strong>${store.name}</strong>
        <span>${store.city || "-"} • ${store.email || "Sem email"}</span>
      </div>
      <div class="inline-actions">
        <button class="ghost-button" type="button" onclick="selectStore('${store.id}')">Ver</button>
        <button class="ghost-button" type="button" onclick="openEditStoreModal('${store.id}')">Editar</button>
        <button class="ghost-button danger-ghost" type="button" onclick="handleDeleteStore('${store.id}')">Excluir</button>
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
    detailEl.innerHTML = `<div class="summary-item"><span>Sem dados</span><strong>Nenhuma loja selecionada</strong></div>`;
    return;
  }

  detailEl.innerHTML = `
    <div class="summary-item"><span>Loja</span><strong>${selected.name}</strong></div>
    <div class="summary-item"><span>Cidade</span><strong>${selected.city || "-"}</strong></div>
    <div class="summary-item"><span>Status</span><strong>${selected.status || "-"}</strong></div>
    <div class="summary-item"><span>Plano</span><strong>${selected.plan || "-"}</strong></div>
  `;
}

function renderPlans() {
  const container = document.querySelector("[data-plans-list]");
  if (!container) return;

  const plans = state.snapshot.plans || [];

  if (!plans.length) {
    container.innerHTML = `<div class="list-item"><strong>Nenhum plano cadastrado.</strong></div>`;
    return;
  }

  container.innerHTML = plans.map((plan) => `
    <div class="list-item">
      <div>
        <strong>${plan.name}</strong>
        <span>R$ ${Number(plan.price || 0).toFixed(2)} / mês</span>
      </div>
      <div class="inline-actions">
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
      <div class="summary-item"><span>Cobranças</span><strong>R$ ${charges.toFixed(2)}</strong></div>
      <div class="summary-item"><span>Repasses</span><strong>R$ ${payouts.toFixed(2)}</strong></div>
      <div class="summary-item"><span>Lançamentos</span><strong>${payments.length}</strong></div>
    `;
  }

  if (listEl) {
    const payments = [...(state.snapshot.payments || [])].slice(0, 10);

    if (!payments.length) {
      listEl.innerHTML = `<div class="list-item"><strong>Nenhum pagamento encontrado.</strong></div>`;
      return;
    }

    listEl.innerHTML = payments.map((item) => `
      <div class="list-item">
        <div>
          <strong>${item.establishment_name}</strong>
          <span>${item.category} • ${item.direction}</span>
        </div>
        <span>R$ ${Number(item.amount || 0).toFixed(2)}</span>
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
    listEl.innerHTML = `<div class="list-item"><strong>Nenhum ticket encontrado.</strong></div>`;
    return;
  }

  listEl.innerHTML = tickets.map((ticket) => `
    <div class="list-item">
      <div>
        <strong>${ticket.subject}</strong>
        <span>${ticket.storeName} • ${ticket.priority}</span>
      </div>
      <span>${ticket.status}</span>
    </div>
  `).join("");
}

function renderReports() {
  const summaryEl = document.querySelector("[data-report-summary]");
  const actionsEl = document.querySelector("[data-report-actions]");
  const revenueSummaryEl = document.querySelector("[data-revenue-summary]");
  const planBarsEl = document.querySelector("[data-plan-bars]");

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="summary-item"><span>Lojas</span><strong>${state.snapshot.establishments.length}</strong></div>
      <div class="summary-item"><span>Planos</span><strong>${state.snapshot.plans.length}</strong></div>
      <div class="summary-item"><span>Tickets</span><strong>${state.snapshot.tickets.length}</strong></div>
      <div class="summary-item"><span>Pagamentos</span><strong>${state.snapshot.payments.length}</strong></div>
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
      <div class="summary-item"><span>Total movimentado</span><strong>R$ ${total.toFixed(2)}</strong></div>
      <div class="summary-item"><span>Planos ativos</span><strong>${state.snapshot.plans.length}</strong></div>
    `;
  }

  if (planBarsEl) {
    const plans = state.snapshot.plans || [];
    planBarsEl.innerHTML = plans.map((plan) => `
      <div class="summary-item">
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

  if (searchEl) searchEl.addEventListener("input", renderStores);
  if (cityEl) cityEl.addEventListener("change", renderStores);
  if (ticketFilter) ticketFilter.addEventListener("change", renderSupport);

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

  if (nameEl) nameEl.textContent = store.name;
  if (headingEl) headingEl.textContent = store.name;
  if (summaryEl) summaryEl.textContent = `${store.city || "-"} • ${store.email || "Sem email"}`;
  if (statusEl) statusEl.textContent = store.status || "-";

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
      <div class="summary-item"><span>Nome</span><strong>${store.name}</strong></div>
      <div class="summary-item"><span>Status</span><strong>${store.status || "-"}</strong></div>
      <div class="summary-item"><span>Plano</span><strong>${store.plan || "-"}</strong></div>
      <div class="summary-item"><span>Código</span><strong>${store.code || "-"}</strong></div>
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

window.refreshSnapshot = refreshSnapshot;
window.renderDashboard = renderDashboard;
window.renderStores = renderStores;
window.selectStore = selectStore;
window.openEditStoreModal = openEditStoreModal;
window.openEditPlanModal = openEditPlanModal;
window.handleDeleteStore = handleDeleteStore;
window.handleDeletePlan = handleDeletePlan;
window.logoutAdmin = logoutAdmin;