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
    inventoryMovements: [],
    finance: null
  };

  const screenMeta = {
    dashboard: {
      title: "Central da loja",
      copy: "Tudo o que sua operação precisa no dia a dia, com foco em praticidade."
    },
    orders: {
      title: "Pedidos",
      copy: "Acompanhe, pesquise e atualize o andamento dos pedidos."
    },
    products: {
      title: "Cardápio",
      copy: "Gerencie produtos, preços e disponibilidade."
    },
    categories: {
      title: "Categorias",
      copy: "Organize melhor o cardápio da sua loja."
    },
    inventory: {
      title: "Estoque",
      copy: "Controle quantidades, custos e itens com baixa."
    },
    tables: {
      title: "Mesas",
      copy: "Gestão prática para atendimento por QR code."
    },
    finance: {
      title: "Financeiro",
      copy: "Veja receita, custo, comissão Dooki e lucro estimado."
    },
    support: {
      title: "Suporte",
      copy: "Abra tickets e acompanhe o atendimento da sua loja."
    },
    settings: {
      title: "Configurações",
      copy: "Atualize os principais dados do estabelecimento."
    }
  };

  const PLAN_FEATURES_FALLBACK = {
    standard: [
      "digital_menu",
      "delivery_orders",
      "establishment_panel",
      "full_dashboard",
      "inventory_management",
      "ticket_support",
      "menu_qr_code",
      "dooki_watermark"
    ],
    premium: [
      "digital_menu",
      "delivery_orders",
      "establishment_panel",
      "full_dashboard",
      "inventory_management",
      "ticket_support",
      "menu_qr_code",
      "table_qr_code",
      "table_ordering",
      "profit_analysis",
      "dooki_watermark"
    ],
    enterprise: [
      "digital_menu",
      "delivery_orders",
      "establishment_panel",
      "full_dashboard",
      "inventory_management",
      "ticket_support",
      "menu_qr_code",
      "table_qr_code",
      "table_ordering",
      "profit_analysis",
      "split_bill",
      "group_orders",
      "support_24h",
      "custom_packaging",
      "table_qr_stands"
    ]
  };

  const FEATURE_UPGRADE_RULES = {
    inventory_management: {
      minPlan: "standard",
      label: "Gestão de estoque"
    },
    ticket_support: {
      minPlan: "standard",
      label: "Suporte por ticket"
    },
    table_qr_code: {
      minPlan: "premium",
      label: "QR code por mesa"
    },
    table_ordering: {
      minPlan: "premium",
      label: "Pedidos por mesa"
    },
    profit_analysis: {
      minPlan: "premium",
      label: "Análise de gastos e ganhos"
    },
    split_bill: {
      minPlan: "enterprise",
      label: "Divisão de conta"
    },
    group_orders: {
      minPlan: "enterprise",
      label: "Pedidos interligados por grupo"
    },
    support_24h: {
      minPlan: "enterprise",
      label: "Suporte 24h"
    },
    custom_packaging: {
      minPlan: "enterprise",
      label: "Embalagens personalizadas"
    },
    table_qr_stands: {
      minPlan: "enterprise",
      label: "Suportes físicos de QR"
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
      openScreen("dashboard");
    } catch (error) {
      console.error("Erro ao iniciar painel do estabelecimento:", error);
      alert(error.message || "Não foi possível carregar o painel.");
      window.location.href = "/establishment/establishment-login.html";
    }
  });

  function getClient() {
    if (!window.supabaseClient) {
      throw new Error("Supabase não configurado.");
    }
    return window.supabaseClient;
  }

  function getPlanName() {
    return String(
      state.plan?.plan_name ||
      state.plan?.plan_display_name ||
      state.establishment?.plan ||
      state.establishment?.current_plan_name ||
      "Standard"
    );
  }

  function getPlanKey() {
    return getPlanName().toLowerCase();
  }

  function getPlanLevel(planKey) {
    if (planKey === "standard") return 1;
    if (planKey === "premium") return 2;
    if (planKey === "enterprise") return 3;
    return 0;
  }

  function getPlanLabel() {
    return state.plan?.plan_display_name || state.plan?.plan_name || state.establishment?.plan || "Standard";
  }

  function getCommissionPercent() {
    const raw = state.plan?.commission_percent ?? state.establishment?.current_commission_percent;
    if (raw != null && raw !== "") return Number(raw || 0);

    const planKey = getPlanKey();
    if (planKey === "standard") return 2;
    if (planKey === "premium") return 1.5;
    if (planKey === "enterprise") return 1;
    return 0;
  }

  function hasFeature(featureKey) {
    return state.features.some(function (feature) {
      return feature.feature_key === featureKey && feature.enabled;
    });
  }

  function getUpgradeBadgeText(featureKey) {
    const rule = FEATURE_UPGRADE_RULES[featureKey];
    if (!rule) return "Upgrade";

    if (rule.minPlan === "premium") return "Premium";
    if (rule.minPlan === "enterprise") return "Enterprise";
    return "Upgrade";
  }

  function getUpgradeMessage(featureKey) {
    const rule = FEATURE_UPGRADE_RULES[featureKey];

    if (!rule) {
      return `Faça upgrade do plano para liberar este recurso. Seu plano atual: ${getPlanLabel()}.`;
    }

    const minPlanLabel =
      rule.minPlan === "premium"
        ? "Premium"
        : rule.minPlan === "enterprise"
          ? "Enterprise"
          : "Standard";

    return `${rule.label} disponível a partir do plano ${minPlanLabel}. Seu plano atual: ${getPlanLabel()}.`;
  }

  function ensureLockedTooltip() {
    let tooltip = document.getElementById("locked-tooltip");

    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "locked-tooltip";
      tooltip.className = "locked-tooltip";
      document.body.appendChild(tooltip);
    }

    return tooltip;
  }

  function showLockedTooltip(message, target) {
    const tooltip = ensureLockedTooltip();
    tooltip.textContent = message;

    const rect = target.getBoundingClientRect();
    tooltip.style.left = `${rect.right + 12}px`;
    tooltip.style.top = `${rect.top}px`;
    tooltip.classList.add("visible");
  }

  function hideLockedTooltip() {
    const tooltip = document.getElementById("locked-tooltip");
    if (tooltip) {
      tooltip.classList.remove("visible");
    }
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
    } catch {
      return "—";
    }
  }

  function isWatermarkEnabled() {
    if (state.plan?.watermark_enabled != null) {
      return state.plan.watermark_enabled !== false;
    }
    return getPlanKey() !== "enterprise";
  }

  function bindBaseEvents() {
    const logoutButton = document.getElementById("establishment-logout");
    if (logoutButton) {
      logoutButton.addEventListener("click", async function () {
        try {
          await window.EstablishmentAuth.signOut();
        } catch (error) {
          console.error("Erro ao sair:", error);
        } finally {
          window.location.href = "/establishment/establishment-login.html";
        }
      });
    }

    const toggleButton = document.getElementById("sidebar-toggle");
    if (toggleButton) {
      toggleButton.addEventListener("click", function () {
        document.getElementById("establishment-sidebar")?.classList.toggle("sidebar-open");
      });
    }

    document.querySelectorAll("[data-screen]").forEach(function (button) {
      button.addEventListener("click", function () {
        const featureKey = button.dataset.feature;

        if (featureKey && !hasFeature(featureKey)) {
          showLockedTooltip(getUpgradeMessage(featureKey), button);
          setTimeout(hideLockedTooltip, 2200);
          return;
        }

        openScreen(button.dataset.screen);
      });

      button.addEventListener("mouseenter", function () {
        const featureKey = button.dataset.feature;
        if (featureKey && !hasFeature(featureKey)) {
          showLockedTooltip(getUpgradeMessage(featureKey), button);
        }
      });

      button.addEventListener("mouseleave", function () {
        hideLockedTooltip();
      });
    });

    const productForm = document.getElementById("product-form");
    if (productForm) productForm.addEventListener("submit", handleCreateProduct);

    const categoryForm = document.getElementById("category-form");
    if (categoryForm) categoryForm.addEventListener("submit", handleCreateCategory);

    const supportForm = document.getElementById("support-form");
    if (supportForm) supportForm.addEventListener("submit", handleCreateTicket);

    const settingsForm = document.getElementById("settings-form");
    if (settingsForm) settingsForm.addEventListener("submit", handleSaveSettings);

    const tableForm = document.getElementById("table-form");
    if (tableForm) tableForm.addEventListener("submit", handleCreateTable);

    const ordersSearch = document.getElementById("orders-search");
    if (ordersSearch) {
      ordersSearch.addEventListener("input", function () {
        renderOrders(this.value || "");
      });
    }
  }

  async function bootstrap() {
    await loadAllData();
    renderHeader();
    renderSidebar();
    renderDashboard();
    renderProducts();
    renderCategories();
    renderInventory();
    renderTables();
    renderFinance();
    renderSupport();
    renderMenuPreview();
    fillSettingsForm();
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
    state.features = normalizeFeatures(featuresRes || [], state.establishment, state.plan);
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
      const query = client.from(viewName).select("*").eq(field, value);

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

  function normalizeFeatures(features, establishment, plan) {
    if (features.length) return features;

    const rawPlan = String(
      plan?.plan_name ||
      plan?.plan_display_name ||
      establishment?.plan ||
      establishment?.current_plan_name ||
      "standard"
    ).toLowerCase();

    const fallback = PLAN_FEATURES_FALLBACK[rawPlan] || PLAN_FEATURES_FALLBACK.standard;

    return fallback.map(function (key) {
      return {
        feature_key: key,
        enabled: true,
        limit_value: null
      };
    });
  }

  function computeFinance() {
    const completedOrders = state.orders.filter(function (order) {
      return order.completed_at || ["completed", "delivered"].includes(String(order.status || "").toLowerCase());
    });

    const grossRevenue = completedOrders.reduce(function (acc, order) {
      return acc + Number(order.total_amount || 0);
    }, 0);

    const dookiFee = completedOrders.reduce(function (acc, order) {
      if (order.dooki_commission_amount != null) {
        return acc + Number(order.dooki_commission_amount || 0);
      }
      return acc + (Number(order.total_amount || 0) * getCommissionPercent() / 100);
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

  function renderHeader() {
    const storeName = state.establishment?.name || "Minha Loja";
    const userEmail = state.user?.email || "—";

    const sidebarStoreName = document.getElementById("sidebar-store-name");
    if (sidebarStoreName) sidebarStoreName.textContent = storeName;

    const sidebarUserName = document.getElementById("sidebar-user-name");
    if (sidebarUserName) sidebarUserName.textContent = storeName;

    const sidebarUserEmail = document.getElementById("sidebar-user-email");
    if (sidebarUserEmail) sidebarUserEmail.textContent = userEmail;

    const planPill = document.getElementById("current-plan-pill");
    if (planPill) planPill.textContent = `Plano ${getPlanLabel()}`;

    const watermarkPill = document.getElementById("watermark-pill");
    if (watermarkPill) {
      watermarkPill.textContent = isWatermarkEnabled()
        ? "Com marca Dooki"
        : "Sem marca d’água";
    }

    document.querySelectorAll('[data-establishment-logo]').forEach(function (img) {
      img.src = state.establishment?.logo_url || "/assets/logo-dooki.png";
      img.alt = "Dooki";
    });
  }

  function renderSidebar() {
    document.querySelectorAll("[data-feature]").forEach(function (button) {
      const featureKey = button.dataset.feature;
      const locked = !hasFeature(featureKey);

      button.classList.toggle("locked-nav-item", locked);
      button.classList.toggle("is-locked", locked);

      if (locked) {
        button.setAttribute("title", getUpgradeMessage(featureKey));
        button.setAttribute("data-upgrade-label", getUpgradeBadgeText(featureKey));
      } else {
        button.removeAttribute("title");
        button.removeAttribute("data-upgrade-label");
      }
    });

    populateCategorySelect();
  }

  function populateCategorySelect() {
    const select = document.getElementById("product-category-select");
    if (!select) return;

    select.innerHTML =
      `<option value="">Sem categoria</option>` +
      state.categories.map(function (category) {
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
    const screenTitle = document.getElementById("screen-title");
    const screenCopy = document.getElementById("screen-copy");

    if (screenTitle) screenTitle.textContent = meta.title;
    if (screenCopy) screenCopy.textContent = meta.copy;

    if (screen === "dashboard") renderDashboard();
    if (screen === "orders") renderOrders();
    if (screen === "products") renderProducts();
    if (screen === "categories") renderCategories();

    if (screen === "inventory") {
      const panel = document.querySelector('[data-panel="inventory"]');
      if (!hasFeature("inventory_management")) {
        if (panel) panel.innerHTML = lockedFeatureCard(getUpgradeMessage("inventory_management"));
        return;
      }
      renderInventory();
    }

    if (screen === "tables") {
      const panel = document.querySelector('[data-panel="tables"]');
      if (!hasFeature("table_qr_code")) {
        if (panel) panel.innerHTML = lockedFeatureCard(getUpgradeMessage("table_qr_code"));
        return;
      }
      renderTables();
    }

    if (screen === "finance") {
      const panel = document.querySelector('[data-panel="finance"]');
      if (!hasFeature("profit_analysis") && getPlanKey() === "standard") {
        if (panel) panel.innerHTML = lockedFeatureCard(getUpgradeMessage("profit_analysis"));
        return;
      }
      renderFinance();
    }

    if (screen === "support") {
      const panel = document.querySelector('[data-panel="support"]');
      if (!hasFeature("ticket_support")) {
        if (panel) panel.innerHTML = lockedFeatureCard(getUpgradeMessage("ticket_support"));
        return;
      }
      renderSupport();
    }

    if (screen === "settings") fillSettingsForm();
  }

  function renderMenuPreview() {
    const cover = document.getElementById("menu-preview-cover");
    const logo = document.getElementById("menu-preview-logo");
    const name = document.getElementById("menu-preview-name");
    const description = document.getElementById("menu-preview-description");
    const city = document.getElementById("menu-preview-city");
    const plan = document.getElementById("menu-preview-plan");
    const status = document.getElementById("menu-preview-status");
    const tabs = document.getElementById("menu-preview-tabs");
    const products = document.getElementById("menu-preview-products");
    const summary = document.getElementById("preview-summary-list");
    const previewLink = document.getElementById("menu-preview-link");
    const editButton = document.getElementById("preview-go-products");

    if (!cover || !logo || !name || !description || !tabs || !products) return;

    const storeName = state.establishment?.name || "Minha Loja";
    const storeDescription = state.establishment?.description || "Seu cardápio digital aparecerá aqui para o cliente final.";
    const storeCity = state.establishment?.city || "Cidade";
    const storePlan = getPlanLabel();
    const isOpen = state.establishment?.status ? !["inactive", "disabled", "closed"].includes(String(state.establishment.status).toLowerCase()) : true;
    const activeProducts = state.products.filter(function (product) { return product.active !== false; });
    const orderedCategories = state.categories.slice().sort(function (a, b) {
      return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
    });
    const categoryNames = orderedCategories.slice(0, 4).map(function (category) {
      return category.name || "Categoria";
    });
    const featuredProducts = activeProducts
      .slice()
      .sort(function (a, b) {
        return Number(b.sale_price || 0) - Number(a.sale_price || 0);
      })
      .slice(0, 3);

    cover.style.backgroundImage = state.establishment?.banner_url
      ? `linear-gradient(180deg, rgba(15, 23, 42, 0.10), rgba(15, 23, 42, 0.55)), url("${state.establishment.banner_url}")`
      : "linear-gradient(135deg, #111827, #1f2937 45%, #d4a017 120%)";
    logo.src = state.establishment?.logo_url || "/assets/logo-dooki.png";
    logo.alt = storeName;
    name.textContent = storeName;
    description.textContent = storeDescription;
    city.textContent = storeCity;
    plan.textContent = `Plano ${storePlan}`;
    status.textContent = isOpen ? "Aberto" : "Fechado";
    status.classList.toggle("closed", !isOpen);

    tabs.innerHTML = (categoryNames.length ? categoryNames : ["Destaques", "Cardápio"]).map(function (category, index) {
      return `<span class="${index === 0 ? "active" : ""}">${category}</span>`;
    }).join("");

    products.innerHTML = featuredProducts.length
      ? featuredProducts.map(function (product) {
          const category = state.categories.find(function (item) {
            return item.id === product.category_id;
          });

          return `
            <article class="menu-preview-item">
              <div class="menu-preview-item-main">
                <strong>${product.name || "Produto"}</strong>
                <span>${category?.name || "Sem categoria"}</span>
              </div>
              <strong>${formatMoney(product.sale_price || 0)}</strong>
            </article>
          `;
        }).join("")
      : `<div class="menu-preview-empty">Cadastre produtos para ver sua prévia aqui.</div>`;

    if (summary) {
      summary.innerHTML = [
        summaryItem("Produtos ativos", String(activeProducts.length)),
        summaryItem("Categorias", String(state.categories.length)),
        summaryItem("Mesas cadastradas", String(state.tables.length)),
        summaryItem("Pedidos recebidos", String(state.orders.length))
      ].join("");
    }

    if (previewLink) {
      const slug = state.establishment?.slug || state.establishment?.id || "menu";
      previewLink.href = `/menu/menu.html?store=${encodeURIComponent(slug)}`;
    }

    if (editButton && !editButton.dataset.bound) {
      editButton.dataset.bound = "true";
      editButton.addEventListener("click", function () {
        openScreen("products");
      });
    }
  }

  function renderDashboard() {
    const completedOrdersEl = document.getElementById("kpi-orders-completed");
    if (completedOrdersEl) completedOrdersEl.textContent = String(state.finance.completedOrders);

    const grossRevenueEl = document.getElementById("kpi-gross-revenue");
    if (grossRevenueEl) grossRevenueEl.textContent = formatMoney(state.finance.grossRevenue);

    const dookiFeeEl = document.getElementById("kpi-dooki-fee");
    if (dookiFeeEl) dookiFeeEl.textContent = formatMoney(state.finance.dookiFee);

    const productsActiveEl = document.getElementById("kpi-products-active");
    if (productsActiveEl) {
      productsActiveEl.textContent = String(
        state.products.filter(function (product) { return product.active !== false; }).length
      );
    }

    const quickActionsGrid = document.getElementById("quick-actions-grid");
    if (quickActionsGrid) {
      quickActionsGrid.innerHTML = [
        quickActionButton("Novo produto", "products", true),
        quickActionButton("Nova categoria", "categories", true),
        quickActionButton("Ver pedidos", "orders", true),
        quickActionButton("Abrir suporte", "support", hasFeature("ticket_support")),
        quickActionButton("Gerenciar mesas", "tables", hasFeature("table_qr_code")),
        quickActionButton("Financeiro", "finance", true)
      ].join("");
    }

    const featureList = document.getElementById("dashboard-feature-list");
    if (featureList) {
      featureList.innerHTML = state.features.length
  ? state.features
      .filter(function (feature) {
        if (!feature.enabled) return false;

        if (feature.feature_key === "dooki_watermark") {
          return getPlanKey() === "enterprise";
        }

        return true;
      })
      .map(function (feature) {
        return `
          <article class="pro-list-card">
            <div class="pro-list-main">
              <div class="pro-list-content">
                <strong>${humanizeFeature(feature.feature_key)}</strong>
                <span>Liberado no plano ${getPlanLabel()}.</span>
              </div>
              <span class="pro-status-badge success">Ativo</span>
            </div>
          </article>
        `;
      }).join("")
  : emptyState("Nenhum recurso ativo encontrado.");
    }

    const recentOrders = document.getElementById("dashboard-recent-orders");
    if (recentOrders) {
      recentOrders.innerHTML = state.orders.length
        ? state.orders.slice(0, 6).map(function (order) {
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
                  <span class="pro-status-badge ${getOrderStatusClass(order.status)}">${order.status || "pendente"}</span>
                  <strong>${formatMoney(order.total_amount || 0)}</strong>
                </div>
              </article>
            `;
          }).join("")
        : emptyState("Nenhum pedido cadastrado ainda.");
    }

    const summaryList = document.getElementById("dashboard-summary-list");
    if (summaryList) {
      summaryList.innerHTML = [
        summaryItem("Cidade", state.establishment?.city || "—"),
        summaryItem("Pedidos cadastrados", String(state.orders.length)),
        summaryItem("Categorias", String(state.categories.length)),
        summaryItem("Tickets abertos", String(
          state.tickets.filter(function (ticket) {
            return !["fechado", "resolvido", "closed"].includes(String(ticket.status || "").toLowerCase());
          }).length
        ))
      ].join("");
    }

    const lowStock = state.products.filter(function (product) {
      return product.track_inventory !== false &&
        Number(product.stock_quantity || 0) <= Number(product.stock_min_quantity || 0);
    });

    const lowStockContainer = document.getElementById("dashboard-low-stock");
    if (lowStockContainer) {
      lowStockContainer.innerHTML = lowStock.length
        ? lowStock.slice(0, 6).map(function (product) {
            return `
              <article class="pro-list-card">
                <div class="pro-list-main">
                  <div class="pro-list-content">
                    <strong>${product.name || "Produto"}</strong>
                    <span>Atual: ${Number(product.stock_quantity || 0)} • mínimo: ${Number(product.stock_min_quantity || 0)}</span>
                  </div>
                  <span class="pro-status-badge warning">Baixo</span>
                </div>
              </article>
            `;
          }).join("")
        : emptyState("Nenhum item com estoque baixo.");
    }

    const planSummary = document.getElementById("dashboard-plan-summary");
    if (planSummary) {
      planSummary.innerHTML = [
        summaryItem("Plano atual", getPlanLabel()),
        summaryItem("Comissão da plataforma", `${String(getCommissionPercent()).replace(".", ",")}%`),
        summaryItem("Marca d’água", isWatermarkEnabled() ? "Ativada" : "Desativada"),
        summaryItem("Suporte", hasFeature("support_24h") ? "24h" : "Ticket")
      ].join("");
    }
  }

  function renderOrders(searchTerm) {
    const table = document.getElementById("orders-table");
    if (!table) return;

    const term = String(searchTerm || "").trim().toLowerCase();

    const filteredOrders = state.orders.filter(function (order) {
      if (!term) return true;

      const haystack = [
        order.id,
        order.customer_name,
        order.status,
        order.customer_phone
      ].join(" ").toLowerCase();

      return haystack.includes(term);
    });

    const pending = filteredOrders.filter(o => ["pending", "pendente"].includes(String(o.status).toLowerCase())).length;
    const preparing = filteredOrders.filter(o => ["preparing", "confirmed"].includes(String(o.status).toLowerCase())).length;
    const completed = filteredOrders.filter(o => ["completed", "delivered"].includes(String(o.status).toLowerCase())).length;

    const summaryHTML = `
      <div class="orders-summary">
        <div class="orders-summary-card warning">
          <strong>${pending}</strong>
          <span>Pendentes</span>
        </div>
        <div class="orders-summary-card info">
          <strong>${preparing}</strong>
          <span>Em preparo</span>
        </div>
        <div class="orders-summary-card success">
          <strong>${completed}</strong>
          <span>Concluídos</span>
        </div>
      </div>
    `;

    const listHTML = filteredOrders.length
      ? filteredOrders.map(function (order) {
          const status = String(order.status || "pendente").toLowerCase();

          return `
            <article class="order-card">
              <div class="order-left">
                <div class="order-avatar">#</div>

                <div class="order-content">
                  <strong>Pedido #${String(order.id).slice(0, 8)}</strong>
                  <span>${order.customer_name || "Cliente"} • ${formatDate(order.created_at)}</span>
                  <span class="order-price">${formatMoney(order.total_amount || 0)}</span>
                </div>
              </div>

              <div class="order-right">
                <span class="order-status ${getOrderStatusClass(status)}">
                  ${status}
                </span>

                <div class="order-actions">
                  ${status === "pending" ? `
                    <button class="primary-button small"
                      onclick="window.EstablishmentPanel.updateOrderStatus('${order.id}','confirmed')">
                      Confirmar
                    </button>
                  ` : ""}

                  ${["confirmed", "preparing"].includes(status) ? `
                    <button class="ghost-button small"
                      onclick="window.EstablishmentPanel.updateOrderStatus('${order.id}','preparing')">
                      Preparar
                    </button>
                  ` : ""}

                  ${status !== "completed" ? `
                    <button class="ghost-button small success"
                      onclick="window.EstablishmentPanel.updateOrderStatus('${order.id}','completed')">
                      Concluir
                    </button>
                  ` : ""}
                </div>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Nenhum pedido encontrado.");

    table.innerHTML = summaryHTML + `<div class="orders-list">${listHTML}</div>`;
  }

 function renderProducts() {
  const table = document.getElementById("products-table");
  if (!table) return;

  const products = [...state.products].sort(function (a, b) {
    return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
  });

  table.innerHTML = products.length
    ? products.map(function (product) {
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

              <div class="pro-action-group">
                <button
                  type="button"
                  class="ghost-button small"
                  onclick="window.EstablishmentPanel.editProduct('${product.id}')"
                >
                  Editar
                </button>

                <button
                  type="button"
                  class="ghost-button small danger"
                  onclick="window.EstablishmentPanel.deleteProduct('${product.id}')"
                >
                  Excluir
                </button>
              </div>
            </div>
          </article>
        `;
      }).join("")
    : emptyState("Nenhum produto cadastrado.");
}

function renderCategories() {
  const table = document.getElementById("categories-table");
  if (!table) return;

  const categories = [...state.categories].sort(function (a, b) {
    return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
  });

  table.innerHTML = categories.length
    ? categories.map(function (category) {
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

              <div class="pro-action-group">
                <button
                  type="button"
                  class="ghost-button small"
                  onclick="window.EstablishmentPanel.editCategory('${category.id}')"
                >
                  Editar
                </button>

                <button
                  type="button"
                  class="ghost-button small danger"
                  onclick="window.EstablishmentPanel.deleteCategory('${category.id}')"
                >
                  Excluir
                </button>
              </div>
            </div>
          </article>
        `;
      }).join("")
    : emptyState("Nenhuma categoria cadastrada.");
}

  function renderInventory() {
    const inventoryTable = document.getElementById("inventory-table");
    const movementsList = document.getElementById("inventory-movements-list");
    if (!inventoryTable || !movementsList) return;

    if (!hasFeature("inventory_management")) {
      inventoryTable.innerHTML = lockedFeatureCard("Este recurso faz parte do plano Standard e superiores.");
      movementsList.innerHTML = "";
      return;
    }

    inventoryTable.innerHTML = state.products.length
      ? state.products.map(function (product) {
          const low = Number(product.stock_quantity || 0) <= Number(product.stock_min_quantity || 0);

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
                <span class="pro-status-badge ${low ? "warning" : "success"}">
                  Estoque ${Number(product.stock_quantity || 0)}
                </span>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Sem produtos para controle de estoque.");

    movementsList.innerHTML = state.inventoryMovements.length
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

  function renderTables() {
    const tablesTable = document.getElementById("tables-table");
    if (!tablesTable) return;

    if (!hasFeature("table_qr_code")) {
      tablesTable.innerHTML = lockedFeatureCard("O módulo de mesas fica disponível a partir do plano Premium.");
      return;
    }

    tablesTable.innerHTML = state.tables.length
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
    const revenue = document.getElementById("finance-revenue");
    const cost = document.getElementById("finance-cost");
    const profitBefore = document.getElementById("finance-profit-before");
    const profitAfter = document.getElementById("finance-profit-after");
    const summary = document.getElementById("finance-summary-list");

    if (revenue) revenue.textContent = formatMoney(state.finance.grossRevenue);
    if (cost) cost.textContent = formatMoney(state.finance.totalCost);
    if (profitBefore) profitBefore.textContent = formatMoney(state.finance.profitBefore);
    if (profitAfter) profitAfter.textContent = formatMoney(state.finance.profitAfter);

    if (summary) {
      const items = [
        summaryItem("Plano atual", getPlanLabel()),
        summaryItem("Comissão Dooki", `${String(getCommissionPercent()).replace(".", ",")}%`),
        summaryItem("Marca d’água", isWatermarkEnabled() ? "Com Dooki" : "Sem marca"),
        summaryItem("Suporte", hasFeature("support_24h") ? "24h" : "Ticket padrão")
      ];

      if (hasFeature("profit_analysis")) {
        items.push(summaryItem("Análise de gastos/ganhos", "Liberada"));
      }

      if (hasFeature("split_bill")) {
        items.push(summaryItem("Divisão de conta", "Liberada"));
      }

      if (hasFeature("custom_packaging")) {
        items.push(summaryItem("Embalagens Dooki", "Incluídas"));
      }

      summary.innerHTML = items.join("");
    }
  }

  function renderSupport() {
    const table = document.getElementById("support-tickets-table");
    if (!table) return;

    if (!hasFeature("ticket_support")) {
      table.innerHTML = lockedFeatureCard("O suporte por ticket não está disponível para este plano.");
      return;
    }

    table.innerHTML = state.tickets.length
      ? state.tickets.map(function (ticket) {
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
                  <span class="pro-status-badge ${getTicketStatusClass(ticket.status)}">${ticket.status || "aberto"}</span>
                </div>
              </div>
            </article>
          `;
        }).join("")
      : emptyState("Nenhum ticket aberto pela loja.");
  }

  function fillSettingsForm() {
    const settingsName = document.getElementById("settings-name");
    const settingsCity = document.getElementById("settings-city");
    const settingsEmail = document.getElementById("settings-email");
    const settingsWhatsapp = document.getElementById("settings-whatsapp");
    const settingsLogoUrl = document.getElementById("settings-logo-url");
    const settingsBannerUrl = document.getElementById("settings-banner-url");

    if (settingsName) settingsName.value = state.establishment?.name || "";
    if (settingsCity) settingsCity.value = state.establishment?.city || "";
    if (settingsEmail) settingsEmail.value = state.establishment?.email || "";
    if (settingsWhatsapp) settingsWhatsapp.value = state.establishment?.whatsapp || "";
    if (settingsLogoUrl) settingsLogoUrl.value = state.establishment?.logo_url || "";
    if (settingsBannerUrl) settingsBannerUrl.value = state.establishment?.banner_url || "";
  }

  function quickActionButton(label, screen, enabled) {
    return `
      <button class="quick-action-card ${enabled ? "" : "locked"}" type="button" onclick="window.EstablishmentPanel.goTo('${screen}')">
        <strong>${label}</strong>
        <span>${enabled ? "Abrir módulo" : "Disponível em outro plano"}</span>
      </button>
    `;
  }

  function summaryItem(label, value) {
    return `
      <div class="pro-summary-item">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
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

  function lockedFeatureCard(message) {
    return `
      <div class="locked-feature-card">
        <h3>Recurso indisponível no seu plano</h3>
        <p>${message}</p>
      </div>
    `;
  }

  function humanizeFeature(key) {
    const map = {
    digital_menu: "Cardápio digital",
    delivery_orders: "Pedidos por delivery",
    establishment_panel: "Painel do estabelecimento",
    full_dashboard: "Dashboard completo",
    inventory_management: "Gestão de estoque",
    ticket_support: "Suporte por ticket",
    menu_qr_code: "QR do cardápio",
    table_qr_code: "QR por mesa",
    table_ordering: "Pedidos na mesa",
    profit_analysis: "Análise de gastos e ganhos",
    split_bill: "Divisão de conta",
    group_orders: "Pedidos interligados por grupo",
    support_24h: "Suporte 24h",
    custom_packaging: "Embalagens personalizadas",
    table_qr_stands: "Suportes físicos QR",
    dooki_watermark: "Remoção da marca d’água da Dooki"
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

  function getOrderStatusClass(status) {
    const value = String(status || "").toLowerCase();
    if (["completed", "delivered"].includes(value)) return "success";
    if (["preparing", "confirmed"].includes(value)) return "info";
    if (["pending", "pendente"].includes(value)) return "warning";
    return "neutral";
  }

  function getTicketStatusClass(status) {
    const value = String(status || "").toLowerCase();
    if (["aberto", "open"].includes(value)) return "warning";
    if (["resolvido", "fechado", "closed"].includes(value)) return "success";
    if (["andamento", "em andamento", "progress"].includes(value)) return "info";
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
  const form = event.target;
  const formData = new FormData(form);
  const editingId = form.dataset.editingId || null;

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

  if (!payload.name) {
    alert("Informe o nome do produto.");
    return;
  }

  try {
    let error = null;

    if (editingId) {
      const response = await client
        .from("products")
        .update({
          name: payload.name,
          category_id: payload.category_id,
          description: payload.description,
          sale_price: payload.sale_price,
          cost_price: payload.cost_price,
          stock_quantity: payload.stock_quantity,
          stock_min_quantity: payload.stock_min_quantity
        })
        .eq("id", editingId)
        .eq("establishment_id", state.membership.establishment_id);

      error = response.error || null;
    } else {
      const response = await client
        .from("products")
        .insert([payload])
        .select();

      error = response.error || null;

      if (!error && response.data?.length) {
        state.products = [response.data[0], ...state.products];
      }
    }

    if (error) {
      throw error;
    }

    form.reset();
    delete form.dataset.editingId;
    resetProductFormMode();

    await loadAllData();
    populateCategorySelect();
    renderProducts();
    renderDashboard();
    renderInventory();
    renderMenuPreview();

    alert(editingId ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.");
  } catch (error) {
    console.error("Erro ao salvar produto:", error);
    alert(error.message || "Não foi possível salvar o produto.");
  }
}

function resetProductFormMode() {
  const form = document.getElementById("product-form");
  if (!form) return;

  delete form.dataset.editingId;

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "Cadastrar produto";
  }

  const cancelButton = document.getElementById("product-cancel-edit");
  if (cancelButton) {
    cancelButton.remove();
  }
}

function ensureProductCancelButton() {
  const form = document.getElementById("product-form");
  if (!form) return null;

  let cancelButton = document.getElementById("product-cancel-edit");
  if (cancelButton) return cancelButton;

  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) return null;

  cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.id = "product-cancel-edit";
  cancelButton.className = "ghost-button";
  cancelButton.textContent = "Cancelar edição";
  cancelButton.style.marginTop = "12px";

  cancelButton.addEventListener("click", function () {
    form.reset();
    resetProductFormMode();
  });

  submitButton.insertAdjacentElement("afterend", cancelButton);
  return cancelButton;
}

function editProduct(productId) {
  const product = state.products.find(function (item) {
    return item.id === productId;
  });

  if (!product) {
    alert("Produto não encontrado.");
    return;
  }

  const form = document.getElementById("product-form");
  if (!form) return;

  const nameInput = form.querySelector('[name="name"]');
  const categoryInput = form.querySelector('[name="category_id"]');
  const salePriceInput = form.querySelector('[name="sale_price"]');
  const costPriceInput = form.querySelector('[name="cost_price"]');
  const stockQuantityInput = form.querySelector('[name="stock_quantity"]');
  const stockMinQuantityInput = form.querySelector('[name="stock_min_quantity"]');
  const descriptionInput = form.querySelector('[name="description"]');
  const submitButton = form.querySelector('button[type="submit"]');

  if (nameInput) nameInput.value = product.name || "";
  if (categoryInput) categoryInput.value = product.category_id || "";
  if (salePriceInput) salePriceInput.value = product.sale_price ?? 0;
  if (costPriceInput) costPriceInput.value = product.cost_price ?? 0;
  if (stockQuantityInput) stockQuantityInput.value = product.stock_quantity ?? 0;
  if (stockMinQuantityInput) stockMinQuantityInput.value = product.stock_min_quantity ?? 0;
  if (descriptionInput) descriptionInput.value = product.description || "";

  form.dataset.editingId = product.id;

  if (submitButton) {
    submitButton.textContent = "Salvar produto";
  }

  ensureProductCancelButton();
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteProduct(productId) {
  const product = state.products.find(function (item) {
    return item.id === productId;
  });

  if (!product) {
    alert("Produto não encontrado.");
    return;
  }

  const confirmed = window.confirm(`Deseja excluir o produto "${product.name}"?`);
  if (!confirmed) return;

  const client = getClient();

  try {
    const { error } = await client
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("establishment_id", state.membership.establishment_id);

    if (error) throw error;

    state.products = state.products.filter(function (item) {
      return item.id !== productId;
    });

    await loadAllData();
    populateCategorySelect();
    renderProducts();
    renderDashboard();
    renderInventory();
    renderMenuPreview();
    resetProductFormMode();

    alert("Produto excluído com sucesso.");
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    alert(error.message || "Não foi possível excluir o produto.");
  }
}

 async function handleCreateCategory(event) {
  event.preventDefault();

  const client = getClient();
  const form = event.target;
  const formData = new FormData(form);

  const editingId = form.dataset.editingId || null;

  const payload = {
    establishment_id: state.membership.establishment_id,
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    active: true
  };

  if (!payload.name) {
    alert("Informe o nome da categoria.");
    return;
  }

  try {
    let error = null;

    if (editingId) {
      const response = await client
        .from("categories")
        .update({
          name: payload.name,
          description: payload.description
        })
        .eq("id", editingId)
        .eq("establishment_id", state.membership.establishment_id);

      error = response.error || null;
    } else {
      const response = await client
        .from("categories")
        .insert([payload])
        .select();

      error = response.error || null;

      if (!error && response.data?.length) {
        state.categories = [response.data[0], ...state.categories];
      }
    }

    if (error) {
      if (error.message && error.message.includes("categories_establishment_id_name_key")) {
        throw new Error("Já existe uma categoria com esse nome na sua loja.");
      }
      throw error;
    }

    form.reset();
    delete form.dataset.editingId;
    resetCategoryFormMode();

    await loadAllData();
    populateCategorySelect();
    renderCategories();
    renderProducts();
    renderDashboard();
    renderMenuPreview();

    alert(editingId ? "Categoria atualizada com sucesso." : "Categoria cadastrada com sucesso.");
  } catch (error) {
    console.error("Erro ao salvar categoria:", error);
    alert(error.message || "Não foi possível salvar a categoria.");
  }
}

function resetCategoryFormMode() {
  const form = document.getElementById("category-form");
  if (!form) return;

  delete form.dataset.editingId;

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "Cadastrar categoria";
  }

  let cancelButton = document.getElementById("category-cancel-edit");
  if (cancelButton) {
    cancelButton.remove();
  }
}

function ensureCategoryCancelButton() {
  const form = document.getElementById("category-form");
  if (!form) return;

  let cancelButton = document.getElementById("category-cancel-edit");
  if (cancelButton) return cancelButton;

  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) return null;

  cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.id = "category-cancel-edit";
  cancelButton.className = "ghost-button";
  cancelButton.textContent = "Cancelar edição";
  cancelButton.style.marginTop = "12px";

  cancelButton.addEventListener("click", function () {
    form.reset();
    resetCategoryFormMode();
  });

  submitButton.insertAdjacentElement("afterend", cancelButton);
  return cancelButton;
}

function editCategory(categoryId) {
  const category = state.categories.find(function (item) {
    return item.id === categoryId;
  });

  if (!category) {
    alert("Categoria não encontrada.");
    return;
  }

  const form = document.getElementById("category-form");
  if (!form) return;

  const nameInput = form.querySelector('[name="name"]');
  const descriptionInput = form.querySelector('[name="description"]');
  const submitButton = form.querySelector('button[type="submit"]');

  if (nameInput) nameInput.value = category.name || "";
  if (descriptionInput) descriptionInput.value = category.description || "";

  form.dataset.editingId = category.id;

  if (submitButton) {
    submitButton.textContent = "Salvar categoria";
  }

  ensureCategoryCancelButton();
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteCategory(categoryId) {
  const category = state.categories.find(function (item) {
    return item.id === categoryId;
  });

  if (!category) {
    alert("Categoria não encontrada.");
    return;
  }

  const confirmed = window.confirm(`Deseja excluir a categoria "${category.name}"?`);
  if (!confirmed) return;

  const client = getClient();

  try {
    const { error } = await client
      .from("categories")
      .delete()
      .eq("id", categoryId)
      .eq("establishment_id", state.membership.establishment_id);

    if (error) throw error;

    state.categories = state.categories.filter(function (item) {
      return item.id !== categoryId;
    });

    await loadAllData();
    populateCategorySelect();
    renderCategories();
    renderProducts();
    renderDashboard();
    renderMenuPreview();
    resetCategoryFormMode();

    alert("Categoria excluída com sucesso.");
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    alert(error.message || "Não foi possível excluir a categoria.");
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
      renderMenuPreview();
      fillSettingsForm();
      alert("Dados do estabelecimento atualizados com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      alert(error.message || "Não foi possível salvar as configurações.");
    }
  }

  async function updateOrderStatus(orderId, status) {
    const client = getClient();
    const payload = { status: status };

    if (status === "completed") {
      payload.completed_at = new Date().toISOString();
    }

    try {
      const { error } = await client
        .from("orders")
        .update(payload)
        .eq("id", orderId)
        .eq("establishment_id", state.membership.establishment_id);

      if (error) throw error;

      await loadAllData();
      const ordersSearch = document.getElementById("orders-search");
      renderOrders(ordersSearch ? ordersSearch.value || "" : "");
      renderDashboard();
      renderFinance();
      alert("Status do pedido atualizado.");
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      alert(error.message || "Não foi possível atualizar o pedido.");
    }
  }

  function goTo(screen) {
    openScreen(screen);
  }

  window.EstablishmentPanel = {
  goTo,
  updateOrderStatus,
  editCategory,
  deleteCategory,
  editProduct,
  deleteProduct
};
})();