# 🌐 RenovaExt — Guia de Implantação do Domínio Oficial (`renovaext.com.br`) na Cloudflare Pages

> **Data de Atualização:** 16 de Novembro de 2026  
> **Status do Domínio:** REGISTRADO e ATIVO no Registro.br pelo fundador Jeferson Dias Zanotelli  
> **Hospedagem Recomendada:** Cloudflare Pages (Plano Free — Custo Fixo R$ 0,00)  
> **Diretriz de Segurança:** Nenhuma alteração de DNS, compra ou corte de tráfego foi executada. O processo está 100% documentado e pré-configurado para execução sob sua autorização.

---

## 1. Auditoria e Confirmação do Domínio `renovaext.com.br`

Em consulta oficial via protocolo RDAP do Registro.br (`https://rdap.registro.br/domain/renovaext.com.br`) realizada em 16/11/2026 às 15:33 BRT:

- **Titular / Registrante:** Jeferson Dias Zanotelli (CPF cadastrado no Registro.br);
- **Data de Registro:** 16/11/2026 às 18:18:35 UTC (Registro recente concluído pelo fundador);
- **Data de Expiração:** 16/11/2027;
- **Status:** `active`;
- **Servidores DNS Atuais:** `a.auto.dns.br` e `b.auto.dns.br` (Servidores DNS padrão do Registro.br).
- **Custo:** **R$ 40,00/ano já quitados pelo fundador**. Não há nenhum custo adicional de compra ou anuidade pendente.

---

## 2. Arquitetura de URLs e Subdomínios

Para garantir autoridade de marca, segurança de dados e separação estrita de ambientes, o RenovaExt operará na seguinte topologia:

```
+--------------------------------------------------------------------------------------------------+
| 1. SITE COMERCIAL OFICIAL (LANDING PAGE DE CONVERSÃO)                                            |
|    URL: https://www.renovaext.com.br (com redirecionamento 301 de https://renovaext.com.br)     |
|    • Apresenta proposta de valor, problemas das planilhas, 3 passos e planos (R$ 49 e R$ 79).    |
|    • Destaque visual: Capturas reais em Full HD da interface (sem vídeo rejeitado/locução robô).  |
|    • Formulário comercial integrado com emissão de recibo SOL-... e captura de UTMs.             |
+--------------------------------------------------------------------------------------------------+
| 2. DEMONSTRAÇÃO INTERATIVA COM DADOS FICTÍCIOS                                                   |
|    URL: https://demo.renovaext.com.br (ou https://www.renovaext.com.br/demo.html)               |
|    • Aplicativo React em execução no navegador com a oficina fictícia "ProtegeFogo Extintores".   |
|    • 5 clientes fictícios, 84 extintores, radar de vencimentos e geração de PDF real.            |
|    • BLOQUEIO MANDATÓRIO: Upload de planilhas reais bloqueado para evitar vazamento de dados.    |
+--------------------------------------------------------------------------------------------------+
| 3. APLICATIVO AUTENTICADO DE CLIENTES REAIS (PÓS-PILOTO)                                         |
|    URL: https://app.renovaext.com.br                                                             |
|    • Ambiente multi-tenant isolado por company_id com RLS estrito no PostgreSQL.                 |
|    • Ativado exclusivamente após homologação do primeiro cliente pagante de piloto.              |
+--------------------------------------------------------------------------------------------------+
```

---

## 3. Configuração da Hospedagem na Cloudflare Pages (Plano Free)

A Cloudflare Pages é a infraestrutura ideal para hospedar o RenovaExt sem custos fixos e com alta velocidade no Brasil:

- **Custo Fixo:** **R$ 0,00/mês permanente** (Sites ilimitados, largura de banda ilimitada, 500 compilações/mês);
- **Performance no Brasil:** Edge servers em São Paulo, Rio de Janeiro, Curitiba, Porto Alegre e Fortaleza, com tempo de resposta `< 20ms`;
- **Certificado SSL/TLS:** Gratuito, automatizado e com renovação invisível (Cloudflare Universal SSL);
- **Proteção contra Ataques:** Proteção DDoS corporativa nativa e mitigação de bots sem captchas invasivos.

### Parâmetros de Configuração do Projeto na Cloudflare Pages:
1. **Conectar Repositório:** Selecionar o repositório GitHub `jefersond/renovaext-demo`;
2. **Framework Preset:** `Vite`;
3. **Build Command:** `npm run build`;
4. **Build Output Directory:** `dist`;
5. **Variáveis de Ambiente (Configuradas na aba Settings > Environment Variables):**
   - `NODE_VERSION`: `20`
   - `VITE_SUPABASE_URL`: `https://xmuzcnjcwkhgojnaosha.supabase.co` (ou endpoint de produção)
   - `VITE_SUPABASE_ANON_KEY`: `(Chave pública anon do Supabase)`
   - `VITE_APP_ENV`: `production`
   - *(PROIBIDO inserir `SUPABASE_SERVICE_ROLE_KEY` nas variáveis do Cloudflare Pages)*.

---

## 4. Roteamento, Redirecionamento Canônico e Segurança (`_redirects` e `_headers`)

Os arquivos de configuração estáticos foram criados e compilados automaticamente em `dist/`:

### 4.1. Redirecionamento Canônico e Rotas (`_redirects`)
```text
# Redirecionamentos de rotas antigas para a raiz do site oficial
/preview/comercial.html / 301
/preview/proposta-piloto.html /proposta-piloto.html 301
/preview/* / 302
/comercial.html / 301

# Roteamento da Demonstração
/demo /demo.html 200
```

### 4.2. Cabeçalhos de Segurança HTTP (`_headers`)
```text
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 4.3. Tratamento de Erro 404 Personalizado (`404.html`)
Criado o arquivo [public/404.html](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/public/404.html) estilizado com a identidade visual da RenovaExt, oferecendo botões diretos para voltar à página inicial ou acessar a demonstração, evitando que o visitante caia em telas de erro genéricas.

---

## 5. Auditoria de Dados e Plano de Produção para Supabase (Leads e CRM)

### 5.1. Diagnóstico do Ambiente Atual
- Atualmente, o formulário de captação comercial utiliza a instância de **Staging** do Supabase (`xmuzcnjcwkhgojnaosha.supabase.co`);
- O backend de leads já possui:
  * Função `public.submit_commercial_lead` (`SECURITY DEFINER`);
  * Proteção contra spam no servidor (rate limit por hash SHA-256 de IP e e-mail);
  * Campo oculto honeypot (`website_trap`);
  * Isolamento RLS estrito: o visitante anônimo não possui permissão de leitura (`SELECT`) em `commercial_leads` ou `commercial_crm_pipeline`.

### 5.2. Plano de Produção Seguro
1. **Separação de Instâncias:**  
   Quando os primeiros pilotos pagos forem formalizados, será criada uma instância dedicada de Produção no Supabase (`renovaext-prod`). O ambiente atual de Staging permanecerá exclusivo para testes automatizados e demonstrações fictícias;
2. **Conformidade LGPD (Direito ao Esquecimento e Retenção):**  
   Implementada a migração [supabase/migrations/20261116000008_lgpd_lead_purge_and_retention.sql](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/supabase/migrations/20261116000008_lgpd_lead_purge_and_retention.sql):
   - Função `public.purge_commercial_lead_by_email(target_email)`: Exclui permanentemente todos os registros vinculados ao e-mail do titular que solicitar remoção (Art. 18 da LGPD) e grava log de auditoria anônimo com hash SHA-256;
   - Função `public.cleanup_expired_stale_leads(180)`: Rotina de expurgo automático para leads não convertidos após 180 dias.
3. **Restrição de CORS:**  
   No painel do Supabase de produção, configurar `Allowed Origins` estritamente para `https://www.renovaext.com.br` e `https://renovaext.com.br`.

---

## 6. Medição de Conversão com Respeito à LGPD (Zero Cookies Invasivos)

Para acompanhar o funil comercial sem infringir a LGPD e sem necessidade de banners intrusivos de cookies:

1. **Cloudflare Web Analytics (Ativação em 1 Clique):**
   - Não usa cookies;
   - Não coleta IP do visitante;
   - Mede com precisão: visitantes únicos, páginas mais acessadas, taxa de rejeição e países/estados;
   - 100% aderente à LGPD sem coletar dados pessoais;
2. **Rastreamento de Origem Comercial (UTM):**
   - O formulário oficial lê automaticamente os parâmetros de URL (`?utm_source=...&utm_medium=...&utm_campaign=...`) e os anexa ao campo `notes` / metadados do lead;
   - Permite saber exatamente se o interessado veio de abordagem direta por e-mail, Instagram ou WhatsApp.
3. **Indicadores do CRM no Painel do Fundador:**
   - O painel autenticado (`/painel-fundador-crm.html` e CLI `npm run crm:consultar`) contabiliza automaticamente:
     * Leads recebidos;
     * Demonstrações solicitadas;
     * Pilotos ativos e confirmados.

---

## 7. Checklist Passo a Passo para Ativar `renovaext.com.br`

Quando você desejar ativar o domínio, o procedimento no Registro.br e na Cloudflare leva menos de 10 minutos:

### Passo 1: Criar o Projeto na Cloudflare Pages
1. Acesse o painel da [Cloudflare](https://dash.cloudflare.com/) com sua conta;
2. Vá em **Workers & Pages > Create application > Pages > Connect to Git**;
3. Selecione o repositório `jefersond/renovaext-demo`;
4. Defina o comando de compilação: `npm run build` e o diretório de saída: `dist`;
5. Clique em **Save and Deploy**. A Cloudflare gerará um subdomínio seguro imediato (ex: `renovaext.pages.dev`).

### Passo 2: Adicionar o Domínio `renovaext.com.br` na Cloudflare
1. No menu lateral da Cloudflare, clique em **Websites > Add a Site** e digite `renovaext.com.br`;
2. Escolha o plano **Free (R$ 0,00)**;
3. A Cloudflare exibirá os dois servidores DNS atribuídos à sua conta (exemplo: `ana.ns.cloudflare.com` e `bob.ns.cloudflare.com`).

### Passo 3: Atualizar os Nameservers no Registro.br
1. Acesse [registro.br](https://registro.br) e faça login na sua conta;
2. Clique no domínio **`renovaext.com.br`**;
3. Na seção **DNS**, clique em **Alterar Servidores DNS**;
4. Substitua os servidores atuais (`a.auto.dns.br` e `b.auto.dns.br`) pelos dois fornecidos pela Cloudflare;
5. Clique em **Salvar Alterações**. O Registro.br conclui a propagação entre 15 minutos e 2 horas.

### Passo 4: Conectar o Domínio Personalizado na Pages
1. Volte ao projeto na Cloudflare Pages > aba **Custom domains**;
2. Clique em **Set up a custom domain** e adicione:
   - `www.renovaext.com.br`
   - `renovaext.com.br`
3. A Cloudflare configurará o SSL Universal automaticamente.

---

## 8. Plano de Rollback e Contingência

Caso seja necessário reverter qualquer alteração a qualquer momento:

1. **Reversão de DNS no Registro.br (Prazo: 5 minutos):**
   - Acesse o Registro.br > `renovaext.com.br` > DNS > Reverter para os servidores padrão (`a.auto.dns.br`);
2. **Preservação do GitHub Pages:**
   - A demonstração no GitHub Pages (`https://jefersond.github.io/renovaext-demo/`) continua ativa como espelho de segurança;
3. **Zero Risco de Interrupção:**
   - Nenhuma oficina real sofrerá impacto, pois a carteira de homologação permanece preservada em banco isolado.
