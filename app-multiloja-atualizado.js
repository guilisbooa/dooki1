const APP_STATE_KEY = "dooki-mvp-state";
const DOOKI_DOMAIN = "dooki.online";

function getStoreSlugFromHost() {
  const hostname = window.location.hostname.toLowerCase();

  // Desenvolvimento local: mantém o fluxo demo normal.
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;

  // Domínio principal: dooki.online ou www.dooki.online.
  if (hostname === DOOKI_DOMAIN || hostname === `www.${DOOKI_DOMAIN}`) return null;

  // Subdomínio da loja: adegalanchesdomiguel.dooki.online.
  if (hostname.endsWith(`.${DOOKI_DOMAIN}`)) {
    return hostname.replace(`.${DOOKI_DOMAIN}`, "");
  }

  return null;
}

const STORE_SLUG_FROM_HOST = getStoreSlugFromHost();
const IS_STORE_SUBDOMAIN = Boolean(STORE_SLUG_FROM_HOST);

const ROUTES = [
  { id: "home", label: "Início" },
  { id: "store", label: "Painel Loja" },
  { id: "menu", label: "Cardápio" },
  { id: "kitchen", label: "Cozinha" },
  { id: "driver", label: "Entregador" },
  { id: "admin", label: "Admin" }
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDateTime = (value) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

function createSeedState() {
  return {
    currentRoute: IS_STORE_SUBDOMAIN ? "menu" : "home",
    currentCategory: "all",
    cartMode: "delivery",
    cart: [],
    users: [
      { role: "store", name: "Loja Demo", login: "loja@dooki.com", password: "123456" },
      { role: "kitchen", name: "Cozinha Demo", login: "cozinha@dooki.com", password: "123456" },
      { role: "driver", name: "Entregador Demo", login: "entrega@dooki.com", password: "123456" }
    ],
    currentUserRole: null,
    store: {
      name: "Sabor da Praça",
      phone: "(11) 99888-7766",
      address: "Rua das Palmeiras, 120 - Centro",
      description: "Restaurante digital com atendimento em mesa, retirada e delivery.",
      logo: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=800&q=80",
      cover: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
      deliveryEnabled: true,
      tableEnabled: true,
      linkSlug: STORE_SLUG_FROM_HOST || "sabor-da-praca",
      tables: [1, 2, 3, 4, 5, 6],
      categories: [
        { id: "burgers", name: "Burgers" },
        { id: "pizzas", name: "Pizzas" },
        { id: "japa", name: "Japones" },
        { id: "bebidas", name: "Bebidas" }
      ],
      products: [
        {
          id: "p1",
          categoryId: "burgers",
          name: "Dooki Burger",
          description: "Pão brioche, burger 180g, cheddar cremoso e cebola caramelizada.",
          price: 34.9,
          active: true,
          featured: true,
          photo: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80"
        },
        {
          id: "p2",
          categoryId: "pizzas",
          name: "Pizza Calabresa Premium",
          description: "Molho artesanal, mussarela, calabresa defumada e cebola roxa.",
          price: 56.9,
          active: true,
          featured: true,
          photo: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80"
        },
        {
          id: "p3",
          categoryId: "japa",
          name: "Combo Tokyo 20 peças",
          description: "Seleção de sashimis, uramakis e hot rolls.",
          price: 62,
          active: true,
          featured: false,
          photo: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80"
        },
        {
          id: "p4",
          categoryId: "bebidas",
          name: "Limonada da Casa",
          description: "Limonada refrescante com toque de hortelã.",
          price: 11.5,
          active: true,
          featured: false,
          photo: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80"
        }
      ]
    },
    orders: [
      {
        id: "PED-1001",
        createdAt: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
        customerName: "Marina",
        type: "mesa",
        tableNumber: "4",
        address: "",
        notes: "Sem cebola no burger",
        status: "aguardando",
        driverStatus: "disponivel",
        assignedDriver: "",
        items: [{ productId: "p1", name: "Dooki Burger", quantity: 2, price: 34.9 }]
      },
      {
        id: "PED-1002",
        createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        customerName: "Carlos",
        type: "delivery",
        tableNumber: "",
        address: "Av. Brasil, 800 - Apto 32",
        notes: "Trocar refrigerante por água com gás",
        status: "em preparo",
        driverStatus: "aceito",
        assignedDriver: "Entregador Demo",
        items: [
          { productId: "p2", name: "Pizza Calabresa Premium", quantity: 1, price: 56.9 },
          { productId: "p4", name: "Limonada da Casa", quantity: 2, price: 11.5 }
        ]
      },
      {
        id: "PED-1003",
        createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        customerName: "Fernanda",
        type: "delivery",
        tableNumber: "",
        address: "Rua Sete, 19",
        notes: "",
        status: "pronto",
        driverStatus: "disponivel",
        assignedDriver: "",
        items: [{ productId: "p3", name: "Combo Tokyo 20 peças", quantity: 1, price: 62 }]
      }
    ]
  };
}

function loadState() {
  const stored = localStorage.getItem(APP_STATE_KEY);
  if (!stored) {
    const seed = createSeedState();
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(stored);
  } catch {
    const seed = createSeedState();
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(seed));
    return seed;
  }
}

let state = loadState();

function applyStoreSubdomainContext() {
  if (!IS_STORE_SUBDOMAIN) return;

  // Enquanto ainda não puxamos do Supabase, garantimos que o subdomínio abra direto no cardápio.
  // Depois vamos trocar essa parte para buscar a loja real pelo slug no banco.
  state.currentRoute = "menu";
  state.store.linkSlug = STORE_SLUG_FROM_HOST;
  saveState();
}

applyStoreSubdomainContext();

function saveState() {
  localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
}

function setState(updater) {
  state = updater(structuredClone(state));
  saveState();
  renderApp();
}

function getActiveProducts() {
  const products = state.store.products.filter((product) => product.active);
  return state.currentCategory === "all"
    ? products
    : products.filter((product) => product.categoryId === state.currentCategory);
}

function getCartTotal() {
  return state.cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

function getOrderTotal(order) {
  return order.items.reduce((total, item) => total + item.price * item.quantity, 0);
}

function getStats() {
  return {
    activeProducts: state.store.products.filter((product) => product.active).length,
    ordersToday: state.orders.length,
    openOrders: state.orders.filter((order) => order.status !== "entregue").length,
    deliveryOrders: state.orders.filter((order) => order.type === "delivery").length,
    totalRevenue: state.orders.reduce((sum, order) => sum + getOrderTotal(order), 0)
  };
}

function getStatusLabel(status) {
  const labels = {
    aguardando: "Aguardando",
    "em preparo": "Em preparo",
    pronto: "Pronto",
    entregue: "Entregue",
    disponivel: "Disponível",
    aceito: "Aceito",
    "em rota": "Em rota"
  };
  return labels[status] || status;
}

function getBadge(status) {
  const className = status ? `status-${status.replaceAll(" ", "-")}` : "";
  return `<span class="badge ${className}">${getStatusLabel(status)}</span>`;
}

function renderNav() {
  const nav = document.querySelector("#main-nav");
  if (!nav) return;

  // Em subdomínio de loja, mostramos só o cardápio para o cliente.
  if (IS_STORE_SUBDOMAIN) {
    nav.innerHTML = "";
    return;
  }

  nav.innerHTML = ROUTES.map(
    (route) => `
      <button class="nav-btn ${state.currentRoute === route.id ? "active" : ""}" data-route="${route.id}">
        ${route.label}
      </button>
    `
  ).join("");
}

function renderApp() {
  if (IS_STORE_SUBDOMAIN) state.currentRoute = "menu";
  renderNav();
  const app = document.querySelector("#app");
  if (!app) return;
  const routeMap = {
    home: renderHome,
    store: renderStorePanel,
    menu: renderPublicMenu,
    kitchen: renderKitchenPanel,
    driver: renderDriverPanel,
    admin: renderAdminPanel
  };
  app.innerHTML = routeMap[state.currentRoute]();
  bindEvents();
}

function renderProductCard(product) {
  return `
    <article class="menu-item">
      <img class="menu-cover" src="${product.photo}" alt="${product.name}">
      <div class="price-row">
        <h3>${product.name}</h3>
        <strong>${formatCurrency(product.price)}</strong>
      </div>
      <p class="muted">${product.description}</p>
      <div class="chip-list">
        <span class="chip">${state.store.categories.find((category) => category.id === product.categoryId)?.name || "Categoria"}</span>
        ${product.featured ? '<span class="chip">Destaque</span>' : ""}
      </div>
    </article>
  `;
}

function renderProductCardForStore(product) {
  const categoryName = state.store.categories.find((category) => category.id === product.categoryId)?.name || "Categoria";
  return `
    <article class="menu-item">
      <img class="menu-cover" src="${product.photo}" alt="${product.name}">
      <div class="price-row">
        <h3>${product.name}</h3>
        <strong>${formatCurrency(product.price)}</strong>
      </div>
      <p class="muted">${product.description}</p>
      <div class="chip-list">
        <span class="chip">${categoryName}</span>
        <span class="chip">${product.active ? "Ativo" : "Inativo"}</span>
        ${product.featured ? '<span class="chip">Destaque</span>' : ""}
      </div>
      <div class="inline-actions">
        <button class="ghost-btn" data-toggle-product="${product.id}">${product.active ? "Desativar" : "Ativar"}</button>
        <button class="ghost-btn" data-feature-product="${product.id}">${product.featured ? "Remover destaque" : "Destacar"}</button>
      </div>
    </article>
  `;
}

function renderPublicProductCard(product) {
  return `
    <article class="menu-item">
      <img class="menu-cover" src="${product.photo}" alt="${product.name}">
      <div class="price-row">
        <h3>${product.name}</h3>
        <strong>${formatCurrency(product.price)}</strong>
      </div>
      <p class="muted">${product.description}</p>
      <button class="action-btn" data-add-cart="${product.id}">Adicionar ao carrinho</button>
    </article>
  `;
}

function renderCartItem(item) {
  return `
    <div class="summary-row">
      <span>${item.quantity}x ${item.name}</span>
      <strong>${formatCurrency(item.price * item.quantity)}</strong>
    </div>
  `;
}

function renderOrderCompact(order) {
  return `
    <div class="info-card">
      <div class="price-row">
        <strong>${order.id}</strong>
        ${getBadge(order.status)}
      </div>
      <p class="muted">${order.customerName} • ${order.type === "delivery" ? "Delivery" : `Mesa ${order.tableNumber}`}</p>
      <p class="muted small">${formatDateTime(order.createdAt)}</p>
    </div>
  `;
}

function renderKitchenOrder(order) {
  return `
    <article class="order-card status-${order.status.replaceAll(" ", "-")}">
      <div class="order-top">
        <h3>${order.id}</h3>
        ${getBadge(order.status)}
      </div>
      <p><strong>${order.customerName}</strong> • ${order.type === "delivery" ? "Delivery" : `Mesa ${order.tableNumber}`}</p>
      <p class="muted small">${order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}</p>
      ${order.notes ? `<p class="muted small">Obs: ${order.notes}</p>` : ""}
      <div class="inline-actions">
        ${order.status === "aguardando" ? `<button class="status-btn" data-order-status="${order.id}|em preparo">Iniciar preparo</button>` : ""}
        ${order.status === "em preparo" ? `<button class="status-btn" data-order-status="${order.id}|pronto">Marcar como pronto</button>` : ""}
      </div>
    </article>
  `;
}

function renderDriverOrder(order, mode) {
  return `
    <article class="order-card status-${(order.driverStatus || "disponivel").replaceAll(" ", "-")}">
      <div class="order-top">
        <h3>${order.id}</h3>
        ${getBadge(order.driverStatus || "disponivel")}
      </div>
      <p><strong>${order.customerName}</strong></p>
      <p class="muted small">${order.address || "Entrega sem endereço informado"}</p>
      <p class="muted small">${formatCurrency(getOrderTotal(order))}</p>
      <div class="inline-actions">
        ${mode === "accept" ? `<button class="status-btn" data-driver-action="${order.id}|accept">Aceitar entrega</button>` : ""}
        ${mode === "progress" && order.driverStatus === "aceito" ? `<button class="status-btn" data-driver-action="${order.id}|route">Sair para rota</button>` : ""}
        ${mode === "progress" && order.driverStatus === "em rota" ? `<button class="status-btn" data-driver-action="${order.id}|deliver">Marcar entregue</button>` : ""}
      </div>
    </article>
  `;
}

function renderHome() {
  const featured = state.store.products.filter((product) => product.featured);
  const stats = getStats();

  return `
    <section class="hero-grid">
      <article class="hero-card">
        <div class="hero-copy">
          <p class="eyebrow">Sistema completo para operação digital</p>
          <h2>Venda em delivery, mesa e balcão com uma única estrutura.</h2>
          <p>
            A Dooki centraliza cardápio online, QR Code por mesa, painel da loja, cozinha e entregador
            em uma experiência moderna para restaurantes, pizzarias, hamburguerias e operações parecidas.
          </p>
        </div>
        <div class="hero-actions">
          <button class="action-btn" data-route-link="store">Entrar no painel</button>
          <button class="ghost-btn" data-route-link="menu">Abrir cardápio público</button>
        </div>
        <div class="hero-metrics">
          <div class="metric-box"><span class="small">Pedidos ativos</span><strong>${stats.openOrders}</strong></div>
          <div class="metric-box"><span class="small">Produtos ativos</span><strong>${stats.activeProducts}</strong></div>
          <div class="metric-box"><span class="small">Receita simulada</span><strong>${formatCurrency(stats.totalRevenue)}</strong></div>
        </div>
      </article>

      <aside class="showcase-card">
        <p class="eyebrow">Fluxo conectado</p>
        <h3>Uma operação, vários pontos de contato.</h3>
        <div class="stack">
          <div class="highlight-card">
            <strong>Link próprio do cardápio</strong>
            <p>Atendimento rápido para delivery, retirada e pedido por mesa.</p>
          </div>
          <div class="highlight-card">
            <strong>Painel operacional</strong>
            <p>Gestão de loja, produtos, pedidos, cozinha e entregador em visões separadas.</p>
          </div>
          <div class="highlight-card">
            <strong>Base pronta para crescimento</strong>
            <p>Estrutura inicial preparada para planos, acompanhamento e área admin futura.</p>
          </div>
        </div>
      </aside>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <p class="eyebrow">Como funciona</p>
          <h2 class="section-title">Módulos principais da Dooki</h2>
        </div>
      </div>
      <div class="section-grid">
        <article class="info-card"><h3>Área institucional</h3><p>Apresentação pública da plataforma, benefícios, funcionalidades e acesso para cadastro e login.</p></article>
        <article class="info-card"><h3>Painel do estabelecimento</h3><p>Edição da loja, cadastro de categorias e produtos, QR Code por mesa, link da loja e pedidos.</p></article>
        <article class="info-card"><h3>Cardápio público</h3><p>Navegação por categorias, carrinho, escolha entre delivery ou mesa e envio do pedido.</p></article>
        <article class="info-card"><h3>Painel da cozinha</h3><p>Pedidos em tempo real separados por status, com observações e identificação do tipo de atendimento.</p></article>
        <article class="info-card"><h3>Painel do entregador</h3><p>Lista de entregas disponíveis, aceite, rota e confirmação de entrega.</p></article>
        <article class="info-card"><h3>Área admin</h3><p>Espaço reservado para a próxima fase com gestão centralizada, contas, planos e métricas.</p></article>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <p class="eyebrow">Produtos em destaque</p>
          <h2 class="section-title">Exemplo do cardápio público</h2>
        </div>
      </div>
      <div class="card-grid">${featured.map(renderProductCard).join("")}</div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <p class="eyebrow">Acessos de teste</p>
          <h2 class="section-title">Logins demo para navegação</h2>
        </div>
      </div>
      <div class="login-grid">
        ${state.users
          .map(
            (user) => `
              <article class="login-card">
                <h3>${user.name}</h3>
                <p class="muted">Perfil: ${user.role}</p>
                <div class="stack small">
                  <span><strong>Login:</strong> ${user.login}</span>
                  <span><strong>Senha:</strong> ${user.password}</span>
                </div>
                <div class="chip-list">
                  <button class="ghost-btn" data-login-role="${user.role}">Entrar nesse painel</button>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderStorePanel() {
  const stats = getStats();
  const recentOrders = [...state.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return `
    <section class="dashboard-grid">
      <div class="stack">
        <article class="panel-card">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Painel do estabelecimento</p>
              <h2>${state.store.name}</h2>
              <p class="muted">${state.store.description}</p>
            </div>
            <div class="chip-list">
              ${state.currentUserRole === "store" ? '<span class="chip">Sessão loja ativa</span>' : '<button class="ghost-btn" data-login-role="store">Login da loja</button>'}
            </div>
          </div>
          <div class="stat-grid">
            <div class="stat-card"><span class="muted">Pedidos hoje</span><strong>${stats.ordersToday}</strong></div>
            <div class="stat-card"><span class="muted">Produtos ativos</span><strong>${stats.activeProducts}</strong></div>
            <div class="stat-card"><span class="muted">Deliveries</span><strong>${stats.deliveryOrders}</strong></div>
            <div class="stat-card"><span class="muted">Receita</span><strong>${formatCurrency(stats.totalRevenue)}</strong></div>
          </div>
        </article>

        <article class="panel-card">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Dados da loja</p>
              <h2>Configurações principais</h2>
            </div>
          </div>
          <form id="store-form" class="stack">
            <div class="form-grid">
              <div class="field"><label for="store-name">Nome da loja</label><input id="store-name" name="name" value="${state.store.name}" /></div>
              <div class="field"><label for="store-phone">Telefone</label><input id="store-phone" name="phone" value="${state.store.phone}" /></div>
              <div class="field"><label for="store-address">Endereço</label><input id="store-address" name="address" value="${state.store.address}" /></div>
              <div class="field"><label for="store-link">Slug do subdomínio</label><input id="store-link" name="linkSlug" value="${state.store.linkSlug}" /></div>
            </div>
            <div class="field"><label for="store-description">Descrição</label><textarea id="store-description" name="description">${state.store.description}</textarea></div>
            <div class="form-grid">
              <div class="field"><label for="store-logo">URL da logo</label><input id="store-logo" name="logo" value="${state.store.logo}" /></div>
              <div class="field"><label for="store-cover">URL da capa</label><input id="store-cover" name="cover" value="${state.store.cover}" /></div>
            </div>
            <div class="form-grid">
              <label class="switch-row"><input type="checkbox" name="deliveryEnabled" ${state.store.deliveryEnabled ? "checked" : ""} /><span>Ativar delivery</span></label>
              <label class="switch-row"><input type="checkbox" name="tableEnabled" ${state.store.tableEnabled ? "checked" : ""} /><span>Ativar pedidos por mesa</span></label>
            </div>
            <div class="inline-actions">
              <button class="action-btn" type="submit">Salvar loja</button>
              <button class="ghost-btn" type="button" data-route-link="menu">Ver prévia do cardápio</button>
            </div>
          </form>
        </article>

        <article class="panel-card">
          <div class="panel-header">
            <div><p class="eyebrow">Cardápio</p><h2>Produtos cadastrados</h2></div>
          </div>
          <div class="card-grid">${state.store.products.map(renderProductCardForStore).join("")}</div>
        </article>

        <article class="panel-card">
          <div class="panel-header">
            <div><p class="eyebrow">Categorias</p><h2>Gestão de categorias</h2></div>
          </div>
          <div class="chip-list">
            ${state.store.categories.map((category) => `<span class="chip">${category.name}</span>`).join("")}
          </div>
          <form id="category-form" class="inline-actions" style="margin-top:16px;">
            <input name="name" placeholder="Nova categoria" style="flex:1; min-width:220px; padding:13px 14px; border-radius:14px; border:1px solid var(--line);" required />
            <button class="action-btn" type="submit">Adicionar categoria</button>
          </form>
        </article>

        <article class="panel-card">
          <div class="panel-header">
            <div><p class="eyebrow">Cadastro rápido</p><h2>Novo produto</h2></div>
          </div>
          <form id="product-form" class="stack">
            <div class="form-grid">
              <div class="field"><label for="product-name">Nome</label><input id="product-name" name="name" placeholder="Ex: Temaki Salmon" required /></div>
              <div class="field"><label for="product-category">Categoria</label><select id="product-category" name="categoryId" required>${state.store.categories.map((category) => `<option value="${category.id}">${category.name}</option>`).join("")}</select></div>
              <div class="field"><label for="product-price">Preço</label><input id="product-price" name="price" type="number" min="0" step="0.01" placeholder="0.00" required /></div>
            </div>
            <div class="field"><label for="product-description">Descrição</label><textarea id="product-description" name="description" placeholder="Descreva o item"></textarea></div>
            <div class="field"><label for="product-photo">URL da foto</label><input id="product-photo" name="photo" placeholder="https://..." /></div>
            <div class="form-grid">
              <label class="switch-row"><input type="checkbox" name="active" checked /><span>Produto ativo</span></label>
              <label class="switch-row"><input type="checkbox" name="featured" /><span>Destacar no cardápio</span></label>
            </div>
            <button class="action-btn" type="submit">Adicionar produto</button>
          </form>
        </article>
      </div>

      <aside class="stack">
        <article class="drawer">
          <div class="drawer-header">
            <div><p class="eyebrow">Operação</p><h2>Pedidos recentes</h2></div>
          </div>
          <div class="stack">${recentOrders.map(renderOrderCompact).join("")}</div>
        </article>

        <article class="drawer">
          <div class="drawer-header">
            <div><p class="eyebrow">Atalhos</p><h2>Link e QR Codes</h2></div>
          </div>
          <div class="stack small">
            <span><strong>Link da loja:</strong> ${state.store.linkSlug}.dooki.online</span>
            <span><strong>QR por mesa:</strong> ${state.store.tables.map((table) => `Mesa ${table}`).join(", ")}</span>
            <span><strong>Pedidos por mesa:</strong> ${state.store.tableEnabled ? "Ativo" : "Desativado"}</span>
            <span><strong>Delivery:</strong> ${state.store.deliveryEnabled ? "Ativo" : "Desativado"}</span>
          </div>
          <div class="inline-actions" style="margin-top:16px;">
            <button class="ghost-btn" type="button" data-reset-demo="true">Restaurar dados demo</button>
          </div>
        </article>
      </aside>
    </section>
  `;
}

function renderPublicMenu() {
  const products = getActiveProducts();
  const categories = [{ id: "all", name: "Todos" }, ...state.store.categories];

  return `
    <section class="public-grid">
      <div class="stack">
        <article class="hero-card">
          <div class="hero-copy">
            <p class="eyebrow">Cardápio público</p>
            <h2>${state.store.name}</h2>
            <p>${state.store.description}</p>
            <div class="chip-list">
              <span class="chip">${state.store.phone}</span>
              <span class="chip">${state.store.address}</span>
            </div>
          </div>
          <div class="hero-actions">
            <button class="ghost-btn" data-cart-mode="delivery">Pedido delivery</button>
            <button class="ghost-btn" data-cart-mode="mesa">Pedido por mesa</button>
          </div>
        </article>

        <article class="panel-card">
          <div class="panel-header">
            <div><p class="eyebrow">Categorias</p><h2>Explore o cardápio</h2></div>
          </div>
          <div class="filter-row">
            ${categories
              .map(
                (category) => `
                  <button class="nav-btn ${state.currentCategory === category.id ? "active" : ""}" data-category="${category.id}">
                    ${category.name}
                  </button>
                `
              )
              .join("")}
          </div>
        </article>

        <div class="card-grid">
          ${products.map(renderPublicProductCard).join("") || '<article class="empty-state"><h3>Nenhum produto ativo nessa categoria</h3><p class="muted">Ative itens no painel da loja para aparecerem aqui.</p></article>'}
        </div>
      </div>

      <aside class="drawer">
        <div class="drawer-header">
          <div><p class="eyebrow">Carrinho</p><h2>${state.cartMode === "delivery" ? "Pedido delivery" : "Pedido por mesa"}</h2></div>
          <span class="chip">${state.cart.length} itens</span>
        </div>
        <div class="stack">${state.cart.map(renderCartItem).join("") || '<p class="muted">Adicione produtos para montar o pedido.</p>'}</div>
        <hr />
        <form id="checkout-form" class="stack">
          <div class="field"><label for="customerName">Nome do cliente</label><input id="customerName" name="customerName" placeholder="Seu nome" required /></div>
          ${state.cartMode === "delivery"
            ? `<div class="field"><label for="address">Endereço de entrega</label><input id="address" name="address" placeholder="Rua, número e complemento" required /></div>`
            : `<div class="field"><label for="tableNumber">Número da mesa</label><select id="tableNumber" name="tableNumber" required><option value="">Selecione</option>${state.store.tables.map((table) => `<option value="${table}">Mesa ${table}</option>`).join("")}</select></div>`
          }
          <div class="field"><label for="notes">Observações</label><textarea id="notes" name="notes" placeholder="Opcional"></textarea></div>
          <div class="summary-row"><span>Total</span><strong>${formatCurrency(getCartTotal())}</strong></div>
          <button class="action-btn" type="submit" ${state.cart.length ? "" : "disabled"}>Enviar pedido</button>
        </form>
      </aside>
    </section>
  `;
}

function renderKitchenPanel() {
  const grouped = {
    aguardando: state.orders.filter((order) => order.status === "aguardando"),
    "em preparo": state.orders.filter((order) => order.status === "em preparo"),
    pronto: state.orders.filter((order) => order.status === "pronto")
  };

  return `
    <section class="section">
      <div class="section-header">
        <div>
          <p class="eyebrow">Painel da cozinha</p>
          <h2 class="section-title">Pedidos em tempo real</h2>
          <p class="muted">Atualize o andamento e acompanhe o que está aguardando, em preparo ou pronto.</p>
        </div>
        <div class="chip-list">
          ${state.currentUserRole === "kitchen" ? '<span class="chip">Sessão cozinha ativa</span>' : '<button class="ghost-btn" data-login-role="kitchen">Login da cozinha</button>'}
        </div>
      </div>
      <div class="card-grid">
        ${Object.entries(grouped)
          .map(
            ([status, orders]) => `
              <article class="panel-card">
                <div class="panel-header">
                  <div><p class="eyebrow">${getStatusLabel(status)}</p><h2>${orders.length} pedido(s)</h2></div>
                </div>
                <div class="stack">
                  ${orders.map(renderKitchenOrder).join("") || '<div class="empty-state"><h3>Sem pedidos</h3><p class="muted">Nenhum pedido nessa etapa.</p></div>'}
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderDriverPanel() {
  const available = state.orders.filter((order) => order.type === "delivery" && order.status === "pronto" && !order.assignedDriver);
  const inProgress = state.orders.filter((order) => order.assignedDriver === "Entregador Demo" && order.status !== "entregue");
  const done = state.orders.filter((order) => order.assignedDriver === "Entregador Demo" && order.status === "entregue");

  return `
    <section class="section">
      <div class="section-header">
        <div>
          <p class="eyebrow">Painel do entregador</p>
          <h2 class="section-title">Entregas e rotas</h2>
          <p class="muted">Aceite pedidos prontos, marque saída para rota e finalize como entregue.</p>
        </div>
        <div class="chip-list">
          ${state.currentUserRole === "driver" ? '<span class="chip">Sessão entregador ativa</span>' : '<button class="ghost-btn" data-login-role="driver">Login do entregador</button>'}
        </div>
      </div>
      <div class="card-grid">
        <article class="panel-card">
          <div class="panel-header"><div><p class="eyebrow">Disponíveis</p><h2>${available.length} pedido(s)</h2></div></div>
          <div class="stack">${available.map((order) => renderDriverOrder(order, "accept")).join("") || '<div class="empty-state"><h3>Sem entregas livres</h3><p class="muted">Assim que a cozinha liberar, os pedidos aparecem aqui.</p></div>'}</div>
        </article>
        <article class="panel-card">
          <div class="panel-header"><div><p class="eyebrow">Em andamento</p><h2>${inProgress.length} pedido(s)</h2></div></div>
          <div class="stack">${inProgress.map((order) => renderDriverOrder(order, "progress")).join("") || '<div class="empty-state"><h3>Nada em rota</h3><p class="muted">Aceite um pedido para iniciar.</p></div>'}</div>
        </article>
        <article class="panel-card">
          <div class="panel-header"><div><p class="eyebrow">Histórico futuro</p><h2>${done.length} entregas concluídas</h2></div></div>
          <div class="stack">${done.map((order) => renderDriverOrder(order, "done")).join("") || '<div class="empty-state"><h3>Sem entregas finalizadas</h3><p class="muted">O histórico aparece aqui conforme as entregas forem concluídas.</p></div>'}</div>
        </article>
      </div>
    </section>
  `;
}

function renderAdminPanel() {
  return `
    <section class="two-col-grid">
      <article class="panel-card">
        <div class="panel-header">
          <div><p class="eyebrow">Área admin da Dooki</p><h2>Base preparada para a próxima fase</h2></div>
        </div>
        <div class="section-grid">
          <article class="info-card"><h3>Cadastro de estabelecimentos</h3><p>Estrutura pensada para onboarding centralizado e aprovação de novas lojas.</p></article>
          <article class="info-card"><h3>Gestão de contas</h3><p>Espaço futuro para controle de perfis, permissões e acesso administrativo.</p></article>
          <article class="info-card"><h3>Métricas gerais</h3><p>Pronto para receber indicadores de pedidos, faturamento, lojas e desempenho.</p></article>
          <article class="info-card"><h3>Planos e suporte</h3><p>Reservado para monetização, relatórios internos e atendimento da operação.</p></article>
        </div>
      </article>
      <aside class="drawer">
        <div class="drawer-header"><div><p class="eyebrow">Estado atual</p><h2>Escopo MVP entregue</h2></div></div>
        <div class="stack small">
          <span>Área institucional pública</span>
          <span>Painel do estabelecimento</span>
          <span>Cardápio público com carrinho</span>
          <span>Painel da cozinha com status</span>
          <span>Painel do entregador com fluxo básico</span>
          <span>Persistência local no navegador</span>
        </div>
      </aside>
    </section>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      setState((draft) => {
        draft.currentRoute = button.dataset.route;
        return draft;
      });
    });
  });

  document.querySelectorAll("[data-route-link]").forEach((button) => {
    button.addEventListener("click", () => {
      setState((draft) => {
        draft.currentRoute = button.dataset.routeLink;
        return draft;
      });
    });
  });

  document.querySelectorAll("[data-login-role]").forEach((button) => {
    button.addEventListener("click", () => {
      const role = button.dataset.loginRole;
      setState((draft) => {
        draft.currentUserRole = role;
        draft.currentRoute = role === "store" ? "store" : role === "kitchen" ? "kitchen" : "driver";
        return draft;
      });
    });
  });

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      setState((draft) => {
        draft.currentCategory = button.dataset.category;
        return draft;
      });
    });
  });

  document.querySelectorAll("[data-add-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.addCart;
      setState((draft) => {
        const product = draft.store.products.find((item) => item.id === productId);
        if (!product) return draft;
        const existing = draft.cart.find((item) => item.productId === productId);
        if (existing) existing.quantity += 1;
        else draft.cart.push({ productId, name: product.name, price: product.price, quantity: 1 });
        return draft;
      });
    });
  });

  document.querySelectorAll("[data-cart-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      setState((draft) => {
        draft.cartMode = button.dataset.cartMode;
        return draft;
      });
    });
  });

  document.querySelectorAll("[data-order-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const [orderId, nextStatus] = button.dataset.orderStatus.split("|");
      setState((draft) => {
        const order = draft.orders.find((item) => item.id === orderId);
        if (order) order.status = nextStatus;
        return draft;
      });
    });
  });

  document.querySelectorAll("[data-driver-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const [orderId, action] = button.dataset.driverAction.split("|");
      setState((draft) => {
        const order = draft.orders.find((item) => item.id === orderId);
        if (!order) return draft;
        if (action === "accept") {
          order.assignedDriver = "Entregador Demo";
          order.driverStatus = "aceito";
        }
        if (action === "route") order.driverStatus = "em rota";
        if (action === "deliver") {
          order.driverStatus = "entregue";
          order.status = "entregue";
        }
        return draft;
      });
    });
  });

  document.querySelectorAll("[data-toggle-product]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.toggleProduct;
      setState((draft) => {
        const product = draft.store.products.find((item) => item.id === productId);
        if (product) product.active = !product.active;
        return draft;
      });
    });
  });

  document.querySelectorAll("[data-feature-product]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.featureProduct;
      setState((draft) => {
        const product = draft.store.products.find((item) => item.id === productId);
        if (product) product.featured = !product.featured;
        return draft;
      });
    });
  });

  const storeForm = document.querySelector("#store-form");
  if (storeForm) {
    storeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(storeForm);
      setState((draft) => {
        draft.store.name = formData.get("name")?.toString() || draft.store.name;
        draft.store.phone = formData.get("phone")?.toString() || "";
        draft.store.address = formData.get("address")?.toString() || "";
        draft.store.description = formData.get("description")?.toString() || "";
        draft.store.logo = formData.get("logo")?.toString() || "";
        draft.store.cover = formData.get("cover")?.toString() || "";
        draft.store.linkSlug = formData.get("linkSlug")?.toString() || "";
        draft.store.deliveryEnabled = formData.get("deliveryEnabled") === "on";
        draft.store.tableEnabled = formData.get("tableEnabled") === "on";
        return draft;
      });
      alert("Dados da loja atualizados.");
    });
  }

  const productForm = document.querySelector("#product-form");
  if (productForm) {
    productForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(productForm);
      setState((draft) => {
        draft.store.products.unshift({
          id: `p${Date.now()}`,
          name: formData.get("name")?.toString() || "",
          categoryId: formData.get("categoryId")?.toString() || draft.store.categories[0]?.id || "",
          price: Number(formData.get("price")),
          description: formData.get("description")?.toString() || "",
          photo: formData.get("photo")?.toString() || "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
          active: formData.get("active") === "on",
          featured: formData.get("featured") === "on"
        });
        return draft;
      });
      productForm.reset();
      alert("Produto adicionado com sucesso.");
    });
  }

  const categoryForm = document.querySelector("#category-form");
  if (categoryForm) {
    categoryForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(categoryForm);
      const name = formData.get("name")?.toString().trim();
      if (!name) return;
      setState((draft) => {
        draft.store.categories.push({
          id: `c${Date.now()}`,
          name
        });
        return draft;
      });
      categoryForm.reset();
      alert("Categoria adicionada com sucesso.");
    });
  }

  const checkoutForm = document.querySelector("#checkout-form");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!state.cart.length) return;
      const formData = new FormData(checkoutForm);
      setState((draft) => {
        draft.orders.unshift({
          id: `PED-${Math.floor(Math.random() * 9000 + 1000)}`,
          createdAt: new Date().toISOString(),
          customerName: formData.get("customerName")?.toString() || "Cliente",
          type: draft.cartMode,
          tableNumber: draft.cartMode === "mesa" ? formData.get("tableNumber")?.toString() || "" : "",
          address: draft.cartMode === "delivery" ? formData.get("address")?.toString() || "" : "",
          notes: formData.get("notes")?.toString() || "",
          status: "aguardando",
          driverStatus: draft.cartMode === "delivery" ? "disponivel" : "",
          assignedDriver: "",
          items: draft.cart
        });
        draft.cart = [];
        draft.currentRoute = draft.cartMode === "delivery" ? "kitchen" : "store";
        return draft;
      });
      alert("Pedido enviado com sucesso.");
    });
  }

  document.querySelectorAll("[data-reset-demo]").forEach((button) => {
    button.addEventListener("click", () => {
      state = createSeedState();
      saveState();
      renderApp();
      alert("Base demo restaurada.");
    });
  });
}

renderApp();
