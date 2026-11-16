# 04 — Proposta de Piloto Comercial de 30 Dias (Etapa Comercial D)

> **Objetivo:** Documento transparente para formalizar o uso inicial do **RenovaExt** pelas primeiras oficinas pagantes (meta inicial: 2 pilotos pagos).
> **URL Pública HTTPS da Proposta:** https://jefersond.github.io/renovaext-demo/proposta-piloto.html
> **Regra de Governança e Privacidade:** Não cobrar por funcionalidades inexistentes, não declarar cliente fechado sem confirmação formal de aceite e pagamento, e **jamais coletar planilhas reais de clientes antes da confirmação de segurança, privacidade, backups e aceite das condições de uso**.

---

## TERMO E PROPOSTA DE PILOTO COMERCIAL — RENOVAEXT (30 DIAS)

**Produto:** RenovaExt — Agenda Comercial de Renovações e Propostas para Empresas de Manutenção de Extintores.  
**Duração do Piloto:** 30 (trinta) dias corridos a partir da liberação do acesso e importação inicial.

---

### 1. Entregas Prometidas e Funcionalidades Disponíveis no MVP

Durante os 30 dias do piloto, a oficina contratante terá acesso imediato às seguintes funcionalidades reais e já operacionais:

1. **Conta Isolada da Oficina:** Acesso individual protegido por login e senha, com dados totalmente separados de qualquer outra empresa.
2. **Assistente de Importação de Planilhas (.CSV e .XLSX):**
   - Associação flexível das colunas da planilha atual da oficina (clientes, contatos, equipamentos, capacidades, quantidades, último serviço e próximo acompanhamento).
   - Prévia editável antes da confirmação, prevenção de duplicatas e marcação automática de registros incompletos como *"Necessita conferência"*.
   - **Apoio Inicial de Implantação:** Caso a oficina deseje, auxiliamos na revisão e importação da primeira planilha em até 24h úteis sem taxa extra de setup.
3. **Painel Principal e Radar de Renovações:**
   - Visão consolidada de clientes cadastrados, equipamentos registrados, acompanhamentos atrasados, vencimentos previstos para os próximos **30, 60 e 90 dias** e registros pendentes de conferência.
4. **Carteira de Clientes e Funil Comercial de 7 Etapas:**
   - Ficha individual por cliente com histórico de serviços e acompanhamento nas etapas: *Pendente de conferência*, *Pronto para contato*, *Contatado*, *Proposta preparada*, *Proposta enviada*, *Aceito* e *Perdido*.
5. **Gerador de Propostas Comerciais em PDF:**
   - Montagem de cotações com os dados da oficina, seleção de equipamentos do cliente, preços unitários editáveis definidos pela oficina, cálculo automático de total e download imediato em PDF.
6. **Acesso em Computador e Celular (PWA):** Interface responsiva utilizável no escritório ou pelo celular.

---

### 2. O Que NÃO Faz Parte Deste Piloto (Transparência de Escopo)

Para manter o sistema simples e de baixo custo, o RenovaExt **não inclui**:
- Emissão de notas fiscais (NF-e / NFS-e) ou módulo contábil/financeiro;
- Emissão de laudos técnicos oficiais ou certificados de conformidade INMETRO/Corpo de Bombeiros;
- Controle de lotes de bancada, selos do INMETRO ou estoque de insumos;
- Disparo automático em massa de mensagens por WhatsApp ou e-mail.

---

### 3. Planos, Limites Operacionais e Preço do Piloto

A oficina pode escolher uma das duas modalidades abaixo para o período de piloto de 30 dias (sem taxa de implantação):

- **Opção A — Plano Inicial: R$ 49,00 / mês**
  - Limite de até **150 clientes** cadastrados na carteira ativa;
  - Limite de importação de até 2.000 linhas por arquivo (máx. 5 MB);
  - Todas as funcionalidades essenciais do MVP (Radar, Carteira, Funil e Propostas PDF).
- **Opção B — Plano Profissional: R$ 79,00 / mês**
  - Limite de até **500 clientes** cadastrados na carteira ativa;
  - Apoio prioritário na conferência e organização da primeira planilha importada;
  - Todas as funcionalidades completas do MVP + exportação integral de dados.

*(Nota: Não há descontos vitalícios automáticos; o valor contratado refere-se ao ciclo mensal de uso).*

---

### 4. Forma de Suporte (Escopo Realista de Atendimento)

- Atendimento comercial e suporte assíncrono em português em dias úteis (segunda a sexta-feira, com retorno em até **1 dia útil / 24 horas úteis**) pelos canais oficiais verificados após o registro da solicitação (e-mail comercial e/ou telefone/WhatsApp informados no protocolo `SOL-...`), para dúvidas de uso do sistema e orientação sobre o mapeamento das colunas da planilha.
- O piloto **não inclui** plantão telefônico 24/7, atendimento presencial na oficina ou digitação manual terceirizada de arquivos físicos.

---

### 5. Tratamento, Privacidade, Backups e Portabilidade dos Dados (LGPD)

1. **Proibição de Coleta Prévia de Planilhas Reais:** Nenhuma planilha real com dados de clientes da oficina é solicitada ou recebida durante a prospecção ou demonstração. A demonstração utiliza exclusivamente dados fictícios (`https://jefersond.github.io/renovaext-demo/?demo=1`).
2. **Checklist Obrigatório Antes da Primeira Importação Real:** A importação de dados reais só ocorre após:
   - Confirmação de e-mail da conta individual da oficina no sistema;
   - Verificação de isolamento multi-tenant (`company_id` + RLS PostgreSQL em HTTPS/TLS);
   - Aceite expresso das condições de uso, privacidade e suporte deste termo.
3. **Propriedade dos Dados:** A carteira de clientes, equipamentos e propostas importadas ou cadastradas pertence **100% à oficina contratante**.
4. **Isolamento e Sigilo:** Os dados ficam isolados por empresa (políticas RLS em banco de dados) e jamais são divulgados publicamente ou compartilhados com terceiros.
5. **Backups e Exportação Livre (Portabilidade Imexorável):** Além da persistência segura no banco PostgreSQL, a oficina pode exportar e fazer backup local instantâneo de 100% dos seus dados a qualquer momento diretamente pelo botão **"Exportar Dados (JSON)"** no cabeçalho do sistema.

---

### 6. Condições de Cancelamento

- **Sem Fidelidade e Sem Multa:** A oficina pode solicitar o cancelamento a qualquer momento por mensagem simples ou e-mail.
- Caso a oficina opte por não continuar após os primeiros 30 dias, nenhuma mensalidade subsequente será cobrada, e a oficina poderá exportar integralmente seus dados organizados antes do encerramento da conta.

---

### 7. Responsabilidades das Partes

- **Responsabilidades do RenovaExt:** Manter o sistema disponível, seguro e isolado; processar fielmente os dados informados pela oficina sem inventar datas ou preços; prestar suporte na importação inicial.
- **Responsabilidades da Oficina Contratante:** Fornecer dados legítimos de sua própria carteira; validar tecnicamente os prazos de inspeção, manutenção (Níveis 1, 2 e 3 — ABNT NBR 12962 / Portaria INMETRO nº 58/2022) e os preços praticados em suas propostas comerciais; realizar o envio das propostas aos seus clientes pelos seus próprios canais.
