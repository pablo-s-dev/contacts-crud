 # Contacts CRUD — Context Challenge
 
 Aplicação full‑stack de **cadastro de contatos** (CRUD) construída com **Node.js + TypeScript + PostgreSQL (Prisma)** no backend e **React + TypeScript** no frontend.
 

 ## Stack e principais bibliotecas
 
 - **Backend**
   - **Fastify**: framework HTTP enxuto e performático.
   - **Prisma + PostgreSQL**: ORM com tipagem forte e migrações versionadas.
   - **Zod (v4)**: validação e inferência de tipos para DTOs/params/query.
   - **@fastify/helmet / @fastify/cors / @fastify/rate-limit**: baseline de segurança e proteção.
   - **Pino**: logs estruturados.
   - **prom-client**: métricas Prometheus via endpoint `/metrics`.
   - **ioredis (opcional)**: cache via Redis com fallback para cache em memória.
   - **libphonenumber-js**: validação de telefone.
 
 - **Frontend**
   - **React + Vite**: DX rápida e build moderno.
   - **@tanstack/react-query**: cache de requisições e mutations previsíveis.
   - **react-hook-form + zod**: validação inline e formulário tipado.
   - **TailwindCSS + shadcn/ui (Radix)**: UI moderna, acessível e customizável.
   - **Axios**: client HTTP simples.
 
 ## Requisitos do desafio (o que está implementado)
 
 - **Entidade `Contact`** com `id`, `name`, `email`, `phone`, `createdAt`, `updatedAt`.
 - **API REST** (prefixo `/v1`):
   - `GET /v1/contacts` com **busca** e **paginação**.
   - `POST /v1/contacts`.
   - `PUT /v1/contacts/:id`.
   - `DELETE /v1/contacts/:id`.
 - **PostgreSQL + Prisma**
   - Migrações versionadas (`backend/prisma/migrations`).
   - Seed com **50 contatos** (`backend/prisma/seed.ts`).
 - **Validação server-side** com Zod (inclui `email` e obrigatórios).
 - **Frontend**: tela única com lista + busca + paginação + formulário create/edit + loading/erro.
 - **Testes**
   - Backend: `vitest` com testes de integração usando `app.inject`.
   - Frontend: `vitest` + Testing Library (testes de componentes).
 
 ## Arquitetura e organização (Vertical Slice)
 
 O projeto está organizado por **features** (fatiamento vertical), priorizando coesão por caso de uso.
 
 - **Backend**: `backend/src/features/contacts/*`
   - Rotas registradas em `contacts.routes.ts`.
   - Handlers separados por caso de uso (`createContact.ts`, `getContacts.ts`, `updateContact.ts`, `deleteContact.ts`).
 
 - **Frontend**: `frontend/src/features/contacts/*`
   - Componentes e formulários isolados por domínio (`ContactList`, `ContactForm`, `ContactDialog`).
   - Comunicação HTTP em `src/services/contactService.ts`.
   - Regras de fetching/mutations no hook `src/hooks/useContacts.ts`.
 
 ## Contrato da API
 
 **Base URL** (dev): `http://localhost:3000/v1`
 
 ### GET `/contacts`
 
 Parâmetros:
 
 - `q` (opcional): busca por `name`/`email` (case-insensitive) e também por `phone`.
 - `page` (default `1`) e `pageSize` (default `10`, máx `100`).
 - `sort` (opcional): `name | email | createdAt`.
 - `order` (default `asc`): `asc | desc`.
 - `pagination` (default `offset`): `offset | keyset`.
 - `cursor` (opcional): usado quando `pagination=keyset`.
 
 Resposta (offset pagination):
 
 ```json
 { "data": [], "page": 1, "pageSize": 10, "total": 42, "totalPages": 5, "pagination": "offset" }
 ```
 
 Resposta (keyset pagination):
 
 ```json
 { "data": [], "cursor": "...", "hasMore": true, "pagination": "keyset" }
 ```
 
 Observação sobre busca por telefone:
 
 - Quando `q` contém ao menos 3 dígitos e `pagination=offset`, a busca normaliza o telefone removendo caracteres não numéricos.
 - Foi usada query raw **com `Prisma.sql` (parametrizada)** para evitar SQL injection.
 
 ### POST `/contacts`
 
 Corpo:
 
 ```json
 { "name": "Ana", "email": "ana@ex.com", "phone": "+55 11 98888-8888" }
 ```
 
 - Retorna `201` e o contato criado.
 - `email` é único.
 - Suporta idempotência via header `idempotency-key`.
 
 ### PUT `/contacts/:id`
 
 - Atualização parcial (body é `partial`).
 - Valida `id` como UUID.
 - Retorna `404` se não encontrar.
 - Retorna `409` se trocar `email` para um já existente.
 - Suporta idempotência via header `idempotency-key`.
 
 ### DELETE `/contacts/:id`
 
 - Retorna `204` em sucesso.
 
 ### Erros
 
 - `400`: erro de validação (Zod), com mensagem descritiva.
 - `404`: recurso não encontrado.
 - `409`: conflito (ex.: email duplicado).
 - `500`: erro interno.
 
 ## Como rodar (desenvolvimento)
 
 ### Pré‑requisitos
 
 - Node.js `18+`
 - Docker + Docker Compose (para Postgres)
 
 ### 1) Banco de dados (PostgreSQL via Docker)
 
 ```bash
 cd backend
 docker-compose up -d
 ```
 
 
 ### 2) Variáveis de ambiente
 
 Crie arquivos `.env` a partir dos exemplos:
 
 - `backend/.env` (baseado em `backend/.env.example`)
 - `frontend/.env` (baseado em `frontend/.env.example`)
 
 Backend:
 
 - `DATABASE_URL` (obrigatório)
 - `PORT` (default `3000`)
 - `NODE_ENV` (`development | production | test`)
 - `FRONTEND_URL` (obrigatório em produção)
 - `REDIS_URL` (opcional)
 
 Frontend:
 
 - `VITE_CONTACTS_API_URL` (ex.: `http://localhost:3000`)
 
 ### 3) Instalar dependências
 
 ```bash
 cd backend
 npm install
 
 cd ..\frontend
 npm install
 ```
 
 ### 4) Migrar e popular o banco
 
 ```bash
 cd backend
 npm run migrate:dev
 npm run seed
 ```
 
 ### 5) Subir backend e frontend
 
 ```bash
 cd backend
 npm run dev
 ```
 
 Em outro terminal:
 
 ```bash
 cd frontend
 npm run dev
 ```
 
 URLs:
 
 - Backend: `http://localhost:3000` (API em `http://localhost:3000/v1`)
 - Frontend: `http://localhost:5173`
 
 ## Scripts
 
 - **Backend** (`backend/package.json`)
   - `npm run dev`
   - `npm run build`
   - `npm start`
   - `npm test`
   - `npm run migrate:dev`
   - `npm run migrate:deploy`
   - `npm run seed`
 
 - **Frontend** (`frontend/package.json`)
   - `npm run dev`
   - `npm run build`
   - `npm run preview`
   - `npm run lint`
   - `npm test`
 
 ## Observabilidade e segurança (decisões implementadas)
 
 - **CORS**
   - Em `development`: `origin='*'`.
   - Em `production`: `origin=FRONTEND_URL`.
 - **Rate limit**: `100` req / `1 minute`.
 - **Helmet**: headers de segurança.
 - **Logs estruturados** (Pino) + **correlationId** para rastrear requests.
 - **Métricas** (Prometheus) em `GET /metrics`.
 
  Como acessar:
 
  - `GET http://localhost:3000/metrics`
  - Ex.: `curl http://localhost:3000/metrics`
 
  Isso **fica exposto** se você publicar a API na internet do jeito que está (não há autenticação nesse endpoint hoje). Em produção, o recomendado é:
 
  - expor `/metrics` apenas na rede interna (ex.: via reverse proxy / ingress),
  - restringir por IP allowlist, ou
  - adicionar autenticação (por exemplo Basic Auth) / separar o listener de métricas.
 - **Cache**
   - Usa Redis se `REDIS_URL` existir; caso contrário, fallback para cache em memória.
   - Respostas do `GET /contacts` são cacheadas por 5 minutos.
 - **Idempotência**
   - Header `idempotency-key` em `POST` e `PUT`.
   - TTL de 24h para deduplicação.
 
 ## ⚙️ Spec Engineering
 
 ### Assunções explícitas
 
 - **Paginação**: `pageSize` default `10`, máximo `100`.
 - **Unicidade**: `email` é único (DB e aplicação). `phone` **não** é único.
 - **Formato de telefone**: API valida com `libphonenumber-js` (telefone precisa ser válido). Persistência é `string`.
 - **Exclusão**: hard delete (sem `deletedAt`).
 - **Cache**: habilitado por padrão (in-memory), Redis é opcional.
 - **Busca por telefone**: normaliza dígitos para maior tolerância a máscaras.
 
 ### Perguntas que eu faria ao time
 
 - **Conflito de telefone**: telefone precisa ser único como email? Qual regra de negócio?
 - **Normalização**: devemos salvar telefone sempre em E.164? (hoje é string livre, mas validada).
 - **Dark mode**: vocês querem que eu implemente dark mode? Se sim, existe alguma preferência de abordagem (Tailwind + CSS variables / design tokens) e critérios de aceite?
 - **Paginação**: a API deve expor **apenas** offset (mais simples) ou também keyset (mais escalável)?
 
 ### Mini‑ADRs (Decisões arquiteturais)
 
 1) **Fastify no backend**
 
 - **Contexto**: CRUD simples, mas com preocupação de performance e validação.
 - **Alternativas**: Express, NestJS.
 - **Decisão**: Fastify.
 - **Consequências**
   - Positiva: ótimo throughput e plugins maduros.
   - Negativa: padrão de middleware/typed hooks difere do Express.
 
 2) **Prisma + PostgreSQL**
 
 - **Alternativas**: Knex, TypeORM.
 - **Decisão**: Prisma.
 - **Consequências**
   - Positiva: tipagem forte e migrations/seed simples.
   - Negativa: queries avançadas às vezes exigem `raw` (ex.: busca por telefone normalizada).
 
 3) **Zod v4 para validação**
 
 - **Alternativas**: Yup, class-validator.
 - **Decisão**: Zod.
 - **Consequências**
   - Positiva: tipos inferidos e schemas reutilizáveis.
   - Negativa: atenção a APIs deprecated (por ex. preferir `z.email()` e `z.uuid()` quando aplicável).
 
 4) **React Query para estado servidor**
 
 - **Alternativas**: Redux Toolkit Query, SWR.
 - **Decisão**: React Query.
 - **Consequências**
   - Positiva: invalidation consistente e menos boilerplate.
   - Negativa: é mais uma camada conceitual (chaves, stale time, etc.).
 
 ## 🌐 Context Engineering
 
 ### Escalabilidade (e se tiver 1 milhão de contatos?)
 
 - **Índices**: já existem índices em `email` (unique), `name` e `createdAt` (schema Prisma).
 - **Paginação**
   - Offset funciona bem até certo volume.
   - Para volume alto, a API já suporta **keyset pagination** (cursor) para reduzir custo de `OFFSET`.
 - **Busca**: para casos avançados (relevância, fuzzy), eu avaliaria Postgres full-text (`tsvector`) ou um motor dedicado.
 - **Cache**: Redis (quando disponível) para amortizar leituras repetidas.
 
 ### Confiabilidade
 
 - **Transações**: `POST` e `PUT` usam transação para garantir atomicidade (ex.: checagem de email + escrita).
 - **Idempotência**: header `idempotency-key` previne duplicidade acidental (ex.: double submit).
 - **Falhas e erros**: handler global padroniza erros (ex.: validação Zod retorna `400`).
 
 ### Evolução (adicionar `Company` 1:N sem quebrar API)
 
 - Adicionar model `Company`.
 - Introduzir `companyId` em `Contact` inicialmente nullable.
 - Expor campo opcional/expand em `GET /contacts` (mudança aditiva).
 - Evoluir sem breaking changes e com migração gradual.
 
 ### Observabilidade
 
 - **Logs**: estruturados com correlação por request.
 - **Métricas**: endpoint `/metrics` com contadores/histogramas (HTTP, DB, cache).
 - Próximo passo: propagar `correlationId` via header (ex.: `x-correlation-id`) para tracing distribuído.
 
 ## 🧠 Prompt Engineering
 
 ### Como usei (e revisei) IA
 
 Usei IA como copiloto para:
 
 - criar esqueletos repetitivos (handlers, schemas, testes),
 - revisar validações/deprecations do Zod,
 - sugerir melhorias de legibilidade e modularização.
 
 Tudo foi revisado manualmente, em especial:
 
 - APIs deprecated (ex.: preferir `z.email()` e `z.uuid()`),
 - validação de telefone via `libphonenumber-js`,
 - CORS em dev vs prod,
 - pontos de segurança em SQL/raw queries (eu identifiquei que uma versão sugerida usava `queryRawUnsafe` e ajustei para uma query parametrizada com `Prisma.sql`).
 
 ### 2 prompts que geraram valor
 
 1) `"Refatore o endpoint GET /contacts (getContacts) para modularizar a lógica de cursor/keyset pagination em utilitários reutilizáveis, mantendo tipagem e comportamento."`
 
 2) `"Crie testes automatizados mínimos (backend e frontend) para o CRUD de contatos: no backend com Vitest + Fastify inject cobrindo 201/409/400/404 e paginação/busca/ordenação; no frontend com Vitest + Testing Library cobrindo listagem, empty state, ações e validação do formulário."`
 
 ### Checklist de revisão manual
 
 - [x] Tipagem em DTOs/params/query.
 - [x] Status HTTP coerentes (`400`, `404`, `409`, `500`).
 - [x] Validação server-side e client-side.
 - [x] Evitar queries inseguras (`$queryRawUnsafe`).
 - [x] CORS/rate-limit/helmet configurados.
 - [x] Testes automatizados básicos.
 
 ## ✅ Checklist final (referência do desafio)
 
 - [x] CRUD funcional (Node/React/Postgres)
 - [x] Tipagem e validação
 - [x] README completo (como rodar, envs, API, implementado vs pendente)
 - [x] Testes (`npm test` no backend e no frontend)
 - [x] Seções: Spec Engineering, Context Engineering, Prompt Engineering
