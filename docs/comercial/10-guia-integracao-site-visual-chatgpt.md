# 10 — Guia Técnico de Integração: Site Visual (ChatGPT) → Formulário e RPC Existentes

> **Objetivo:** Conectar qualquer novo layout HTML/CSS/React criado no ChatGPT diretamente ao motor comercial já homologado do **RenovaExt**, **sem recriar tabelas (`public.commercial_leads` / `public.commercial_crm_pipeline`) e sem alterar a RPC (`public.submit_commercial_lead`)**.

---

## Opção A — Integração Zero-Código (Recomendada: Reutilizar `lead-capture-widget.js`)

Basta incluir o script [`public/lead-capture-widget.js`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/public/lead-capture-widget.js) no final do HTML gerado pelo ChatGPT e manter os mesmos `id`s nos campos do formulário:

```html
<script src="./lead-capture-widget.js?v=20261116"></script>
```

### 1. Botões de CTA no Topo / Hero do Novo Site:
- **Botão "Solicitar demonstração":**
  ```html
  <button type="button" onclick="selectLeadIntentAndScroll('solicitar_demonstracao')">
    Solicitar demonstração
  </button>
  ```
- **Botão "Quero participar do piloto":**
  ```html
  <button type="button" onclick="selectLeadIntentAndScroll('quero_participar_piloto', 'profissional_79')">
    Quero participar do piloto
  </button>
  ```
- **Botão para a Demonstração Fictícia (Preservada):**
  ```html
  <a href="./index.html?demo=1">Testar Demonstração (Dados Fictícios)</a>
  ```

### 2. IDs Esperados pelo `lead-capture-widget.js` na Seção `#solicitar`:
- `<section id="solicitar">`
- `<form onsubmit="submitPublicLeadForm(event, '/site-comercial')">`
- `<input type="hidden" id="leadIntentType" value="solicitar_demonstracao" />`
- `<input type="text" id="leadHoneypot" class="hidden" tabindex="-1" autocomplete="off" />` *(Honeypot anti-bot obrigatório)*
- `<input type="text" id="leadResponsibleName" required minlength="2" />` *(1. Nome do responsável)*
- `<input type="text" id="leadWorkshopName" required minlength="2" />` *(2. Nome da oficina)*
- `<input type="email" id="leadEmail" required />` *(3. E-mail comercial)*
- `<input type="tel" id="leadPhone" />` *(4. Telefone opcional)*
- `<select id="leadPortfolioSize">` com valores exatos:
  - `ate_50_clientes`
  - `51_a_150_clientes`
  - `151_a_300_clientes`
  - `301_a_500_clientes`
  - `mais_de_500_clientes`
- `<select id="leadPlanInterest">` com valores exatos:
  - `inicial_49`
  - `profissional_79`
- `<textarea id="leadNotes"></textarea>` *(7. Observações)*
- `<input type="checkbox" id="leadPrivacyConsent" required />` *(Aceite LGPD obrigatório)*
- Containers de feedback: `<div id="leadFormError"></div>`, `<div id="leadFormContainer"></div>` e `<div id="leadReceiptContainer"></div>`.

---

## Opção B — Chamada Direta via `fetch` para a RPC Existente (`public.submit_commercial_lead`)

Caso o site criado no ChatGPT possua seu próprio script de formulário, basta fazer um `POST` HTTPS direto para a RPC já existente no Supabase Staging (usando **somente a chave pública `anon`**, nunca `service_role`):

- **Endpoint:** `POST https://xmuzcnjcwkhgojnaosha.supabase.co/rest/v1/rpc/submit_commercial_lead`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "apikey": "<VITE_SUPABASE_ANON_KEY>",
    "Authorization": "Bearer <VITE_SUPABASE_ANON_KEY>"
  }
  ```
- **Payload JSON (Parâmetros Exatos da RPC):**
  ```json
  {
    "p_intent_type": "solicitar_demonstracao",
    "p_responsible_name": "Nome do Responsável",
    "p_workshop_name": "Nome da Oficina",
    "p_email": "comercial@oficina.com.br",
    "p_phone": "(11) 99999-0000",
    "p_portfolio_size": "51_a_150_clientes",
    "p_plan_interest": "profissional_79",
    "p_notes": "Observações opcionais",
    "p_source_page": "/site-principal",
    "p_privacy_consent": true,
    "p_honeypot": "",
    "p_elapsed_ms": 2500,
    "p_is_test_submission": false
  }
  ```
- **Resposta da RPC (`200 OK` — Sem expor PII):**
  ```json
  {
    "id": "uuid",
    "protocolCode": "SOL-20261116-XXXXXX",
    "intentType": "solicitar_demonstracao",
    "portfolioSize": "51_a_150_clientes",
    "planInterest": "profissional_79",
    "isTestSubmission": false,
    "status": "recebido_aguardando_contato",
    "createdAt": "2026-11-16T..."
  }
  ```
- **Sincronização Automática:** Ao receber `200 OK`, o trigger `trg_sync_lead_to_crm_pipeline` no PostgreSQL já terá inserido o lead automaticamente em `public.commercial_crm_pipeline` e ele aparecerá na hora no painel autenticado do fundador.
