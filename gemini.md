# 📜 GEMINI.MD — CONSTITUIÇÃO DO PROJETO RENOVAEXT

> **Identidade do Sistema:** RenovaExt — SaaS B2B brasileiro para pequenas e médias empresas de inspeção, manutenção e recarga de extintores de incêndio.
> **Posicionamento em Teste:** *"Transforme sua carteira de manutenção de extintores em uma agenda organizada de renovações, sem abandonar seu sistema atual."*
> **Arquitetura Operacional:** Protocolo V.L.A.E.G. + Arquitetura A.N.T. (3 Camadas) + Stack React 18, TypeScript, Tailwind CSS, PWA e Supabase (PostgreSQL + RLS).

---

## 1. Respostas de Descoberta (Visão e Lógica Consolidadas)

1. **Estrela Guia (Resultado Único Desejado):**
   Entregar um MVP funcional, responsivo (celular e computador), seguro (isolamento multi-tenant / RLS) e imediatamente demonstrável do **RenovaExt**, capaz de importar planilhas reais (CSV/XLSX) de oficinas de extintores, organizar clientes e equipamentos sem inventar datas ou preços, exibir o radar comercial de renovações (atrasados, 30, 60, 90 dias e incompletos), gerenciar o funil comercial de 7 etapas e gerar propostas comerciais em PDF, acompanhado de toda a documentação e material comercial para conquistar os **2 primeiros pilotos pagos**.

2. **Integrações e Infraestrutura:**
   - **Banco de Dados e Autenticação:** Supabase (`@supabase/supabase-js`) com PostgreSQL e políticas estritas de Row Level Security (RLS) isoladas por `company_id`.
   - **Modo Homologação Local Isolado:** Camada determinística de persistência que opera conectada ao Supabase quando `.env` está configurado ou em banco isolado local multi-tenant para testes/demonstrações sem custo fixo adicional.
   - **Processamento de Planilhas:** Leitura client-side validada de arquivos `.csv` e `.xlsx` (via `xlsx` / parser seguro).
   - **Geração de Documentos:** Geração client-side de propostas comerciais em PDF (`jspdf`).
   - **Separação Estrita:** Zero compartilhamento de banco, credenciais ou dados com *Zuno Prospect* ou *Zanotelli OS*. Zero APIs externas pagas sem autorização.

3. **Fonte da Verdade:**
   - Tabelas relacionais do RenovaExt (`companies`, `profiles`, `clients`, `equipments`, `service_history`, `opportunities`, `opportunity_history`, `proposals`, `audit_logs`) isoladas por `company_id`.
   - Os prazos de acompanhamento comercial derivam exclusivamente das datas registradas/importadas pela oficina ou confirmadas por profissional técnico habilitado.

4. **Payload de Entrega:**
   - Aplicação Web/PWA em React + TypeScript organizada em 3 telas principais operacionais (Tela 1: Painel e Radar de Vencimentos; Tela 2: Importação e Carteira de Clientes; Tela 3: Cliente, Oportunidade e Proposta PDF) + fluxo de Autenticação/Configuração da Empresa + Modo Demonstração Fictícia.
   - Migrações SQL com RLS em `supabase/migrations/`.
   - Pacote executivo de operação comercial (Auditoria técnica, validação das 10 empresas-alvo, análise de concorrentes, proposta de piloto de 30 dias, 10 mensagens comerciais individuais em espera e briefing do site comercial).

5. **Regras Comportamentais e Invariantes de Domínio (O Que Fazer e O Que Não Fazer):**
   - **PROIBIDO afirmar que todo extintor exige recarga anual incondicional:** Os requisitos de manutenção (Níveis 1, 2 e 3) variam conforme o equipamento, normas técnicas (ABNT NBR 12962 e Portaria INMETRO nº 58/2022) e condições de uso/inspeção.
   - **PROIBIDO inventar datas ausentes:** Registros importados sem data de próximo acompanhamento/vencimento ou com dados técnicos incompletos devem receber obrigatoriamente o status `necessita_conferencia` (`needs_review = true`).
   - **PROIBIDO inventar preços de serviços:** Na montagem de propostas comerciais, os preços unitários devem ser informados/editados pela própria oficina usuária.
   - **PROIBIDO apresentar alertas comerciais como laudos técnicos ou certificados de conformidade.**
   - **PROIBIDO realizar disparos automáticos externos (WhatsApp ou e-mail) ou ativar cobrança real sem autorização explícita do fundador.**
   - **PROIBIDO implementar escopo de ERP fiscal no MVP:** Sem emissão de NF-e/NFS-e, sem controle complexo de lotes/selos INMETRO, sem estoque PEPS e sem app de roteirização de veículos.

---

## 2. Esquemas de Dados (JSON / PostgreSQL Data Schemas)

### 2.1. Empresa Usuária (`Company`)
```json
{
  "id": "uuid",
  "name": "string (Nome da Oficina)",
  "cnpj": "string | null",
  "responsibleName": "string",
  "email": "string",
  "phone": "string",
  "city": "string",
  "state": "string (UF)",
  "selectedPlanHypothesis": "inicial_49 | profissional_79",
  "billingActive": false,
  "defaultProposalValidityDays": 15,
  "defaultProposalNotes": "string",
  "createdAt": "ISO-8601"
}
```

### 2.2. Cliente da Oficina (`Client`)
```json
{
  "id": "uuid",
  "companyId": "uuid (FK companies.id - RLS)",
  "name": "string (Nome do cliente / Razão Social)",
  "organizationName": "string (Condomínio / Empresa)",
  "contactName": "string (Síndico / Comprador / Responsável)",
  "contactPhone": "string",
  "contactEmail": "string",
  "city": "string",
  "notes": "string",
  "needsReview": "boolean (true quando dados essenciais ou datas estão incompletos)",
  "reviewReason": "string | null",
  "OpportunityStage": "pendente_conferencia | pronto_para_contato | contatado | proposta_preparada | proposta_enviada | aceito | perdido",
  "isDemo": "boolean",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### 2.3. Equipamento / Registro de Manutenção (`EquipmentRecord`)
```json
{
  "id": "uuid",
  "companyId": "uuid (FK companies.id - RLS)",
  "clientId": "uuid (FK clients.id)",
  "description": "string (Descrição do lote/equipamento)",
  "extinguisherType": "string (ex: PQS ABC, PQS BC, Água Pressurizada, CO2, Espuma Mecânica, Agente K, Não informado)",
  "capacity": "string | null (ex: 4kg, 6kg, 10L)",
  "quantity": "integer (>= 1)",
  "lastServiceDate": "YYYY-MM-DD | null",
  "nextDueDate": "YYYY-MM-DD | null (Data informada pela oficina; NUNCA inventada)",
  "needsReview": "boolean (true se nextDueDate for null ou tipo/capacidade ausente)",
  "reviewNotes": "string | null",
  "notes": "string",
  "createdAt": "ISO-8601"
}
```

### 2.4. Oportunidade e Histórico do Funil (`Opportunity` & `OpportunityHistory`)
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "clientId": "uuid",
  "stage": "pendente_conferencia | pronto_para_contato | contatado | proposta_preparada | proposta_enviada | aceito | perdido",
  "nextFollowUpDate": "YYYY-MM-DD | null",
  "notes": "string",
  "history": [
    {
      "id": "uuid",
      "fromStage": "string | null",
      "toStage": "string",
      "note": "string",
      "changedBy": "string",
      "createdAt": "ISO-8601"
    }
  ]
}
```

### 2.5. Proposta Comercial (`Proposal`)
```json
{
  "id": "uuid",
  "proposalNumber": "string (ex: PROP-2026-001)",
  "companyId": "uuid",
  "clientId": "uuid",
  "status": "rascunho | gerada | enviada | aceita | perdida",
  "validityDays": 15,
  "items": [
    {
      "id": "uuid",
      "equipmentId": "uuid | null",
      "equipmentLabel": "string (ex: Extintor PQS ABC 4kg)",
      "serviceDescription": "string (ex: Manutenção de 2º Nível / Recarga conforme avaliação técnica)",
      "quantity": "integer",
      "unitPriceBrl": "number (>= 0, editável pelo usuário, nunca inventado pelo sistema)",
      "subtotalBrl": "number"
    }
  ],
  "totalBrl": "number",
  "notes": "string",
  "createdAt": "ISO-8601"
}
```

### 2.6. Log de Auditoria (`AuditLog`)
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "actorEmail": "string",
  "action": "IMPORT_BATCH | CLIENT_CREATED | STAGE_UPDATED | PROPOSAL_GENERATED | DATA_EXPORTED | AUTH_LOGIN",
  "details": "string",
  "createdAt": "ISO-8601"
}
```

### 2.7. Lead Comercial e Privacidade LGPD (`CommercialLead` & `PrivacyLog`)
```json
{
  "lead": {
    "id": "uuid",
    "protocolNumber": "string (ex: SOL-20261116-A1B2C3)",
    "responsibleName": "string",
    "companyName": "string",
    "email": "string",
    "phone": "string | null",
    "portfolioSize": "string | null",
    "interestedPlan": "inicial_49 | profissional_79",
    "notes": "string",
    "requestType": "demonstracao | piloto_30d | lgpd_direitos",
    "consentLgpd": true,
    "status": "novo | em_analise | contatado | convertido | arquivado | expurgado_lgpd",
    "createdAt": "ISO-8601"
  },
  "privacyLog": {
    "id": "uuid",
    "targetEmailHash": "string (SHA-256)",
    "action": "PURGE_REQUESTED | PURGE_EXECUTED | RETENTION_CLEANUP",
    "recordsAffected": "integer",
    "createdAt": "ISO-8601"
  }
}
```

---

## 3. Invariantes Arquiteturais

1. **Isolamento Multi-Tenant (`company_id`):** Toda consulta ou mutação exige `company_id` da sessão autenticada. No PostgreSQL (Supabase), todas as tabelas possuem `ENABLE ROW LEVEL SECURITY` com política `company_id = public.current_user_company_id()`.
2. **Prevenção de Duplicatas na Importação:** Chave composta normalizada `(company_id, lower(trim(client_name)), lower(trim(extinguisher_type)), coalesce(capacity, ''), coalesce(next_due_date, ''))` detecta registros duplicados no assistente antes da confirmação.
3. **Limites de Segurança de Upload:** Máximo de 5 MB por arquivo CSV/XLSX e máximo de 2.000 linhas por operação de importação.
4. **Rastreabilidade de Regra Técnica:** Nenhuma data de vencimento é calculada silenciosamente. O radar classifica os clientes em:
   - `ATRASADO`: `next_due_date < hoje`
   - `D_30`: `hoje <= next_due_date <= hoje + 30 dias`
   - `D_60`: `hoje + 31 dias <= next_due_date <= hoje + 60 dias`
   - `D_90`: `hoje + 61 dias <= next_due_date <= hoje + 90 dias`
   - `FUTURO`: `next_due_date > hoje + 90 dias`
   - `INCOMPLETO`: `next_due_date IS NULL` ou `needs_review = true`
5. **Arquitetura de Domínio e Hospedagem (`renovaext.com.br`):**
   - `www.renovaext.com.br` / raiz (`/`): Site comercial oficial estático de alta conversão (Cloudflare Pages Free), com showcase em alta resolução e formulário de captação de leads protegido contra spam e com conformidade LGPD.
   - `demo.renovaext.com.br` / `/demo/`: Ambiente de demonstração interativa em React com dados 100% fictícios (ProtegeFogo Extintores) e bloqueio estrito de upload de planilhas reais.
   - `app.renovaext.com.br`: Instância de produção autenticada para clientes de pilotos reais após validação.

---

## 4. Log de Manutenção
- **2026-11-12:** Inicialização da Constituição `gemini.md` do projeto RenovaExt em repositório isolado (`c:\Users\jefer\Desktop\Jeferson\Saas em teste\RenovaExt`), separando integralmente o produto dos artefatos conceituais do Zanotelli OS e da Zuno Prospect.
- **2026-11-16:** Formalização do esquema de leads comerciais e privacidade LGPD (`20261116000008_lgpd_lead_purge_and_retention.sql`), inclusão dos invariantes de arquitetura do domínio próprio `renovaext.com.br` na Cloudflare Pages Free e separação estrita da demonstração interativa em `/demo/`.
