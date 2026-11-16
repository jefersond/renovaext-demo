# 📋 TASK PLAN — PROJETO RENOVAEXT (MVP & OPERAÇÃO COMERCIAL)

> **Protocolo:** V.L.A.E.G. (Visão, Link, Arquitetura, Estilo, Gatilho)
> **Meta Técnica:** Aplicação Web/PWA responsiva em React + TypeScript + Supabase (PostgreSQL + RLS) pronta para demonstração e homologação.
> **Meta Comercial Inicial:** Conquistar os **2 primeiros pilotos pagos** (hipóteses de preço: R$ 49/mês e R$ 79/mês).

---

## Blueprint Aprovado de Execução — 100% Concluído

### Fase 0: Inicialização e Governança V.L.A.E.G.
- [x] Inicializar `gemini.md` (Constituição, Esquemas de Dados e Invariantes).
- [x] Inicializar `task_plan.md`, `findings.md` e `progress.md`.
- [x] Criar diretórios da arquitetura de 3 camadas (`architecture/`, `tools/`, `.tmp/`).

### Fase 1: Auditoria e Recuperação Estrutural
- [x] Localizar os artefatos citados no relatório da Sofia (`Grupo zanotelli/products/renova-ext/` e `docs/commercial-operations/2026-11-10/`).
- [x] Auditar o que é demonstração estática vs. código funcional e documentar em `findings.md`.
- [x] Verificar normas técnicas oficiais (ABNT NBR 12962 e Portaria INMETRO nº 58/2022).
- [x] Verificar ofertas e preços atuais dos concorrentes (Fragasoft, Gestão Zenix e Extinradar).
- [x] Auditar e validar as 10 empresas-alvo do setor de extintores.
- [x] Inicializar repositório Git próprio e isolado em `c:\Users\jefer\Desktop\Jeferson\Saas em teste\RenovaExt` (sem copiar dados ou credenciais da Zuno Prospect / Zanotelli OS).

### Fase 2: Link, Banco de Dados e Arquitetura (Camadas A.N.T.)
- [x] Escrever os POPs técnicos em `architecture/`:
  - `pop-01-autenticacao-isolamento-rls.md`
  - `pop-02-importacao-planilhas-validacao.md`
  - `pop-03-radar-renovacoes-carteira.md`
  - `pop-04-propostas-pdf-funil-comercial.md`
- [x] Criar migração PostgreSQL + RLS em `supabase/migrations/20261112000001_renovaext_mvp_schema.sql`.
- [x] Criar e executar script determinístico de verificação (`tools/verify_env_and_schema.mjs` e `tools/verify_env_and_schema.py`).

### Fase 3: Construção do MVP Full-Stack (React + TypeScript + PWA)
- [x] Configurar projeto React 18 + TypeScript + Vite + Tailwind CSS + PWA (`manifest.webmanifest`, `sw.js`).
- [x] Implementar camada de autenticação e isolamento multi-tenant (`company_id` / RLS) com suporte a Supabase real e persistência local isolada para homologação imediata.
- [x] Implementar **Cadastro, Login, Perfil do Responsável, Configuração da Empresa e Seleção de Plano em Teste (R$ 49/mês e R$ 79/mês)**.
- [x] Implementar **Assistente de Importação de Planilhas (CSV e XLSX)**:
  - Mapeamento flexível de colunas.
  - Prévia editável antes da confirmação.
  - Prevenção de duplicatas.
  - Marcação automática como `necessita_conferencia` quando datas ou dados técnicos estiverem ausentes (zero invenção de datas).
- [x] Implementar **Tela 1 — Painel Principal & Radar de Renovações**:
  - KPIs (clientes, equipamentos, atrasados, próximos vencimentos, oportunidades, propostas criadas/aceitas/perdidas).
  - Janelas do Radar: *A conferir agora (Atrasados)*, *Próximos 30 dias*, *Próximos 60 dias*, *Próximos 90 dias* e *Dados incompletos*.
  - Filtros por período e cliente + avisos claros de conformidade técnica (não constitui laudo).
- [x] Implementar **Tela 2 — Importação & Carteira de Clientes**:
  - Lista de clientes, ficha detalhada com informações comerciais, equipamentos, histórico de serviços, datas registradas, propostas, observações, situação comercial e exportação LGPD (JSON).
- [x] Implementar **Tela 3 — Cliente, Oportunidade (Funil de 7 Etapas) & Proposta Comercial (PDF)**:
  - Funil comercial (*Pendente de conferência*, *Pronto para contato*, *Contatado*, *Proposta preparada*, *Proposta enviada*, *Aceito*, *Perdido*) com histórico de movimentações.
  - Gerador de Proposta Comercial com preços 100% editáveis, cálculo de total, validade e **download real de PDF**.

### Fase 4: Testes de Aceitação (10 Critérios Obrigatórios)
- [x] Criar suíte automatizada de testes (`vitest`) cobrindo os 10 critérios de aceitação (`src/__tests__/acceptance.test.ts` e `src/__tests__/ui_integration.test.tsx`).
- [x] Executar build de produção (`npm run build`) e testes automatizados (`npm test`).

### Fase 5: Entregáveis Comerciais e Documentação Executiva
- [x] Preparar pacote comercial completo em `docs/comercial/`:
  - `01-auditoria-e-analise-competitiva.md`
  - `02-lista-verificada-10-empresas.md`
  - `03-mensagens-comerciais-individuais.md`
  - `04-proposta-piloto-30-dias.md`
  - `05-briefing-site-comercial.md`
  - `06-custos-operacionais-e-provedores-pagamento.md`
  - `07-proximas-acoes-2-pilotos-pagos.md`

---

## Fase 6: Homologação Real + Preparação dos 2 Primeiros Pilotos Pagos
- [x] **Frente 1 — Homologação Real:**
  - [x] 1. Auditar o código criado e conectar `tenantRepository.ts` / `App.tsx` ao Supabase Staging real (`supabaseStagingSync.ts`).
  - [x] 2. Criar Supabase de Staging exclusivo do RenovaExt (`RenovaExt Staging` — `xmuzcnjcwkhgojnaosha`).
  - [x] 3. Aplicar migrations exclusivamente em Staging (`supabase/migrations/20261112000001_renovaext_mvp_schema.sql`).
  - [x] 4. Testar autenticação real (`Supabase Auth` JWT).
  - [x] 5. Criar duas empresas de teste (`Oficina Alpha` e `Oficina Beta`) e comprovar isolamento RLS no banco PostgreSQL (`42501` em INSERT cruzado, `0` linhas em SELECT/UPDATE cruzado).
  - [x] 6. Importar arquivos CSV e XLSX reais (`docs/homologacao/planilha-teste-homologacao.csv` e `.xlsx`) com formatos incorretos (`32/13/2026`), duplicatas e campos ausentes.
  - [x] 7. Confirmar cálculos de datas (`ATRASADO`, `D_30`, `D_60`, `D_90`) e sinalização `needs_review = true` (`INCOMPLETO`) sem inventar datas.
  - [x] 8. Abrir cliente, movimentar oportunidade no funil, editar valores e gerar proposta PDF real (`docs/homologacao/proposta-homologacao-real.pdf`).
  - [x] 9. Testar a jornada completa em viewport de celular (`390x844`) e computador.
  - [x] 10. Corrigir defeito de leitura de `ArrayBuffer` em arquivos `.xlsx` (`new Uint8Array(buffer)`).
- [x] **Frente 2 — Preparação Comercial:**
  - [x] Revisão das 10 oficinas verificadas, contatos públicos e aderência ao perfil.
  - [x] Roteiro de demonstração simples (planilha + radar + PDF), mensagens individuais em espera, oferta de piloto de 30 dias (R$ 49/mês e R$ 79/mês), transparência do que funciona vs. não disponível, processo de aceite/cobrança/cancelamento/suporte e CRM estruturado (`08-registro-crm-interessados-e-pilotos.json`).
- [x] **Frente 3 — Site:**
  - [x] Confirmação de que 100% das promessas em `docs/comercial/05-briefing-site-comercial.md` correspondem às funcionalidades reais e homologadas do MVP.

---

## Fase 7: Publicação Segura HTTPS e Operação Comercial (Rodada 1)
- [x] **Prioridade 1 — Link de Demonstração Segura:**
  - [x] 1. Publicar versão de demonstração em HTTPS sem custos adicionais (`https://jefersond.github.io/renovaext-demo/?demo=1`).
  - [x] 2. Usar somente dados fictícios na demonstração pública (sandbox isolado client-side).
  - [x] 3. Auditar bundle `dist/` (`tools/verify_public_bundle_security.mjs`) comprovando ausência total de `service_role`, segredos ou credenciais administrativas.
  - [x] 4. Separar contas de testes internos (`Oficina Alpha` e `Oficina Beta`) da experiência de demonstração pública.
  - [x] 5. Rotacionar senhas expostas anteriormente em relatórios (`tools/rotate_and_isolate_staging_accounts.mjs`) e bloquear reutilização.
  - [x] 6. Manter confirmação de e-mail ativada por padrão + trigger `public.handle_auth_user_confirmed()` (`supabase/migrations/20261115000002_auth_email_confirmation_and_isolation.sql`) + fluxo de reenvio de e-mail na UI.
  - [x] 7. Confirmar isolamento multi-tenant (`company_id` / RLS) entre oficinas.
  - [x] 8. Testar novamente em computador (`1280x800`) e celular (`390x844`).
- [x] **Prioridade 2 — Vendas (Rodada 1):**
  - [x] 1-3. Revisar as 10 oficinas, separar 5 contatos para a Rodada 1 e verificar sites (`HTTP 200 OK`), e-mails e existência das empresas.
  - [x] 4-5. Preparar 5 abordagens individuais com convite para demonstração (`docs/comercial/03-mensagens-comerciais-individuais.md`), aguardando aprovação do fundador antes do envio.
  - [x] 6-7. Publicar link comercial (`https://jefersond.github.io/renovaext-demo/comercial.html`) com vídeo demonstrativo de 2min 15s (*importar planilha → visualizar vencimentos → gerar proposta PDF*).
  - [x] 8-10. Publicar página de Proposta de Piloto de 30 dias (`https://jefersond.github.io/renovaext-demo/proposta-piloto.html`) com R$ 49/mês e R$ 79/mês, protocolo de não coletar planilhas reais antes do aceite/segurança/backups e CRM atualizado (`docs/comercial/08-registro-crm-interessados-e-pilotos.json`).

---

## Fase 8: Correção Comercial Antes da Primeira Venda (Captação de Leads e Preview)
- [x] 1. Auditar as páginas públicas (`/comercial.html`, `/proposta-piloto.html` e `/?demo=1`).
- [x] 2. Criar CTAs visíveis nas páginas: `"Solicitar demonstração"` e `"Quero participar do piloto"`.
- [x] 3. Implementar formulário funcional e responsivo com os 7 campos obrigatórios/opcionais.
- [x] 4. Registrar interessados em armazenamento seguro separado dos dados das oficinas (`public.commercial_leads`), com proteção contra spam, política de privacidade e controle de acesso RLS.
- [x] 5. Confirmar recebimento do cadastro com protocolo oficial (`SOL-...`) sem inventar telefone ou endereço de e-mail.
- [x] 6. Testar o fluxo completo (`Visitante → Formulário → Registro → Confirmação → CRM`) via `tools/test_lead_flow_and_crm_sync.mjs`.
- [x] 7. Revisar promessas comerciais (descrição técnica exata de RLS, suporte realista de 1 dia útil, transparência do vídeo de 2min 15s e bloqueio de upload de planilha real na demonstração pública `/?demo=1`).
- [x] 8-9. Atualizar as 5 mensagens comerciais individuais com o link de solicitação (`#solicitar`) sem enviar mensagens nem cobrar sem autorização.
- [x] 10. Publicar branch/preview (`preview/correcao-comercial-leads` e `/preview/`) e entregar checklist completo de publicação.

---

## Fase 9: Finalização da Publicação e Preparação da 1ª Rodada de Vendas (`rc/publicacao-rodada-1`)
- [x] 1. Conferir estado exato das páginas públicas e versões Git (`tools/inspect_pages_and_git_state.mjs`).
- [x] 2. Preparar promoção da versão revisada (`tools/promote_release_candidate_to_production.mjs`), preservando a demonstração fictícia e aguardando aprovação do fundador antes do push final em produção.
- [x] 3. Repetir o teste `Formulário → Supabase → Registro Comercial` (`tools/test_lead_flow_and_crm_sync.mjs`).
- [x] 4. Verificar autenticação, autorização, rate limiting no servidor (IP hash, e-mail hash e disjuntor global) e proteção contra abuso/XSS na RPC `submit_commercial_lead`.
- [x] 5. Garantir zero exposição de dados pessoais (PII) em logs públicos, resposta HTTP da RPC ou `localStorage` do frontend.
- [x] 6. Criar painel autenticado do fundador (`/painel-fundador-crm.html` + CLI `npm run crm:consultar`) exibindo data, oficina, plano e status de acompanhamento sem `service_role` no navegador.
- [x] 7. Implementar sincronização contínua ao CRM via trigger PostgreSQL (`trg_sync_lead_to_crm_pipeline`).
- [x] 8. Remover registro fictício de teste dos indicadores de clientes reais (`realLeadsTotal: 0`, `excludedTechnicalTestRecords: 1`), preservando evidências técnicas em `docs/homologacao/evidencias-fluxo-leads-comerciais.json`.
- [x] 9. Reconfirmar viabilidade operacional do SLA de resposta em até 1 dia útil.
- [x] 10. Preparar as 5 mensagens comerciais da Rodada 1 para revisão final.

---

## Fase 10: Identidade Oficial e Canais Comerciais
- [x] 1. Criar identidade visual oficial para empresas de extintores de incêndio (sem menção a oficinas mecânicas; sem símbolo ® sem registro).
- [x] 2. Gerar logotipo oficial em todos os formatos necessários (SVG editável e PNG transparente):
  - Horizontal Claro (`public/brand/renovaext-logo-horizontal-claro.svg` / `.png`)
  - Horizontal Escuro (`public/brand/renovaext-logo-horizontal-escuro.svg` / `.png`)
  - Fundo Claro (`public/brand/renovaext-logo-fundo-claro.svg` / `.png`)
  - Fundo Escuro (`public/brand/renovaext-logo-fundo-escuro.svg` / `.png`)
  - Ícone Quadrado (`public/brand/renovaext-icone-quadrado.svg` / `.png` e `public/icon.svg`)
  - Monocromática Escura e Clara (`public/brand/renovaext-logo-monocromatica-escura.png` / `-clara.png`)
- [x] 3. Consultar disponibilidade do domínio `renovaext.com.br` no Registro.br via RDAP oficial (disponível por R$ 40/ano; zero compra efetuada).
- [x] 4. Estruturar política de e-mails profissionais (`contato@renovaext.com.br` e alias `suporte@renovaext.com.br`).
- [x] 5. Preparar canal do Instagram (@renovaext / @renovaext.br): foto de perfil 1080×1080, biografia institucional, link oficial, 3 posts iniciais no carrossel/feed com artes 1080×1080 e legendas comerciais, e 4 capas de destaques 1080×1920.
- [x] 6. Configurar protocolo para WhatsApp Business oficial (nome comercial, mensagem de saudação, mensagem de ausência, sem envio automático não autorizado).
- [x] 7. Documentar guia completo de ativação para o fundador em `docs/comercial/12-identidade-oficial-e-canais-comerciais.md`.

---

## Fase 11: Refação Completa do Vídeo com Pipeline Audiovisual Profissional de Produção
- [x] 1. Auditar criticamente o vídeo anterior (pan-and-scan artificial e locução em bloco único rejeitada pelo fundador).
- [x] 2. Gravar sessões contínuas reais do aplicativo RenovaExt em execução Full HD (1920×1080 @ 30fps) com Playwright + cursor inteligente + ripple de clique em 9 tomadas separadas (`clip_01` a `clip_09`).
- [x] 3. Declarar com total transparência a ausência do DaVinci Resolve / CapCut Desktop no ambiente Windows e gerar os arquivos de intercâmbio de timeline profissionais (`renovaext_timeline.fcpxml` e `renovaext_timeline.edl`).
- [x] 4. Produzir locução modular natural em 10 takes de áudio independentes (`take_01` a `take_10`) com modelo neural pt-BR, sem jargões de TI, focado em condomínios e inspeções.
- [x] 5. Compor e masterizar trilha sonora sutil harmônica (-26 dB) e tela de encerramento (`screen_10_encerramento.png`).
- [x] 6. Masterizar vídeo final em Full HD (`public/video-demo-renovaext.mp4`, 100,7s, H.264 / AAC estéreo 44.1 kHz, normalizado a -16 LUFS / -1.0 dBTP).
- [x] 7. Gerar legendas sincronizadas WebVTT (`public/legendas-demo-ptbr.vtt`) e thumbnail de alta definição (`public/video-thumbnail.png`).
- [x] 8. Integrar e validar o novo vídeo na prévia comercial (`/preview/comercial.html`) com testes em Desktop e Celular via subagente de browser.
- [x] 9. Estruturar roteiro e storyboard para versão vertical (9:16, 1080×1920, 20–30s) para Instagram Reels / TikTok em `docs/comercial/13-storyboard-e-roteiro-producao-audiovisual.md`.
- [x] 10. Executar e documentar teste de qualidade dos 5 pontos-chave do comprador de oficinas de extintores.

---

## Fase 12: Criação do Site Oficial com Domínio Próprio (`renovaext.com.br`) e Cloudflare Pages
- [x] 1. Reconfirmar e auditar status do domínio `renovaext.com.br` no Registro.br (confirmado registrado pelo fundador em 16/11/2026).
- [x] 2. Estruturar arquitetura de URLs: `www.renovaext.com.br` (site comercial oficial na raiz), `demo.renovaext.com.br` (demonstração fictícia interativa) e `app.renovaext.com.br` (aplicativo autenticado real).
- [x] 3. Transformar a landing page comercial na página inicial oficial (`index.html`), removendo o vídeo anterior/rejeitado e destacando capturas reais em Full HD da interface e da proposta em PDF.
- [x] 4. Mover o aplicativo React da demonstração para `demo.html` com suporte em `vite.config.ts`, preservando o bloqueio estrito de upload de planilhas reais.
- [x] 5. Criar regras de redirecionamento canônico (`_redirects`), cabeçalhos de segurança (`_headers`) e página de erro 404 personalizada (`404.html`) para Cloudflare Pages Free.
- [x] 6. Auditar o formulário comercial e o Supabase Staging: desenhar e implementar plano de produção isolado para captação de leads com RLS, anti-spam, retenção e conformidade LGPD (`20261116000008_lgpd_lead_purge_and_retention.sql`).
- [x] 7. Implementar medição de visitantes sem cookies (Cloudflare Web Analytics privacy-first) e persistência de parâmetros UTM.
- [x] 8. Testar o fluxo completo ponta a ponta (formulário, recibos, CORS, duplicatas e CRM).
- [x] 9. Gerar checklist passo a passo de ativação do DNS no Registro.br e plano de rollback (`docs/comercial/15-implantacao-dominio-proprio-e-cloudflare-pages.md`).



