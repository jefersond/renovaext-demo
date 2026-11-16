# POP-01: Autenticação, Cadastro da Oficina e Isolamento Multi-Tenant (RLS)

## 1. Objetivo
Garantir que cada oficina de manutenção de extintores tenha seu ambiente estritamente isolado (`company_id`), com autenticação segura, perfil do responsável, configuração dos dados comerciais da oficina (para cabeçalho de propostas) e preparação estrutural para múltiplos funcionários futuros.

## 2. Entradas
- Dados de cadastro da empresa: Nome fantasia/razão social da oficina, CNPJ (opcional no início), nome do responsável, e-mail, senha, telefone/WhatsApp comercial, cidade/UF e plano em teste selecionado (`inicial_49` ou `profissional_79`).
- Credenciais de login (`email`, `password`).

## 3. Lógica Determinística e Regras de Negócio
1. **Isolamento Absoluto (`company_id`):**
   - Toda tabela operacional (`clients`, `equipments`, `service_history`, `opportunities`, `opportunity_history`, `proposals`, `audit_logs`) possui a coluna obrigatória `company_id`.
   - No PostgreSQL (Supabase), as políticas RLS verificam `company_id = public.current_user_company_id()`.
   - Na camada de aplicação/homologação, o repositório filtra todas as leituras e escritas estritamente pelo `company_id` da sessão ativa e lança erro de segurança (`ACCESS_DENIED_CROSS_TENANT`) se houver tentativa de acesso a registro de outra empresa.
2. **Planos em Teste (Sem Cobrança Automática Ativa):**
   - **Plano Inicial (R$ 49/mês — Hipótese em Teste):** Limite de até 150 clientes cadastrados na carteira.
   - **Plano Profissional (R$ 79/mês — Hipótese em Teste):** Limite de até 500 clientes cadastrados na carteira.
   - O sistema exibe claramente que os planos estão em fase de validação comercial (`billingActive: false`), sem cobrar cartão de crédito automaticamente.
3. **Exportação de Dados (Portabilidade LGPD):**
   - O responsável pela oficina pode exportar a qualquer momento todos os dados pertencentes ao seu `company_id` em formato JSON ou CSV.
4. **Armazenamento Separado de Solicitações Comerciais (`public.commercial_leads`):**
   - As solicitações de visitantes públicos (*"Solicitar demonstração"* e *"Quero participar do piloto"*) são gravadas na tabela independente `public.commercial_leads` via RPC `public.submit_commercial_lead`.
   - Esta tabela é 100% separada das tabelas operacionais das oficinas (`companies`, `clients`, `equipments`, `proposals`), possui `ENABLE ROW LEVEL SECURITY` e `REVOKE ALL` para `anon` e `authenticated` (nenhum visitante ou oficina autenticada pode listar leads comerciais), e aplica bloqueio de spam por honeypot, tempo mínimo de preenchimento (`>= 800ms`), rate-limit temporal por e-mail e aceite obrigatório da Política de Privacidade.
5. **Bloqueio de Inserção Acidental de Dados Reais na Demonstração Pública (`/?demo=1`):**
   - No modo de demonstração pública (`isDemoCompany === true`), o upload de arquivos externos do computador do visitante é bloqueado na interface e no handler de importação, permitindo apenas o carregamento da planilha fictícia de exemplo integrada.

## 4. Casos de Borda
- Tentativa de cadastro com e-mail já utilizado: bloquear com mensagem amigável.
- Tentativa de leitura/edição de `clientId` pertencente a outro `company_id`: rejeitar imediatamente e registrar evento no log de auditoria.
- Tentativa de submissão de formulário comercial por bot (honeypot preenchido ou `< 800ms`) ou repetição em menos de 5 minutos: bloquear no PostgreSQL (`SPAM_PROTECTION_*`).
