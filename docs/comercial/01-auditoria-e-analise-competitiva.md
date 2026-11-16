# 01 — Auditoria do Material Existente e Análise Competitiva Verificada

---

## 1. Auditoria Técnica dos Artefatos do Relatório da Sofia

Antes de iniciar a construção do MVP do **RenovaExt**, foi realizada uma auditoria completa no ambiente de trabalho:

1. **Situação Inicial da Pasta `RenovaExt`:**
   - O diretório `c:\Users\jefer\Desktop\Jeferson\Saas em teste\RenovaExt` estava **100% vazio**, sem repositório Git e sem código-fonte.
2. **Localização dos Artefatos Citados no Relatório da Sofia:**
   - Os artefatos preparados durante a *Operação Aceleração de Receita 48h* da Sofia estavam armazenados dentro da pasta `Grupo zanotelli` (repositório do Zanotelli OS):
     - `Grupo zanotelli/products/renova-ext/index.html` (Demonstração conceitual + Landing Page + Proposta de Piloto).
     - `Grupo zanotelli/products/renova-ext/README.md` e `schema.json`.
     - `Grupo zanotelli/docs/commercial-operations/2026-11-10/OPERACAO-ACELERACAO-RECEITA-48H.md`.
     - `Grupo zanotelli/docs/commercial-operations/2026-11-10/OPERACAO-ACELERACAO-RECEITA-CRM.json`.
     - `Grupo zanotelli/src/services/revenueAccelerationService.ts` (Lista das 10 empresas e textos de abordagem).
3. **Separação entre Demonstração Estática e Código Funcional:**
   - O arquivo `products/renova-ext/index.html` era uma **demonstração estática single-file** (React via CDN + Babel no navegador), sem autenticação, sem banco de dados, sem leitor real de arquivos `.CSV`/`.XLSX`, sem mapeador de colunas, sem funil de 7 etapas e sem geração real de PDF.
   - **Decisão Executada:** Conforme determinado na Missão Executiva (*"Se não houver código funcional, informar isso e iniciar um projeto novo a partir da arquitetura definida abaixo"*), foi criado um **repositório próprio e isolado em `RenovaExt`**, sem copiar credenciais ou dados da *Zuno Prospect* e sem confundir o *Zanotelli OS* com backend de produção do RenovaExt.
4. **Ajustes de Regras de Negócio e Conformidade Técnica Aplicados no Novo MVP:**
   - Na demo conceitual anterior, o texto afirmava que *"a recarga anual obrigatória (NBR 12962) vence em 12 meses"* como regra única. No MVP real do **RenovaExt**, essa presunção foi eliminada: o sistema **não afirma que todo extintor exige recarga anual**, respeita exclusivamente as datas informadas pela oficina e marca registros incompletos como **`Necessita conferência`**.

---

## 2. Análise Competitiva Atualizada (Fragasoft, Gestão Zenix e Extinradar)

| Concorrente | Site Oficial | Oferta e Funcionalidades Confirmadas | Preço Atual Observado | Posicionamento Comercial do RenovaExt frente ao Concorrente |
|---|---|---|---|---|
| **Fragasoft (Sistema EXTINTORES — Fábrica 40)** | `https://fragasoft.com.br` | Sistema web de balcão e bancada: controle de lotes (recebido, em recarga, pronto, entregue), validade e lacre por cilindro, frente de caixa (PDV) e botão para avisar no WhatsApp quando o serviço fica pronto. | **R$ 120,00/mês** (preço fixo divulgado publicamente). | O Fragasoft exige que a oficina registre as Ordens de Serviço e vendas de balcão dentro dele para alimentar os vencimentos. O **RenovaExt** permite **importar a planilha atual (.CSV/.XLSX) em minutos com mapeamento de colunas**, organizar a agenda comercial (30/60/90 dias) e gerar propostas em PDF sem mudar a rotina de balcão da oficina, testando planos de **R$ 49/mês** e **R$ 79/mês**. |
| **Gestão Zenix** | `https://gestaozenix.com.br` | Plataforma voltada ao chão de oficina: emissão de OS, rastreabilidade de selos do INMETRO, controle de estoque de insumos/peças e redução de digitação fiscal. | Teste grátis de 7 dias; planos sob consulta comercial conforme porte. | O Zenix foca na operação técnica interna e controle de selos/estoque. O **RenovaExt** atua de forma complementar ou inicial para pequenas oficinas que só querem parar de perder o histórico comercial em planilhas. |
| **Extinradar** | `https://extinradar.com.br` | Software de gestão comercial e operacional: radar de vencimentos, controle de licenças (AVCB/PPCI), agendamento de técnicos em campo, execução de OS na oficina e faturamento integrado. | Sob consulta (mediante agendamento de diagnóstico/demonstração). | O Extinradar cobre desde o agendamento de campo e licenças até a execução da OS e fatura. O **RenovaExt** posiciona-se como uma solução ultrassimples de entrada (3 telas principais: Radar, Importação/Carteira e Funil/Proposta PDF), focada em quem quer simplicidade imediata e baixo custo. |
