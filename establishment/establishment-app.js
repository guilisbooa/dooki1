(function () {
  const state = {
    user: null,
    membership: null,
    establishment: null,
    plan: null,
    features: [],
    orders: [],
    products: [],
    categories: [],
    tickets: [],
    tables: [],
    finance: null,
    inventoryMovements: []
  };

  const screenMeta = {
    dashboard: {
      title: "Visão geral",
      copy: "Acompanhe pedidos, vendas, estoque e desempenho da sua operação."
    },
    orders: {
      title: "Pedidos",
      copy: "Visualize e acompanhe os pedidos recebidos pela sua loja."
    },
    products: {
      title: "Produtos",
      copy: "Gerencie o cardápio, preços e disponibilidade dos seus itens."
    },
    categories: {
      title: "Categorias",
      copy: "Organize o cardápio por seções para facilitar a navegação."
    },
    inventory: {
      title: "Estoque",
      copy: "Controle o estoque e acompanhe movimentações dos produtos."
    },
    tables: {
      title: "Mesas",
      copy: "Gerencie QR codes, atendimento em mesa e sessões abertas."
    },
    finance: {
      title: "Financeiro",
      copy: "Acompanhe receita, custos, comissão Dooki e lucro estimado."
    },
    support: {
      title: "Suporte",
      copy: "Abra tickets e acompanhe o histórico de atendimento da sua loja."
    },
    settings: {
      title: "Configurações",
      copy: "Atualize os dados principais do seu estabelecimento."
    }
  };

  document.addEventListener("DOMContentLoaded", async function () {
    try {
      const context = await window.EstablishmentAuth.requireAuth();
      if (!context) return;

      state.user = context.user;
      state.membership = context.membership;

      bindBaseEvents();
      await bootstrap();
    } catch (error) {
      console.error("Erro ao iniciar painel do estabelecimento:", error);
      alert(error.message || "Não foi possível carregar o painel.");
      window.location.href = "./establishment-login.html";
    }
  });

  function getClient() {
    if (!window.supabaseClient) {
      throw new Error("Supabase não configurado.");
    }
    return window.supabaseClient;
  }

  function bindBaseEvents() {
    document.getElementById("establishment-logout").addEventListener("click", async function () {
      await window.EstablishmentAuth.signOut();
      window.location.href = "./establishment-login.html";
    });

    document.getElementById("sidebar-toggle").addEventListener("click", function () {
      document.getElementById("establishment-sidebar").classList.toggle("sidebar-open");
    });

    document.querySelectorAll("[data-screen]").forEach(function (button) {
      button.addEventListener("click", function () {
        const screen = button.dataset.screen;
        if (!screen) return;

        if (button.dataset.feature && !hasFeature(button.dataset.feature)) {
          openScreen(screen);
          renderLockedTables();
          return;
        }

        openScreen(screen);
      });
    });

    document.getElementById("product-form").addEventListener("submit", handleCreateProduct);
    document.getElementById("category-form").addEventListener("submit", handleCreateCategory);
    document.getElementById("support-form").addEventListener("submit", handleCreateTicket);
    document.getElementById("settings-form").addEventListener("submit", handleSaveSettings);
    document.getElementById("table-form").addEventListener("submit", handleCreateTable);

    document.getElementById("orders-search").addEventListener("input", function () {
      renderOrders(this.value || "");
    });
  }

  async function bootstrap() {
    await loadAllData();
    renderHeader();
    renderSidebar();
    renderDashboard();
    renderProducts();
    renderCategories();
    renderInventory();
    renderFinance();
    renderSupport();
    fillSettingsForm();
    renderTables();
  }

  async function loadAllData() {
    const client = getClient();
    const establishmentId = state.membership.establishment_id;

    const [
      establishmentRes,
      planRes,
      featuresRes,
      ordersRes,
      productsRes,
      categoriesRes,
      ticketsRes,
      tablesRes,
      movementsRes
    ] = await Promise.all([
      client.from("establishments").select("*").eq("id", establishmentId).single(),
      safeView("v_establishment_active_plan", "establishment_id", establishmentId, true),
      safeView("v_establishment_features", "establishment_id", establishmentId, false),
      safeTable("orders", establishmentId),
      safeTable("products", establishmentId),
      safeTable("categories", establishmentId),
      safeTable("support_tickets", establishmentId),
      safeTable("establishment_tables", establishmentId),
      safeTable("inventory_movements", establishmentId)
    ]);

    if (establishmentRes.error) throw establishmentRes.error;

    state.establishment = establishmentRes.data || null;
    state.plan = planRes || null;
    state.features = featuresRes || [];
    state.orders = ordersRes || [];
    state.products = productsRes || [];
    state.categories = categoriesRes || [];
    state.tickets = ticketsRes || [];
    state.tables = tablesRes || [];
    state.inventoryMovements = movementsRes || [];
    state.finance = computeFinance();
  }

  async function safeTable(tableName, establishmentId) {
    const client = getClient();

    try {
      const { data, error } = await client
        .from(tableName)
        .select("*")
        .eq("establishment_id", establishmentId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn(`Tabela ${tableName} indisponível.`, error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.warn(`Falha ao consultar ${tableName}.`, error);
      return [];
    }
  }

  async function safeView(viewName, field, value, single) {
    const client = getClient();

    try {
      let query = client.from(viewName).select("*").eq(field, value);

      if (single) {
        const { data, error } = await query.maybeSingle();
        if (error) {
          console.warn(`View ${viewName} indisponível.`, error.message);
          return null;
        }
        return data || null;
      }

      const { data, error } = await query;
      if (error) {
        console.warn(`View ${viewName} indisponível.`, error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.warn(`Falha ao consultar ${viewName}.`, error);
      return single ? null : [];
    }
  }

  function computeFinance() {
    const completedOrders = state.orders.filter(function (order) {
      return order.completed_at || order.status === "completed" || order.status === "delivered";
    });

    const grossRevenue = completedOrders.reduce(function (acc, order) {
      return acc + Number(order.total_amount || 0);
    }, 0);

    const dookiFee = completedOrders.reduce(function (acc, order) {
      return acc + Number(order.dooki_commission_amount || 0);
    }, 0);

    const totalCost = state.products.reduce(function (acc, product) {
      return acc + Number(product.cost_price || 0);
    }, 0);

    return {
      completedOrders: completedOrders.length,
      grossRevenue,
      dookiFee,
      totalCost,
      profitBefore: grossRevenue - totalCost,
      profitAfter: grossRevenue - totalCost - dookiFee
    };
  }

  function hasFeature(featureKey) {
    return state.features.some(function (feature) {
      return feature.feature_key === featureKey && feature.enabled;
    });
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value || 0));
  }

  function formatDate(value) {
    if (!value) return "—";

    try {
      return new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      return "—";
    }
  }

  function getPlanLabel() {
    return state.plan?.plan_display_name || state.plan?.plan_name || state.establishment?.plan || "Sem plano";
  }

  function renderHeader() {
    document.getElementById("sidebar-store-name").textContent = state.establishment?.name || "Estabelecimento";
    document.getElementById("sidebar-user-name").textContent = state.establishment?.name || "Responsável";
    document.getElementById("sidebar-user-email").textContent = state.user?.email || "—";
    document.getElementById("current-plan-pill").textContent = `Plano ${getPlanLabel()}`;
    document.getElementById("watermark-pill").textContent = state.plan?.watermark_enabled === false
      ? "Sem marca d’água"
      : "Com marca Dooki";
  }

  function renderSidebar() {
    document.querySelectorAll("[data-feature]").forEach(function (button) {
      const feature = button.dataset.feature;
      button.style.display = hasFeature(feature) ? "" : "";
    });

    populateCategorySelect();
  }

  function populateCategorySelect() {
    const select = document.getElementById("product-category-select");
    select.innerHTML = `<option value="">Sem categoria</option>` + state.categories.map(function (category) {
      return `<option value="${category.id}">${category.name}</option>`;
    }).join("");
  }

  function openScreen(screen) {
    document.querySelectorAll(".admin-nav-item").forEach(function (button) {
      button.classList.toggle("active", button.dataset.screen === screen);
    });

    document.querySelectorAll(".admin-screen").forEach(function (panel) {
      panel.classList.toggle("active", panel.dataset.panel === screen);
    });

    const meta = screenMeta[screen] || screenMeta.dashboard;
    document.getElementById("screen-title").textContent = meta.title;
    document.getElementById("screen-copy").textContent = meta.copy;

    if (screen === "dashboard") renderDashboard();
    if (screen === "orders") renderOrders();
    if (screen === "products") renderProducts();
    if (screen === "categories") renderCategories();
    if (screen === "inventory") renderInventory();
    if (screen === "tables") renderTables();
    if (screen === "finance") renderFinance();
    if (screen === "support") renderSupport();
    if (screen === "settings") fillSettingsForm();
  }

  function renderDashboard() {
    document.getElementById("kpi-orders-completed").textContent = String(state.finance.completedOrders);
    document.getElementById("kpi-gross-revenue").textContent = formatMoney(state.finance.grossRevenue);
    document.getElementById("kpi-dooki-fee").textContent = formatMoney(state.finance.dookiFee);
    document.getElementById("kpi-products-active").textContent = String(
      state.products.filter(function (product) { return product.active !== false; }).length
    );

    document.getElementById("dashboard-summary-list").innerHTML = [
      summaryItem("Cidade", state.establishment?.city || "—"),
      summaryItem("Pedidos cadastrados", String(state.orders.length)),
      summaryItem("Categorias", String(state.categories.length)),
      summaryItem("Tickets abertos", String(
        state.tickets.filter(function (ticket) {
          return !["fechado", "resolvido", "closed"].includes(String(ticket.status || "").toLowerCase());
        }).length
      ))
    ].join("");

    document.getElementById("dashboard-feature-list").innerHTML = state.features.length
      ? state.features.filter(function (feature) { return feature.enabled; }).map(function (feature) {
          return `
            <article class="pro-list-card">
              <div class="pro-list-main">
                <div class="pro-list-content">
                  <strong>${humanizeFeature(feature.feature_key)}</strong>
                  <span>Disponível no seu plano atual.</span>
                </div>
                <span class="pro-status-badge success">Ativo</span>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Nenhum recurso ativo encontrado.");

    document.getElementById("dashboard-recent-orders").innerHTML = state.orders.length
      ? state.orders.slice(0, 6).map(function (order) {
          return `
            <article class="pro-list-card">
              <div class="pro-list-main">
                <div class="pro-list-content">
                  <strong>Pedido #${String(order.id).slice(0, 8)}</strong>
                  <span>${order.customer_name || "Cliente"} • ${formatDate(order.created_at)}</span>
                </div>
                <div class="pro-action-group">
                  <span class="pro-status-badge info">${order.status || "pendente"}</span>
                  <span class="pro-status-badge neutral">${formatMoney(order.total_amount || 0)}</span>
                </div>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Nenhum pedido cadastrado ainda.");

    const lowStock = state.products.filter(function (product) {
      return product.track_inventory !== false &&
        Number(product.stock_quantity || 0) <= Number(product.stock_min_quantity || 0);
    });

    document.getElementById("dashboard-low-stock").innerHTML = lowStock.length
      ? lowStock.slice(0, 6).map(function (product) {
          return `
            <article class="pro-list-card">
              <div class="pro-list-main">
                <div class="pro-list-content">
                  <strong>${product.name || "Produto"}</strong>
                  <span>Estoque atual: ${Number(product.stock_quantity || 0)} • mínimo: ${Number(product.stock_min_quantity || 0)}</span>
                </div>
                <span class="pro-status-badge warning">Baixo</span>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Nenhum item com estoque baixo.");
  }

  function renderOrders(searchTerm) {
    const term = String(searchTerm || "").trim().toLowerCase();

    const items = state.orders.filter(function (order) {
      if (!term) return true;

      const haystack = [
        order.id,
        order.customer_name,
        order.status,
        order.customer_phone
      ].join(" ").toLowerCase();

      return haystack.includes(term);
    });

    document.getElementById("orders-table").innerHTML = items.length
      ? items.map(function (order) {
          return `
            <article class="pro-store-row">
              <div class="pro-store-row-left">
                <div class="pro-avatar">#</div>
                <div class="pro-store-row-content">
                  <strong>Pedido #${String(order.id).slice(0, 8)}</strong>
                  <span>${order.customer_name || "Cliente"} • ${formatDate(order.created_at)}</span>
                </div>
              </div>
              <div class="pro-store-row-right">
                <span class="pro-status-badge info">${order.status || "pendente"}</span>
                <strong>${formatMoney(order.total_amount || 0)}</strong>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Nenhum pedido encontrado.");
  }

  function renderProducts() {
    document.getElementById("products-table").innerHTML = state.products.length
      ? state.products.map(function (product) {
          const category = state.categories.find(function (item) {
            return item.id === product.category_id;
          });

          return `
            <article class="pro-store-row">
              <div class="pro-store-row-left">
                <div class="pro-avatar">${(product.name || "P").charAt(0).toUpperCase()}</div>
                <div class="pro-store-row-content">
                  <strong>${product.name || "Produto"}</strong>
                  <span>${category?.name || "Sem categoria"} • ${product.description || "Sem descrição"}</span>
                </div>
              </div>
              <div class="pro-store-row-right">
                <span class="pro-status-badge ${product.active === false ? "neutral" : "success"}">
                  ${product.active === false ? "Inativo" : "Ativo"}
                </span>
                <strong>${formatMoney(product.sale_price || 0)}</strong>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Nenhum produto cadastrado.");
  }

  function renderCategories() {
    document.getElementById("categories-table").innerHTML = state.categories.length
      ? state.categories.map(function (category) {
          return `
            <article class="pro-store-row">
              <div class="pro-store-row-left">
                <div class="pro-avatar">${(category.name || "C").charAt(0).toUpperCase()}</div>
                <div class="pro-store-row-content">
                  <strong>${category.name || "Categoria"}</strong>
                  <span>${category.description || "Sem descrição"}</span>
                </div>
              </div>
              <div class="pro-store-row-right">
                <span class="pro-status-badge ${category.active === false ? "neutral" : "success"}">
                  ${category.active === false ? "Inativa" : "Ativa"}
                </span>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Nenhuma categoria cadastrada.");
  }

  function renderInventory() {
    document.getElementById("inventory-table").innerHTML = state.products.length
      ? state.products.map(function (product) {
          return `
            <article class="pro-store-row">
              <div class="pro-store-row-left">
                <div class="pro-avatar">${(product.name || "I").charAt(0).toUpperCase()}</div>
                <div class="pro-store-row-content">
                  <strong>${product.name || "Produto"}</strong>
                  <span>Custo: ${formatMoney(product.cost_price || 0)} • Venda: ${formatMoney(product.sale_price || 0)}</span>
                </div>
              </div>
              <div class="pro-store-row-right">
                <span class="pro-status-badge ${Number(product.stock_quantity || 0) <= Number(product.stock_min_quantity || 0) ? "warning" : "success"}">
                  Estoque ${Number(product.stock_quantity || 0)}
                </span>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Sem produtos para controle de estoque.");

    document.getElementById("inventory-movements-list").innerHTML = state.inventoryMovements.length
      ? state.inventoryMovements.slice(0, 8).map(function (movement) {
          return `
            <article class="pro-list-card">
              <div class="pro-list-main">
                <div class="pro-list-content">
                  <strong>${humanizeMovement(movement.movement_type || "movimentação")}</strong>
                  <span>Qtd: ${movement.quantity || 0} • ${formatDate(movement.created_at)}</span>
                </div>
                <span class="pro-status-badge neutral">${formatMoney(movement.total_cost || 0)}</span>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Nenhuma movimentação de estoque encontrada.");
  }

  function renderLockedTables() {
    document.getElementById("tables-table").innerHTML = `
      <div class="locked-feature-card">
        <h3>Recurso indisponível no seu plano</h3>
        <p>O módulo de mesas fica disponível a partir do plano Premium.</p>
      </div>
    `;
  }

  function renderTables() {
    if (!hasFeature("table_qr_code")) {
      renderLockedTables();
      return;
    }

    document.getElementById("tables-table").innerHTML = state.tables.length
      ? state.tables.map(function (table) {
          return `
            <article class="pro-store-row">
              <div class="pro-store-row-left">
                <div class="pro-avatar">M</div>
                <div class="pro-store-row-content">
                  <strong>Mesa ${table.table_number || "—"}</strong>
                  <span>${table.qr_code_url || table.qr_code_value || "QR code não gerado"}</span>
                </div>
              </div>
              <div class="pro-store-row-right">
                <span class="pro-status-badge ${table.active === false ? "neutral" : "success"}">
                  ${table.active === false ? "Inativa" : "Ativa"}
                </span>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Nenhuma mesa cadastrada para a loja.");
  }

  function renderFinance() {
    document.getElementById("finance-revenue").textContent = formatMoney(state.finance.grossRevenue);
    document.getElementById("finance-cost").textContent = formatMoney(state.finance.totalCost);
    document.getElementById("finance-profit-before").textContent = formatMoney(state.finance.profitBefore);
    document.getElementById("finance-profit-after").textContent = formatMoney(state.finance.profitAfter);

    const items = [
      summaryItem("Plano atual", getPlanLabel()),
      summaryItem("Comissão estimada Dooki", formatMoney(state.finance.dookiFee)),
      summaryItem("Marca d’água", state.plan?.watermark_enabled === false ? "Desativada" : "Ativada"),
      summaryItem("Suporte", state.plan?.support_level || "ticket")
    ];

    if (hasFeature("profit_analysis")) {
      items.push(summaryItem("Análise de gastos/ganhos", "Liberada"));
    }

    if (hasFeature("split_bill")) {
      items.push(summaryItem("Divisão de conta", "Liberada"));
    }

    document.getElementById("finance-summary-list").innerHTML = items.join("");
  }

  function renderSupport() {
    document.getElementById("support-tickets-table").innerHTML = state.tickets.length
      ? state.tickets.map(function (ticket) {
          const statusClass = getStatusClass(ticket.status);
          const priorityClass = getPriorityClass(ticket.priority);

          return `
            <article class="pro-support-card">
              <div class="pro-support-main">
                <div class="pro-store-row-content">
                  <strong>${ticket.subject || "Sem assunto"}</strong>
                  <span>${ticket.last_message || "Sem mensagem"} • ${formatDate(ticket.created_at)}</span>
                </div>
                <div class="pro-action-group">
                  <span class="pro-priority-badge ${priorityClass}">${ticket.priority || "Baixa"}</span>
                  <span class="pro-status-badge ${statusClass}">${ticket.status || "aberto"}</span>
                </div>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Nenhum ticket aberto pela loja.");
  }

  function fillSettingsForm() {
    document.getElementById("settings-name").value = state.establishment?.name || "";
    document.getElementById("settings-city").value = state.establishment?.city || "";
    document.getElementById("settings-email").value = state.establishment?.email || "";
    document.getElementById("settings-whatsapp").value = state.establishment?.whatsapp || "";
    document.getElementById("settings-logo-url").value = state.establishment?.logo_url || "";
    document.getElementById("settings-banner-url").value = state.establishment?.banner_url || "";
  }

  function summaryItem(label, value) {
    return `
      <article class="pro-summary-item">
        <span>${label}</span>
        <strong>${value}</strong>
      </article>
    `;
  }

  function emptyState(message) {
    return `
      <div class="pro-empty-state">
        <strong>Nada por aqui ainda</strong>
        <span>${message}</span>
      </div>
    `;
  }

  function humanizeFeature(key) {
    const map = {
      digital_menu: "Cardápio digital",
      delivery_orders: "Pedidos delivery",
      establishment_panel: "Painel do estabelecimento",
      full_dashboard: "Dashboard completo",
      inventory_management: "Gestão de estoque",
      ticket_support: "Suporte via ticket",
      menu_qr_code: "QR do cardápio",
      table_qr_code: "QR por mesa",
      table_ordering: "Pedidos na mesa",
      profit_analysis: "Análise de gastos e ganhos",
      split_bill: "Divisão de conta",
      group_orders: "Pedidos por grupo",
      support_24h: "Suporte 24h",
      custom_packaging: "Embalagens personalizadas",
      table_qr_stands: "Suportes para QR",
      dooki_watermark: "Marca Dooki"
    };

    return map[key] || key;
  }

  function humanizeMovement(type) {
    const map = {
      sale: "Venda",
      purchase: "Compra",
      manual_adjustment: "Ajuste manual",
      waste: "Perda",
      return: "Devolução"
    };

    return map[type] || type;
  }

  function getStatusClass(status) {
    const value = String(status || "").toLowerCase();

    if (["aberto", "open", "ativo"].includes(value)) return "warning";
    if (["resolvido", "fechado", "closed", "done"].includes(value)) return "success";
    if (["em andamento", "andamento", "progress"].includes(value)) return "info";
    return "neutral";
  }

  function getPriorityClass(priority) {
    const value = String(priority || "").toLowerCase();

    if (["crítica", "critica", "alta", "high", "critical"].includes(value)) return "danger";
    if (["média", "media", "medium"].includes(value)) return "warning";
    return "neutral";
  }

  async function handleCreateProduct(event) {
    event.preventDefault();

    const client = getClient();
    const formData = new FormData(event.target);

    const payload = {
      establishment_id: state.membership.establishment_id,
      name: String(formData.get("name") || "").trim(),
      category_id: formData.get("category_id") || null,
      description: String(formData.get("description") || "").trim(),
      sale_price: Number(formData.get("sale_price") || 0),
      cost_price: Number(formData.get("cost_price") || 0),
      stock_quantity: Number(formData.get("stock_quantity") || 0),
      stock_min_quantity: Number(formData.get("stock_min_quantity") || 0),
      active: true
    };

    try {
      const { error } = await client.from("products").insert([payload]);
      if (error) throw error;

      event.target.reset();
      await loadAllData();
      populateCategorySelect();
      renderProducts();
      renderDashboard();
      renderInventory();
      alert("Produto cadastrado com sucesso.");
    } catch (error) {
      console.error("Erro ao cadastrar produto:", error);
      alert(error.message || "Não foi possível cadastrar o produto.");
    }
  }

  async function handleCreateCategory(event) {
    event.preventDefault();

    const client = getClient();
    const formData = new FormData(event.target);

    const payload = {
      establishment_id: state.membership.establishment_id,
      name: String(formData.get("name") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      active: true
    };

    try {
      const { error } = await client.from("categories").insert([payload]);
      if (error) throw error;

      event.target.reset();
      await loadAllData();
      populateCategorySelect();
      renderCategories();
      renderProducts();
      renderDashboard();
      alert("Categoria cadastrada com sucesso.");
    } catch (error) {
      console.error("Erro ao cadastrar categoria:", error);
      alert(error.message || "Não foi possível cadastrar a categoria.");
    }
  }

  async function handleCreateTable(event) {
    event.preventDefault();

    if (!hasFeature("table_qr_code")) {
      alert("Este recurso está disponível a partir do plano Premium.");
      return;
    }

    const client = getClient();
    const formData = new FormData(event.target);

    const payload = {
      establishment_id: state.membership.establishment_id,
      table_number: String(formData.get("table_number") || "").trim(),
      seats: Number(formData.get("seats") || 0) || null,
      qr_code_value: String(formData.get("qr_code_value") || "").trim() || null,
      qr_code_url: String(formData.get("qr_code_url") || "").trim() || null,
      active: true
    };

    try {
      const { error } = await client.from("establishment_tables").insert([payload]);
      if (error) throw error;

      event.target.reset();
      await loadAllData();
      renderTables();
      alert("Mesa cadastrada com sucesso.");
    } catch (error) {
      console.error("Erro ao cadastrar mesa:", error);
      alert(error.message || "Não foi possível cadastrar a mesa.");
    }
  }

  async function handleCreateTicket(event) {
    event.preventDefault();

    const client = getClient();
    const formData = new FormData(event.target);

    const payload = {
      establishment_id: state.membership.establishment_id,
      store_name: state.establishment?.name || "Loja",
      subject: String(formData.get("subject") || "").trim(),
      priority: String(formData.get("priority") || "Baixa"),
      status: "aberto",
      last_message: String(formData.get("message") || "").trim()
    };

    try {
      const { data, error } = await client
        .from("support_tickets")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (data?.id) {
        await client.from("support_ticket_messages").insert([{
          ticket_id: data.id,
          sender_type: "establishment",
          sender_name: state.establishment?.name || "Estabelecimento",
          message: payload.last_message
        }]);
      }

      event.target.reset();
      await loadAllData();
      renderSupport();
      renderDashboard();
      alert("Ticket aberto com sucesso.");
    } catch (error) {
      console.error("Erro ao abrir ticket:", error);
      alert(error.message || "Não foi possível abrir o ticket.");
    }
  }

  async function handleSaveSettings(event) {
    event.preventDefault();

    const client = getClient();
    const formData = new FormData(event.target);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      whatsapp: String(formData.get("whatsapp") || "").trim(),
      logo_url: String(formData.get("logo_url") || "").trim(),
      banner_url: String(formData.get("banner_url") || "").trim()
    };

    try {
      const { error } = await client
        .from("establishments")
        .update(payload)
        .eq("id", state.membership.establishment_id);

      if (error) throw error;

      await loadAllData();
      renderHeader();
      fillSettingsForm();
      alert("Dados do estabelecimento atualizados com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      alert(error.message || "Não foi possível salvar as configurações.");
    }
  }
})();