# POP-03: Painel Principal, Radar de Renovações e Carteira de Clientes

## 1. Objetivo
Transformar os registros importados e cadastrados em uma agenda visual clara de acompanhamento comercial, destacando vencimentos registrados e registros pendentes de conferência sem jamais emitir laudos técnicos automáticos.

## 2. Entradas
- Lista de `clients`, `equipments`, `opportunities` e `proposals` filtrada pelo `company_id` autenticado.
- Data de referência (`referenceDate`, padrão: data atual local).

## 3. Lógica Determinística de Classificação do Radar
Para cada equipamento/cliente, calcula-se `daysUntilDue = diffInDays(nextDueDate, referenceDate)`:
1. **`INCOMPLETO` ("Clientes com dados incompletos / Necessita conferência"):**
   - Quando `needsReview === true` OU `nextDueDate === null` OU o cliente não possui equipamentos registrados.
2. **`ATRASADO` ("Clientes a conferir agora / Acompanhamentos atrasados"):**
   - Quando `nextDueDate !== null` e `daysUntilDue < 0`.
3. **`D_30` ("Previstos para os próximos 30 dias"):**
   - Quando `0 <= daysUntilDue <= 30`.
4. **`D_60` ("Previstos para os próximos 60 dias"):**
   - Quando `31 <= daysUntilDue <= 60`.
5. **`D_90` ("Previstos para os próximos 90 dias"):**
   - Quando `61 <= daysUntilDue <= 90`.
6. **`FUTURO` ("Acima de 90 dias"):**
   - Quando `daysUntilDue > 90`.

## 4. Regras de Exibição e Conformidade Técnica
- Todas as telas exibem aviso explícito de que os prazos referem-se a acompanhamento comercial baseado nos dados registrados pela oficina e que os requisitos de manutenção variam conforme o equipamento, normas técnicas (ABNT NBR 12962 / Portaria INMETRO nº 58/2022) e inspeção presencial.
- O usuário pode revisar manualmente qualquer cliente, completar os dados pendentes e retirar a marcação de `necessita_conferencia`.
