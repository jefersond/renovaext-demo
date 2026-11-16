# 06 — Custos Operacionais Estimados e Provedores de Pagamento

---

## 1. Custos Operacionais Observados e Estimados (Com Premissas Explícitas)

A arquitetura do **RenovaExt MVP** foi projetada para operar com **custo fixo adicional R$ 0,00** durante a fase de homologação e conquista dos primeiros pilotos, escalando apenas quando houver receita recorrente validada.

| Componente de Infraestrutura | Fase 1: Homologação e Primeiros 2 a 10 Pilotos | Fase 2: Operação Comercial Expandida (20 a 100 Oficinas) | Premissas Técnicas Explícitas |
|---|---|---|---|
| **Hospedagem Frontend / PWA (Vercel)** | **R$ 0,00 / mês** (Plano Hobby / Preview) | ~US$ 20/mês (~R$ 115/mês no Plano Pro, se necessário uso comercial em equipe) | O processamento de planilhas (`.csv`/`.xlsx`) e a geração de PDF (`jspdf`) ocorrem 100% no navegador do cliente (client-side), consumindo zero CPU de servidor. |
| **Banco de Dados, Auth e RLS (Supabase)** | **R$ 0,00 / mês** (Free Tier: até 500 MB de banco PostgreSQL e 1 GB de Storage privado) | ~US$ 25/mês (~R$ 145/mês no Plano Pro, com backups diários automáticos e sem pausa por inatividade) | Cada cliente cadastrado + equipamentos ocupa cerca de 2 KB a 4 KB no PostgreSQL. 10 oficinas com 300 clientes cada (3.000 clientes) consomem menos de **15 MB** de banco (< 3% do Free Tier). |
| **Domínio Próprio (Opcional)** | **R$ 0,00** (usando subdomínio `.vercel.app` no piloto) ou **R$ 40,00 / ano** (`Registro.br`) | **R$ 40,00 / ano** (~R$ 3,35/mês) | Registro anual de domínio `.com.br` no Registro.br. |
| **APIs Externas Pagas / IA / WhatsApp** | **R$ 0,00 / mês** | **R$ 0,00 / mês** | Conforme diretriz executiva, não há contratação de APIs pagas, disparos em massa ou agentes de IA no MVP. |
| **CUSTO TOTAL MENSAL ESTIMADO** | **R$ 0,00 / mês** | **R$ 0,00 a R$ 260,00 / mês** (apenas se optar pelos planos Pro após tração) | Com **2 pilotos pagos** (R$ 98 a R$ 158/mês de receita bruta), a operação no tier gratuito já apresenta margem positiva desde o primeiro mês. |

---

## 2. Verificação de Provedores de Pagamento no Brasil (Conforme Situação Cadastral)

> **Regra de Governança:** Nenhuma cobrança automática foi ativada no código (`billingActive: false`). A ativação só ocorrerá após aprovação da operação comercial pelo fundador.

Como não devemos presumir a situação cadastral atual do fundador (se operará inicialmente como **Pessoa Física — CPF**, **MEI** ou **CNPJ LTDA/SLU**), abaixo está o levantamento oficial dos provedores brasileiros que atendem cada cenário sem mensalidade fixa:

| Provedor de Pagamento | Aceita Pessoa Física (CPF)? | Aceita MEI / CNPJ? | Meios de Cobrança Suportados | Taxas Padrão de Mercado (Sem Mensalidade Fixa) | Recomendação para os 2 Primeiros Pilotos |
|---|---|---|---|---|---|
| **Asaas (`asaas.com`)** | **Sim** (permite criar conta com CPF ou CNPJ, sujeito à validação documental do titular). | **Sim** (MEI, EI, SLU, LTDA). | Assinatura recorrente via **Pix**, **Boleto** e **Cartão de Crédito** (com envio de link de cobrança). | Mensalidade: **R$ 0,00**. Pix recebido: ~R$ 1,99 por transação. Boleto pago: ~R$ 1,99. | **Mais recomendado para B2B no Brasil.** Permite gerar link de assinatura mensal de R$ 49 ou R$ 79 via Pix/Boleto em 2 minutos, sem precisar integrar checkout complexo no código antes de validar os 2 primeiros clientes. |
| **Mercado Pago (`mercadopago.com.br`)** | **Sim** (conta imediata para CPF). | **Sim** (CNPJ). | Link de pagamento, Pix, Boleto e Assinatura em Cartão. | Mensalidade: **R$ 0,00**. Pix via link: ~0,99% a 1,99%. Cartão: ~4,98%. | **Excelente alternativa imediata** caso o fundador já possua conta ativa no Mercado Pago (CPF ou CNPJ). |
| **Stripe Brasil (`stripe.com/br`)** | Restrito para recorrência B2B (exige comprovação de atividade comercial / recomendável CNPJ). | **Sim** (foco em CNPJ). | Cartão de Crédito recorrente e Boleto. | Mensalidade: **R$ 0,00**. Cartão nacional: ~3,99% + R$ 0,39. | Recomendado apenas na Fase 7 (Expansão Comercial) caso haja CNPJ constituído e demanda por autoatendimento via cartão de crédito. |

### Como operar o recebimento dos 2 primeiros pilotos com segurança:
1. Apresentar a demonstração e a **Proposta de Piloto de 30 Dias** (`docs/comercial/04-proposta-piloto-30-dias.md`).
2. Importar a planilha da oficina e validar que o cliente visualizou valor real no painel.
3. Emitir cobrança avulsa ou link de assinatura mensal (R$ 49 ou R$ 79) via **Pix ou Boleto** no provedor escolhido pelo fundador, sem armazenar dados de cartão de crédito dentro do RenovaExt.
