# 🛡️ EVIDÊNCIAS DE HOMOLOGAÇÃO REAL — SUPABASE STAGING (RENOVAEXT MVP)

> **Ambiente de Homologação (Staging Exclusivo):** `RenovaExt Staging`
> **Project Ref:** `xmuzcnjcwkhgojnaosha` (`sa-east-1` — São Paulo)
> **Endpoint PostgreSQL / REST / Auth:** `https://xmuzcnjcwkhgojnaosha.supabase.co`
> **Separação Estrita:** 100% isolado de *Zuno Prospect* e *Zanotelli OS*. Aplicado apenas em Staging (nenhuma migração executada em banco de terceiros ou produção sem autorização).

---

## 1. Auditoria Técnica do Código (Frente 1 — Item 1)

| Módulo / Arquivo | Funcionalidade Auditada | Status na Homologação |
|---|---|---|
| [`supabase/migrations/20261112000001_renovaext_mvp_schema.sql`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/supabase/migrations/20261112000001_renovaext_mvp_schema.sql) | 9 tabelas (`companies`, `profiles`, `clients`, `equipments`, `service_history`, `opportunities`, `opportunity_history`, `proposals`, `audit_logs`), índices, função `public.current_user_company_id()`, políticas RLS e RPC `public.bootstrap_company_account` | **Aplicado e Homologado no PostgreSQL Staging** |
| [`src/services/supabaseStagingSync.ts`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/src/services/supabaseStagingSync.ts) + [`src/services/tenantRepository.ts`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/src/services/tenantRepository.ts) | Autenticação real via `@supabase/supabase-js` + sincronização direta com o banco PostgreSQL sob RLS e cache local determinístico | **Implementado e Validado** |
| [`src/services/spreadsheetImportEngine.ts`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/src/services/spreadsheetImportEngine.ts) | Parser RFC-4180 UTF-8 para `.csv` e `xlsx` com `cellDates: true`, detecção de duplicatas por impressão digital composta, validação de datas inválidas (`32/13/2026`) e campos ausentes sem inventar vencimentos | **Homologado com CSV e XLSX Reais** |
| [`src/services/radarEngine.ts`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/src/services/radarEngine.ts) | Classificação determinística em `ATRASADO`, `D_30`, `D_60`, `D_90`, `FUTURO` e `INCOMPLETO` (`needs_review = true`) | **Homologado** |
| [`src/services/pdfProposalGenerator.ts`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/src/services/pdfProposalGenerator.ts) | Cálculo de subtotais/totais com preços informados pela oficina (bloqueio de proposta com R$ 0,00) e geração de PDF A4 com nota de isenção técnica | **Homologado (`proposta-homologacao-real.pdf`)** |
| [`src/components/Screen1RadarDashboard.tsx`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/src/components/Screen1RadarDashboard.tsx), [`Screen2ImportAndPortfolio.tsx`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/src/components/Screen2ImportAndPortfolio.tsx), [`Screen3ClientOpportunityProposal.tsx`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/src/components/Screen3ClientOpportunityProposal.tsx) | As 3 telas principais do MVP com responsividade para celular (`390x844`) e computador (`1280x800`) | **Homologado** |

---

## 2. Comprovação Real de Isolamento Multi-Tenant (RLS no PostgreSQL)

Foram criadas e autenticadas no **Supabase Auth** duas empresas distintas (além da conta de Demonstração Fictícia):

1. **Empresa Alpha:** `Oficina Alpha Extintores LTDA (Homologação)`
   - `company_id`: `e668eaec-d59c-4de2-974e-96efd4b90eb0`
   - `user_id` (Supabase Auth JWT): `7df8bf81-ef13-48a5-8dc6-caacb7814c56`
   - E-mail: `alpha.homologacao@renovaext-staging.com.br`
   - Carteira gravada no PostgreSQL: **6 clientes**, **6 lotes de equipamentos**, **1 proposta comercial (`PROP-2026-001`)**.

2. **Empresa Beta:** `Oficina Beta Prevenção Contra Incêndio LTDA (Homologação)`
   - `company_id`: `d4557676-1416-4b28-a057-e806f4c62120`
   - `user_id` (Supabase Auth JWT): `a8500dd7-fca6-468c-8f29-dfbb9a2ee024`
   - E-mail: `beta.homologacao@renovaext-staging.com.br`
   - Carteira gravada no PostgreSQL: **1 cliente próprio** (`Condomínio Residencial Araucária`).

### Resultado dos Testes de Invasão Cross-Tenant no PostgreSQL (`evidencias-homologacao-staging.json`)

| Vetor de Teste Executado com JWT da Empresa Beta | Resultado Retornado pelo PostgreSQL (Supabase Staging) | Status |
|---|---|---|
| `SELECT * FROM public.clients` (sem filtro `WHERE`) | Retornou apenas `1` registro (o próprio cliente da Beta). **`0` clientes da Alpha vazados.** | **APROVADO (RLS Ativo)** |
| `SELECT * FROM public.clients WHERE id = '0dfecfe8-f43a-48d6-bc18-fa85cebb5648'` (ID real de cliente da Alpha) | Retornou **`0` linhas** (`[]`). | **APROVADO (RLS Ativo)** |
| `SELECT * FROM public.proposals WHERE company_id = 'e668eaec-d59c-4de2-974e-96efd4b90eb0'` | Retornou **`0` linhas** (`[]`). | **APROVADO (RLS Ativo)** |
| `UPDATE public.clients SET notes = 'TENTATIVA_INVASAO_CROSS_TENANT' WHERE id = '0dfecfe8-...'` | Afetou **`0` linhas**. O registro da Alpha permaneceu intacto no banco. | **APROVADO (RLS Ativo)** |
| `INSERT INTO public.clients (company_id, name) VALUES ('e668eaec-...', 'Cliente Injetado Ilegalmente')` | **Bloqueado pelo PostgreSQL** com erro `42501`: `"new row violates row-level security policy for table \"clients\""` | **APROVADO (RLS Ativo)** |

---

## 3. Evidência de Importação CSV/XLSX (Formatos Incorretos, Duplicatas e Campos Ausentes)

Os arquivos reais utilizados no teste estão salvos em:
- **CSV:** [`docs/homologacao/planilha-teste-homologacao.csv`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/docs/homologacao/planilha-teste-homologacao.csv)
- **XLSX:** [`docs/homologacao/planilha-teste-homologacao.xlsx`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/docs/homologacao/planilha-teste-homologacao.xlsx)

### Comportamento linha a linha confirmado no banco PostgreSQL:

| Linha na Planilha | Cliente (Fictício) | Vencimento Informado | Resultado na Importação e no Radar |
|---|---|---|---|
| Linha 1 | Condomínio Edifício Atlântico Sul | `+14 dias` (`DD/MM/YYYY`) | Importado (`storedNextDueDate` ISO válido) • Janela **`D_30` (0 a 30 dias)** • `needsReview = false` |
| Linha 2 | Condomínio Edifício Atlântico Sul *(Duplicata exata da Linha 1)* | `+14 dias` | **Duplicata detectada por fingerprint e ignorada (`skippedDuplicates = 1`)** |
| Linha 3 | Metalúrgica Precisão Industrial | `-11 dias` (`DD/MM/YYYY`) | Importado • Janela **`ATRASADO` (-11 dias)** • `needsReview = false` |
| Linha 4 | Colégio Horizonte Saber | `+44 dias` (`DD/MM/YYYY`) | Importado • Janela **`D_60` (31 a 60 dias)** • `needsReview = false` |
| Linha 5 | Supermercado Bom Preço Matriz | `+75 dias` (`DD/MM/YYYY`) | Importado • Janela **`D_90` (61 a 90 dias)** • `needsReview = false` |
| Linha 6 | Padaria e Confeitaria Pão Dourado | `"32/13/2026"` *(Formato inválido)* | **`storedNextDueDate = null` (data NÃO inventada)** • `needsReview = true` (`"Data inválida (32/13/2026) — marcada para conferência"`) • Janela **`INCOMPLETO`** |
| Linha 7 | Clínica Médica Santa Clara | `""` *(Vencimento e tipo ausentes)* | **`storedNextDueDate = null` (data NÃO inventada)** • `needsReview = true` (`"Data de próximo acompanhamento/vencimento ausente; Tipo do extintor não informado"`) • Janela **`INCOMPLETO`** |

---

## 4. Evidência de Funil Comercial e Geração de Proposta PDF

- **Cliente selecionado:** `Condomínio Edifício Atlântico Sul (Fictício)` (`id: 0dfecfe8-f43a-48d6-bc18-fa85cebb5648`)
- **Movimentações gravadas em `public.opportunity_history`:**
  1. `null -> pronto_para_contato` (*Registro importado via Assistente de Planilhas*)
  2. `pronto_para_contato -> contatado` (*Contato realizado com o síndico Sr. Roberto*)
  3. `contatado -> proposta_preparada` (*Cotação montada com preços da oficina*)
  4. `proposta_preparada -> proposta_enviada` (*PDF enviado para aprovação do condomínio*)
- **Proposta gravada em `public.proposals`:**
  - `id`: `f5f9ede5-ca7d-450c-8e5e-1a8b9e8988de`
  - `proposal_number`: `PROP-2026-001`
  - Itens cotados com preços editados pela oficina:
    - `18x Extintor PQS ABC 4kg` × `R$ 65,00` = `R$ 1.170,00`
    - `6x Extintor Água Pressurizada 10L` × `R$ 55,00` = `R$ 330,00`
  - `total_brl`: **`R$ 1.500,00`**
- **Arquivo PDF real gerado:** [`docs/homologacao/proposta-homologacao-real.pdf`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/docs/homologacao/proposta-homologacao-real.pdf) (`5.070 bytes`).
- **Relatório JSON auditável:** [`docs/homologacao/evidencias-homologacao-staging.json`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/docs/homologacao/evidencias-homologacao-staging.json).
