# Dooki

Base web da Dooki com admin, login de loja, painel do estabelecimento, cozinha, entregador e cardapios conectados ao Supabase por chave publica.

## Arquivos principais

- `index.html`: login do admin
- `admin.html`: painel administrativo
- `login.html`: login do restaurante
- `supabase-client.js`: cliente publico do Supabase
- `dooki-data.js`: camada de dados compartilhada entre as paginas
- `admin-app.js`: fluxo e CRUD do admin
- `modules-app.js`: paginas da loja, cozinha, entregador e cardapios
- `supabase-schema.sql`: schema sugerido para as tabelas esperadas

## Observacoes

- O frontend usa apenas a chave publica/publishable.
- `service_role`, `secret key` e chaves sensiveis nao devem ir para o navegador.
- Se as tabelas ainda nao existirem no projeto Supabase, aplique o `supabase-schema.sql`.
