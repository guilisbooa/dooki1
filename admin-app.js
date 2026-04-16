// =====================================================
// DOOKI ADMIN APP (CORRIGIDO)
// =====================================================

const state = {
  admin: null,
  snapshot: {
    establishments: [],
    plans: [],
    orders: [],
    payments: [],
    tickets: []
  }
};

// =====================================================
// INIT
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {
  loadAdminSession();
  await refreshSnapshot();
  renderDashboard();
});

// =====================================================
// SESSION
// =====================================================

function loadAdminSession() {
  const saved = localStorage.getItem("dooki-admin-session");

  if (saved) {
    state.admin = JSON.parse(saved);
  } else {
    state.admin = {
      name: "Administrador Dooki",
      email: "admin@dooki.com"
    };
  }

  renderAdminInfo();
}

function renderAdminInfo() {
  const nameEl = document.querySelector("[data-admin-name]");
  const emailEl = document.querySelector("[data-admin-email]");

  if (nameEl) nameEl.textContent = state.admin.name;
  if (emailEl) emailEl.textContent = state.admin.email;
}

// =====================================================
// SNAPSHOT
// =====================================================

async function refreshSnapshot() {
  try {
    const data = await window.DookiData.getSnapshot();
    state.snapshot = data;
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    alert("Erro ao carregar dados.");
  }
}

// =====================================================
// DASHBOARD
// =====================================================

function renderDashboard() {
  renderStores();
}

// =====================================================
// ESTABELECIMENTOS
// =====================================================

function renderStores() {
  const container = document.getElementById("stores-list");
  if (!container) return;

  const stores = state.snapshot.establishments || [];

  container.innerHTML = "";

  if (!stores.length) {
    container.innerHTML = "<p>Nenhum estabelecimento encontrado.</p>";
    return;
  }

  stores.forEach(store => {
    const div = document.createElement("div");
    div.className = "store-card";

    div.innerHTML = `
      <h3>${store.name || "Sem nome"}</h3>
      <p><strong>Cidade:</strong> ${store.city || "-"}</p>
      <p><strong>Status:</strong> ${store.status || "-"}</p>

      <div class="actions">
        <button onclick="handleEditStore('${store.id}')">✏️ Editar</button>
        <button onclick="handleDeleteStore('${store.id}')">🗑️ Excluir</button>
      </div>
    `;

    container.appendChild(div);
  });
}

// =====================================================
// CRIAR ESTABELECIMENTO
// =====================================================

async function handleCreateStore() {
  const name = prompt("Nome da loja:");
  if (!name) return;

  try {
    await window.DookiData.createStore({
      name,
      status: "active",
      created_at: new Date().toISOString()
    });

    await refreshSnapshot();
    renderStores();

  } catch (error) {
    console.error(error);
    alert("Erro ao criar loja.");
  }
}

// =====================================================
// EDITAR ESTABELECIMENTO
// =====================================================

async function handleEditStore(storeId) {
  const store = state.snapshot.establishments.find(s => s.id === storeId);
  if (!store) return;

  const newName = prompt("Novo nome da loja:", store.name);
  if (!newName) return;

  try {
    await window.DookiData.updateStore(storeId, {
      name: newName
    });

    await refreshSnapshot();
    renderStores();

  } catch (error) {
    console.error(error);
    alert("Erro ao editar loja.");
  }
}

// =====================================================
// 🔥 EXCLUSÃO
// =====================================================

async function handleDeleteStore(storeId) {
  const store = state.snapshot.establishments.find(s => s.id === storeId);

  if (!store) {
    alert("Estabelecimento não encontrado.");
    return;
  }

  const reason = prompt(
    `Motivo da exclusão da loja "${store.name}":`,
    `Exclusão manual`
  );

  if (reason === null) return;

  const confirmed = confirm(
    `Tem certeza que deseja excluir "${store.name}"?\n\nEssa ação é permanente.\n\nMotivo: ${reason}`
  );

  if (!confirmed) return;

  try {
    await window.DookiData.deleteStore(store.id, {
      deletedByEmail: state.admin.email,
      deletedByName: state.admin.name,
      deleteReason: reason,
      deleteOrigin: "admin_portal"
    });

    alert("Loja excluída com sucesso.");

    await refreshSnapshot();
    renderStores();

  } catch (error) {
    console.error(error);
    alert("Erro ao excluir loja.");
  }
}

// =====================================================
// LOGOUT
// =====================================================

function logoutAdmin() {
  localStorage.removeItem("dooki-admin-session");
  window.location.href = "index.html";
}

// =====================================================
// DEBUG
// =====================================================

window.debugSnapshot = () => {
  console.log(state.snapshot);
};

// =====================================================
// GLOBAL (IMPORTANTE)
// =====================================================

window.handleCreateStore = handleCreateStore;
window.handleEditStore = handleEditStore;
window.handleDeleteStore = handleDeleteStore;
window.logoutAdmin = logoutAdmin;