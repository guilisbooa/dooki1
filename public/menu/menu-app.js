(function () {
  const state = { establishment: null, categories: [], products: [], cart: [], activeCategoryId: "" };

  document.addEventListener("DOMContentLoaded", init);

  function getClient() { return window.supabaseClient || null; }

  function getParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      establishmentId: params.get("establishment") || params.get("store") || params.get("id") || "",
      slug: params.get("slug") || "",
      mode: params.get("mode") || params.get("tipo") || "delivery",
      table: params.get("table") || params.get("mesa") || ""
    };
  }

  function normalizeUuidValue(value) {
    if (value == null) return null;
    if (typeof value === "object") return normalizeUuidValue(value.id ?? value.value ?? null);
    const raw = String(value).trim();
    if (!raw || raw === "undefined" || raw === "null" || raw.includes("[object Object]")) return null;
    return raw;
  }

  function money(value) {
    return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function getProductPrice(product) { return Number(product.sale_price ?? product.price ?? product.unit_price ?? 0); }
  function isProductActive(product) {
    if (product.active != null) return product.active !== false;
    if (product.is_active != null) return product.is_active !== false;
    return true;
  }

  function sortByOrderAndName(items) {
    return [...items].sort((a,b) => (Number(a.sort_order ?? 999999) - Number(b.sort_order ?? 999999)) || String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));
  }

  function resolveMediaUrl(value, fallback) {
    const raw = value == null ? "" : String(value).trim();
    const safeFallback = fallback || "/assets/logo-dooki.png";
    if (!raw || raw === "undefined" || raw === "null") return safeFallback;
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
    if (raw.startsWith("/assets/") || raw.startsWith("./") || raw.startsWith("../")) return raw;
    const baseUrl = (window.SUPABASE_URL || window.supabaseUrl || "https://lvnhwtmdpzwjfjktkmtd.supabase.co").replace(/\/+$/, "");
    if (raw.startsWith("/storage/v1/object/public/")) return `${baseUrl}${raw}`;
    if (raw.startsWith("storage/v1/object/public/")) return `${baseUrl}/${raw}`;
    if (raw.includes("/")) return `${baseUrl}/storage/v1/object/public/${raw.replace(/^\/+/, "")}`;
    return raw;
  }

  async function init() {
    try {
      const client = getClient();
      if (!client) throw new Error("Supabase não configurado.");

      const params = getParams();
      if (!params.establishmentId && !params.slug) throw new Error("Link inválido. Falta o estabelecimento.");

      let query = client.from("establishments").select("*");
      query = params.establishmentId ? query.eq("id", params.establishmentId) : query.eq("slug", params.slug);
      const { data: establishment, error: establishmentError } = await query.maybeSingle();
      if (establishmentError) throw establishmentError;
      if (!establishment) throw new Error("Estabelecimento não encontrado.");

      state.establishment = establishment;

      const [categoriesRes, productsRes] = await Promise.all([
        client.from("categories").select("*").eq("establishment_id", establishment.id),
        client.from("products").select("*").eq("establishment_id", establishment.id)
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (productsRes.error) throw productsRes.error;

      state.categories = sortByOrderAndName((categoriesRes.data || []).filter(c => c.active !== false));
      state.products = sortByOrderAndName((productsRes.data || []).filter(isProductActive));
      state.activeCategoryId = normalizeUuidValue(state.categories[0]?.id) || "";
      render();
    } catch (error) {
      document.getElementById("menu-root").innerHTML = `<div class="menu-error"><strong>Não foi possível carregar o cardápio.</strong><span>${error.message || "Tente novamente."}</span></div>`;
    }
  }

  function getGroups() {
    const groups = state.categories.map(category => {
      const categoryId = normalizeUuidValue(category.id);
      const products = sortByOrderAndName(state.products.filter(product => String(normalizeUuidValue(product.category_id)) === String(categoryId)));
      return { category, products };
    }).filter(group => group.products.length > 0);

    const groupedProductIds = new Set();
    groups.forEach(group => {
      group.products.forEach(product => groupedProductIds.add(String(normalizeUuidValue(product.id))));
    });

    const uncategorized = sortByOrderAndName(
      state.products.filter(product => !groupedProductIds.has(String(normalizeUuidValue(product.id))))
    );

    if (uncategorized.length) {
      groups.push({
        category: { id: "__todos__", name: "Cardápio" },
        products: uncategorized
      });
    }

    return groups;
  }

  function render() {
    const params = getParams();
    const root = document.getElementById("menu-root");
    const store = state.establishment;
    const groups = getGroups();

    if (!groups.some(group => String(normalizeUuidValue(group.category.id) || group.category.id) === String(state.activeCategoryId))) {
      state.activeCategoryId = normalizeUuidValue(groups[0]?.category?.id) || groups[0]?.category?.id || "";
    }

    const tableMode = params.mode === "table" || params.mode === "mesa";
    const modeLabel = tableMode ? `Pedido presencial${params.table ? ` • Mesa ${params.table}` : ""}` : "Pedido delivery via link";

    root.innerHTML = `
      <div class="public-menu-shell">
        <main class="public-menu-main">
          <section class="public-menu-hero">
            <div class="public-menu-banner" style="background-image:linear-gradient(135deg,rgba(15,23,42,.12),rgba(15,23,42,.02)),url('${resolveMediaUrl(store.banner_url, "")}')"></div>
            <div class="public-menu-info">
              <img class="public-menu-logo" src="${resolveMediaUrl(store.logo_url, "/assets/logo-dooki.png")}" alt="${store.name || "Logo"}">
              <div class="public-menu-title">
                <span class="mode-pill">${modeLabel}</span>
                <h1>${store.name || "Cardápio"}</h1>
                <p>${store.description || "Escolha seus produtos e envie o pedido."}</p>
              </div>
            </div>
          </section>

          <nav class="menu-category-tabs">
            ${groups.map(group => {
              const id = normalizeUuidValue(group.category.id) || group.category.id;
              return `<button class="${String(id) === String(state.activeCategoryId) ? "active" : ""}" data-category-id="${id}">${group.category.name}</button>`;
            }).join("")}
          </nav>

          <section class="menu-category-section">${renderProducts(groups)}</section>
        </main>

        <aside class="public-cart">${renderCart(params)}</aside>
      </div>
    `;

    root.querySelectorAll("[data-category-id]").forEach(button => {
      button.addEventListener("click", () => {
        state.activeCategoryId = button.dataset.categoryId;
        render();
      });
    });
  }

  function renderProducts(groups) {
    const selectedGroups = groups.filter(group => String(normalizeUuidValue(group.category.id) || group.category.id) === String(state.activeCategoryId));
    const groupsToRender = selectedGroups.length ? selectedGroups : groups;
    if (!groupsToRender.length) return `<div class="menu-error"><strong>Cardápio vazio</strong><span>Esta loja ainda não cadastrou produtos ativos.</span></div>`;

    return groupsToRender.map(group => `
      <div class="menu-category-block">
        <h2>${group.category.name}</h2>
        <div class="menu-products-grid">
          ${group.products.map(product => `
            <article class="public-product-card">
              <strong>${product.name || "Produto"}</strong>
              <p>${product.description || "Sem descrição."}</p>
              <div class="product-card-footer">
                <b>${money(getProductPrice(product))}</b>
                <button class="add-button" onclick="window.DookiMenu.addToCart('${product.id}')">Adicionar</button>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    `).join("");
  }

  function renderCart(params) {
    const tableMode = params.mode === "table" || params.mode === "mesa";
    const total = state.cart.reduce((acc, item) => acc + getProductPrice(item.product) * item.quantity, 0);

    return `
      <h2>Seu pedido</h2>
      <div class="cart-mode-card">
        <strong>${tableMode ? "Pedido presencial" : "Pedido delivery"}</strong>
        <span>${tableMode ? `Mesa ${params.table || "não informada"}` : "Receba no endereço informado"}</span>
      </div>

      <div class="cart-items">
        ${state.cart.length ? state.cart.map(item => `
          <div class="cart-item">
            <div><strong>${item.product.name || "Produto"}</strong><span>${money(getProductPrice(item.product))}</span></div>
            <div class="cart-qty">
              <button onclick="window.DookiMenu.changeQty('${item.product.id}', -1)">-</button>
              <b>${item.quantity}</b>
              <button onclick="window.DookiMenu.changeQty('${item.product.id}', 1)">+</button>
            </div>
          </div>
        `).join("") : `<div class="cart-empty">Seu pedido está vazio.</div>`}
      </div>

      <form class="cart-form" onsubmit="event.preventDefault(); window.DookiMenu.submitOrder(this);">
        <label>Nome<input name="customer_name" placeholder="${tableMode ? "Seu nome ou identificação" : "Nome completo"}" ${tableMode ? "" : "required"}></label>
        <label>WhatsApp<input name="customer_phone" placeholder="(00) 00000-0000" ${tableMode ? "" : "required"}></label>
        ${tableMode ? "" : `<label>Endereço de entrega<textarea name="delivery_address" placeholder="Rua, número, bairro, complemento" required></textarea></label>`}
        <label>Observações<textarea name="notes" placeholder="Ex.: sem cebola, forma de pagamento..."></textarea></label>
        <div class="cart-total"><span>Total</span><strong>${money(total)}</strong></div>
        <button class="submit-order" type="submit" ${state.cart.length ? "" : "disabled"}>Enviar pedido</button>
      </form>
    `;
  }

  function addToCart(productId) {
    const product = state.products.find(item => String(normalizeUuidValue(item.id)) === String(normalizeUuidValue(productId)));
    if (!product) return;
    const existing = state.cart.find(item => String(normalizeUuidValue(item.product.id)) === String(normalizeUuidValue(productId)));
    if (existing) existing.quantity += 1;
    else state.cart.push({ product, quantity: 1 });
    render();
  }

  function changeQty(productId, delta) {
    const item = state.cart.find(entry => String(normalizeUuidValue(entry.product.id)) === String(normalizeUuidValue(productId)));
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) state.cart = state.cart.filter(entry => String(normalizeUuidValue(entry.product.id)) !== String(normalizeUuidValue(productId)));
    render();
  }

  function isMissingColumnError(error) {
    const msg = String(error?.message || "").toLowerCase();
    return msg.includes("column") || msg.includes("schema cache") || msg.includes("could not find");
  }

  async function insertOrder(payload) {
    const client = getClient();
    const { data, error } = await client.from("orders").insert([payload]).select().single();
    if (!error) return data;
    if (!isMissingColumnError(error)) throw error;
    const fallback = { establishment_id: payload.establishment_id, customer_name: payload.customer_name, customer_phone: payload.customer_phone, status: payload.status, total_amount: payload.total_amount };
    const retry = await client.from("orders").insert([fallback]).select().single();
    if (retry.error) throw retry.error;
    return retry.data;
  }

  async function insertOrderItems(orderId, items) {
    const client = getClient();
    if (!orderId) return;
    const rows = items.map(item => ({
      order_id: orderId,
      establishment_id: state.establishment.id,
      product_id: normalizeUuidValue(item.product.id),
      product_name: item.product.name || "Produto",
      quantity: item.quantity,
      unit_price: getProductPrice(item.product),
      total_price: getProductPrice(item.product) * item.quantity
    }));
    const { error } = await client.from("order_items").insert(rows);
    if (error) console.warn("Não foi possível salvar itens do pedido.", error);
  }

  async function submitOrder(form) {
    if (!state.cart.length) return;
    const params = getParams();
    const tableMode = params.mode === "table" || params.mode === "mesa";
    const formData = new FormData(form);
    const total = state.cart.reduce((acc, item) => acc + getProductPrice(item.product) * item.quantity, 0);

    const payload = {
      establishment_id: state.establishment.id,
      customer_name: String(formData.get("customer_name") || "").trim() || (tableMode ? `Mesa ${params.table || ""}`.trim() : "Cliente"),
      customer_phone: String(formData.get("customer_phone") || "").trim() || null,
      delivery_address: tableMode ? null : String(formData.get("delivery_address") || "").trim(),
      table_number: tableMode ? (params.table || null) : null,
      source: tableMode ? "table" : "delivery",
      order_source: tableMode ? "table" : "delivery",
      status: "pending",
      notes: String(formData.get("notes") || "").trim() || null,
      total_amount: total
    };

    try {
      const button = form.querySelector("button[type='submit']");
      if (button) { button.disabled = true; button.textContent = "Enviando..."; }
      const order = await insertOrder(payload);
      await insertOrderItems(order?.id, state.cart);
      state.cart = [];
      render();
      document.querySelector(".public-cart").insertAdjacentHTML("afterbegin", `<div class="order-success">Pedido enviado com sucesso!</div>`);
    } catch (error) {
      console.error(error);
      alert(error.message || "Não foi possível enviar o pedido.");
      render();
    }
  }

  window.DookiMenu = { addToCart, changeQty, submitOrder };
})();
