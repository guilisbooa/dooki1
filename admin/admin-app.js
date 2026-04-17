// =============================
// DOOKI ADMIN APP (COMPLETO)
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
}

// =============================
// INIT
// =============================

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await loadAdminSession()
  if (!ok) return

  bindEvents()
  await refreshSnapshot()
  renderDashboard()
})

// =============================
// AUTH
// =============================

async function loadAdminSession() {
  const supabase = window.supabaseClient

  const { data, error } = await supabase.auth.getUser()
  const user = data?.user

  if (error || !user) {
    window.location.href = "../public/index.html"
    return false
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("id", user.id)
    .eq("is_active", true)
    .single()

  if (!profile) {
    alert("Sem permissão")
    window.location.href = "../public/index.html"
    return false
  }

  state.admin = profile
  renderAdminInfo()
  return true
}

function renderAdminInfo() {
  document.querySelector("[data-admin-name]").innerText = state.admin.name
  document.querySelector("[data-admin-email]").innerText = state.admin.email
}

window.logout = async () => {
  await window.supabaseClient.auth.signOut()
  window.location.href = "../public/index.html"
}

// =============================
// SNAPSHOT
// =============================

async function refreshSnapshot() {
  const data = await window.DookiData.getSnapshot()
  state.snapshot = data
}

// =============================
// NAVIGATION
// =============================

function bindEvents() {
  document.querySelectorAll("[data-admin-screen]").forEach(btn => {
    btn.addEventListener("click", () => navigate(btn.dataset.adminScreen))
  })
}

function navigate(screen) {
  document.querySelectorAll(".admin-screen").forEach(el => el.classList.remove("active"))
  document.querySelector(`[data-screen-panel="${screen}"]`)?.classList.add("active")

  if (screen === "dashboard") renderDashboard()
  if (screen === "stores") renderStores()
  if (screen === "plans") renderPlans()
  if (screen === "payments") renderPayments()
  if (screen === "support") renderSupport()
}

// =============================
// DASHBOARD
// =============================

function renderDashboard() {
  renderKpis()
  renderStores()
  renderPlans()
}

function renderKpis() {
  const stores = state.snapshot.establishments || []
  const orders = state.snapshot.orders || []
  const tickets = state.snapshot.tickets || []

  const activeStores = stores.filter(s => s.status === "active").length
  const openTickets = tickets.filter(t => t.status === "aberto").length

  setKpi("activeStores", activeStores)
  setKpi("ordersToday", orders.length)
  setKpi("openTickets", openTickets)
}

function setKpi(key, value) {
  const el = document.querySelector(`[data-kpi="${key}"]`)
  if (el) el.innerText = value
}

// =============================
// STORES
// =============================

function renderStores() {
  const container = document.querySelector("[data-stores-table]")
  if (!container) return

  const stores = state.snapshot.establishments || []

  container.innerHTML = stores.map(store => `
    <div class="pro-store-row">
      <div>
        <strong>${store.name}</strong>
        <span>${store.city}</span>
      </div>

      <span class="pro-status-badge">${store.status}</span>

      <button onclick="selectStore('${store.id}')">Ver</button>
    </div>
  `).join("")
}

window.selectStore = (id) => {
  state.selectedStoreId = id
  renderStoreDetail()
}

function renderStoreDetail() {
  const container = document.querySelector("[data-store-detail]")
  if (!container) return

  const store = state.snapshot.establishments.find(s => s.id === state.selectedStoreId)
  if (!store) return

  container.innerHTML = `
    <h3>${store.name}</h3>
    <p>${store.city}</p>
    <p>${store.plan}</p>
  `
}

// =============================
// PLANS
// =============================

function renderPlans() {
  const container = document.querySelector("[data-plans-table]")
  if (!container) return

  const plans = state.snapshot.plans || []

  container.innerHTML = plans.map(p => `
    <div class="panel">
      <strong>${p.name}</strong>
      <span>R$ ${p.price}</span>
    </div>
  `).join("")
}

// =============================
// PAYMENTS
// =============================

function renderPayments() {
  const container = document.querySelector("[data-payments-table]")
  if (!container) return

  const payments = state.snapshot.payments || []

  container.innerHTML = payments.map(p => `
    <div class="panel">
      <strong>${p.amount}</strong>
      <span>${p.status}</span>
    </div>
  `).join("")
}

// =============================
// SUPPORT
// =============================

function renderSupport() {
  const container = document.querySelector("[data-support-table]")
  if (!container) return

  const tickets = state.snapshot.tickets || []

  container.innerHTML = tickets.map(t => `
    <div class="panel">
      <strong>${t.subject}</strong>
      <span>${t.status}</span>
      <button onclick="openTicket('${t.id}')">Abrir</button>
    </div>
  `).join("")
}

window.openTicket = async (id) => {
  state.selectedTicketId = id
  state.selectedTicketMessages = await window.DookiData.getTicketMessages(id)
  renderTicket()
}

function renderTicket() {
  const container = document.querySelector("[data-support-thread]")
  if (!container) return

  container.innerHTML = state.selectedTicketMessages.map(m => `
    <div class="panel">
      <strong>${m.sender_type}</strong>
      <p>${m.message}</p>
    </div>
  `).join("")
}