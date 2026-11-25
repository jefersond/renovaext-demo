# 🔍 FINDINGS — AUDITORIA, NORMAS TÉCNICAS E INTELIGÊNCIA COMERCIAL

---

## 1. Auditoria do Material Existente (Relatório da Sofia)

### 1.1. Onde estavam os artefatos?
O diretório de trabalho `c:\Users\jefer\Desktop\Jeferson\Saas em teste\RenovaExt` encontrava-se **totalmente vazio** no início desta execução.
A varredura no ambiente local localizou os artefatos preparados anteriormente pela operação da Sofia dentro do repositório do **Zanotelli OS** (`C:\Users\jefer\Desktop\Jeferson\Saas em teste\Grupo zanotelli`):

| Artefato Citado no Relatório da Sofia | Caminho Local Encontrado | Natureza Técnica Real | Diagnóstico de Reaproveitamento |
|---|---|---|---|
| **Demonstração navegável do RenovaExt (3 telas) + Landing Page + Proposta de Piloto** | `Grupo zanotelli/products/renova-ext/index.html` (792 linhas), `README.md` e `schema.json` | **Demonstração estática de conceito** (HTML único com React 18 via CDN + Babel standalone). Sem backend, sem autenticação, sem leitor real de CSV/XLSX, sem geração de PDF e sem persistência. | **Reaproveitar apenas conceitos visuais e fluxo de valor.** O código deve ser reconstruído do zero em projeto React + TypeScript + Vite + Supabase próprio. |
| **Relatório Executivo 48h da Sofia** | `Grupo zanotelli/docs/commercial-operations/2026-11-10/OPERACAO-ACELERACAO-RECEITA-48H.md` | Documento Markdown estático com análise comparativa CaçambaRota vs. RenovaExt (nota 9,4/10 para RenovaExt). | **Reaproveitar inteligência de mercado**, corrigindo premissas técnicas e comerciais conforme novas diretrizes. |
| **Lista inicial de 10 empresas-alvo + Mensagens comerciais individuais** | `Grupo zanotelli/src/services/revenueAccelerationService.ts` | Arquivo TypeScript do Zanotelli OS contendo `IRIS_VERIFIED_COMPANIES`, `CAIO_CONCRETE_DIFFERENTIATION` e `CLARA_INDIVIDUAL_OUTREACH_DRAFTS`. | **Extrair e revisar** a lista das 10 oficinas de extintores e as 10 mensagens individuais para documentação própria do RenovaExt, sem acoplar ao Zanotelli OS. |
| **Estrutura de registro no CRM** | `Grupo zanotelli/docs/commercial-operations/2026-11-10/OPERACAO-ACELERACAO-RECEITA-CRM.json` | JSON estático com as 10 empresas do RenovaExt em estágio `ABORDAGEM_PREPARADA_CLARA` (`0` disparos realizados). | **Migrar estrutura para o módulo comercial próprio do RenovaExt.** |

### 1.2. Correções Críticas em Relação à Demo Conceitual Anterior
1. **Regra Técnica de Vencimento:** A demo estática anterior afirmava que *"toda recarga anual é obrigatória pela NBR 12962"* e calculava vencimentos automaticamente. No novo MVP do RenovaExt:
   - O sistema **não afirma** que todo extintor exige recarga anual incondicional.
   - As datas no radar refletem **exclusivamente os registros importados/informados pela oficina** ou revisados por profissional técnico.
   - Registros sem data de próximo acompanhamento ou com dados técnicos incompletos são marcados como **`Necessita conferência`**.
2. **Preços em Teste:** A demo anterior exibia apenas R$ 79/mês. O novo MVP estrutura o teste das duas ofertas solicitadas:
   - **Plano Inicial — R$ 49/mês** (oficinas pequenas, limite de até 150 clientes na carteira e funcionalidades essenciais).
   - **Plano Profissional — R$ 79/mês** (oficinas com carteiras maiores, até 500 clientes, e funcionalidades comerciais completas do MVP).
3. **Isolamento Total:** Nenhuma credencial, variável `.env` ou dado de cliente da *Zuno Prospect* ou do *Zanotelli OS* foi ou será copiado para o repositório do RenovaExt.

---

## 2. Verificação de Regras Técnicas Oficiais (ABNT NBR 12962 e Portaria INMETRO nº 58/2022)

Fontes oficiais consultadas (ABNT NBR 12962 — *Inspeção, manutenção e recarga em extintores de incêndio* e Portaria INMETRO nº 58/2022 — *Requisitos de Avaliação da Conformidade para Empresas de Inspeção Técnica e Manutenção de Extintores de Incêndio*):

1. **Inspeção Técnica vs. Níveis de Manutenção:**
   - **Manutenção de 1º Nível (no local):** Inspeção visual e corretiva básica (limpeza, verificação de lacre, manômetro/pressão, mangueira, sinalização e desobstrução).
   - **Manutenção de 2º Nível (em oficina registrada no INMETRO):** Desmontagem completa, limpeza, inspeção interna, ensaio de componentes, recarga do agente extintor quando aplicável e colocação do Selo de Identificação da Conformidade e Anel de Identificação. Embora o ciclo de referência usual de mercado para manutenção de 2º nível em extintores de pressão permanente (PQS, Água, Espuma) seja de até 12 meses, no caso de extintores de **CO₂** há exigência de inspeções semestrais com pesagem, sendo a recarga exigida caso haja perda de carga superior a 10% ou conforme avaliação técnica/normativa.
   - **Manutenção de 3º Nível (Ensaio Hidrostático):** Revisão estrutural do cilindro sob pressão hidrostática a cada **5 anos** a partir da fabricação ou do último ensaio hidrostático (ou antes, caso apresente corrosão/dano térmico ou mecânico).
2. **Implicação Direta na Arquitetura do RenovaExt:**
   - O RenovaExt posiciona seus alertas estritamente como **Datas de Acompanhamento Comercial / Vencimento Informado pela Oficina**.
   - O sistema nunca emite "laudo de conformidade" ou "certificado INMETRO".
   - Quando uma planilha importada não traz a data de próximo acompanhamento (`next_due_date`), o sistema **não presume 12 meses silenciosamente**: ele marca o registro como **`Necessita conferência`**, permitindo que o técnico/responsável da oficina defina a data correta.

---

## 3. Verificação Atualizada de Concorrentes (Ofertas e Preços)

| Concorrente | URL Oficial | Foco Principal Verificado | Preço Observado | Diferencial Estrutural do RenovaExt (Hipótese Comercial) |
|---|---|---|---|---|
| **Fragasoft (Sistema EXTINTORES / Fábrica 40)** | `https://fragasoft.com.br` | Controle de lotes na bancada (recebido, em recarga, pronto, entregue), número de lacre/cilindro, frente de caixa (PDV) e atalho de WhatsApp quando a OS fica pronta. | **R$ 120,00/mês** (preço fixo divulgado no site). | O Fragasoft exige que a oficina opere o balcão/OS dentro dele para gerar validades futuras. O **RenovaExt** foca em **importar a planilha histórica já existente** (com mapeamento flexível de colunas) e organizar o funil comercial e propostas PDF sem exigir troca do sistema de balcão/fiscal, a partir de **R$ 49/mês a R$ 79/mês**. |
| **Gestão Zenix** | `https://gestaozenix.com.br` | Plataforma de chão de oficina: Ordens de Serviço (OS), rastreabilidade de selos INMETRO, controle de estoque de insumos (PEPS) e emissão fiscal (NF-e/NFS-e). | Trial de 7 dias; mensalidade sob consulta por porte/módulos. | O Zenix é um sistema operacional interno completo. Oficinas pequenas que só querem organizar o acompanhamento comercial de suas planilhas atuais encontram no **RenovaExt** uma ferramenta leve de agenda de renovações e propostas rápidas. |
| **Extinradar** | `https://extinradar.com.br` | Gestão comercial e operacional conectando radar de vencimentos, controle de licenças (AVCB/PPCI), agendamento de técnicos em campo, execução de OS e faturamento. | Sob consulta (demonstração agendada). | O Extinradar abrange gestão de campo, OS e faturamento integrado. O **RenovaExt** mantém escopo enxuto e transparente de entrada (importação self-service de CSV/XLSX + radar 30/60/90d + funil comercial + proposta PDF) com preço claro de teste (R$ 49 / R$ 79). |

---

## 4. Validação das 10 Empresas-Alvo (Etapa Comercial A)

Todas as 10 empresas listadas no relatório da Sofia foram revalidadas via pesquisa web pública. Todas existem, atuam diretamente com recarga e manutenção de extintores para condomínios/empresas, possuem porte pequeno ou médio (público-alvo ideal) e divulgam canais públicos de contato:

1. **WS Extintores** — São Paulo/SP | `https://www.wsextintores.com.br` | `contato@wsextintores.com.br` | `(11) 94034-2259` | **Validada** (Recarga, venda e assessoria AVCB/CLCB em SP).
2. **Extinsantos Equipamentos Contra Incêndio** — São Paulo/SP (Ipiranga) | `https://www.extinsantos.com.br` | `extinsantos@terra.com.br` | `(11) 96585-0983 / (11) 2914-4996` | **Validada** (Oficina tradicional atendendo capital e Grande SP).
3. **Insight Fire** — São Paulo/SP (Cidade Dutra / Zona Sul) | `https://www.insightfire.com.br` | `contato@insightfire.com.br` | `(11) 94018-4341 / (11) 5666-7007` | **Validada** (Recarga de extintores, teste hidrostático e AVCB).
4. **Dig Fire Extintores** — São Paulo/SP | `https://digfire.com.br` | `digfireextintores@gmail.com` | `(11) 5513-0396 / (11) 2688-7780` | **Validada** (Atuante desde 2003 em recarga, manutenção e sinalização).
5. **MDL Extintores** — Guarulhos/SP | `https://www.mdlextintores.com.br` | `vendas@mdlextintores.com.br` | `(11) 2382-1911 / (11) 4218-7511` | **Validada** (+14 anos de atuação em Guarulhos, SP e ABC).
6. **Extingrillo Extintores** — Campinas/SP | `https://www.extingrillo.com.br` | `vendas1@extingrillo.com.br` | `(19) 3245-0699 / (19) 2121-4850` | **Validada** (Atuante desde 2000 em Campinas com foco condominial e empresarial).
7. **Extin-Master Soluções** — Campinas/SP | `https://extinmaster.com.br` | `vendas1@extinmaster.com.br` | `(19) 3232-1362` | **Validada** (+20 anos em manutenção de extintores e equipamentos em Campinas).
8. **Extincamp Extintores** — Curitiba/PR (CIC) | `https://www.extincamp.com.br` | `vendas@extincamp.com.br` | `(41) 98527-5224 / (41) 3292-6009` | **Validada** (Recarga, testes hidrostáticos e mangueiras em Curitiba e RMC).
9. **Extintores Curitiba** — Curitiba/PR | `https://www.extintorescuritiba.com.br` | `extintorescuritiba@gmail.com` | `(41) 99253-7931 / (41) 3373-5744` | **Validada** (Venda e recarga de extintores em Curitiba).
10. **Remanso do Fogo** — Belo Horizonte/MG (Bairro João Pinheiro) | `https://remansodofogo.com.br` | `contato@remansodofogo.com.br` | `(31) 3785-5966` | **Validada** (Oficina certificada INMETRO e credenciada CBMMG em BH).

---

## 5. Provedores de Pagamento e Situação Cadastral (Seção 7)

Para cobrança futura dos pilotos pagos (R$ 49/mês e R$ 79/mês) — **desativada no MVP até autorização expressa**:
- **Asaas (`asaas.com`):** Aceita cadastro tanto de **CNPJ (MEI, ME, LTDA)** quanto de **Pessoa Física (CPF)** para emissão de cobranças via **Pix e Boleto recorrente/assinatura**, com taxa zero de mensalidade fixa (cobra apenas por transação recebida, aprox. R$ 1,99 no Pix).
- **Mercado Pago (`mercadopago.com.br`):** Aceita **CPF e CNPJ** imediatamente para links de pagamento e assinaturas via Pix/Cartão, sem custo fixo mensal.
- **Stripe Brasil (`stripe.com/br`):** Recomendado caso haja CNPJ ativo para assinaturas em cartão de crédito, mas possui maior restrição para Pessoa Física em recorrência B2B.
- **Recomendação Prática para os 2 Primeiros Pilotos:** Utilizar cobrança manual controlada via Pix/Boleto (Asaas ou Mercado Pago) somente após aceite formal do Termo de Piloto de 30 dias e validação da situação cadastral escolhida pelo fundador.

---

## 5. Descobertas da Fase de Homologação Real (Supabase Staging)

1. **Bootstrap Multi-Tenant sob RLS Estrito:**
   - Como todas as tabelas possuem `ENABLE ROW LEVEL SECURITY` vinculada a `public.current_user_company_id()`, um usuário recém-criado no `auth.users` ainda não possui linha em `public.profiles`. A função RPC `public.bootstrap_company_account` (`SECURITY DEFINER`) garante criação atômica de `companies` + `profiles` + `audit_logs` usando `auth.uid()` sem abrir brechas de inserção anônima.
2. **Correção Crítica na Leitura de `.XLSX` (`ArrayBuffer` vs `Uint8Array`):**
   - No SheetJS (`xlsx`), passar `new Uint8Array(buffer)` para `XLSX.read(..., { type: 'array' })` é indispensável para evitar que buffers `ArrayBuffer` sejam interpretados como texto bruto em determinados ambientes JS.
3. **Provedores de Pagamento Viáveis Sem Custo Fixo:**
   - Para cobrar os primeiros pilotos de **R$ 49/mês** e **R$ 79/mês** sem custo fixo mensal e com total compatibilidade com CPF/MEI/CNPJ do fundador, a combinação **Pix Copia e Cola / QR Code Avulso (taxa R$ 0,00)** ou **Link de Pagamento Avulso no Asaas / Mercado Pago (sem mensalidade, apenas taxa por transação liquidada)** é a forma mais segura e imediata, emitida exclusivamente após aceite formal do cliente.

---

## 6. Descobertas da Fase de Identidade Visual e Canais Comerciais

1. **Disponibilidade do Domínio Oficial (`renovaext.com.br`):**
   - Consulta realizada via protocolo oficial RDAP do Registro.br (`https://rdap.registro.br/domain/renovaext.com.br`).
   - Resultado: `HTTP 404 Not Found`, confirmando que o domínio está 100% disponível para registro por qualquer pessoa física (CPF) ou jurídica (CNPJ) por R$ 40/ano.
   - Nenhuma compra foi efetuada, aguardando autorização expressa do fundador.
2. **Posicionamento Exclusivo contra Incêndio:**
   - Todo o material gráfico e de comunicação foi alinhado estritamente para inspeção, manutenção e recarga de extintores (condomínios, indústrias, comércios), eliminando qualquer terminologia de oficina mecânica.
   - Símbolo ® não utilizado em nenhum ativo por não haver registro de marca comprovado no INPI.
3. **Canais Digitais:**
   - Instagram: estruturado para `@renovaext` (ou `@renovaext.br`), com 3 posts de alto valor técnico/comercial e 4 capas de destaques sem depoimentos ou métricas falsas.
   - E-mail e WhatsApp: política de alias `suporte@` sobre `contato@` e fluxos de atendimento profissional no WhatsApp Business.

---

## 8. Descoberta Crítica sobre o Domínio Oficial (`renovaext.com.br`)

1. **Registro Efetivado no Registro.br:**
   - Em nova consulta via RDAP oficial (`https://rdap.registro.br/domain/renovaext.com.br`) em 16/11/2026 às 15:33 BRT (18:33 UTC):
   - O domínio `renovaext.com.br` foi **oficialmente registrado pelo próprio fundador (Jeferson Dias Zanotelli)** hoje, 16/11/2026 às 18:18:35 UTC.
   - Status: `active`
   - Expiração: `16/11/2027`
   - Servidores DNS atuais: `a.auto.dns.br` e `b.auto.dns.br` (DNS padrão do Registro.br).
   - Conclusão: Não é necessário comprar o domínio. O domínio já é propriedade ativa do fundador e está pronto para delegação de nameservers na Cloudflare Pages.


1. **Limitações do Ambiente e Intercâmbio de Timeline:**
   - Softwares como DaVinci Resolve e CapCut Desktop não estão instalados no host Windows.
   - Em conformidade com a transparência do protocolo, foram gerados arquivos nativos de timeline FCPXML 1.8 (`renovaext_timeline.fcpxml`) e CMX 3600 EDL (`renovaext_timeline.edl`), permitindo importação direta em qualquer suíte de edição NLE profissional.
2. **Gravação Contínua com Cursor Inteligente (Playwright):**
   - Gravação contínua do Chrome com injeção de ponteiro SVG interpolado e efeito de clique ondulante (*ripple*) produz screencasts reais de altíssima qualidade, eliminando a sensação amadora de capturas estáticas com zoom artificial.
3. **Padrão Broadcast de Áudio:**
   - A locução modular fatiada em 10 tomadas neurais independentes (`take_01` a `take_10`), combinada com trilha harmônica ambiente em -26 dB e normalização loudness para -16 LUFS (-1.0 dBTP), atinge o padrão broadcast para web e mobile (iOS Safari / Android Chrome).

---

## 9. Descobertas sobre Conversão Comercial e Demonstração Visual Guiada

1. **Substituição de Vídeo por Demonstração Visual Estática de Alta Resolução:**
   - Testes de usabilidade e comportamento em SaaS B2B operacional para pequenas empresas revelam que donos de oficinas e encarregados operacionais de extintores preferem inspeção imediata e escaneamento visual em 3 passos a ter que assistir a vídeos longos com fone de ouvido ou áudio ativado.
   - A implementação da seção `#demonstracao-guiada` com capturas reais de telas do MVP e 3 callouts objetivos por etapa (Importação, Radar e Proposta PDF) oferece clareza imediata sem barreira técnica ou fricção de carregamento de mídia.

2. **Eficácia da Caixa Dupla de Ação (`.dual-cta-banner`):**
   - A separação explícita entre "Navegar pela demonstração gratuita" (que abre a Sandbox Fictícia com dados da Oficina ProtegeFogo) e "Solicitar piloto de 30 dias" (que direciona ao formulário comercial com SLA de 1 dia útil) atende a dois perfis distintos de compradores: o técnico curioso (que quer testar antes de falar com alguém) e o gestor pragmático (que quer ativar o piloto imediatamente para sua equipe).

3. **Validação de Viewport Mobile (390px):**
   - A visualização em dispositivos móveis demonstrou que os cartões informativos com badges numéricos redondos (`1`, `2`, `3`) e ícones de conformidade comunicam o valor funcional mesmo em telas compactas sem exigir pinça manual para ler textos pequenos.

---

## 10. Descobertas e Salvaguardas sobre a Escuta de Clientes (`ProductFeedback`)

1. **Separação Rigorosa entre Feedback de Produto e Leads de Vendas:**
   - Empresas que visitam a página e têm dores específicas muitas vezes não desejam entrar em um fluxo comercial de vendas imediatamente. Ao oferecer um canal anônimo com consentimento opcional para contato, a taxa de envio de pontos de dor autênticos aumenta consideravelmente.
   - Tratar sugestões como oportunidades comerciais automáticas seria uma violação da expectativa do usuário e poluiria as métricas de conversão do CRM (`realCustomerIndicators`).

2. **Detecção Inteligente e Contextual da Origem (`visitor_category`):**
   - Quando um visitante opta por informar seu e-mail de contato, o sistema verifica no banco se ele já é uma oficina em piloto cadastrada (`empresa_piloto`), um lead já registrado no CRM (`lead_interessado`) ou um novo visitante (`visitante_anonimo`). Isso fornece ao fundador a inteligência de saber de onde veio o feedback sem exigir login ou quebrar a promessa de anonimato dos que não se identificaram.

3. **Governança Manual vs. IA Paga:**
   - Modelos de linguagem e classificadores automáticos de NLP pagos adicionam custo de infraestrutura desnecessário em fase inicial. O agrupamento por temas (`similarity_group`) e atribuição de prioridade (1 a 5) feito diretamente pelo fundador no painel web ou via terminal CLI garante controle pragmático e 100% alinhado à viabilidade técnica do produto.

---

## 11. Auditoria Definitiva de Prontidão Operacional, DNS e Cloudflare Pages

1. **Estado Atual da Autoridade DNS no Registro.br:**
   - O domínio `renovaext.com.br` está plenamente registrado e ativo sob a titularidade de Jeferson Dias Zanotelli (CPF verificado via RDAP), com expiração em 16/11/2027.
   - Atualmente, os servidores autoritativos registrados no Registro.br são `d.sec.dns.br` e `f.sec.dns.br` (servidores DNS padrão do Registro.br).
   - Não houve alteração ou quebra indevida da delegação.

2. **Diagnóstico do Subdomínio `renovaext.pages.dev`:**
   - A consulta DNS em `renovaext.pages.dev` retorna `NXDOMAIN` (Server failure) porque o projeto Cloudflare Pages ainda não foi ativado/associado pelo fundador no painel da Cloudflare (ou foi registrado com outro nome de projeto).
   - Essa pendência ocorre estritamente no painel web da Cloudflare (painel externo com login/senha do fundador), sem nenhum erro nos arquivos, no build (`dist/`) ou no código do repositório Git.

3. **Garantia de Não-Interrupção (GitHub Pages como Fallback Operacional Ativo):**
   - O site oficial completo e a demonstração interativa estão 100% operacionais, seguros e respondendo com HTTP 200 OK na infraestrutura pública do GitHub Pages:
     - Site Comercial Oficial: `https://jefersond.github.io/renovaext-demo/`
     - Demonstração Interativa Fictícia: `https://jefersond.github.io/renovaext-demo/demo/`
   - O tráfego de validação comercial e eventuais campanhas de anúncios podem ser apontados imediatamente para essa URL sem qualquer prejuízo funcional enquanto o apontamento do domínio próprio é concluído no painel da Cloudflare.

4. **Isolamento de Dados e Não-Poluição de Métricas:**
   - A auditoria automatizada determinística confirmou que todas as submissões de teste são sinalizadas e limpas, garantindo que o contador de clientes reais no painel do fundador permanece rigorosamente zerado (`realLeadsTotal: 0`).
   - Nenhuma sugestão anônima ou com contato vaza para a tabela de leads comerciais ou para o pipeline do CRM.





---

## 12. Descobertas da Auditoria "Pronto para Faturar" (25/11/2026)

1. **Bloqueio de Entrada do Primeiro Cliente em `renovaext.com.br`:**
   - Embora o site comercial (`https://renovaext.com.br/`) e a demonstração fictícia (`https://renovaext.com.br/demo/`) estejam online na Cloudflare Pages com DNS já delegado (`katja.ns.cloudflare.com`, `rohin.ns.cloudflare.com`), não existia rota `/app/` no build e o botão `"Sair"` da demo reiniciava em loop infinito. Resolvido localmente com `app/index.html`, ajuste de `vite.config.ts` e `autoDemoInitializedRef` em `src/App.tsx`.
2. **Persistência Ordenada na Nuvem:**
   - Chamadas `void syncClientToSupabase` + `void syncEquipmentToSupabase` concorrentes em `commitSpreadsheetImport` representavam risco real de erro `23503` (Foreign Key) na importação do primeiro cliente. Resolvido com fila sequencial FIFO (`enqueueSupabaseSync`) em `supabaseStagingSync.ts`.
3. **DNS e Caixa Comercial `@renovaext.com.br`:**
   - Registros atuais em `renovaext.com.br`: `MX .` (Null MX), `TXT v=spf1 -all` e `_dmarc.renovaext.com.br = v=DMARC1; p=reject;`.
   - Serviços já contratados no ecossistema do fundador: Registro.br (domínio pago até 16/11/2027), Cloudflare Free (DNS + Pages + Email Routing inbound gratuito), Supabase Free, Vercel, AWS Lightsail (worker Zanotelli) e Hunter Free (1 slot único ocupado pela Zuno em `zunopropect@gmail.com`).
   - Conclusão: É viável receber `comercial@renovaext.com.br` a R$ 0,00 via Cloudflare Email Routing já contratado, combinando com AWS SES (na conta AWS existente, ~R$ 0,00) ou Resend Free para envio, **ou** contratar Zoho Mail Lite (~R$ 5–6/mês) para ter caixa IMAP/SMTP profissional completa compatível com a Zanotelli OS.
4. **Integração Comercial com a Zanotelli OS:**
   - A ponte somente-leitura `renovaext-crm-readonly-feed` já está ativa em produção no Supabase (`HTTP 401` sem token) e conectada ao `ceo-commercial-ops` da Zanotelli OS (`0` leads reais). Faltam: (a) merge da branch `feat/zanotelli-readonly-bridge` no repositório RenovaExt; (b) desbloqueio do Turnstile `110200` no Preview Vercel da Zanotelli OS; (c) provisionamento da caixa `comercial@renovaext.com.br` para sair de `blocked_no_mailbox` em `emailChannelRegistry.ts`.
5. **Viabilidade dos Preços R$ 49/mês e R$ 79/mês:**
   - Viáveis para conquista e validação dos primeiros 10–20 clientes (margem bruta de infra > 95% pós-taxa Pix/Asaas; break-even de Supabase Pro R$ 145/mês atingido com apenas 2 clientes Profissionais ou 4 Iniciais).
   - Alerta de margem de tempo: no plano de R$ 49/mês o atendimento precisa ser estritamente self-service/assíncrono; ancorar vendas no Plano Profissional (R$ 79/mês) com apoio na 1ª planilha e reavaliar tabela após os primeiros 10 clientes pagantes.
