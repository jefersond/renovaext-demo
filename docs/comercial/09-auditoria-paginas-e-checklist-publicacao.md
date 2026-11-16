# 09 — Diagnóstico Preview vs. Produção, Hardening de Segurança e Versão Candidata à Publicação

> **Escopo:** `GEMINI — RENOVAEXT | FINALIZAR A PUBLICAÇÃO E PREPARAR A PRIMEIRA RODADA DE VENDAS`
> **Regra de Governança:** Nenhuma mensagem externa foi enviada, nenhuma cobrança foi ativada e a promoção final para produção aguarda aprovação explícita do fundador (`node tools/promote_release_candidate_to_production.mjs --confirm-founder-approval`).

---

## 1. Diagnóstico Exato das Diferenças entre Preview e Produção (Item 1)

A inspeção determinística executada por [`tools/inspect_pages_and_git_state.mjs`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/tools/inspect_pages_and_git_state.mjs) e via API do GitHub (`repos/jefersond/renovaext-demo`) identificou a causa exata pela qual as URLs principais apresentaram a versão anterior enquanto `/preview/*` exibia o formulário novo:

| Fator Técnico Identificado | Comportamento nas URLs Principais (`/comercial.html`, `/proposta-piloto.html`, `/?demo=1`) | Comportamento em `/preview/*` | Correção Implementada na Versão Candidata (`rc/publicacao-rodada-1`) |
|---|---|---|---|
| **1. Cache HTTP do CDN Fastly (GitHub Pages) + Navegador** | Como as rotas principais já haviam sido abertas antes do commit `5d3a9e7`, o cabeçalho `Cache-Control: max-age=600` (10 minutos) do GitHub Pages manteve o HTML anterior no cache local/borda durante a janela de transição. | Rotas inéditas (`/preview/*`) não tinham entrada prévia no cache do navegador/CDN e serviram o HTML novo imediatamente. | Adicionado versionamento explícito `?v=20261115-rc2` na inclusão de `lead-capture-widget.js` e limpeza integral de `assets/` no script de promoção. |
| **2. Service Worker PWA (`sw.js`)** | O `sw.js` anterior usava `CACHE_NAME = 'renovaext-pwa-v1'` e caminhos absolutos (`/`, `/index.html`), podendo reter navegação antiga no navegador do visitante. | Não tinha Service Worker registrado previamente no escopo `/preview/`. | Atualizado [`public/sw.js`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/public/sw.js) para `renovaext-pwa-v2-20261115` com estratégia **Network-First (`cache: 'no-cache'`)** para documentos HTML e exclusão automática de caches antigos. |
| **3. Acúmulo de Bundles Antigos em `assets/`** | O comando `Copy-Item` anterior copiou o novo bundle sem apagar os arquivos `assets/index-*.js` antigos no repositório remoto. | Criado do zero apenas com o bundle novo. | O script [`tools/promote_release_candidate_to_production.mjs`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/tools/promote_release_candidate_to_production.mjs) remove `assets/` antigo antes de copiar `dist/`, garantindo paridade binária 1:1. |

---

## 2. Hardening de Segurança, Rate Limiting no Servidor e Proteção de Dados Pessoais (Itens 3, 4 e 5)

Aplicadas no Supabase Staging (`xmuzcnjcwkhgojnaosha`) as migrações [`20261115000004_hardened_lead_rpc_and_founder_admin_view.sql`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/supabase/migrations/20261115000004_hardened_lead_rpc_and_founder_admin_view.sql) e [`20261115000005_fix_sha256_native_in_submit_lead.sql`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/supabase/migrations/20261115000005_fix_sha256_native_in_submit_lead.sql), com bateria de testes automatizados em [`tools/test_lead_flow_and_crm_sync.mjs`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/tools/test_lead_flow_and_crm_sync.mjs):

| Vetor de Segurança / Privacidade Auditado | Implementação Técnica no Servidor e Frontend | Resultado do Teste Real ([`evidencias-fluxo-leads-comerciais.json`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/docs/homologacao/evidencias-fluxo-leads-comerciais.json)) |
|---|---|---|
| **Rate Limiting no Servidor por E-mail** | Tabela interna `public.commercial_lead_rate_limits` (com `RLS` + `REVOKE ALL`) armazena apenas hash SHA-256 (`pg_catalog.sha256`) do e-mail e bloqueia mais de **1 submissão a cada 10 minutos** (e máx. 3 em 24h). | **APROVADO** (`serverSideEmailRateLimitBlocked: true` — `SPAM_PROTECTION_RATE_LIMIT`) |
| **Rate Limiting no Servidor por IP + Disjuntor Global** | Extrai o IP real do cabeçalho HTTP `request.headers` (`cf-connecting-ip` / `x-forwarded-for`) no PostgreSQL, gera hash SHA-256 irreversível (sem guardar IP puro) e limita a **4 envios por IP em 10 min** e **15 envios globais em 5 min**. | **APROVADO** |
| **Proteção contra Bots e Injeção (Honeypot, Tempo Mínimo e Anti-XSS)** | Bloqueia submissões com campo oculto preenchido (`SPAM_PROTECTION_HONEYPOT`), tempo `< 800ms` (`SPAM_PROTECTION_FAST_SUBMIT`), ausência de aceite LGPD (`PRIVACY_CONSENT_REQUIRED`) e tags HTML/links em nomes (`INVALID_CHARACTERS_DETECTED`). | **APROVADO** (`honeypotBlocked: true`, `fastSubmitBlocked: true`, `xssAndLinkInjectionBlocked: true`) |
| **Zero Exposição de Dados Pessoais (PII) no Frontend / Logs** | A RPC `public.submit_commercial_lead` retorna apenas `{ id, protocolCode, intentType, portfolioSize, planInterest, isTestSubmission, status, createdAt }`. O navegador ([`lead-capture-widget.js`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/public/lead-capture-widget.js) e [`commercialLeadService.ts`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/src/services/commercialLeadService.ts)) **não grava** nome, e-mail, telefone ou oficina em `localStorage` (guarda apenas timestamps numéricos de cooldown). | **APROVADO** (`piiExposedInPublicRpcResponse: false`) |
| **Auditoria do Bundle Público (`dist/`)** | Executado [`tools/verify_public_bundle_security.mjs`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/tools/verify_public_bundle_security.mjs) sobre os 13 arquivos compilados em `dist/`. | **APROVADO** (`serviceRoleLeaked: false`, `adminSecretsLeaked: false`) |

---

## 3. Forma Simples e Autenticada para o Fundador Consultar Interessados e Sincronização Contínua com o CRM (Itens 6, 7 e 8)

### 3.1. Como Consultar e Atualizar Interessados (Sem `service_role` no Navegador)
Foram disponibilizadas duas formas complementares e seguras:

1. **Painel Web Autenticado do Fundador (`/painel-fundador-crm.html`):**
   - Arquivo incluído na versão candidata: [`public/painel-fundador-crm.html`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/public/painel-fundador-crm.html).
   - Utiliza **exclusivamente a chave pública `anon` + login padrão Supabase Auth (`signInWithPassword` JWT)** — **zero `service_role` no navegador**.
   - No banco PostgreSQL, as funções `public.founder_list_commercial_leads` e `public.founder_update_commercial_lead_status` exigem `public.is_authenticated_founder_admin()` (verificando se `auth.uid()` pertence à tabela restrita `public.founder_admin_users`).
   - **Comprovado em teste real:**
     - Visitante anônimo (`anon`) → **Bloqueado** (`ACCESS_DENIED_FOUNDER_ONLY`);
     - Oficina comum autenticada (`Oficina Alpha`) → **Bloqueada** (`ACCESS_DENIED_FOUNDER_ONLY`);
     - Conta autenticada do fundador → **Autorizada**, exibindo **Data/Hora, Protocolo, Oficina, Responsável, E-mail/WhatsApp clicáveis, Tamanho da Carteira, Plano (`R$ 49` ou `R$ 79`) e seletor de Status de Acompanhamento**.
2. **Consulta Rápida via Terminal Local (`npm run crm:consultar`):**
   - Executando `npm run crm:consultar` ([`tools/founder_leads_cli.mjs`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/tools/founder_leads_cli.mjs)), o fundador lista no terminal todos os interessados reais ou atualiza o status de um protocolo (`node tools/founder_leads_cli.mjs --status SOL-XXXX demonstracao_agendada`).

### 3.2. Como Funciona a Sincronização Contínua ao CRM (Item 7)
- A sincronização **não depende de executar scripts manuais de teste**:
  - Foi criado no PostgreSQL o trigger automático **`trg_sync_lead_to_crm_pipeline`** (`AFTER INSERT OR UPDATE ON public.commercial_leads FOR EACH ROW EXECUTE FUNCTION public.sync_commercial_lead_to_crm()`).
  - No exato milissegundo em que um visitante envia o formulário em `/comercial.html`, `/proposta-piloto.html` ou `/?demo=1`, o banco grava em `public.commercial_leads` e o trigger insere/atualiza automaticamente o registro correspondente em `public.commercial_crm_pipeline`.

### 3.3. Remoção do Registro Fictício de Teste dos Indicadores Reais (Item 8)
- O registro técnico de homologação (`SOL-20261116-9050C7`) possui `is_test_submission = true` (`is_test_record = true`).
- Os indicadores de clientes reais calculados no PostgreSQL (`realCustomerIndicators`) e em [`docs/comercial/08-registro-crm-interessados-e-pilotos.json`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/docs/comercial/08-registro-crm-interessados-e-pilotos.json) filtram estritamente `is_test_submission = false`:
  - `realLeadsTotal: 0`
  - `realPendingContact: 0`
  - `realDemoRequests: 0`
  - `realPilotRequests: 0`
  - `confirmedPaidPilots: 0`
  - `excludedTechnicalTestRecords: 1` (evidência preservada separadamente em [`docs/homologacao/evidencias-fluxo-leads-comerciais.json`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/docs/homologacao/evidencias-fluxo-leads-comerciais.json)).

---

## 4. Viabilidade Operacional da Resposta em Até 1 Dia Útil (Item 9)

A promessa de retorno comercial em **até 1 dia útil (dias úteis, segunda a sexta-feira)** é 100% viável para a operação atual do fundador porque:
1. **Volume controlado por lotes (5 oficinas na Rodada 1):** Como a prospecção inicial aborda apenas 5 oficinas prioritárias, o volume máximo de retorno simultâneo é de 1 a 5 conversas.
2. **Rotina diária de 5 minutos:** Basta abrir o painel autenticado (`/painel-fundador-crm.html`) ou rodar `npm run crm:consultar` duas vezes por dia útil (ex.: 10h e 16h).
3. **Ação em 1 clique:** O painel já gera o link direto de resposta por e-mail (`mailto:` com assunto e protocolo preenchidos) e o link direto para WhatsApp (`wa.me/55...`), permitindo responder a qualquer interessado em menos de 2 minutos.
