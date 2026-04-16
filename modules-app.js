(() => {
  const SESSION_KEY = "dooki-portal-session";

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch {
      return null;
    }
  }

  function setSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function money(value) {
    return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function pageName() {
    return window.location.pathname.split("/").pop() || "index.html";
  }

  function resolveStore(snapshot) {
    const queryStore = params().get("store");
    const session = getSession();
    const bySlug = snapshot.stores.find((item) => item.slug === queryStore);
    const bySession = snapshot.stores.find((item) => item.slug === session?.storeSlug || item.id === session?.storeId);
    if (session?.role === "restaurant") return bySession || null;
    if (session?.role === "admin") return bySlug || bySession || snapshot.stores[0] || null;
    return bySlug || snapshot.stores[0] || null;
  }

  async function loadContext() {
    const snapshot = await window.DookiData.getSnapshot();
    const store = resolveStore(snapshot);
    const products = snapshot.products.filter((item) => item.establishmentId === store?.id && item.isActive);
    const orders = snapshot.orders.filter((item) => item.establishmentId === store?.id);
    const deliveries = orders.filter((item) => item.channel === "delivery");
    return { snapshot, store, products, orders, deliveries };
  }

  function protectRestaurantPages(context) {
    const required = document.body.dataset.requiresAuth;
    if (required !== "restaurant") return true;
    const session = getSession();
    if (!session || !["restaurant", "admin"].includes(session.role)) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  function fillSessionBadges(store) {
    document.querySelectorAll("[data-session-label]").forEach((node) => {
      node.textContent = store ? store.name : "Loja nao identificada";
    });
    document.querySelectorAll("[data-session-role]").forEach((node) => {
      node.textContent = store ? `${store.plan} - ${store.city}` : "Painel isolado por loja";
    });
  }

  function bindRestaurantLogin(snapshot) {
    const restaurantForm = document.querySelector('[data-login-form="restaurant"]');
    const adminForm = document.querySelector('[data-login-form="admin"]');
    const select = document.querySelector("[data-restaurant-select]");

    if (select) {
      select.innerHTML = snapshot.stores.map((store) => `<option value="${store.slug}">${store.name}</option>`).join("");
    }

    restaurantForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const store = snapshot.stores.find((item) => item.slug === data.get("restaurantCode"));
      if (!store) return;
      setSession({ role: "restaurant", storeId: store.id, storeSlug: store.slug, storeName: store.name });
      window.location.href = `estabelecimento.html?store=${store.slug}`;
    });

    adminForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      window.location.href = "index.html";
    });
  }

  function renderEstablishment(context) {
    const { store, products, orders } = context;
    if (!store) return;
    fillSessionBadges(store);
    const featured = products.filter((item) => item.isFeatured).concat(products.filter((item) => !item.isFeatured)).slice(0, 4);
    const recent = orders.slice(0, 4);
    const setText = (selector, text) => { const node = document.querySelector(selector); if (node) node.textContent = text; };
    setText("[data-store-name]", store.name);
    setText("[data-store-description]", store.description);
    setText("[data-store-link]", `Link: dooki.app/${store.slug}`);
    setText("[data-store-tables]", `Mesas ativas: ${store.tablesCount}`);
    setText("[data-store-qrcodes]", `QR Codes gerados: ${store.qrcodesCount}`);
    setText("[data-store-orders]", store.ordersToday);
    setText("[data-store-ticket]", money(store.averageTicket));
    setText("[data-store-products]", products.length);
    setText("[data-store-online-tables]", Math.max(0, Math.min(store.tablesCount, 18)));

    const productGrid = document.querySelector("[data-store-products-grid]");
    if (productGrid) {
      productGrid.innerHTML = featured.map((product) => `
        <article class="menu-card">
          <img src="${product.imageUrl}" alt="${product.name}">
          <span class="soft-pill">${product.category}</span>
          <h3>${product.name}</h3>
          <p>${product.description}</p>
        </article>
      `).join("");
    }
    const ordersList = document.querySelector("[data-store-orders-list]");
    if (ordersList) {
      ordersList.innerHTML = recent.map((order) => `<span>${order.code} - ${order.channel === "mesa" ? `mesa ${order.tableNumber}` : "delivery"} - ${order.status.replaceAll("_", " ")}</span>`).join("");
    }
  }

  function nextKitchenStatus(status) {
    if (status === "aguardando") return "em_preparo";
    if (status === "em_preparo") return "pronto";
    return "pronto";
  }

  function renderKitchen(context) {
    const { orders, store } = context;
    if (!store) return;
    fillSessionBadges(store);
    const columns = [
      { label: "Aguardando", status: "aguardando" },
      { label: "Em preparo", status: "em_preparo" },
      { label: "Pronto", status: "pronto" }
    ];
    const shell = document.querySelector("[data-kitchen-columns]");
    if (!shell) return;
    shell.innerHTML = columns.map((column) => `
      <article class="ticket-column">
        <h3>${column.label}</h3>
        ${(orders.filter((item) => item.status === column.status)).map((order) => `
          <div class="ticket-card">
            <div class="ticket-top"><strong>${order.code}</strong><span class="badge ${order.channel === "delivery" ? "warning" : "dark"}">${order.channel === "mesa" ? `mesa ${order.tableNumber}` : "delivery"}</span></div>
            <h3>${order.itemsSummary}</h3>
            <p class="muted">${order.notes || "Sem observacoes."}</p>
            ${column.status !== "pronto" ? `<button class="btn btn-dark" type="button" data-kitchen-next="${order.id}">Avancar status</button>` : ""}
          </div>
        `).join("") || `<div class="empty-box">Nenhum pedido aqui.</div>`}
      </article>
    `).join("");
    document.querySelectorAll("[data-kitchen-next]").forEach((button) => {
      button.addEventListener("click", async () => {
        const order = orders.find((item) => item.id === button.dataset.kitchenNext);
        if (!order) return;
        await window.DookiData.updateOrder(order.id, { status: nextKitchenStatus(order.status) });
        window.location.reload();
      });
    });
  }

  function renderDelivery(context) {
    const { deliveries, store } = context;
    if (!store) return;
    fillSessionBadges(store);
    const available = deliveries.filter((item) => item.status === "pronto" && (!item.courierStatus || item.courierStatus === "disponivel"));
    const inRoute = deliveries.filter((item) => item.courierStatus === "em_rota");
    const history = deliveries.filter((item) => item.courierStatus === "entregue").slice(0, 5);
    const shell = document.querySelector("[data-delivery-cards]");
    if (!shell) return;
    shell.innerHTML = `
      <article class="data-card">
        <span class="panel-label">Disponivel</span>
        <h3 class="page-title">${available[0]?.code || "Nenhuma entrega pronta"}</h3>
        <p class="muted">${available[0] ? `${available[0].customerAddress || "Sem endereco"} - total ${money(available[0].total)}` : "Aguarde novos pedidos prontos."}</p>
        <div class="mini-actions">${available[0] ? `<button class="btn btn-green" type="button" data-delivery-action="accept" data-order-id="${available[0].id}">Aceitar entrega</button>` : ""}</div>
      </article>
      <article class="data-card">
        <span class="panel-label">Em andamento</span>
        <h3 class="page-title">${inRoute[0]?.code || "Sem rota ativa"}</h3>
        <p class="muted">${inRoute[0] ? `${inRoute[0].customerAddress || "Sem endereco"} - cliente ${inRoute[0].customerName || "Cliente"}` : "Nenhum entregador em rota no momento."}</p>
        <div class="mini-actions">
          ${inRoute[0] ? `<button class="btn btn-soft" type="button" data-delivery-action="delivered" data-order-id="${inRoute[0].id}">Marcar entregue</button>` : ""}
        </div>
      </article>
      <article class="data-card">
        <span class="panel-label">Historico</span>
        <h3 class="page-title">Ultimas entregas</h3>
        <div class="info-list">${history.map((item) => `<span>${item.code} - entregue - ${money(item.total)}</span>`).join("") || "<span>Sem entregas finalizadas.</span>"}</div>
      </article>
    `;
    document.querySelectorAll("[data-delivery-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const orderId = button.dataset.orderId;
        if (button.dataset.deliveryAction === "accept") {
          await window.DookiData.updateOrder(orderId, { courierStatus: "em_rota", status: "pronto" });
        }
        if (button.dataset.deliveryAction === "delivered") {
          await window.DookiData.updateOrder(orderId, { courierStatus: "entregue", status: "entregue" });
        }
        window.location.reload();
      });
    });
  }

  function renderMenuPage(context, mode) {
    const { store, products } = context;
    if (!store) return;
    const title = document.querySelector("[data-menu-title]");
    const description = document.querySelector("[data-menu-description]");
    const categoryNode = document.querySelector("[data-menu-categories]");
    const grid = document.querySelector("[data-menu-grid]");
    const tableLabel = document.querySelector("[data-table-label]");
    const tableCartTitle = document.querySelector("[data-table-cart-title]");
    const tableNumber = params().get("table") || "12";
    if (title) title.textContent = mode === "mesa" ? `${store.name} via QR Code da mesa` : `${store.name} via link`;
    if (description) description.textContent = mode === "mesa" ? `Mesa ${tableNumber} identificada. Escolha os itens e envie direto para a cozinha.` : `Cardapio digital de ${store.name} com itens sincronizados do Supabase.`;
    if (tableLabel) tableLabel.textContent = `Mesa ${tableNumber}`;
    if (tableCartTitle) tableCartTitle.textContent = `Mesa ${tableNumber}`;
    const categories = [...new Set(products.map((item) => item.category))];
    if (categoryNode) categoryNode.innerHTML = categories.map((category) => `<a href="#">${category}</a>`).join("");
    if (grid) {
      grid.innerHTML = products.map((product, index) => `
        <article class="menu-card ${index === 0 ? "featured" : ""}">
          <img src="${product.imageUrl}" alt="${product.name}">
          <span class="soft-pill">${product.category}</span>
          <h3>${product.name}</h3>
          <p>${product.description}</p>
          <div class="row-between">
            <strong class="price">${money(product.price)}</strong>
            <button class="btn btn-dark" data-add-item data-name="${product.name}" data-price="${product.price}">Adicionar</button>
          </div>
        </article>
      `).join("");
    }

    const cart = [];
    const itemsNode = document.querySelector("[data-cart-items]");
    const totalNode = document.querySelector("[data-cart-total]");
    const countNode = document.querySelector("[data-cart-count]");
    const feedbackNode = document.querySelector("[data-cart-feedback]");
    const customerName = document.querySelector("[data-customer-name]");
    const customerAddress = document.querySelector("[data-customer-address]");
    const customerNotes = document.querySelector("[data-customer-notes]");

    const renderCart = () => {
      if (itemsNode) {
        itemsNode.innerHTML = cart.map((item) => `<div class="summary-row"><span>${item.name}</span><strong>${money(item.price)}</strong></div>`).join("") || `<div class="empty-box">Seu carrinho esta vazio.</div>`;
      }
      const total = cart.reduce((sum, item) => sum + item.price, 0);
      if (totalNode) totalNode.textContent = money(total);
      if (countNode) countNode.textContent = `${cart.length} item(ns)`;
    };

    document.querySelectorAll("[data-add-item]").forEach((button) => {
      button.addEventListener("click", () => {
        cart.push({ name: button.dataset.name, price: Number(button.dataset.price || 0) });
        renderCart();
      });
    });
    document.querySelector("[data-reset-cart]")?.addEventListener("click", () => {
      cart.length = 0;
      renderCart();
    });
    document.querySelector("[data-submit-order]")?.addEventListener("click", async () => {
      if (!cart.length) {
        if (feedbackNode) feedbackNode.textContent = "Adicione ao menos um item.";
        return;
      }
      const orderId = `#${String(Date.now()).slice(-4)}`;
      await window.DookiData.createOrder({
        establishmentId: store.id,
        code: orderId,
        channel: mode,
        status: "aguardando",
        tableNumber: mode === "mesa" ? Number(tableNumber) : null,
        notes: customerNotes?.value || "",
        total: cart.reduce((sum, item) => sum + item.price, 0),
        itemsSummary: cart.map((item) => item.name).join(", "),
        items: cart.map((item) => ({ name: item.name, quantity: 1, unit_price: item.price })),
        customerName: customerName?.value || "",
        customerAddress: customerAddress?.value || "",
        courierStatus: mode === "delivery" ? "disponivel" : ""
      });
      cart.length = 0;
      renderCart();
      if (feedbackNode) feedbackNode.textContent = mode === "mesa" ? "Pedido enviado para a cozinha." : "Pedido delivery enviado com sucesso.";
    });
    renderCart();
  }

  async function init() {
    const context = await loadContext();
    if (!protectRestaurantPages(context)) return;
    const currentPage = pageName();
    if (currentPage === "login.html") return bindRestaurantLogin(context.snapshot);
    if (currentPage === "estabelecimento.html") return renderEstablishment(context);
    if (currentPage === "cozinha.html") return renderKitchen(context);
    if (currentPage === "entregador.html") return renderDelivery(context);
    if (currentPage === "cardapio-link.html") return renderMenuPage(context, "delivery");
    if (currentPage === "cardapio-mesa.html") return renderMenuPage(context, "mesa");
  }

  init();
})();
