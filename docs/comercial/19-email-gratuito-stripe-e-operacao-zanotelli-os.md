# 19 — E-mail Gratuito (`comercial@renovaext.com.br`), Isolamento Stripe, Rollback e Operação 24/7 na Zanotelli OS

> **Data:** 25 de Novembro de 2026  
> **Regras de Governança:** ZERO alterações de DNS executadas, ZERO contratação de serviços, ZERO cobranças reais e ZERO disparos comerciais realizados sem confirmação expressa do fundador.

---

## 1. Solução 100% Gratuita (R$ 0,00/mês) para `comercial@renovaext.com.br` + Compatibilidade Real com a Zanotelli OS

### 1.1. Estado Atual Verificado (DNS ao vivo + Zanotelli OS)
- **DNS atual em `renovaext.com.br` (Cloudflare — `katja/rohin.ns.cloudflare.com`):**
  - `MX`: `.` (Null MX — bloqueia recebimento)
  - `TXT`: `v=spf1 -all` (bloqueia envio)
  - `_dmarc`: `v=DMARC1; p=reject;` (rejeita qualquer envio não alinhado)
- **Compatibilidade REAL com a Zanotelli OS (verificada no código-fonte de `Grupo zanotelli`):**
  - A Zanotelli OS **já possui infraestrutura nativa para Resend** (`supabase/functions/resend-provider-configure`, `resend-provider-status`, `resend-test-send`) e o **Resend possui plano GRATUITO** (`3.000 e-mails/mês`, `100/dia`, `1 domínio próprio`).
  - O **Hunter Free** comporta apenas **1 caixa por workspace** e esse slot já pertence à Zuno Propect (`zunopropect@gmail.com`). Logo, **não** devemos misturar o RenovaExt no Hunter da Zuno.
  - A conta **Cloudflare Free** já ativa em `renovaext.com.br` inclui **Cloudflare Email Routing gratuito** para **receber** `comercial@renovaext.com.br`, `contato@renovaext.com.br` e `suporte@renovaext.com.br` e encaminhar para a caixa de destino do fundador.

### 1.2. Arquitetura Gratuita Recomendada (`R$ 0,00/mês`, 100% Alinhada com SPF + DKIM + DMARC e Zanotelli OS / Helena)
- **Recebimento (Inbound — R$ 0,00):** **Cloudflare Email Routing** → recebe `comercial@renovaext.com.br` (e aliases `contato@` / `suporte@`) e encaminha para a caixa Gmail dedicada ao RenovaExt (nunca `zunopropect@gmail.com`).
- **Envio (Outbound — R$ 0,00):** **Resend Free** (`renovaext.com.br` verificado com DKIM/SPF próprios) integrado via `resend-provider-configure` na Zanotelli OS (Helena) + `Reply-To: comercial@renovaext.com.br`.
  - *(Alternativa também ~R$ 0,00 usando conta AWS já existente do Lightsail: **AWS SES**, US$ 0,10 por 1.000 e-mails; porém a Zanotelli OS ainda não tem Edge Function nativa de AWS SES, enquanto **já tem** de Resend!)*

### 1.3. Configuração DNS Exata (AGUARDANDO SUA APROVAÇÃO — NENHUMA ALTERAÇÃO FEITA)
Quando você aprovar, os registros abaixo serão aplicados na zona `renovaext.com.br` da Cloudflare:

| Ação | Tipo | Nome | Valor / Destino | Finalidade |
|---|---|---|---|---|
| **Remover** | `MX` | `@` | `.` (Null MX) | Desbloquear recebimento |
| **Adicionar** | `MX` | `@` | `route1.mx.cloudflare.net` (prio 10), `route2.mx.cloudflare.net` (prio 20), `route3.mx.cloudflare.net` (prio 30) *(gerados automaticamente pelo botão Enable Email Routing na Cloudflare)* | Receber `comercial@renovaext.com.br` grátis |
| **Adicionar** | `MX` | `send` | `feedback-smtp.sa-east-1.amazonses.com` (prio 10 — gerado pelo Resend ao adicionar o domínio) | Bounce/Return-Path do Resend |
| **Adicionar** | `TXT` | `send` | `v=spf1 include:amazonses.com ~all` (gerado pelo Resend) | SPF de envio alinhado |
| **Adicionar** | `TXT` | `resend._domainkey` | *(chave pública DKIM gerada na conta Resend)* | Assinatura criptográfica DKIM |
| **Alterar** | `TXT` | `@` | `v=spf1 include:_spf.mx.cloudflare.net ~all` | Substitui `v=spf1 -all` para permitir routing |
| **Alterar** | `TXT` | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:comercial@renovaext.com.br; adkim=r; aspf=r;` | Transição segura de `p=reject` durante aquecimento inicial (retorna para `p=reject` após 14 dias sem falha) |

---

## 2. Análise Real do Stripe (Isolamento Total da Zuno Propect)

### 2.1. Risco Comprovado no Código Real da Zuno Propect
Ao auditar `Zuno propecção/supabase/functions/stripe-webhook/index.ts` (linhas 138–160), comprovamos que:
1. O webhook atual da Zuno **não filtra por `metadata.product`** e faz fallback de plano por valor (`amount`) assumindo `"pro"` por padrão;
2. A única chave encontrada localmente na pasta da Zuno é **`sk_live_...`** (produção real da Zuno — **intocada**); não existe chave de teste `sk_test_...` do RenovaExt configurada neste ambiente.
3. **Conclusão técnica:** Criar produtos/assinaturas do RenovaExt na **mesma conta Stripe da Zuno** causaria **interferência direta** (o webhook da Zuno receberia eventos de pagamento do RenovaExt e tentaria processá-los/repassá-los como receita da Zuno).

### 2.2. Arquitetura Segura no Stripe (Mesmo Login/CNPJ/Banco — ZERO Interferência na Zuno)
- No Stripe Dashboard, o mesmo titular pode criar uma **Nova Conta Isolada ("RenovaExt")** no seletor do canto superior esquerdo (custo fixo **R$ 0,00**, mesmo CPF/CNPJ e conta bancária).
- Dentro da subconta isolada **RenovaExt**:
  - **Modo Teste (`Test Mode`)** → criar 2 produtos:
    1. `RenovaExt Plano Inicial` — **R$ 49,00 / mês** (`metadata: { product: "renovaext", plan_code: "inicial_49" }`);
    2. `RenovaExt Plano Profissional` — **R$ 79,00 / mês** (`metadata: { product: "renovaext", plan_code: "profissional_79" }`);
  - Configurar o webhook exclusivo apontando para:
    `https://xmuzcnjcwkhgojnaosha.supabase.co/functions/v1/renovaext-stripe-webhook`
  - Gravar o segredo `RENOVAEXT_STRIPE_WEBHOOK_SECRET` (`whsec_...`) exclusivamente nos Secrets do Supabase do RenovaExt (`xmuzcnjcwkhgojnaosha`).
- **O que já está pronto e validado no RenovaExt:**
  - Edge Function `supabase/functions/renovaext-stripe-webhook/` (assinatura HMAC-SHA256 + filtro estrito `metadata.product === 'renovaext'` + idempotência na tabela `public.renovaext_stripe_events` + ativação automática de `billing_active = true` e `subscription_status = 'assinatura_ativa'` em `public.companies`).
  - Testes determinísticos em `src/__tests__/stripeWebhook.test.ts` comprovando: rejeição de assinatura inválida (`400`), bloqueio/descarte de eventos da Zuno (`ignored_other_product`), ativação em modo teste (`inicial_49`) e idempotência (`23505` / `idempotent: true`).
- **O que permanece pendente para execução na API Sandbox real do Stripe:** fornecer `sk_test_...` e `whsec_...` da subconta isolada **RenovaExt** (sem tocar na chave `sk_live_...` da Zuno).

---

## 3. Integração Comercial com Sofia, Clara, Rafael e Helena (Operação 24/7 Independente do Computador)

### 3.1. Como Funciona na Nuvem (Sem Depender do PC do Fundador)
Toda a infraestrutura opera 100% em nuvem:
- **Site + Demo + Área do Cliente (`/app/`):** Cloudflare Pages (`https://renovaext.com.br/`).
- **Banco + Auth + RLS + CRM 30 Alvos + Ponte Readonly:** Supabase RenovaExt (`xmuzcnjcwkhgojnaosha`, `sa-east-1`).
- **Sala do CEO + Worker 01 (AWS Lightsail) + Agentes:** Supabase Zanotelli OS (`fxoovelvhzzqasekmlvr`) + Vercel (`zanotelligrupo.online`).

### 3.2. Papéis dos 4 Agentes na Operação RenovaExt
1. **Sofia (`supervisor-geral`):** lê a ponte `renovaext-crm-readonly-feed` (v2) a cada ciclo e consolida no painel: **30 potenciais clientes no CRM**, **5 abordagens prontas aguardando aprovação**, **0 leads inbound reais**, **0 pilotos pagos** e **`R$ 0,00` de receita efetivamente recebida**, mais custos de IA controlados por teto (`R$ 1/rodada`, `R$ 10/dia`, `R$ 60/mês`).
2. **Clara (`sdr`):** consome os 30 alvos de `crmPipeline` (Onda 1/2/3), respeita `optOut`, `eligibleChannel` e a regra de **Reunião Zero** (convida para a demo interativa `https://renovaext.com.br/demo/` e prepara rascunhos individuais em `pending_approval` — nunca dispara sozinha).
3. **Rafael (`closer`):** ancora exclusivamente os planos oficiais (**R$ 49/mês** até 150 clientes e **R$ 79/mês** até 500 clientes, sem cupons ou descontos não autorizados) e conduz o fechamento assíncrono até confirmação real de pagamento.
4. **Helena (`agente-email`):** aplica auditoria de qualidade, separação de marca (`RenovaExt` nunca mistura remetente/assinatura com `Zuno Propect`), verificação de `opt-out` e bloqueio fail-closed enquanto `comercial@renovaext.com.br` (Resend Free + Cloudflare Email Routing) não for autorizado e ativado no DNS.

---

## 4. Plano de Rollback Seguro (Produção)

1. **Frontend (Cloudflare Pages):** reverter o deployment em 1 clique no painel Cloudflare Pages ou `git revert <commit>` + push em `main` (tempo < 2 min).
2. **Migration `20261125000012` (Supabase `xmuzcnjcwkhgojnaosha`):** 100% aditiva (não remove nem altera dados existentes). Rollback não-destrutivo imediato:
   ```sql
   drop trigger if exists trg_enforce_company_client_plan_limit on public.clients;
   drop trigger if exists trg_protect_company_billing_columns on public.companies;
   revoke all on function public.founder_activate_company_subscription(text, text, text, integer, text) from authenticated, service_role;
   ```
3. **Ponte Readonly / Stripe Webhook:** revogar `RENOVAEXT_CRM_READONLY_TOKEN` ou remover `RENOVAEXT_STRIPE_WEBHOOK_SECRET` nos Secrets do Supabase desativa instantaneamente (fail-closed) sem derrubar o aplicativo dos clientes.
