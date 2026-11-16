# 🛡️ RenovaExt — MVP

> **Posicionamento Comercial em Teste:** *"Transforme sua carteira de manutenção de extintores em uma agenda organizada de renovações, sem abandonar seu sistema atual."*

O **RenovaExt** é um SaaS B2B brasileiro enxuto, seguro e responsivo (Web + PWA instalável) projetado para pequenas e médias empresas de inspeção, manutenção e recarga de extintores de incêndio que ainda dependem significativamente de planilhas.

---

## 🚀 Arquitetura e Stack do MVP

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons.
- **PWA Instalável:** Manifesto Web (`public/manifest.webmanifest`) e Service Worker (`public/sw.js`) prontos para instalação em celulares Android/iOS e computadores sem necessidade inicial de lojas.
- **Banco de Dados e Segurança:** PostgreSQL (Supabase) com políticas estritas de **Row Level Security (RLS)** isoladas por `company_id` (`supabase/migrations/20261112000001_renovaext_mvp_schema.sql`), além de camada local determinística isolada por empresa para homologação e demonstração imediata.
- **Importação de Planilhas:** Leitura client-side de arquivos `.CSV` e `.XLSX` (`xlsx`), assistente de associação de colunas, prévia editável, prevenção de duplicatas e marcação automática como **`Necessita conferência`** quando datas ou especificações técnicas estão ausentes (**zero invenção de datas**).
- **Geração de Propostas em PDF:** Geração client-side de PDF (`jspdf`) com cabeçalho da oficina, dados do cliente, equipamentos, preços 100% editáveis pelo usuário (**zero invenção de preços**) e nota regulatória (ABNT NBR 12962 / Portaria INMETRO nº 58/2022).
- **Isolamento Estrito:** Repositório 100% separado da *Zuno Prospect* e do *Zanotelli OS*.

---

## 💻 Como Executar Localmente

### 1. Instalar dependências
```bash
npm install
```

### 2. Iniciar servidor de desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:5173`.

### 3. Executar testes automatizados de aceitação (Vitest)
```bash
npm test
```

### 4. Gerar build de produção / homologação
```bash
npm run build
```

### 5. Verificar handshake e integridade de esquema/RLS (Protocolo V.L.A.E.G.)
```bash
npm run verify:link
```

---

## 🗄️ Configuração do Supabase (Quando Autorizado para Produção/Homologação Remota)

1. Crie um projeto dedicado ao **RenovaExt** no Supabase (separado de qualquer outro produto).
2. No SQL Editor do Supabase, execute o conteúdo integral de:
   [`supabase/migrations/20261112000001_renovaext_mvp_schema.sql`](./supabase/migrations/20261112000001_renovaext_mvp_schema.sql)
3. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

---

## 📂 Estrutura de Documentação e Entregáveis Comerciais

- [`gemini.md`](./gemini.md) — Constituição do Projeto, Esquemas de Dados e Invariantes.
- [`task_plan.md`](./task_plan.md) — Plano de Tarefas e Blueprint.
- [`findings.md`](./findings.md) — Auditoria técnica, normas ABNT/INMETRO e inteligência competitiva.
- [`progress.md`](./progress.md) — Log de progresso, testes e validações.
- [`architecture/`](./architecture/) — POPs técnicos (Autenticação/RLS, Importação, Radar e Propostas PDF).
- [`docs/comercial/01-auditoria-e-analise-competitiva.md`](./docs/comercial/01-auditoria-e-analise-competitiva.md)
- [`docs/comercial/02-lista-verificada-10-empresas.md`](./docs/comercial/02-lista-verificada-10-empresas.md)
- [`docs/comercial/03-mensagens-comerciais-individuais.md`](./docs/comercial/03-mensagens-comerciais-individuais.md)
- [`docs/comercial/04-proposta-piloto-30-dias.md`](./docs/comercial/04-proposta-piloto-30-dias.md)
- [`docs/comercial/05-briefing-site-comercial.md`](./docs/comercial/05-briefing-site-comercial.md)
- [`docs/comercial/06-custos-operacionais-e-provedores-pagamento.md`](./docs/comercial/06-custos-operacionais-e-provedores-pagamento.md)
- [`docs/comercial/07-proximas-acoes-2-pilotos-pagos.md`](./docs/comercial/07-proximas-acoes-2-pilotos-pagos.md)
