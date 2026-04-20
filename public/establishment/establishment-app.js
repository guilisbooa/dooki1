(function () {
  'use strict';

  /* ==========================================================
     STATE
  ========================================================== */
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
    finance: null,
    activeProductCat: 'all',
    activePreviewCat: ''
  };

  const screenMeta = {
    dashboard: { kicker: 'Painel', title: 'Central da loja', desc: 'Tudo o que sua operação precisa no dia a dia.' },
    orders: { kicker: 'Operação', title: 'Pedidos', desc: 'Acompanhe, pesquise e atualize os pedidos.' },
    products: { kicker: 'Cardápio', title: 'Produtos', desc: 'Gerencie produtos, preços e disponibilidade.' },
    categories: { kicker: 'Organização', title: 'Categorias', desc: 'Organize melhor o cardápio.' },
    inventory: { kicker: 'Controle', title: 'Inventário', desc: 'Controle quantidades, custos e itens com baixa.' },
    tables: { kicker: 'Atendimento', title: 'Mesas e QR Codes', desc: 'Gestão prática por QR code.' },
    finance: { kicker: 'Gestão', title: 'Financeiro', desc: 'Receita, custo, comissão Dooki e lucro.' },
    support: { kicker: 'Atendimento', title: 'Suporte', desc: 'Abra tickets e acompanhe atendimentos.' },
    settings: { kicker: 'Configurações', title: 'Dados do estabelecimento', desc: 'Atualize as informações da sua loja.' }
  };

  const PLAN_FEATURES_FALLBACK = {
    standard: ['digital_menu','delivery_orders','establishment_panel','full_dashboard','inventory_management','ticket_support','menu_qr_code','dooki_watermark'],
    premium: ['digital_menu','delivery_orders','establishment_panel','full_dashboard','inventory_management','ticket_support','menu_qr_code','table_qr_code','table_ordering','profit_analysis','dooki_watermark'],
    enterprise: ['digital_menu','delivery_orders','establishment_panel','full_dashboard','inventory_management','ticket_support','menu_qr_code','table_qr_code','table_ordering','profit_analysis','split_bill','group_orders','support_24h','custom_packaging','table_qr_stands']
  };

  /* ==========================================================
     TOAST SYSTEM (replaces alert())
  ========================================================== */
  function toast(msg, type = 'success', duration = 3800) {
    const region = document.getElementById('toast-region');
    if (!region) { console.log(msg); return; }

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <div class="toast-icon">${icons[type] || '•'}</div>
      <span class="toast-msg">${msg}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </button>
    `;
    region.appendChild(el);

    setTimeout(() => {
      el.classList.add('hiding');
      el.addEventListener('animationend', () => el.remove());
    }, duration);
  }

  /* ==========================================================
     HELPERS
  ========================================================== */
  function getClient() {
    if (!window.supabaseClient) throw new Error('Supabase não configurado.');
    return window.supabaseClient;
  }

  function fmt(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
  }

  function fmtDate(value) {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch { return '—'; }
  }

  function getPlanKey() {
    return String(state.plan?.plan_name || state.establishment?.plan || 'standard').toLowerCase();
  }

  function getPlanLabel() {
    return state.plan?.plan_display_name || state.plan?.plan_name || state.establishment?.plan || 'Standard';
  }

  function getCommissionPercent() {
    const raw = state.plan?.commission_percent ?? state.establishment?.current_commission_percent;
    if (raw != null) return Number(raw);
    const k = getPlanKey();
    if (k === 'premium') return 1.5;
    if (k === 'enterprise') return 1;
    return 2;
  }

  function hasFeature(key) {
    return state.features.some(f => f.feature_key === key && f.enabled);
  }

  function getProductPrice(p) {
    return Number(p?.sale_price ?? p?.price ?? p?.unit_price ?? 0);
  }

  function isProductActive(p) {
    if (p?.active != null) return p.active !== false;
    if (p?.is_active != null) return p.is_active !== false;
    return true;
  }

  function emptyState(msg) {
    return `<div class="empty-state"><span class="empty-icon">📭</span><strong>Nada por aqui</strong><span>${msg}</span></div>`;
  }

  function lockedCard(msg) {
    return `<div class="locked-card"><span class="locked-icon">🔒</span><h3>Recurso bloqueado</h3><p>${msg}</p></div>`;
  }

  function summaryRow(label, value) {
    return `
      <div class="list-row">
        <div class="list-info">
          <span class="list-sub">${label}</span>
        </div>
        <div class="list-right">
          <strong style="font-size:0.9rem;color:var(--text)">${value}</strong>
        </div>
      </div>
    `;
  }

  function orderStatusClass(s) {
    const v = String(s || '').toLowerCase();
    if (['completed','delivered','concluído'].includes(v)) return 'badge-success';
    if (['preparing','confirmed','em preparo'].includes(v)) return 'badge-info';
    if (['pending','pendente'].includes(v)) return 'badge-warning';
    return 'badge-neutral';
  }

  function ticketStatusClass(s) {
    const v = String(s || '').toLowerCase();
    if (['aberto','open'].includes(v)) return 'badge-warning';
    if (['resolvido','fechado','closed'].includes(v)) return 'badge-success';
    if (['andamento','em andamento'].includes(v)) return 'badge-info';
    return 'badge-neutral';
  }

  function priorityClass(p) {
    const v = String(p || '').toLowerCase();
    if (['crítica','critica','alta','high','critical'].includes(v)) return 'badge-danger';
    if (['média','media','medium'].includes(v)) return 'badge-warning';
    return 'badge-neutral';
  }

  function humanizeFeature(key) {
    const map = {
      digital_menu:'Cardápio digital', delivery_orders:'Pedidos por delivery',
      establishment_panel:'Painel do estabelecimento', full_dashboard:'Dashboard completo',
      inventory_management:'Gestão de estoque', ticket_support:'Suporte por ticket',
      menu_qr_code:'QR do cardápio', table_qr_code:'QR por mesa',
      table_ordering:'Pedidos na mesa', profit_analysis:'Análise de ganhos',
      split_bill:'Divisão de conta', group_orders:'Pedidos em grupo',
      support_24h:'Suporte 24h', custom_packaging:'Embalagens personalizadas',
      table_qr_stands:'Suportes físicos QR', dooki_watermark:'Sem marca Dooki'
    };
    return map[key] || key;
  }

  /* ==========================================================
     LOCKED NAV TOOLTIP
  ========================================================== */
  function showLockedTip(msg, target) {
    const tip = document.getElementById('locked-tooltip');
    if (!tip) return;
    tip.textContent = msg;
    const rect = target.getBoundingClientRect();
    tip.style.top = `${rect.top}px`;
    tip.classList.add('visible');
  }
  function hideTip() {
    document.getElementById('locked-tooltip')?.classList.remove('visible');
  }

  /* ==========================================================
     BOOTSTRAP
  ========================================================== */
  document.addEventListener('DOMContentLoaded', async function () {
    try {
      const ctx = await window.EstablishmentAuth.requireAuth();
      if (!ctx) return;
      state.user = ctx.user;
      state.membership = ctx.membership;

      bindEvents();
      await loadAllData();
      renderAll();
      openScreen('dashboard');
    } catch (err) {
      console.error('Erro ao iniciar painel:', err);
      toast(err.message || 'Não foi possível carregar o painel.', 'error');
      setTimeout(() => { window.location.href = '/establishment/establishment-login.html'; }, 2000);
    }
  });

  async function loadAllData() {
    const client = getClient();
    const eid = state.membership.establishment_id;

    const [estRes, planRes, featRes, ordersRes, productsRes, catsRes, ticketsRes, tablesRes, movementsRes] = await Promise.all([
      client.from('establishments').select('*').eq('id', eid).single(),
      safeActivePlan(eid),
      safeView('v_establishment_features', 'establishment_id', eid, false),
      safeTable('orders', eid),
      safeTable('products', eid),
      safeTable('categories', eid),
      safeTable('support_tickets', eid),
      safeTable('establishment_tables', eid),
      safeTable('inventory_movements', eid)
    ]);

    if (estRes.error) throw estRes.error;
    state.establishment = estRes.data;
    state.plan = planRes || derivePlan(state.establishment);
    state.features = normalizeFeatures(featRes || [], state.establishment, state.plan);
    state.orders = ordersRes || [];
    state.products = productsRes || [];
    state.categories = catsRes || [];
    state.tickets = ticketsRes || [];
    state.tables = tablesRes || [];
    state.inventoryMovements = movementsRes || [];
    state.finance = computeFinance();
  }

  async function safeActivePlan(eid) {
    const client = getClient();
    try {
      const { data, error } = await client
        .from('establishment_subscriptions')
        .select('*,plans(id,name,commission_percent,watermark_enabled,support_level)')
        .eq('establishment_id', eid).eq('status', 'active')
        .order('started_at', { ascending: false }).limit(1).maybeSingle();
      if (error || !data) return null;
      return {
        plan_id: data.plan_id,
        plan_name: data.plans?.name || null,
        plan_display_name: data.plans?.name || null,
        commission_percent: data.commission_percent_snapshot ?? data.plans?.commission_percent ?? 0,
        watermark_enabled: data.watermark_enabled_snapshot ?? data.plans?.watermark_enabled ?? true,
        status: data.status, started_at: data.started_at, expires_at: data.expires_at
      };
    } catch { return null; }
  }

  function derivePlan(est) {
    if (!est) return null;
    const name = est.plan_name || est.current_plan_name || est.plan;
    if (!name) return null;
    return { plan_name: name, plan_display_name: name, commission_percent: est.current_commission_percent ?? 0, watermark_enabled: est.watermark_enabled ?? true };
  }

  async function safeTable(tableName, eid) {
    const client = getClient();
    try {
      const { data, error } = await client.from(tableName).select('*').eq('establishment_id', eid).order('created_at', { ascending: false });
      if (error) { console.warn(`${tableName}:`, error.message); return []; }
      return data || [];
    } catch { return []; }
  }

  async function safeView(viewName, field, value, single) {
    const client = getClient();
    try {
      const query = client.from(viewName).select('*').eq(field, value);
      if (single) {
        const { data, error } = await query.maybeSingle();
        return error ? null : (data || null);
      }
      const { data, error } = await query;
      return error ? [] : (data || []);
    } catch { return single ? null : []; }
  }

  function normalizeFeatures(features, est, plan) {
    if (features.length) return features;
    const k = String(plan?.plan_name || est?.plan || 'standard').toLowerCase();
    const fallback = PLAN_FEATURES_FALLBACK[k] || PLAN_FEATURES_FALLBACK.standard;
    return fallback.map(key => ({ feature_key: key, enabled: true }));
  }

  function computeFinance() {
    const done = state.orders.filter(o => o.completed_at || ['completed','delivered'].includes(String(o.status||'').toLowerCase()));
    const grossRevenue = done.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const dookiFee = done.reduce((s, o) => {
      if (o.dooki_commission_amount != null) return s + Number(o.dooki_commission_amount || 0);
      return s + (Number(o.total_amount || 0) * getCommissionPercent() / 100);
    }, 0);
    const totalCost = state.products.reduce((s, p) => s + Number(p.cost_price || 0), 0);
    return { completedOrders: done.length, grossRevenue, dookiFee, totalCost, profitBefore: grossRevenue - totalCost, profitAfter: grossRevenue - totalCost - dookiFee };
  }

  /* ==========================================================
     RENDER ALL
  ========================================================== */
  function renderAll() {
    renderTopbar();
    renderSidebar();
    renderDashboard();
    renderProductsScreen();
    renderCategories();
    renderInventory();
    renderTables();
    renderFinance();
    renderSupport();
    fillSettings();
    renderMenuPreview();
  }

  function renderTopbar() {
    const name = state.establishment?.name || 'Minha Loja';
    const initial = name.charAt(0).toUpperCase();

    setText('topbar-store-name', name);
    setText('sidebar-store-name', name);
    setText('sidebar-user-email', state.user?.email || '—');
    setText('sidebar-avatar', initial);
    setText('topbar-avatar', initial);
    setText('plan-badge', `Plano ${getPlanLabel()}`);
    setText('products-plan-badge', `Plano ${getPlanLabel()}`);
    setText('menu-store-name', name);

    // Trial/plan info
    const trialText = document.getElementById('trial-text');
    if (trialText) trialText.textContent = `Plano ${getPlanLabel()} ativo`;

    // Update sidebar logo if establishment has one
    const logo = state.establishment?.logo_url;
    if (logo) {
      const sidebarLogo = document.getElementById('sidebar-logo');
      if (sidebarLogo) sidebarLogo.src = logo;
    }

    // Menu preview link
    const menuLink = document.getElementById('sidebar-view-menu');
    const previewLink = document.getElementById('preview-open-link');
    const url = getMenuUrl();
    if (menuLink) menuLink.href = url;
    if (previewLink) previewLink.href = url;
  }

  function renderSidebar() {
    // Lock features on nav items
    document.querySelectorAll('[data-feature]').forEach(btn => {
      const key = btn.dataset.feature;
      const locked = !hasFeature(key);
      btn.classList.toggle('locked-nav-item', locked);
    });

    populateCategorySelect();
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function getMenuUrl() {
    const eid = state.membership?.establishment_id || state.establishment?.id || '';
    return `/menu/menu.html${eid ? '?establishment=' + encodeURIComponent(eid) : ''}`;
  }

  function populateCategorySelect() {
    const sel = document.getElementById('product-category-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Sem categoria</option>' +
      state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  /* ==========================================================
     SCREEN NAVIGATION
  ========================================================== */
  function openScreen(screen) {
    // Nav active state
    document.querySelectorAll('.nav-item, .nav-sub-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === screen);
    });

    // Panel visibility
    document.querySelectorAll('.est-screen').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.panel === screen);
    });

    // Re-render on demand
    if (screen === 'dashboard') renderDashboard();
    if (screen === 'orders') renderOrders();
    if (screen === 'products') renderProductsScreen();
    if (screen === 'categories') renderCategories();

    if (screen === 'inventory') {
      if (!hasFeature('inventory_management')) {
        document.getElementById('inventory-list').innerHTML = lockedCard('Gestão de estoque disponível a partir do plano Standard.');
        document.getElementById('inventory-movements').innerHTML = '';
        return;
      }
      renderInventory();
    }

    if (screen === 'tables') {
      if (!hasFeature('table_qr_code')) {
        document.getElementById('tables-list').innerHTML = lockedCard('Mesas e QR codes disponíveis a partir do plano Premium.');
        return;
      }
      renderTables();
    }

    if (screen === 'finance') renderFinance();
    if (screen === 'support') {
      if (!hasFeature('ticket_support')) {
        document.getElementById('support-list').innerHTML = lockedCard('Suporte por ticket disponível a partir do plano Standard.');
        return;
      }
      renderSupport();
    }
    if (screen === 'settings') fillSettings();

    // Show/hide preview sidebar
    const previewSidebar = document.getElementById('preview-sidebar');
    const content = document.getElementById('est-content');
    const showPreview = ['products', 'categories'].includes(screen);
    if (previewSidebar) previewSidebar.style.display = showPreview ? '' : 'none';
    if (content) content.classList.toggle('has-preview', showPreview);

    // Collapse mobile sidebar
    document.getElementById('est-sidebar')?.classList.remove('open');
  }

  /* ==========================================================
     DASHBOARD
  ========================================================== */
  function renderDashboard() {
    setText('kpi-orders', state.finance.completedOrders);
    setText('kpi-revenue', fmt(state.finance.grossRevenue));
    setText('kpi-products', state.products.filter(p => isProductActive(p)).length);
    setText('kpi-fee', fmt(state.finance.dookiFee));

    // Quick actions
    const qa = document.getElementById('quick-actions');
    if (qa) {
      const actions = [
        { label:'Novo produto', desc:'Adicionar ao cardápio', screen:'products', icon:'📋', enabled:true },
        { label:'Ver pedidos', desc:'Atualizar status', screen:'orders', icon:'🛍', enabled:true },
        { label:'Categorias', desc:'Organizar cardápio', screen:'categories', icon:'📂', enabled:true },
        { label:'Inventário', desc:'Controlar estoque', screen:'inventory', icon:'📦', enabled:hasFeature('inventory_management') },
        { label:'Financeiro', desc:'Ver receita', screen:'finance', icon:'💰', enabled:true },
        { label:'Suporte', desc:'Abrir chamado', screen:'support', icon:'🎧', enabled:hasFeature('ticket_support') }
      ];
      qa.innerHTML = actions.map(a => `
        <div class="quick-action ${a.enabled ? '' : 'locked'}" onclick="${a.enabled ? `window.EstablishmentPanel.goTo('${a.screen}')` : ''}">
          <div class="quick-action-icon"><span style="font-size:1.1rem">${a.icon}</span></div>
          <div class="quick-action-text">
            <strong>${a.label}</strong>
            <span>${a.enabled ? a.desc : 'Upgrade necessário'}</span>
          </div>
        </div>
      `).join('');
    }

    // Recent orders
    const ro = document.getElementById('dash-recent-orders');
    if (ro) {
      ro.innerHTML = state.orders.length
        ? state.orders.slice(0, 5).map(o => `
          <div class="list-row">
            <div class="list-avatar">#</div>
            <div class="list-info">
              <span class="list-name">${o.customer_name || 'Cliente'}</span>
              <span class="list-sub">Pedido #${String(o.id).slice(0,8)} • ${fmtDate(o.created_at)}</span>
            </div>
            <div class="list-right">
              <span class="badge ${orderStatusClass(o.status)}">${o.status || 'pendente'}</span>
              <strong style="font-size:0.9rem">${fmt(o.total_amount)}</strong>
            </div>
          </div>
        `).join('')
        : emptyState('Nenhum pedido registrado ainda.');
    }

    // Low stock
    const lowStock = state.products.filter(p => p.track_inventory !== false && Number(p.stock_quantity || 0) <= Number(p.stock_min_quantity || 0));
    setText('low-stock-count', `${lowStock.length} ${lowStock.length === 1 ? 'item' : 'itens'}`);
    const ls = document.getElementById('dash-low-stock');
    if (ls) {
      ls.innerHTML = lowStock.length
        ? lowStock.slice(0, 5).map(p => `
          <div class="list-row">
            <div class="list-avatar">${p.name.charAt(0).toUpperCase()}</div>
            <div class="list-info">
              <span class="list-name">${p.name}</span>
              <span class="list-sub">Atual: ${Number(p.stock_quantity||0)} • mínimo: ${Number(p.stock_min_quantity||0)}</span>
            </div>
            <div class="list-right"><span class="badge badge-warning">Baixo</span></div>
          </div>
        `).join('')
        : emptyState('Nenhum item com estoque baixo.');
    }

    // Plan summary
    const ps = document.getElementById('dash-plan-summary');
    if (ps) {
      ps.innerHTML = [
        summaryRow('Plano atual', getPlanLabel()),
        summaryRow('Comissão Dooki', `${String(getCommissionPercent()).replace('.',',')}%`),
        summaryRow('Produtos cadastrados', String(state.products.length)),
        summaryRow('Categorias', String(state.categories.length)),
        summaryRow('Tickets abertos', String(state.tickets.filter(t => !['fechado','resolvido','closed'].includes(String(t.status||'').toLowerCase())).length))
      ].join('');
    }
  }

  /* ==========================================================
     ORDERS
  ========================================================== */
  function renderOrders(term = '') {
    const filtered = state.orders.filter(o => {
      if (!term) return true;
      return [o.id, o.customer_name, o.status, o.customer_phone].join(' ').toLowerCase().includes(term.toLowerCase());
    });

    const pending = filtered.filter(o => ['pending','pendente'].includes(String(o.status||'').toLowerCase())).length;
    const prep = filtered.filter(o => ['preparing','confirmed'].includes(String(o.status||'').toLowerCase())).length;
    const done = filtered.filter(o => ['completed','delivered'].includes(String(o.status||'').toLowerCase())).length;

    const band = document.getElementById('orders-status-band');
    if (band) {
      band.innerHTML = `
        <div class="status-count-card warning"><strong>${pending}</strong><span>Pendentes</span></div>
        <div class="status-count-card info"><strong>${prep}</strong><span>Em preparo</span></div>
        <div class="status-count-card success"><strong>${done}</strong><span>Concluídos</span></div>
      `;
    }

    const list = document.getElementById('orders-list');
    if (!list) return;
    list.innerHTML = filtered.length
      ? filtered.map(o => {
          const st = String(o.status || 'pendente').toLowerCase();
          return `
            <div class="list-row">
              <div class="list-avatar" style="background:var(--info-bg);color:var(--info-text)">#</div>
              <div class="list-info">
                <span class="list-name">${o.customer_name || 'Cliente'} — <small style="font-weight:600">#${String(o.id).slice(0,8)}</small></span>
                <span class="list-sub">${fmtDate(o.created_at)} • ${fmt(o.total_amount)}</span>
              </div>
              <div class="list-right" style="gap:6px;flex-wrap:wrap">
                <span class="badge ${orderStatusClass(st)}">${st}</span>
                ${st === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="window.EstablishmentPanel.updateOrderStatus('${o.id}','confirmed')">Confirmar</button>` : ''}
                ${['confirmed','preparing'].includes(st) ? `<button class="btn btn-secondary btn-sm" onclick="window.EstablishmentPanel.updateOrderStatus('${o.id}','preparing')">Em preparo</button>` : ''}
                ${st !== 'completed' ? `<button class="btn btn-sm" style="background:var(--success-bg);color:var(--success-text)" onclick="window.EstablishmentPanel.updateOrderStatus('${o.id}','completed')">Concluir</button>` : ''}
              </div>
            </div>
          `;
        }).join('')
      : emptyState('Nenhum pedido encontrado.');
  }

  /* ==========================================================
     PRODUCTS (Cardápio view)
  ========================================================== */
  function renderProductsScreen() {
    // Banner
    const banner = document.getElementById('menu-banner');
    if (banner && state.establishment?.banner_url) {
      banner.style.backgroundImage = `url("${state.establishment.banner_url}")`;
      banner.style.backgroundSize = 'cover';
      banner.style.backgroundPosition = 'center';
    }

    // Logo
    const logo = document.getElementById('menu-logo');
    if (logo && state.establishment?.logo_url) {
      logo.src = state.establishment.logo_url;
    }

    // Store name & status
    setText('menu-store-name', state.establishment?.name || 'Minha Loja');

    // Category tabs
    renderProductCategoryTabs();

    // Product listing
    renderProductsByCategory(state.activeProductCat);
  }

  function renderProductCategoryTabs() {
    const nav = document.getElementById('menu-category-nav');
    if (!nav) return;

    const tabs = [
      { id: 'all', name: 'Todos os produtos' },
      ...state.categories.map(c => ({ id: c.id, name: c.name }))
    ];

    nav.innerHTML = tabs.map(t => `
      <button class="menu-cat-tab ${t.id === state.activeProductCat ? 'active' : ''}"
        data-cat="${t.id}" onclick="window.EstablishmentPanel.filterProductsByCat('${t.id}')">
        ${t.name}
      </button>
    `).join('');
  }

  function renderProductsByCategory(catFilter) {
    const container = document.getElementById('products-by-category');
    if (!container) return;

    const products = [...state.products].sort((a, b) => String(a.name||'').localeCompare(String(b.name||''), 'pt-BR'));

    if (!products.length) {
      container.innerHTML = `<div class="card">${emptyState('Nenhum produto cadastrado. Clique em "Novo Produto" para começar.')}</div>`;
      return;
    }

    const groups = [];

    if (catFilter === 'all') {
      // Group by category
      state.categories.forEach(cat => {
        const items = products.filter(p => String(p.category_id) === String(cat.id));
        if (items.length) groups.push({ cat, items });
      });
      const uncategorized = products.filter(p => !p.category_id || !state.categories.find(c => String(c.id) === String(p.category_id)));
      if (uncategorized.length) groups.push({ cat: { id: '__none__', name: 'Sem categoria' }, items: uncategorized });
    } else {
      const cat = state.categories.find(c => String(c.id) === String(catFilter));
      const items = products.filter(p => String(p.category_id) === String(catFilter));
      if (cat) groups.push({ cat, items });
    }

    container.innerHTML = groups.map(g => `
      <div class="category-section" style="margin-bottom:12px">
        <div class="category-section-header">
          <div class="category-section-title">
            ${g.cat.name}
            <span class="category-count">${g.items.length} ${g.items.length === 1 ? 'produto' : 'produtos'}</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openProductModal(null, '${g.cat.id !== '__none__' ? g.cat.id : ''}')">
            + Produto
          </button>
        </div>
        ${g.items.map(p => productRow(p)).join('')}
      </div>
    `).join('');
  }

  function productRow(p) {
    const active = isProductActive(p);
    const price = getProductPrice(p);
    const imgHtml = p.image_url
      ? `<img class="product-img" src="${p.image_url}" alt="${p.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const placeholder = `<div class="product-img-placeholder" ${p.image_url ? 'style="display:none"' : ''}>🍽</div>`;

    return `
      <div class="product-row">
        <div class="product-drag" title="Reordenar">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/></svg>
        </div>
        ${imgHtml}${placeholder}
        <div class="product-info">
          <span class="product-name">${p.name || 'Produto'}</span>
          <div class="product-meta">
            <span>${state.categories.find(c => String(c.id) === String(p.category_id))?.name || 'Sem categoria'}</span>
            ${p.description ? `<span>•</span><span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.description}</span>` : ''}
          </div>
        </div>
        <div class="product-right">
          ${p.original_price ? `<div><span class="product-price-old">${fmt(p.original_price)}</span></div>` : ''}
          <div class="product-price">${fmt(price)}</div>
          <span class="badge ${active ? 'badge-success' : 'badge-neutral'}">${active ? 'Ativo' : 'Inativo'}</span>
          <button class="btn btn-secondary btn-sm" onclick="window.EstablishmentPanel.editProduct('${p.id}')">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="window.EstablishmentPanel.deleteProduct('${p.id}')">Excluir</button>
        </div>
      </div>
    `;
  }

  /* ==========================================================
     CATEGORIES
  ========================================================== */
  function renderCategories() {
    const list = document.getElementById('categories-list');
    if (!list) return;

    const cats = [...state.categories].sort((a, b) => String(a.name||'').localeCompare(String(b.name||''), 'pt-BR'));

    list.innerHTML = cats.length
      ? cats.map(c => {
          const count = state.products.filter(p => String(p.category_id) === String(c.id)).length;
          return `
            <div class="list-row">
              <div class="list-avatar">${(c.name||'C').charAt(0).toUpperCase()}</div>
              <div class="list-info">
                <span class="list-name">${c.name}</span>
                <span class="list-sub">${c.description || 'Sem descrição'} • ${count} produto(s)</span>
              </div>
              <div class="list-right">
                <span class="badge ${c.active === false ? 'badge-neutral' : 'badge-success'}">${c.active === false ? 'Inativa' : 'Ativa'}</span>
                <button class="btn btn-secondary btn-sm" onclick="window.EstablishmentPanel.editCategory('${c.id}')">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="window.EstablishmentPanel.deleteCategory('${c.id}')">Excluir</button>
              </div>
            </div>
          `;
        }).join('')
      : emptyState('Nenhuma categoria cadastrada ainda.');
  }

  /* ==========================================================
     INVENTORY
  ========================================================== */
  function renderInventory() {
    const list = document.getElementById('inventory-list');
    const movements = document.getElementById('inventory-movements');

    if (list) {
      list.innerHTML = state.products.length
        ? state.products.map(p => {
            const low = Number(p.stock_quantity||0) <= Number(p.stock_min_quantity||0);
            return `
              <div class="list-row">
                <div class="list-avatar">${(p.name||'I').charAt(0).toUpperCase()}</div>
                <div class="list-info">
                  <span class="list-name">${p.name}</span>
                  <span class="list-sub">Custo: ${fmt(p.cost_price)} • Venda: ${fmt(p.sale_price)}</span>
                </div>
                <div class="list-right">
                  <span class="badge ${low ? 'badge-warning' : 'badge-success'}">Estoque: ${Number(p.stock_quantity||0)}</span>
                </div>
              </div>
            `;
          }).join('')
        : emptyState('Sem produtos para controle de estoque.');
    }

    if (movements) {
      movements.innerHTML = state.inventoryMovements.length
        ? state.inventoryMovements.slice(0, 10).map(m => `
            <div class="list-row">
              <div class="list-info">
                <span class="list-name">${humanizeMovement(m.movement_type)}</span>
                <span class="list-sub">Qtd: ${m.quantity || 0} • ${fmtDate(m.created_at)}</span>
              </div>
              <div class="list-right">
                <span class="badge badge-neutral">${fmt(m.total_cost || 0)}</span>
              </div>
            </div>
          `).join('')
        : emptyState('Nenhuma movimentação registrada.');
    }
  }

  function humanizeMovement(type) {
    return { sale:'Venda', purchase:'Compra', manual_adjustment:'Ajuste manual', waste:'Perda', return:'Devolução' }[type] || type;
  }

  /* ==========================================================
     TABLES
  ========================================================== */
  function renderTables() {
    const list = document.getElementById('tables-list');
    if (!list) return;
    list.innerHTML = state.tables.length
      ? state.tables.map(t => `
          <div class="list-row">
            <div class="list-avatar" style="background:var(--brand-orange-soft);color:var(--brand-orange-dark)">M</div>
            <div class="list-info">
              <span class="list-name">Mesa ${t.table_number || '—'}</span>
              <span class="list-sub">${t.qr_code_url || t.qr_code_value || 'QR não gerado'}</span>
            </div>
            <div class="list-right">
              <span class="badge ${t.active === false ? 'badge-neutral' : 'badge-success'}">${t.active === false ? 'Inativa' : 'Ativa'}</span>
            </div>
          </div>
        `).join('')
      : emptyState('Nenhuma mesa cadastrada.');
  }

  /* ==========================================================
     FINANCE
  ========================================================== */
  function renderFinance() {
    setText('fin-revenue', fmt(state.finance.grossRevenue));
    setText('fin-cost', fmt(state.finance.totalCost));
    setText('fin-profit-before', fmt(state.finance.profitBefore));
    setText('fin-profit-after', fmt(state.finance.profitAfter));

    const summary = document.getElementById('fin-summary');
    if (summary) {
      summary.innerHTML = [
        summaryRow('Plano atual', getPlanLabel()),
        summaryRow('Comissão Dooki', `${getCommissionPercent()}%`),
        summaryRow('Pedidos concluídos', String(state.finance.completedOrders)),
        summaryRow('Receita bruta', fmt(state.finance.grossRevenue)),
        summaryRow('Taxa total Dooki', fmt(state.finance.dookiFee)),
        summaryRow('Lucro estimado', fmt(state.finance.profitAfter))
      ].join('');
    }
  }

  /* ==========================================================
     SUPPORT
  ========================================================== */
  function renderSupport() {
    const list = document.getElementById('support-list');
    if (!list) return;
    list.innerHTML = state.tickets.length
      ? state.tickets.map(t => `
          <div class="list-row">
            <div class="list-info">
              <span class="list-name">${t.subject || 'Sem assunto'}</span>
              <span class="list-sub">${t.last_message || '—'} • ${fmtDate(t.created_at)}</span>
            </div>
            <div class="list-right">
              <span class="badge ${priorityClass(t.priority)}">${t.priority || 'Baixa'}</span>
              <span class="badge ${ticketStatusClass(t.status)}">${t.status || 'aberto'}</span>
            </div>
          </div>
        `).join('')
      : emptyState('Nenhum ticket aberto pela loja.');
  }

  /* ==========================================================
     SETTINGS FORM
  ========================================================== */
  function fillSettings() {
    const est = state.establishment || {};
    ['name','city','email','whatsapp'].forEach(k => {
      const el = document.getElementById(`settings-${k}`);
      if (el) el.value = est[k] || '';
    });
    const logoEl = document.getElementById('settings-logo-url');
    const bannerEl = document.getElementById('settings-banner-url');
    const descEl = document.getElementById('settings-description');
    if (logoEl) logoEl.value = est.logo_url || '';
    if (bannerEl) bannerEl.value = est.banner_url || '';
    if (descEl) descEl.value = est.description || '';
  }

  /* ==========================================================
     MENU PREVIEW
  ========================================================== */
  function renderMenuPreview(activeCatId) {
    const est = state.establishment || {};
    const banner = document.getElementById('preview-banner');
    const logo = document.getElementById('preview-logo');

    if (banner) {
      if (est.banner_url) {
        banner.style.backgroundImage = `url("${est.banner_url}")`;
        banner.style.backgroundSize = 'cover';
        banner.style.backgroundPosition = 'center';
      }
    }
    if (logo && est.logo_url) logo.src = est.logo_url;

    setText('preview-name', est.name || 'Minha Loja');
    setText('preview-desc', est.description || `${state.products.filter(p => isProductActive(p)).length} produto(s)`);

    const cats = state.categories.filter(c => c.active !== false).sort((a, b) => Number(a.sort_order||0) - Number(b.sort_order||0));
    const visibleProducts = state.products.filter(p => isProductActive(p));

    const groups = cats.map(c => ({
      cat: c,
      items: visibleProducts.filter(p => String(p.category_id) === String(c.id))
    })).filter(g => g.items.length);

    const uncategorized = visibleProducts.filter(p => !groups.some(g => g.items.find(i => String(i.id) === String(p.id))));
    if (uncategorized.length) groups.push({ cat: { id:'__none__', name:'Outros' }, items: uncategorized });

    const currentCatId = activeCatId || state.activePreviewCat || groups[0]?.cat?.id || '';
    state.activePreviewCat = currentCatId;

    const tabs = document.getElementById('preview-tabs');
    if (tabs) {
      tabs.innerHTML = groups.map(g => `
        <button class="preview-tab ${String(g.cat.id) === String(currentCatId) ? 'active' : ''}"
          onclick="window.EstablishmentPanel.previewCat('${g.cat.id}')">
          ${g.cat.name}
        </button>
      `).join('');
    }

    const activeGroup = groups.find(g => String(g.cat.id) === String(currentCatId));
    const previewList = document.getElementById('preview-list');
    if (previewList) {
      previewList.innerHTML = (activeGroup?.items || []).slice(0, 8).map(p => {
        const price = getProductPrice(p);
        return `
          <div class="preview-item">
            <div>
              <span class="preview-item-name">${p.name}</span>
              <span class="preview-item-desc">${p.description || ''}</span>
            </div>
            <div>
              <span class="preview-item-price">${fmt(price)}</span>
              ${p.original_price ? `<span class="preview-item-price-old">${fmt(p.original_price)}</span>` : ''}
            </div>
          </div>
        `;
      }).join('') || '<div style="padding:16px;text-align:center;font-size:0.8rem;color:var(--text-soft)">Sem produtos nesta categoria.</div>';
    }
  }

  /* ==========================================================
     BIND EVENTS
  ========================================================== */
  function bindEvents() {
    // Logout
    document.getElementById('establishment-logout')?.addEventListener('click', async () => {
      try { await window.EstablishmentAuth.signOut(); } catch {}
      window.location.href = '/establishment/establishment-login.html';
    });

    // Mobile sidebar toggle
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      document.getElementById('est-sidebar')?.classList.toggle('open');
    });

    // Nav items
    document.querySelectorAll('[data-screen]').forEach(btn => {
      btn.addEventListener('click', () => {
        const featureKey = btn.dataset.feature;
        if (featureKey && !hasFeature(featureKey)) {
          toast(`Este recurso requer upgrade do plano. Plano atual: ${getPlanLabel()}.`, 'warning');
          return;
        }
        openScreen(btn.dataset.screen);
      });
      btn.addEventListener('mouseenter', () => {
        if (btn.dataset.feature && !hasFeature(btn.dataset.feature)) {
          showLockedTip(`Recurso disponível em plano superior (atual: ${getPlanLabel()})`, btn);
        }
      });
      btn.addEventListener('mouseleave', hideTip);
    });

    // Open product modal button
    document.getElementById('open-add-product-modal')?.addEventListener('click', () => openProductModal());

    // Open category modal button
    document.getElementById('open-add-category-modal')?.addEventListener('click', () => openCategoryModal());

    // Product form
    document.getElementById('product-form')?.addEventListener('submit', handleSaveProduct);

    // Category form
    document.getElementById('category-form')?.addEventListener('submit', handleSaveCategory);

    // Table form
    document.getElementById('table-form')?.addEventListener('submit', handleSaveTable);

    // Support form
    document.getElementById('support-form')?.addEventListener('submit', handleSaveTicket);

    // Settings form
    document.getElementById('settings-form')?.addEventListener('submit', handleSaveSettings);

    // Orders search
    document.getElementById('orders-search')?.addEventListener('input', function () {
      renderOrders(this.value);
    });
  }

  /* ==========================================================
     PRODUCT MODAL
  ========================================================== */
  function openProductModal(productId = null, prefillCatId = '') {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('product-modal-title');
    const submitBtn = document.getElementById('product-submit-btn');
    if (!modal || !form) return;

    form.reset();
    populateCategorySelect();

    if (productId) {
      const p = state.products.find(x => x.id === productId);
      if (!p) return;
      title.textContent = 'Editar produto';
      submitBtn.textContent = 'Salvar alterações';
      form.editing_id.value = p.id;
      form.name.value = p.name || '';
      form.category_id.value = p.category_id || '';
      form.sale_price.value = p.sale_price ?? '';
      form.original_price.value = p.original_price ?? '';
      form.cost_price.value = p.cost_price ?? '';
      form.stock_quantity.value = p.stock_quantity ?? '';
      form.image_url.value = p.image_url || '';
      form.description.value = p.description || '';
    } else {
      title.textContent = 'Novo produto';
      submitBtn.textContent = 'Cadastrar produto';
      form.editing_id.value = '';
      if (prefillCatId) form.category_id.value = prefillCatId;
    }

    modal.style.display = 'flex';
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const editingId = fd.get('editing_id');
    const client = getClient();

    const payload = {
      establishment_id: state.membership.establishment_id,
      name: String(fd.get('name') || '').trim(),
      category_id: fd.get('category_id') || null,
      description: String(fd.get('description') || '').trim(),
      sale_price: Number(fd.get('sale_price') || 0),
      original_price: fd.get('original_price') ? Number(fd.get('original_price')) : null,
      cost_price: Number(fd.get('cost_price') || 0),
      stock_quantity: Number(fd.get('stock_quantity') || 0),
      image_url: String(fd.get('image_url') || '').trim() || null,
      active: true
    };

    if (!payload.name) { toast('Informe o nome do produto.', 'warning'); return; }

    try {
      if (editingId) {
        const { error } = await client.from('products').update(payload).eq('id', editingId).eq('establishment_id', payload.establishment_id);
        if (error) throw error;
        toast('Produto atualizado com sucesso!', 'success');
      } else {
        const { error } = await client.from('products').insert([payload]);
        if (error) throw error;
        toast('Produto cadastrado com sucesso!', 'success');
      }

      document.getElementById('product-modal').style.display = 'none';
      await loadAllData();
      renderProductsScreen();
      renderCategories();
      renderDashboard();
      renderMenuPreview();
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      toast(err.message || 'Não foi possível salvar o produto.', 'error');
    }
  }

  /* ==========================================================
     CATEGORY MODAL
  ========================================================== */
  function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('category-modal');
    const form = document.getElementById('category-form');
    const title = document.getElementById('category-modal-title');
    const submitBtn = document.getElementById('category-submit-btn');
    if (!modal || !form) return;

    form.reset();

    if (categoryId) {
      const c = state.categories.find(x => x.id === categoryId);
      if (!c) return;
      title.textContent = 'Editar categoria';
      submitBtn.textContent = 'Salvar alterações';
      form.editing_id.value = c.id;
      form.name.value = c.name || '';
      form.description.value = c.description || '';
    } else {
      title.textContent = 'Nova categoria';
      submitBtn.textContent = 'Cadastrar categoria';
      form.editing_id.value = '';
    }

    modal.style.display = 'flex';
  }

  async function handleSaveCategory(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const editingId = fd.get('editing_id');
    const client = getClient();

    const payload = {
      establishment_id: state.membership.establishment_id,
      name: String(fd.get('name') || '').trim(),
      description: String(fd.get('description') || '').trim(),
      active: true
    };

    if (!payload.name) { toast('Informe o nome da categoria.', 'warning'); return; }

    try {
      if (editingId) {
        const { error } = await client.from('categories').update(payload).eq('id', editingId).eq('establishment_id', payload.establishment_id);
        if (error) throw error;
        toast('Categoria atualizada!', 'success');
      } else {
        const { error } = await client.from('categories').insert([payload]);
        if (error) throw error;
        toast('Categoria cadastrada!', 'success');
      }

      document.getElementById('category-modal').style.display = 'none';
      await loadAllData();
      renderCategories();
      renderProductsScreen();
      renderMenuPreview();
    } catch (err) {
      console.error('Erro ao salvar categoria:', err);
      toast(err.message || 'Não foi possível salvar a categoria.', 'error');
    }
  }

  /* ==========================================================
     TABLE FORM
  ========================================================== */
  async function handleSaveTable(e) {
    e.preventDefault();
    if (!hasFeature('table_qr_code')) { toast('Recurso disponível a partir do plano Premium.', 'warning'); return; }
    const client = getClient();
    const fd = new FormData(e.target);
    const payload = {
      establishment_id: state.membership.establishment_id,
      table_number: String(fd.get('table_number') || '').trim(),
      seats: Number(fd.get('seats') || 0) || null,
      qr_code_value: String(fd.get('qr_code_value') || '').trim() || null,
      qr_code_url: String(fd.get('qr_code_url') || '').trim() || null,
      active: true
    };
    try {
      const { error } = await client.from('establishment_tables').insert([payload]);
      if (error) throw error;
      e.target.reset();
      await loadAllData();
      renderTables();
      toast('Mesa cadastrada com sucesso!', 'success');
    } catch (err) {
      toast(err.message || 'Não foi possível cadastrar a mesa.', 'error');
    }
  }

  /* ==========================================================
     TICKET FORM
  ========================================================== */
  async function handleSaveTicket(e) {
    e.preventDefault();
    const client = getClient();
    const fd = new FormData(e.target);
    const payload = {
      establishment_id: state.membership.establishment_id,
      store_name: state.establishment?.name || 'Loja',
      subject: String(fd.get('subject') || '').trim(),
      priority: String(fd.get('priority') || 'Baixa'),
      status: 'aberto',
      last_message: String(fd.get('message') || '').trim()
    };
    try {
      const { data, error } = await client.from('support_tickets').insert([payload]).select().single();
      if (error) throw error;
      if (data?.id) {
        await client.from('support_ticket_messages').insert([{
          ticket_id: data.id, sender_type:'establishment',
          sender_name: state.establishment?.name || 'Estabelecimento', message: payload.last_message
        }]);
      }
      e.target.reset();
      await loadAllData();
      renderSupport();
      toast('Ticket aberto com sucesso!', 'success');
    } catch (err) {
      toast(err.message || 'Não foi possível abrir o ticket.', 'error');
    }
  }

  /* ==========================================================
     SETTINGS FORM
  ========================================================== */
  async function handleSaveSettings(e) {
    e.preventDefault();
    const client = getClient();
    const fd = new FormData(e.target);
    const payload = {
      name: String(fd.get('name') || '').trim(),
      city: String(fd.get('city') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      whatsapp: String(fd.get('whatsapp') || '').trim(),
      logo_url: String(fd.get('logo_url') || '').trim(),
      banner_url: String(fd.get('banner_url') || '').trim(),
      description: String(fd.get('description') || '').trim()
    };
    try {
      const { error } = await client.from('establishments').update(payload).eq('id', state.membership.establishment_id);
      if (error) throw error;
      await loadAllData();
      renderTopbar();
      renderProductsScreen();
      renderMenuPreview();
      toast('Configurações salvas com sucesso!', 'success');
    } catch (err) {
      toast(err.message || 'Não foi possível salvar.', 'error');
    }
  }

  /* ==========================================================
     ORDER STATUS UPDATE
  ========================================================== */
  async function updateOrderStatus(orderId, status) {
    const client = getClient();
    const payload = { status };
    if (status === 'completed') payload.completed_at = new Date().toISOString();
    try {
      const { error } = await client.from('orders').update(payload).eq('id', orderId).eq('establishment_id', state.membership.establishment_id);
      if (error) throw error;
      await loadAllData();
      renderOrders(document.getElementById('orders-search')?.value || '');
      renderDashboard();
      renderFinance();
      toast('Status do pedido atualizado!', 'success');
    } catch (err) {
      toast(err.message || 'Não foi possível atualizar o pedido.', 'error');
    }
  }

  /* ==========================================================
     DELETE PRODUCT
  ========================================================== */
  async function deleteProduct(productId) {
    const p = state.products.find(x => x.id === productId);
    if (!p) return;
    if (!window.confirm(`Deseja excluir o produto "${p.name}"? Esta ação não pode ser desfeita.`)) return;
    const client = getClient();
    try {
      const { error } = await client.from('products').delete().eq('id', productId).eq('establishment_id', state.membership.establishment_id);
      if (error) throw error;
      await loadAllData();
      renderProductsScreen();
      renderDashboard();
      renderInventory();
      renderMenuPreview();
      toast('Produto excluído.', 'success');
    } catch (err) {
      toast(err.message || 'Não foi possível excluir o produto.', 'error');
    }
  }

  /* ==========================================================
     DELETE CATEGORY
  ========================================================== */
  async function deleteCategory(categoryId) {
    const c = state.categories.find(x => x.id === categoryId);
    if (!c) return;
    if (!window.confirm(`Deseja excluir a categoria "${c.name}"?`)) return;
    const client = getClient();
    try {
      const { error } = await client.from('categories').delete().eq('id', categoryId).eq('establishment_id', state.membership.establishment_id);
      if (error) throw error;
      await loadAllData();
      renderCategories();
      renderProductsScreen();
      renderMenuPreview();
      toast('Categoria excluída.', 'success');
    } catch (err) {
      toast(err.message || 'Não foi possível excluir a categoria.', 'error');
    }
  }

  /* ==========================================================
     PUBLIC API
  ========================================================== */
  window.EstablishmentPanel = {
    goTo: openScreen,
    updateOrderStatus,
    editProduct: id => openProductModal(id),
    deleteProduct,
    editCategory: id => openCategoryModal(id),
    deleteCategory,
    filterProductsByCat: catId => {
      state.activeProductCat = catId;
      renderProductCategoryTabs();
      renderProductsByCategory(catId);
    },
    previewCat: catId => renderMenuPreview(catId)
  };

  // Expose modal openers globally for inline onclick
  window.openProductModal = openProductModal;
  window.openCategoryModal = openCategoryModal;

})();
