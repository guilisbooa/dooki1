import { useEffect, useMemo, useState } from 'react';

const GOLD = '#DAA520';
const STORAGE_KEY = 'dooki-estabelecimento-db-v1';

const defaultData = {
  stores: [
    {
      id: 'rest-1',
      email: 'contato@burgerprime.com',
      password: '123456',
      profile: {
        name: 'Burger Prime',
        slug: 'burgerprime',
        phone: '(11) 99999-0000',
        category: 'Hamburgueria',
        address: 'Rua Exemplo, 123 - São Paulo/SP',
        description: 'Hambúrguer artesanal, porções e bebidas.',
        logoUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200&auto=format&fit=crop',
        coverUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop',
        deliveryEnabled: true,
        dineInEnabled: true,
      },
      categories: [
        { id: 'cat-1', name: 'Lanches', description: 'Hambúrgueres e combos', active: true },
        { id: 'cat-2', name: 'Bebidas', description: 'Refrigerantes e sucos', active: true },
        { id: 'cat-3', name: 'Porções', description: 'Batatas e acompanhamentos', active: true },
      ],
      products: [
        {
          id: 'prod-1',
          categoryId: 'cat-1',
          name: 'Prime Burger',
          description: 'Pão brioche, burger 160g, cheddar e molho da casa.',
          price: 31.9,
          imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200&auto=format&fit=crop',
          active: true,
          featured: true,
        },
        {
          id: 'prod-2',
          categoryId: 'cat-1',
          name: 'Bacon Melt',
          description: 'Burger duplo com bacon crocante e queijo prato.',
          price: 37.9,
          imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1200&auto=format&fit=crop',
          active: true,
          featured: false,
        },
        {
          id: 'prod-3',
          categoryId: 'cat-2',
          name: 'Refrigerante Lata',
          description: '350ml bem gelado.',
          price: 6.5,
          imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?q=80&w=1200&auto=format&fit=crop',
          active: true,
          featured: false,
        },
      ],
    },
  ],
};

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultData;
  } catch {
    return defaultData;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function App() {
  const [db, setDb] = useState(defaultData);
  const [loggedStoreId, setLoggedStoreId] = useState(null);
  const [screen, setScreen] = useState('dashboard');
  const [email, setEmail] = useState('contato@burgerprime.com');
  const [password, setPassword] = useState('123456');
  const [loginError, setLoginError] = useState('');
  const [categoryDraft, setCategoryDraft] = useState({ name: '', description: '', active: true });
  const [productDraft, setProductDraft] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    imageUrl: '',
    active: true,
    featured: false,
  });

  useEffect(() => {
    setDb(loadData());
  }, []);

  const store = useMemo(
    () => db.stores.find((item) => item.id === loggedStoreId) || null,
    [db, loggedStoreId]
  );

  const groupedProducts = useMemo(() => {
    if (!store) return [];
    return store.categories.map((category) => ({
      ...category,
      products: store.products.filter((product) => product.categoryId === category.id),
    }));
  }, [store]);

  function updateStoreData(nextStore) {
    const nextDb = {
      ...db,
      stores: db.stores.map((item) => (item.id === nextStore.id ? nextStore : item)),
    };
    setDb(nextDb);
    saveData(nextDb);
  }

  function handleLogin(e) {
    e.preventDefault();
    const found = db.stores.find((item) => item.email === email && item.password === password);
    if (!found) {
      setLoginError('E-mail ou senha inválidos.');
      return;
    }
    setLoggedStoreId(found.id);
    setScreen('dashboard');
    setLoginError('');
    setProductDraft((prev) => ({ ...prev, categoryId: found.categories[0]?.id || '' }));
  }

  function handleProfileChange(field, value) {
    if (!store) return;
    updateStoreData({
      ...store,
      profile: {
        ...store.profile,
        [field]: value,
      },
    });
  }

  function addCategory(e) {
    e.preventDefault();
    if (!store || !categoryDraft.name.trim()) return;
    updateStoreData({
      ...store,
      categories: [
        ...store.categories,
        {
          id: uid('cat'),
          name: categoryDraft.name.trim(),
          description: categoryDraft.description.trim(),
          active: categoryDraft.active,
        },
      ],
    });
    setCategoryDraft({ name: '', description: '', active: true });
  }

  function toggleCategory(categoryId) {
    if (!store) return;
    updateStoreData({
      ...store,
      categories: store.categories.map((category) =>
        category.id === categoryId ? { ...category, active: !category.active } : category
      ),
    });
  }

  function deleteCategory(categoryId) {
    if (!store) return;
    const nextCategories = store.categories.filter((category) => category.id !== categoryId);
    const nextProducts = store.products.filter((product) => product.categoryId !== categoryId);
    updateStoreData({ ...store, categories: nextCategories, products: nextProducts });
    setProductDraft((prev) => ({
      ...prev,
      categoryId: nextCategories[0]?.id || '',
    }));
  }

  function addProduct(e) {
    e.preventDefault();
    if (!store || !productDraft.name.trim() || !productDraft.categoryId) return;
    updateStoreData({
      ...store,
      products: [
        {
          id: uid('prod'),
          categoryId: productDraft.categoryId,
          name: productDraft.name.trim(),
          description: productDraft.description.trim(),
          price: Number(productDraft.price || 0),
          imageUrl: productDraft.imageUrl.trim(),
          active: productDraft.active,
          featured: productDraft.featured,
        },
        ...store.products,
      ],
    });
    setProductDraft({
      name: '',
      description: '',
      price: '',
      categoryId: store.categories[0]?.id || '',
      imageUrl: '',
      active: true,
      featured: false,
    });
  }

  function toggleProduct(productId, field) {
    if (!store) return;
    updateStoreData({
      ...store,
      products: store.products.map((product) =>
        product.id === productId ? { ...product, [field]: !product[field] } : product
      ),
    });
  }

  function deleteProduct(productId) {
    if (!store) return;
    updateStoreData({
      ...store,
      products: store.products.filter((product) => product.id !== productId),
    });
  }

  function resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
    setDb(defaultData);
    setLoggedStoreId(null);
    setScreen('dashboard');
    setEmail('contato@burgerprime.com');
    setPassword('123456');
    setLoginError('');
  }

  if (!store) {
    return (
      <div className="page auth-page">
        <div className="auth-panel brand-panel">
          <div className="brand-badge">DOOKI</div>
          <h1>Painel do estabelecimento</h1>
          <p>
            Primeira versão do sistema da Dooki focada no restaurante: login, gestão completa da loja,
            categorias e produtos com fotos.
          </p>
          <div className="demo-box">
            <strong>Conta de teste</strong>
            <span>E-mail: contato@burgerprime.com</span>
            <span>Senha: 123456</span>
          </div>
        </div>

        <form className="auth-panel login-panel" onSubmit={handleLogin}>
          <h2>Entrar</h2>
          <label>
            E-mail
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Digite seu e-mail" />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
            />
          </label>
          {loginError ? <div className="error-box">{loginError}</div> : null}
          <button className="primary-button" type="submit">
            Acessar painel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="page app-page">
      <aside className="sidebar">
        <div>
          <div className="brand-badge">DOOKI</div>
          <h2>{store.profile.name}</h2>
          <p className="muted">Painel do estabelecimento</p>
        </div>

        <nav className="nav-list">
          <button className={screen === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => setScreen('dashboard')}>
            Visão geral
          </button>
          <button className={screen === 'store' ? 'nav-item active' : 'nav-item'} onClick={() => setScreen('store')}>
            Minha loja
          </button>
          <button className={screen === 'categories' ? 'nav-item active' : 'nav-item'} onClick={() => setScreen('categories')}>
            Categorias
          </button>
          <button className={screen === 'products' ? 'nav-item active' : 'nav-item'} onClick={() => setScreen('products')}>
            Produtos
          </button>
          <button className={screen === 'preview' ? 'nav-item active' : 'nav-item'} onClick={() => setScreen('preview')}>
            Prévia cardápio
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="ghost-button" onClick={resetDemo}>Resetar demo</button>
          <button className="ghost-button" onClick={() => setLoggedStoreId(null)}>Sair</button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h1>{screenTitle(screen)}</h1>
            <p className="muted">Edite os dados da sua operação localmente.</p>
          </div>
          <div className="status-pill">Cor principal {GOLD}</div>
        </header>

        {screen === 'dashboard' && (
          <section className="section-grid">
            <StatCard label="Categorias" value={store.categories.length} />
            <StatCard label="Produtos" value={store.products.length} />
            <StatCard label="Produtos ativos" value={store.products.filter((p) => p.active).length} />
            <StatCard label="Destaques" value={store.products.filter((p) => p.featured).length} />

            <div className="panel large">
              <h3>Resumo da loja</h3>
              <div className="summary-list">
                <SummaryRow label="Nome" value={store.profile.name} />
                <SummaryRow label="Slug" value={store.profile.slug} />
                <SummaryRow label="Telefone" value={store.profile.phone} />
                <SummaryRow label="Categoria" value={store.profile.category} />
                <SummaryRow label="Delivery" value={store.profile.deliveryEnabled ? 'Ativo' : 'Desativado'} />
                <SummaryRow label="Mesa / QR" value={store.profile.dineInEnabled ? 'Ativo' : 'Desativado'} />
              </div>
            </div>

            <div className="panel large">
              <h3>Produtos em destaque</h3>
              <div className="mini-products">
                {store.products.filter((p) => p.featured).length === 0 ? (
                  <p className="muted">Nenhum produto em destaque.</p>
                ) : (
                  store.products
                    .filter((p) => p.featured)
                    .map((product) => (
                      <div key={product.id} className="mini-product-card">
                        <img src={product.imageUrl || store.profile.logoUrl} alt={product.name} />
                        <div>
                          <strong>{product.name}</strong>
                          <span>{money(product.price)}</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </section>
        )}

        {screen === 'store' && (
          <section className="section-stack">
            <div className="panel form-panel">
              <h3>Dados principais</h3>
              <div className="form-grid">
                <label>
                  Nome da loja
                  <input value={store.profile.name} onChange={(e) => handleProfileChange('name', e.target.value)} />
                </label>
                <label>
                  Slug
                  <input value={store.profile.slug} onChange={(e) => handleProfileChange('slug', e.target.value)} />
                </label>
                <label>
                  Telefone
                  <input value={store.profile.phone} onChange={(e) => handleProfileChange('phone', e.target.value)} />
                </label>
                <label>
                  Segmento
                  <input value={store.profile.category} onChange={(e) => handleProfileChange('category', e.target.value)} />
                </label>
                <label className="full-width">
                  Endereço
                  <input value={store.profile.address} onChange={(e) => handleProfileChange('address', e.target.value)} />
                </label>
                <label className="full-width">
                  Descrição
                  <textarea value={store.profile.description} onChange={(e) => handleProfileChange('description', e.target.value)} rows={4} />
                </label>
                <label>
                  Logo URL
                  <input value={store.profile.logoUrl} onChange={(e) => handleProfileChange('logoUrl', e.target.value)} />
                </label>
                <label>
                  Capa URL
                  <input value={store.profile.coverUrl} onChange={(e) => handleProfileChange('coverUrl', e.target.value)} />
                </label>
              </div>
              <div className="toggle-row">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={store.profile.deliveryEnabled}
                    onChange={(e) => handleProfileChange('deliveryEnabled', e.target.checked)}
                  />
                  Aceitar delivery
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={store.profile.dineInEnabled}
                    onChange={(e) => handleProfileChange('dineInEnabled', e.target.checked)}
                  />
                  Aceitar pedidos em mesa
                </label>
              </div>
            </div>

            <div className="panel preview-panel">
              <h3>Prévia visual da loja</h3>
              <div className="store-preview">
                <img className="cover-image" src={store.profile.coverUrl} alt="Capa da loja" />
                <div className="store-preview-body">
                  <img className="logo-image" src={store.profile.logoUrl} alt="Logo da loja" />
                  <div>
                    <h2>{store.profile.name}</h2>
                    <p>{store.profile.description}</p>
                    <small>{store.profile.address}</small>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {screen === 'categories' && (
          <section className="section-stack two-columns">
            <form className="panel form-panel" onSubmit={addCategory}>
              <h3>Nova categoria</h3>
              <label>
                Nome da categoria
                <input
                  value={categoryDraft.name}
                  onChange={(e) => setCategoryDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Sobremesas"
                />
              </label>
              <label>
                Descrição
                <textarea
                  rows={4}
                  value={categoryDraft.description}
                  onChange={(e) => setCategoryDraft((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva rapidamente esta categoria"
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={categoryDraft.active}
                  onChange={(e) => setCategoryDraft((prev) => ({ ...prev, active: e.target.checked }))}
                />
                Criar como ativa
              </label>
              <button className="primary-button" type="submit">Adicionar categoria</button>
            </form>

            <div className="panel">
              <h3>Categorias cadastradas</h3>
              <div className="list-stack">
                {store.categories.map((category) => (
                  <div key={category.id} className="list-card">
                    <div>
                      <strong>{category.name}</strong>
                      <p>{category.description || 'Sem descrição.'}</p>
                    </div>
                    <div className="list-actions">
                      <span className={category.active ? 'tag active-tag' : 'tag'}>
                        {category.active ? 'Ativa' : 'Inativa'}
                      </span>
                      <button className="ghost-button" onClick={() => toggleCategory(category.id)}>
                        {category.active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button className="danger-button" onClick={() => deleteCategory(category.id)}>
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {screen === 'products' && (
          <section className="section-stack two-columns">
            <form className="panel form-panel" onSubmit={addProduct}>
              <h3>Novo produto</h3>
              <label>
                Nome do produto
                <input
                  value={productDraft.name}
                  onChange={(e) => setProductDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Brownie da casa"
                />
              </label>
              <label>
                Descrição
                <textarea
                  rows={4}
                  value={productDraft.description}
                  onChange={(e) => setProductDraft((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o item"
                />
              </label>
              <div className="form-grid compact">
                <label>
                  Preço
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productDraft.price}
                    onChange={(e) => setProductDraft((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="0,00"
                  />
                </label>
                <label>
                  Categoria
                  <select
                    value={productDraft.categoryId || store.categories[0]?.id || ''}
                    onChange={(e) => setProductDraft((prev) => ({ ...prev, categoryId: e.target.value }))}
                  >
                    {store.categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                URL da foto
                <input
                  value={productDraft.imageUrl}
                  onChange={(e) => setProductDraft((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="Cole a imagem do produto"
                />
              </label>
              <div className="toggle-row">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={productDraft.active}
                    onChange={(e) => setProductDraft((prev) => ({ ...prev, active: e.target.checked }))}
                  />
                  Produto ativo
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={productDraft.featured}
                    onChange={(e) => setProductDraft((prev) => ({ ...prev, featured: e.target.checked }))}
                  />
                  Destacar no cardápio
                </label>
              </div>
              <button className="primary-button" type="submit">Adicionar produto</button>
            </form>

            <div className="panel">
              <h3>Produtos cadastrados</h3>
              <div className="product-list">
                {store.products.map((product) => {
                  const category = store.categories.find((item) => item.id === product.categoryId);
                  return (
                    <div key={product.id} className="product-card">
                      <img src={product.imageUrl || store.profile.logoUrl} alt={product.name} />
                      <div className="product-body">
                        <div className="product-header">
                          <div>
                            <strong>{product.name}</strong>
                            <span>{category?.name || 'Sem categoria'}</span>
                          </div>
                          <b>{money(product.price)}</b>
                        </div>
                        <p>{product.description || 'Sem descrição.'}</p>
                        <div className="list-actions">
                          <span className={product.active ? 'tag active-tag' : 'tag'}>
                            {product.active ? 'Ativo' : 'Inativo'}
                          </span>
                          <span className={product.featured ? 'tag featured-tag' : 'tag'}>
                            {product.featured ? 'Destaque' : 'Normal'}
                          </span>
                          <button className="ghost-button" onClick={() => toggleProduct(product.id, 'active')}>
                            Ativar / desativar
                          </button>
                          <button className="ghost-button" onClick={() => toggleProduct(product.id, 'featured')}>
                            Destacar
                          </button>
                          <button className="danger-button" onClick={() => deleteProduct(product.id)}>
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {screen === 'preview' && (
          <section className="panel preview-menu-panel">
            <div className="public-preview-header">
              <img className="cover-image" src={store.profile.coverUrl} alt="Capa da loja" />
              <div className="public-preview-info">
                <img className="logo-image" src={store.profile.logoUrl} alt="Logo" />
                <div>
                  <h2>{store.profile.name}</h2>
                  <p>{store.profile.description}</p>
                  <div className="tag-row">
                    <span className="tag active-tag">{store.profile.category}</span>
                    {store.profile.deliveryEnabled ? <span className="tag active-tag">Delivery ativo</span> : null}
                    {store.profile.dineInEnabled ? <span className="tag featured-tag">Mesa / QR ativo</span> : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="grouped-menu">
              {groupedProducts.map((group) => (
                <div key={group.id} className="menu-group">
                  <div className="menu-group-header">
                    <h3>{group.name}</h3>
                    <span className={group.active ? 'tag active-tag' : 'tag'}>
                      {group.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <p className="muted">{group.description || 'Sem descrição.'}</p>

                  <div className="menu-items-grid">
                    {group.products.length === 0 ? (
                      <p className="muted">Nenhum produto nesta categoria.</p>
                    ) : (
                      group.products.map((product) => (
                        <div key={product.id} className="menu-item-card">
                          <img src={product.imageUrl || store.profile.logoUrl} alt={product.name} />
                          <div>
                            <div className="menu-title-line">
                              <strong>{product.name}</strong>
                              <span>{money(product.price)}</span>
                            </div>
                            <p>{product.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function screenTitle(screen) {
  const titles = {
    dashboard: 'Visão geral',
    store: 'Minha loja',
    categories: 'Categorias',
    products: 'Produtos',
    preview: 'Prévia do cardápio',
  };
  return titles[screen] || 'Painel';
}

function StatCard({ label, value }) {
  return (
    <div className="panel stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

