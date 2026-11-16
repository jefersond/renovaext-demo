# POP-04: Propostas Comerciais em PDF e Funil Comercial de 7 Etapas

## 1. Objetivo
Permitir o acompanhamento de cada oportunidade de renovação através das 7 etapas do funil comercial e a geração de propostas comerciais profissionais em PDF com preços editáveis informados pela oficina.

## 2. Etapas Obrigatórias do Funil Comercial
Toda oportunidade possui exatamente uma das 7 etapas abaixo:
1. `pendente_conferencia` — **Pendente de conferência**
2. `pronto_para_contato` — **Pronto para contato**
3. `contatado` — **Contatado**
4. `proposta_preparada` — **Proposta preparada**
5. `proposta_enviada` — **Proposta enviada**
6. `aceito` — **Aceito**
7. `perdido` — **Perdido**

Cada mudança de etapa exige o registro automático em `opportunity_history` e `audit_logs` com data/hora, etapa anterior, nova etapa e observação opcional.

## 3. Regras da Proposta Comercial e Geração de PDF
1. **Proibição de Inventar Preços:**
   - Ao abrir o gerador de proposta para um cliente, os equipamentos registrados são pré-carregados com suas quantidades reais, porém o campo **`unitPriceBrl` inicia em `0` (ou vazio para edição obrigatória)**.
   - A geração da proposta valida que o usuário revisou/preencheu os valores unitários dos itens selecionados.
2. **Cálculo Determinístico:**
   - `subtotalBrl = round(quantity * unitPriceBrl, 2)`
   - `totalBrl = sum(items.subtotalBrl)`
3. **Estrutura do PDF Gerado:**
   - Cabeçalho com dados da Oficina (Nome, CNPJ se informado, Telefone, E-mail, Cidade/UF).
   - Número da proposta, Data de emissão e Prazo de validade (ex.: 15 dias).
   - Dados do Cliente (Empresa/Condomínio, Responsável, Contato, Cidade).
   - Tabela discriminada de Equipamentos, Serviço a cotar, Quantidade, Preço Unitário (R$) e Subtotal (R$).
   - Valor Total da Proposta em destaque.
   - Observações comerciais e nota de conformidade técnica (informando que o escopo final depende da inspeção técnica presencial conforme normas vigentes).
4. **Sem Envio Automático:**
   - O sistema faz o download local do PDF e disponibiliza o texto resumo para cópia manual, nunca disparando mensagens externas sozinho.
