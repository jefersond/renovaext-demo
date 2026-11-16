# 08 — Demonstração Comercial, Processo de Aceite/Cobrança e Estrutura de CRM (Prioridade 2 — Vendas)

> **Regra de Governança Comercial:** Nenhuma mensagem foi disparada sem autorização, nenhuma planilha real é coletada antes do aceite e verificação de segurança/privacidade/backups, nenhum link de pagamento automático foi ativado e nenhuma resposta positiva é contabilizada como piloto pago antes da compensação financeira real.
> - **Link Comercial + Vídeo Demonstrativo (2min 15s):** https://jefersond.github.io/renovaext-demo/comercial.html
> - **Demonstração Pública HTTPS (Dados Fictícios):** https://jefersond.github.io/renovaext-demo/?demo=1
> - **Página de Proposta de Piloto (30 Dias):** https://jefersond.github.io/renovaext-demo/proposta-piloto.html

---

## 1. Roteiro de Demonstração Simples (3 Minutos — Planilha + Radar + PDF)

Quando uma das 10 oficinas abordadas responder pedindo para ver como funciona:

1. **Abertura (30 segundos) — Sem trocar o sistema atual:**
   - Abrir a URL de homologação do RenovaExt (ou compartilhar tela pelo WhatsApp/Google Meet) e clicar em **"Acessar Demonstração Navegável (Dados Fictícios)"**.
   - Mostrar que o RenovaExt funciona como uma **agenda comercial de renovações** ao lado do emissor de NF-e ou controle interno que a oficina já usa.
2. **Passo 1: Importação da Planilha (1 minuto — Tela 2):**
   - Ir para a **Tela 2: Importação & Carteira** e clicar em **"Carregar Planilha Fictícia de Exemplo"** (ou importar `docs/homologacao/planilha-teste-homologacao.xlsx`).
   - Mostrar que o sistema reconhece colunas de clientes, condomínios, tipos de extintores (`PQS ABC`, `CO2`, `Água 10L`), quantidades e datas.
   - Destacar dois diferenciais de confiança técnica:
     - **Bloqueio automático de duplicatas:** linhas repetidas vêm desmarcadas na prévia;
     - **Zero datas inventadas:** se uma linha estiver sem data de próximo acompanhamento ou com data digitada errada (ex: `32/13/2026`), o RenovaExt **não presume recarga anual cega** — ele marca como **"Necessita conferência"**.
3. **Passo 2: Radar de Renovações (1 minuto — Tela 1):**
   - Voltar para a **Tela 1: Painel de Vencimentos** e clicar nas faixas do Radar:
     - **A Conferir Agora (Atrasados)** -> mostra quem já passou do prazo registrado;
     - **Próximos 30, 60 e 90 dias** -> mostra quem deve entrar na agenda comercial da semana;
     - **Dados Incompletos** -> mostra quem precisa de revisão técnica antes do contato.
4. **Passo 3: Funil e Proposta em PDF (30 segundos — Tela 3):**
   - Clicar em **"Oportunidade & Proposta"** em um cliente do Radar, avançar a etapa no funil de 7 estágios (*Contatado -> Proposta preparada*), digitar o preço unitário praticado pela oficina e clicar em **"Salvar e Baixar PDF"**.

---

## 2. O Que Está Funcionando vs. O Que Ainda Não Está Disponível (Transparência Obrigatória)

| O Que JÁ Está Funcionando Hoje no MVP (Homologado) | O Que NÃO Faz Parte Desta Versão (Sem Promessas Falsas) |
|---|---|
| Cadastro e login isolado por oficina (Supabase PostgreSQL com RLS ativo) | Emissão de NF-e, NFS-e ou boletos bancários integrados |
| Importação assistida de planilhas `.CSV` e `.XLSX` com prévia e anti-duplicidade | Emissão de laudos técnicos oficiais, relatórios de ensaio hidrostático ou selos INMETRO |
| Sinalização automática de registros sem data/tipo como *"Necessita conferência"* | Controle fabril de lotes de pó químico, estoque PEPS ou rastreamento de cilindros por código de barras |
| Radar de Renovações (Atrasados, 30, 60, 90 dias e Dados Incompletos) | Aplicativo offline específico para técnico em campo ou roteirização de frota |
| Funil Comercial de 7 etapas com histórico auditável de movimentações | Disparos automáticos de WhatsApp ou e-mail em massa sem revisão humana |
| Gerador de Propostas Comerciais em PDF com preços editáveis pela oficina | Integração automática via API com ERPs legados de terceiros |
| Acesso responsivo em celular e computador (PWA instalável) + Exportação JSON (LGPD) | Controle complexo de permissões hierárquicas para grandes equipes |

---

## 3. Processo de Aceite, Cobrança Autorizada, Cancelamento e Suporte

Este fluxo foi desenhado para ser **100% compatível com a situação cadastral atual do fundador (Pessoa Física / CPF ou MEI/CNPJ)**, sem custo fixo mensal de plataforma de cobrança:

### 3.1. Verificação de Provedores de Pagamento Disponíveis (Sem Mensalidade Fixa)
Antes de enviar qualquer link de pagamento ao cliente piloto, o fundador utiliza um dos dois caminhos já disponíveis para CPF/MEI/CNPJ no Brasil com **custo fixo zero**:
1. **Opção Primária (Mais rápida e taxa zero/mínima): Pix Copia e Cola / QR Code Avulso (Conta PJ/MEI ou Conta Digital do Fundador) + Recibo Comercial:**
   - Taxa: **R$ 0,00** (ou até 0,99% em contas PJ).
   - Emissão manual apenas após o aceite explícito do cliente.
2. **Opção Secundária (Link de Pagamento Avulso — Asaas ou Mercado Pago):**
   - Aceita cadastro por **CPF ou CNPJ/MEI**, sem mensalidade fixa (cobra apenas ~R$ 1,99 por Pix pago ou ~2,99% a 4,99% no cartão/boleto).
   - **Regra de Ouro:** O link é gerado **individualmente e sob demanda** somente depois que a oficina confirmar o aceite do piloto.

### 3.2. Passo a Passo de Aceite, Proteção de Dados e Ativação do Piloto de 30 Dias
1. **Demonstração Segura (Apenas Dados Fictícios):**
   - A oficina assiste ao vídeo de 2min 15s em `https://jefersond.github.io/renovaext-demo/comercial.html` e testa a demonstração interativa com dados fictícios (`https://jefersond.github.io/renovaext-demo/?demo=1`). **Nenhuma planilha real é solicitada nesta etapa.**
2. **Aceite Formal Simples (WhatsApp ou E-mail):**
   - A oficina revisa a página `https://jefersond.github.io/renovaext-demo/proposta-piloto.html`, confirma o interesse no **Piloto de 30 dias** e escolhe a faixa conforme sua carteira:
     - **Plano Inicial — R$ 49/mês** (até 150 clientes na carteira); ou
     - **Plano Profissional — R$ 79/mês** (até 500 clientes na carteira).
   - O fundador envia o resumo escrito de 4 linhas com o escopo real do MVP, termos de uso/privacidade e a condição de cancelamento livre.
3. **Verificação de Segurança, Privacidade, Backups e Cobrança Autorizada:**
   - Após o aceite das condições de uso e confirmação do pagamento do primeiro ciclo de 30 dias (**R$ 49,00** ou **R$ 79,00** via Pix Copia e Cola ou Link Avulso com recibo), a oficina ativa sua conta individual com **confirmação de e-mail obrigatória** e isolamento RLS por `company_id`.
   - Somente dentro da conta isolada da própria oficina (e com rotina de backup/exportação JSON disponível) é realizada a primeira importação de planilha real.
4. **Política de Cancelamento e Exportação de Dados (Zero Fidelidade):**
   - Sem multa e sem retenção de dados: a oficina pode cancelar a qualquer momento solicitando pelo WhatsApp/e-mail e exportar 100% da sua carteira pelo botão **"Exportar Dados (JSON)"**.
5. **Canal de Suporte durante o Piloto:**
   - Atendimento direto pelo fundador via WhatsApp e e-mail em horário comercial (segunda a sexta, 9h às 18h), com resposta em até 24h úteis e apoio na higienização e importação da planilha.

---

## 4. Governança do CRM de Prospecção e Pilotos (`08-registro-crm-interessados-e-pilotos.json`)

Para impedir qualquer distorção nas métricas de validação comercial, o registro no arquivo [`docs/comercial/08-registro-crm-interessados-e-pilotos.json`](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/docs/comercial/08-registro-crm-interessados-e-pilotos.json) obedece a 6 estados estritos:

1. `aguardando_autorizacao_disparo` *(Estado atual das 10 oficinas verificadas)*
2. `abordagem_enviada` *(Após o fundador autorizar e enviar o contato)*
3. `interesse_ou_resposta_positiva` *(Respondeu demonstrando interesse — **NÃO conta como venda**)*
4. `demonstracao_solicitada_ou_realizada` *(Viu a demonstração da planilha + radar)*
5. `objecao_registrada` *(Registrou motivo real de recusa/adiamento para aprendizado)*
6. `piloto_pago_confirmado` *(**Único estado que contabiliza na meta dos 2 primeiros pilotos pagos**, exigindo data do pagamento, valor recebido R$ 49 ou R$ 79 e ID do comprovante).*
