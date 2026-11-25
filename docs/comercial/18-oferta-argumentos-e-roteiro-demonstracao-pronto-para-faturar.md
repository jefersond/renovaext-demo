# 18 — Oferta Final, Viabilidade de Preços (R$ 49 / R$ 79), Argumentos Comerciais e Roteiro de Demonstração

> **Objetivo:** Consolidar a engenharia comercial pronta para gerar os **primeiros clientes pagantes do RenovaExt**, aproveitando integralmente o MVP existente, sem promessas exageradas e sem contratar serviços sem autorização.

---

## 1. Estudo Real de Viabilidade dos Preços Propostos (`R$ 49/mês` e `R$ 79/mês`)

### 1.1. Estrutura de Custos Fixos e Variáveis por Cliente

| Camada de Custo | Fase 1: 1 a 10 Clientes Pagantes | Fase 2: 11 a 50 Clientes Pagantes | Premissa Técnica Real |
|---|---|---|---|
| **Hospedagem Site + App (`renovaext.com.br`)** | **R$ 0,00 / mês** (Cloudflare Pages Free) | **R$ 0,00 / mês** (Cloudflare Pages Free — banda ilimitada) | Planilhas (`.csv`/`.xlsx`) e PDF (`jsPDF`) rodam 100% no navegador do cliente (custo de CPU no servidor = R$ 0). |
| **Banco de Dados, Auth e RLS (Supabase)** | **R$ 0,00 / mês** (Free Tier — 500 MB DB) *(risco: sem backup automático point-in-time e pausa após 7d sem atividade)* | **~R$ 145,00 / mês** (US$ 25/mês — Supabase Pro, **obrigatório ao ter produção contínua com clientes pagantes**) | 50 oficinas × 300 clientes ≈ 60 MB (< 1% do Pro). |
| **Domínio (`renovaext.com.br`)** | **R$ 3,33 / mês** (R$ 40/ano já pago até 16/11/2027) | **R$ 3,33 / mês** | Já quitado no Registro.br. |
| **Caixa Comercial (`comercial@renovaext.com.br`)** | **R$ 0,00** (Cloudflare Routing + SES/Resend Free) ou **~R$ 6,00/mês** (Zoho Mail Lite) | **~R$ 6,00 / mês** (Zoho Mail Lite) | Recomendado Zoho Mail Lite para caixa IMAP/SMTP real com SPF/DKIM/DMARC alinhados. |
| **Taxa de Cobrança (Pix / Boleto Asaas ou Mercado Pago)** | **R$ 0,00** (Pix avulso/chave) a **R$ 1,99/cobrança** (Asaas Pix/Boleto) | **~R$ 1,99 / cliente / mês** (Asaas) ou ~1% a 2% | Representa **4,1%** no plano de R$ 49 e **2,5%** no plano de R$ 79. |
| **Custo Variável Direto por Cliente** | **R$ 0,00 a R$ 1,99 / mês** | **~R$ 2,00 / mês** | Margem bruta de infraestrutura: **95,9% (R$ 49)** e **97,5% (R$ 79)**. |

### 1.2. Ponto de Equilíbrio (Break-Even) e Alerta Crítico de Unit Economics

| Cenário | Custo Fixo Mensal (Infra + E-mail) | Receita Líquida Média por Cliente (pós-taxa R$ 1,99) | Clientes Necessários para Pagar Infra (Break-Even) |
|---|---|---|---|
| **Fase 1 (Free Tier — primeiros pilotos)** | **R$ 3,33 a R$ 9,33 / mês** | R$ 47,01 (Inicial) / R$ 77,01 (Profissional) | **1 único cliente** já deixa a infra positiva |
| **Fase 2 (Supabase Pro + Zoho Mail Lite — produção real estável)** | **~R$ 154,33 / mês** | R$ 47,01 (Inicial) / R$ 77,01 (Profissional) | **4 clientes no Inicial** ou **2 clientes no Profissional** |

### 1.3. Veredito Honesto sobre R$ 49/mês e R$ 79/mês
- **Os preços SÃO viáveis financeiramente no estágio de entrada e validação (primeiros 10 a 20 clientes)?**
  **SIM — com uma condição operacional estrita.**
  - **Por que funcionam para vender agora:** O concorrente mais transparente do mercado (**Fragasoft**) cobra **R$ 120/mês**, enquanto **Gestão Zenix** e **Extinradar** cobram sob consulta em faixas superiores por incluírem chão de oficina/OS/fiscal. Posicionar o RenovaExt a **R$ 49/mês** (até 150 clientes) e **R$ 79/mês** (até 500 clientes) reduz radicalmente o atrito para a oficina testar como ferramenta complementar sem cancelar nada. Basta recuperar **1 único condomínio com 10 a 15 extintores** (serviço típico de R$ 500 a R$ 1.200) para pagar **um ano inteiro** da assinatura.
  - **Onde está o perigo oculto (custo do tempo do fundador):** Em um ticket de **R$ 49/mês**, **não existe margem para atendimento humano intensivo, reuniões longas de suporte ou limpeza manual de planilhas sujas todo mês**. Se o fundador gastar 2 horas/mês dando suporte individual a um cliente de R$ 49, o valor da hora cai para ~R$ 23/h.
- **Recomendação Prática de Precificação:**
  1. **Manter R$ 49/mês e R$ 79/mês para os primeiros 10 clientes fundadores (Piloto de 30 dias):** velocidade máxima para validar retenção e provar receita real.
  2. **Ancorar a venda no Plano Profissional (R$ 79/mês):** concentrar o apoio na revisão do mapeamento da primeira planilha **exclusivamente no Plano Profissional (R$ 79)**; deixar o Plano Inicial (R$ 49) 100% self-service com suporte assíncrono simples.
  3. **Definir gatilho de revisão após 10 clientes pagantes:** após validar uso recorrente e feedback real, avaliar reposicionamento de novos clientes para **R$ 79 (Inicial) / R$ 119 (Profissional)** ou cobrança de **taxa única de implantação assistida (R$ 99)** caso peçam higienização de planilhas complexas.

---

## 2. Oferta Comercial Final (Pronta para Fechar Hoje)

- **Nome da Oferta:** **Piloto Comercial RenovaExt — 30 Dias Sem Fidelidade**
- **Promessa Central (100% verdadeira e auditada):**
  *"Organize a carteira da sua empresa de extintores em uma agenda clara de vencimentos (atrasados, 30, 60 e 90 dias) e emita propostas em PDF com os seus preços — sem abandonar seu sistema fiscal atual."*
- **Modalidades:**
  - **Plano Inicial — R$ 49/mês:** Até 150 clientes na carteira ativa • Importação self-service CSV/XLSX • Radar 30/60/90d e Conferência • Funil comercial em 7 etapas • Propostas comerciais em PDF • Backup/exportação JSON a qualquer momento.
  - **Plano Profissional — R$ 79/mês (Recomendado):** Tudo do Inicial para até **500 clientes** + **apoio assíncrono na conferência do mapeamento da 1ª planilha** + suporte em dias úteis (retorno em até 1 dia útil).
- **Garantia de Confiança / Risco Zero:**
  - Sem fidelidade e sem multa de cancelamento.
  - Sem taxa de implantação.
  - Dados 100% da empresa (isolados por `company_id` sob RLS no PostgreSQL e exportáveis em 1 clique).
  - Pagamento transparente via **Pix ou Boleto (Asaas/Mercado Pago)** somente após o aceite formal — sem retenção de cartão de crédito.

---

## 3. Argumentos Comerciais & Quebra de Objeções Reais

| Objeção Típica da Empresa de Extintores | Resposta Curta, Honesta e Convincente |
|---|---|
| **"Já controlo tudo no Excel."** | *"O RenovaExt não substitui seu Excel — ele lê sua planilha atual em 2 minutos e transforma as datas em uma fila pronta de quem já venceu, vence em 30/60/90 dias ou está sem data, além de gerar o PDF da proposta na hora."* |
| **"Já pago sistema de nota fiscal / Fragasoft / Zenix."** | *"Perfeito, você não precisa trocar nada nem cancelar seu sistema atual. O RenovaExt funciona ao lado dele apenas para o comercial: acompanhar renovações, não esquecer propostas enviadas e cotar rápido."* |
| **"Não quero mandar minha planilha de clientes para terceiros."** | *"Concordo 100% — e nós nem pedimos sua planilha na demonstração! Na demo você vê apenas dados fictícios (upload real bloqueado). Quando ativar sua conta, você mesmo importa dentro do seu ambiente isolado por RLS e pode baixar um backup completo quando quiser."* |
| **"Nem todo extintor vence em 12 meses (CO₂ tem pesagem semestral, teste hidrostático é 5 anos)."** | *"Exatamente por isso o RenovaExt nunca inventa datas nem assume recarga anual automática. Ele respeita estritamente a data de próximo acompanhamento que sua empresa registra; se uma linha vier sem data, marca como 'Necessita conferência' para seu técnico revisar."* |
| **"Não tenho tempo para cadastrar 200 clientes de novo."** | *"Você não precisa digitar do zero. Sobe o arquivo CSV ou Excel que você já tem, associa as colunas na tela, revisa duplicatas e confirma. No Plano Profissional (R$ 79), ainda ajudamos na revisão do mapeamento da primeira planilha."* |
| **"Emite NF-e, laudo técnico ou controla selos INMETRO?"** | *"Não — e fazemos questão de ser transparentes antes de você contratar. O foco aqui é exclusivamente agenda comercial de renovações, funil e proposta em PDF, mantendo a mensalidade baixa (R$ 49 ou R$ 79)."* |
| **"E se minha equipe não se adaptar?"** | *"Zero fidelidade e zero multa. Você testa por 30 dias; se decidir parar, exporta seus dados e não há cobrança seguinte."* |

---

## 4. Processo de Demonstração (5 Minutos) + Fechamento até o Primeiro Pagamento

### Etapa A — Antes da Demo (Preparação em 1 minuto)
1. Confirmar pelo WhatsApp/e-mail o porte aproximado da carteira (até 150 ou até 500 clientes) e como controlam hoje (Excel, fichas, ERP).
2. Deixar abertas duas abas: `https://renovaext.com.br/demo/` e `https://renovaext.com.br/proposta-piloto.html`.

### Etapa B — Demonstração Guiada (5 minutos exatos — ao vivo no Meet/WhatsApp ou por link)
1. **Minuto 0–1 (Contexto + Radar — Tela 1):**
   - Mostrar a `Oficina ProtegeFogo Extintores (Demonstração Fictícia)` em `https://renovaext.com.br/demo/`.
   - Clicar nos filtros **A conferir agora (Atrasados)**, **Próximos 30 dias** e **Dados incompletos**. Reforçar: *"Aqui sua equipe decide em 30 segundos para quem ligar hoje."*
2. **Minuto 1–3 (Importação Sem Atrito — Tela 2):**
   - Ir para **Tela 2: Importação & Carteira** → mostrar que na demo pública o upload real é bloqueado por segurança.
   - Clicar em **"Carregar Planilha de Exemplo no Assistente"** → mostrar o Passo 2 (mapeamento flexível de colunas) e o Passo 3 (prévia editável, duplicatas bloqueadas e linha sem data marcada como *"Necessita conferência"* — zero invenção de datas).
3. **Minuto 3–4 (Funil + Proposta em PDF — Tela 3):**
   - Abrir o cliente fictício *Condomínio Edifício Atlântico Sul* na **Tela 3**.
   - Avançar a etapa no funil de 7 estágios (*Contatado → Proposta preparada*), digitar os valores unitários (ex: `R$ 65,00`) e clicar em **"Salvar Proposta e Baixar PDF"**, abrindo o PDF limpo em A4 na tela.
4. **Minuto 4–5 (Fechamento Objetivo):**
   - Perguntar diretamente: *"Pelo tamanho da sua carteira hoje, faz mais sentido começar no Plano Inicial de R$ 49/mês (até 150 clientes) ou no Profissional de R$ 79/mês (até 500 clientes com apoio na 1ª planilha) para testar por 30 dias sem fidelidade?"*

### Etapa C — Onboarding do 1º Cliente Pagante (Do Aceite à Ativação em 10 Minutos)
1. **Aceite formal simples (WhatsApp ou E-mail):** Cliente responde confirmando o plano escolhido (R$ 49 ou R$ 79) e ciência do escopo transparente (`proposta-piloto.html`).
2. **Pagamento autorizado (zero custo fixo):** Fundador gera cobrança avulsa de 30 dias via **Pix (chave/QR Code) ou Link Asaas/Mercado Pago** e envia recibo comercial simples.
3. **Criação da Conta Real:** Cliente acessa `https://renovaext.com.br/app/` (após deploy autorizado), cria a conta da empresa e confirma o e-mail (provisionamento automático isolado por RLS no PostgreSQL).
4. **Ativação da Assinatura pelo Fundador:** Após compensação do Pix/Boleto, o fundador executa o comando administrativo (após aplicar a migration `20261125000012`):
   ```bash
   node tools/founder_activate_subscription_cli.mjs --email cliente@oficina.com.br --plan profissional_79 --status piloto_ativo --days 30 --ref PIX-20261125-001
   ```
5. **Primeira Vitória em 24h:** Cliente importa sua planilha CSV/XLSX real dentro da própria conta isolada, visualiza os vencimentos dos próximos 30 dias e gera a 1ª proposta em PDF.

---

## 5. Modelos de Abordagem Personalizada (EM ESPERA — ZERO DISPAROS REALIZADOS)

### Modelo 1 — WhatsApp Comercial (Curto, Direto, Sem Spam)
> Olá, pessoal da **[Nome da Empresa]**! Tudo bem?
> Vi o trabalho de vocês com manutenção e recarga de extintores em **[Cidade]**.
> Desenvolvemos o **RenovaExt**, uma ferramenta simples feita para empresas de extintores organizarem os vencimentos da carteira (30, 60 e 90 dias) direto da planilha atual e emitirem propostas em PDF — sem precisar trocar o sistema fiscal.
> Deixamos uma demonstração aberta com dados 100% fictícios (sem cadastro e sem enviar dados da sua empresa): `https://renovaext.com.br/demo/`
> Se fizer sentido, posso mostrar em 5 minutos como funciona no piloto de 30 dias (a partir de R$ 49/mês, sem fidelidade). Posso te mandar mais detalhes?

### Modelo 2 — E-mail Comercial (Para uso após ativar `comercial@renovaext.com.br`)
- **Assunto:** `Agenda de renovações e propostas PDF para [Nome da Empresa]`
- **Corpo:**
  > Olá, equipe da **[Nome da Empresa]**,
  >
  > Acompanhei a atuação de vocês em **[Cidade/UF]** com recarga e manutenção de extintores **[gancho específico: ex: para condomínios e empresas / assessoria AVCB]**.
  >
  > Muitas empresas do setor mantêm a carteira de clientes espalhada entre planilhas e conversas de WhatsApp, o que dificulta saber toda semana quem está próximo do prazo de acompanhamento ou com proposta em aberto.
  >
  > Criamos o **RenovaExt** justamente para atuar ao lado do sistema que vocês já usam:
  > - Importa sua planilha atual (CSV ou Excel), bloqueia duplicatas e marca registros sem data para conferência técnica (sem inventar prazos);
  > - Organiza o radar de renovações em atrasados, 30, 60 e 90 dias;
  > - Gera propostas comerciais em PDF com os preços que vocês praticam e controla o funil em 7 etapas.
  >
  > Você pode testar agora mesmo a demonstração interativa com dados fictícios (sem cadastro): `https://renovaext.com.br/demo/`
  >
  > Estamos abrindo vagas para o **Piloto de 30 dias sem fidelidade** (R$ 49/mês até 150 clientes ou R$ 79/mês até 500 clientes com apoio no mapeamento da primeira planilha).
  >
  > Se quiser ver na prática em 5 minutos, basta responder este e-mail.
  >
  > Atenciosamente,  
  > **Jeferson Zanotelli**  
  > Equipe Comercial | RenovaExt (`https://renovaext.com.br`)
  >
  > *(Caso não tenha interesse em receber contato sobre este assunto, basta responder "não tenho interesse" que não enviaremos novas mensagens.)*
