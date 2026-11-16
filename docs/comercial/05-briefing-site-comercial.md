# 05 — Briefing Completo do Site Comercial (Para Criação no ChatGPT)

> **Instrução de Uso:** Copie este documento e envie ao ChatGPT quando desejar gerar a página institucional/comercial externa do **RenovaExt**. Todas as diretrizes abaixo respeitam estritamente o que já existe e funciona no MVP.

---

## 1. Identificação do Produto
- **Nome do Produto:** RenovaExt
- **Categoria:** Software web (SaaS) de organização comercial e agenda de renovações para empresas de manutenção de extintores.
- **Público-Alvo Inicial:** Pequenas e médias empresas/oficinas que prestam serviços de inspeção, manutenção e recarga de extintores de incêndio (atendendo condomínios, lojas, escolas, escritórios e pequenas indústrias) e que ainda controlam sua carteira de clientes significativamente em planilhas.
- **Quem NÃO é o público-alvo inicial:** Grandes indústrias ou corporações que exigem ERP fiscal completo, controle fabril de estoque, roteirização de frota ou integração fiscal complexa.

---

## 2. Promessa Principal (Headline e Posicionamento em Teste)
- **Promessa Principal:** *"Transforme sua carteira de manutenção de extintores em uma agenda organizada de renovações, sem abandonar seu sistema atual."*
- **Subtítulo Explicativo:** *"Você importa sua planilha atual (.CSV ou Excel) e consegue visualizar quais clientes devem entrar na sua agenda de acompanhamento comercial — com propostas em PDF prontas para cotar pelo computador ou celular."*
- **Diretriz de Tom de Voz:** Prático, direto, respeitoso com a rotina do dono de oficina, usando vocabulário real do setor (carteira de clientes, condomínios, equipamentos, tipo do extintor, capacidade, acompanhamento, proposta comercial).

---

## 3. Benefícios Verificáveis (O Que Destacar)
1. **Aproveitamento imediato da planilha existente:** Não obriga a oficina a digitar cadastros antigos do zero nem exige que a planilha siga um formato rígido perfeito.
2. **Visibilidade clara de quem contatar:** Organiza os clientes por janelas de acompanhamento comercial (A conferir agora/Atrasados, Próximos 30 dias, 60 dias, 90 dias e Dados incompletos).
3. **Segurança contra presunções erradas:** O sistema não inventa datas nem preços; quando um registro antigo está sem data ou sem especificação técnica, ele marca claramente como *"Necessita conferência"*.
4. **Agilidade comercial:** Gera propostas comerciais limpas em PDF com os dados da oficina e do cliente em poucos cliques, mantendo histórico da oportunidade no funil comercial.
5. **Convivência sem atrito:** Funciona em paralelo ao emissor de nota fiscal ou rotina interna atual da oficina.

---

## 4. Recursos Reais do MVP (Apenas o que já está construído e funcionando)
1. **Assistente de Importação de Planilhas (.CSV e .XLSX):** Associação manual e automática de colunas, prévia editável antes da confirmação e bloqueio de duplicatas.
2. **Painel Principal e Radar de Renovações:** Indicadores de carteira e filtros rápidos por janela de tempo (Atrasados, 30d, 60d, 90d, Incompletos) e por cliente.
3. **Carteira de Clientes:** Ficha individual com dados comerciais, relação de equipamentos (tipo, capacidade, quantidade, último serviço, próximo acompanhamento), histórico de serviços e observações.
4. **Funil Comercial de 7 Etapas:** *Pendente de conferência*, *Pronto para contato*, *Contatado*, *Proposta preparada*, *Proposta enviada*, *Aceito* e *Perdido*, com linha do tempo de movimentações.
5. **Gerador de Propostas em PDF:** Preços unitários editáveis pela oficina, cálculo automático do total, prazo de validade e download imediato do PDF.
6. **Acesso Responsivo (PWA):** Funciona no navegador do computador e do celular, podendo ser instalado na tela inicial do aparelho.

---

## 5. Preços em Teste (Apresentar como Oferta de Lançamento / Piloto)
- **Plano Inicial — R$ 49/mês**
  - Indicado para oficinas pequenas;
  - Até 150 clientes cadastrados na carteira;
  - Importação de planilhas, Radar de renovações, Funil comercial e Propostas em PDF.
- **Plano Profissional — R$ 79/mês**
  - Indicado para oficinas com carteiras maiores;
  - Até 500 clientes cadastrados na carteira;
  - Acesso completo às funcionalidades comerciais do MVP, apoio na primeira importação e exportação integral de dados.
- **Condição Transparente:** Piloto de 30 dias sem fidelidade e sem multa de cancelamento.

---

## 6. Estrutura de Conversão: CTA e Formulário de Interesse
- **CTA Principal:** *"Ver Demonstração Navegável"* / *"Solicitar Piloto de 30 Dias"*
- **Campos do Formulário de Interesse:**
  1. Nome da Oficina / Empresa de Extintores (obrigatório)
  2. Nome do Responsável (obrigatório)
  3. E-mail Comercial (obrigatório)
  4. Telefone / WhatsApp (obrigatório)
  5. Cidade / UF (obrigatório)
  6. Como controla os vencimentos hoje? *(Opções: Planilhas Excel/Google Sheets | Fichas em papel/pastas | Sistema de balcão, mas sem agenda comercial)*
  7. Plano de interesse para teste *(Opções: Plano Inicial R$ 49/mês | Plano Profissional R$ 79/mês | Quero apenas ver a demonstração)*

---

## 7. Perguntas Frequentes (FAQ) Obrigatórias
1. **Preciso trocar meu emissor de nota fiscal ou sistema de balcão para usar o RenovaExt?**
   Não. O RenovaExt cuida especificamente da organização comercial da sua carteira de clientes, acompanhamento de prazos e geração de propostas em PDF.
2. **Minha planilha não segue um padrão perfeito. Consigo importar mesmo assim?**
   Sim. O assistente de importação permite que você associe as colunas da sua planilha atual (CSV ou Excel) aos campos do sistema e revise uma prévia antes de salvar.
3. **O sistema calcula recarga anual automática para todos os extintores?**
   Não. Os requisitos de inspeção e manutenção variam conforme o equipamento, normas técnicas (como ABNT NBR 12962 e Portaria INMETRO nº 58/2022) e condições de uso. O RenovaExt respeita as datas informadas pela sua oficina e marca registros sem data como *"Necessita conferência"*.
4. **Meus clientes ficam visíveis para outras oficinas?**
   Jamais. Cada oficina possui um ambiente isolado e privado. Você também pode exportar todos os seus dados quando quiser.
5. **O sistema envia mensagens automáticas para os meus clientes sem eu ver?**
   Não. O RenovaExt prepara a proposta em PDF e o resumo comercial para que você mesmo envie pelos canais da sua oficina quando achar adequado.

---

## 8. Avisos de Privacidade e Proibições Estritas no Site
- **Aviso de Privacidade (LGPD):** Informar no rodapé e no formulário que os dados preenchidos são utilizados exclusivamente para apresentar a demonstração e configurar o piloto solicitado, podendo o titular pedir exclusão a qualquer momento.
- **PROIBIÇÕES ESTRITAS PARA A GERAÇÃO DO SITE:**
  - **Proibido** inventar depoimentos de clientes, estrelas de avaliação ou estudos de caso fictícios.
  - **Proibido** afirmar que o software é "inédito no Brasil" ou "exclusivo".
  - **Proibido** prometer recuperação garantida de faturamento ("recupere R$ X mil garantidos").
  - **Proibido** anunciar emissão de NF-e, laudos técnicos, certificados INMETRO ou automação de WhatsApp como recursos disponíveis.

---

## 9. Identidade Visual Simples Recomendada
- **Paleta de Cores:** Fundo claro e limpo (`#F8FAFC` / `#FFFFFF`), cabeçalhos e blocos institucionais em azul-ardósia escuro (`#0F172A`) e destaques de ação em vermelho-segurança (`#DC2626`), com indicadores de atenção em âmbar (`#D97706`) e confirmação em verde-esmeralda (`#059669`).
- **Tipografia:** `Inter` para leitura limpa em telas de celular e computador, e `JetBrains Mono` para códigos de propostas, datas e números.
