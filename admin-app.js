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
  const saved = localStorage.getItem("dooki_admin");

  if (saved) {
    state.admin = JSON.parse(saved);
  } else {
    // mock temporário
    state.admin = {
      name: "Administrador Dooki",
      email: "admin@dooki.com"
    };
  }
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

  const stores = state.snapshot.establishments;

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
        <button onclick="handleDeleteStore('${store.id}')">
          🗑️ Excluir
        </button>
      </div>
    `;

    container.appendChild(div);
  });
}

// =====================================================
// 🔥 EXCLUSÃO PROFISSIONAL
// =====================================================

async function handleDeleteStore(storeId) {
  const store = state.snapshot.establishments.find(s => s.id === storeId);

  if (!store) {
    alert("Estabelecimento não encontrado.");
    return;
  }

  // 1) pede motivo
  const reason = window.prompt(
    `Digite o motivo da exclusão do estabelecimento "${store.name}":`,
    `Exclusão manual da loja ${store.name}`
  );

  if (reason === null) return;

  // 2) confirmação forte
  const confirmed = window.confirm(
    `⚠️ ATENÇÃO ⚠️\n\nVocê está prestes a excluir PERMANENTEMENTE o estabelecimento:\n\n${store.name}\n\nEssa ação NÃO pode ser desfeita.\n\nMotivo: ${reason}\n\nDeseja continuar?`
  );

  if (!confirmed) return;

  try {
    // 3) chama exclusão auditada
    await window.DookiData.deleteStore(store.id, {
      deletedByEmail: state.admin?.email,
      deletedByName: state.admin?.name,
      deleteReason: reason,
      deleteOrigin: "admin_portal"
    });

    alert("✅ Estabelecimento excluído com sucesso.");

    // 4) atualiza tela
    await refreshSnapshot();
    renderStores();

  } catch (error) {
    console.error("Erro ao excluir:", error);
    alert(`Erro ao excluir: ${error.message}`);
  }
}

// =====================================================
// (EXTRA) CRIAR ESTABELECIMENTO
// =====================================================

async function createStore() {
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
// (EXTRA) DEBUG
// =====================================================

window.debugSnapshot = () => {
  console.log(state.snapshot);
};