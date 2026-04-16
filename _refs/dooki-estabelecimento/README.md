# Dooki - Painel do Estabelecimento

Versão inicial do sistema da Dooki focada apenas no **painel do estabelecimento**.

## O que já tem
- Login do estabelecimento
- Dashboard inicial
- Gestão completa da loja
- Cadastro e remoção de categorias
- Cadastro e remoção de produtos
- Foto por URL para logo, capa e produtos
- Prévia do cardápio público
- Persistência local com `localStorage`

## Conta de teste
- E-mail: `contato@burgerprime.com`
- Senha: `123456`

## Como rodar
```bash
npm install
npm run dev
```

Depois abra no navegador o endereço mostrado pelo Vite, normalmente:
```bash
http://localhost:5173
```

## Estrutura
- `src/App.jsx` → lógica principal do painel
- `src/styles.css` → estilos
- `src/main.jsx` → bootstrap React

## Observação
Essa versão é um MVP local, sem backend real ainda. Os dados ficam salvos no navegador via `localStorage`.
