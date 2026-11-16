# POP-02: Importação Assistida de Planilhas (CSV e XLSX) e Validação Técnica

## 1. Objetivo
Permitir que o dono ou comercial da oficina importe sua planilha atual (`.csv` ou `.xlsx`) sem exigir um modelo rígido prévio, mapeando colunas, revisando dados na prévia, prevenindo duplicatas e **nunca inventando datas ou especificações técnicas ausentes**.

## 2. Entradas
- Arquivo `.csv` ou `.xlsx` (tamanho máximo: 5 MB; limite por lote: 2.000 linhas) ou planilha de exemplo.
- Mapeamento de colunas definido pelo usuário no assistente:
  - `clientName` (Nome do cliente)
  - `organizationName` (Empresa ou Condomínio)
  - `contactName` / `contactPhone` / `contactEmail` (Contato comercial)
  - `equipmentDescription` (Equipamentos)
  - `extinguisherType` (Tipo do extintor: PQS ABC, PQS BC, Água, CO2, Espuma, etc.)
  - `capacity` (Capacidade: 4kg, 6kg, 10L, etc.)
  - `quantity` (Quantidade)
  - `lastServiceDate` (Data do último serviço)
  - `nextDueDate` (Data do próximo acompanhamento ou vencimento informada)
  - `notes` (Observações)

## 3. Lógica Determinística e Regras de Negócio
1. **Autodetecção Sugerida + Associação Manual de Colunas:**
   - Ao carregar o arquivo, o parser lê o cabeçalho e sugere o vínculo por aproximação lexical (ex.: `"Condomínio"`, `"Cliente"`, `"Razão Social"` -> `clientName`; `"Vencimento"`, `"Próxima Recarga"`, `"Retorno"` -> `nextDueDate`), mas permite que o usuário altere qualquer coluna.
2. **Parser de Datas Seguro (Formatos Brasileiros e ISO):**
   - Aceita `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD` e números seriais de data do Excel.
   - Datas inválidas (ex.: `31/02/2026` ou texto irreconhecível) não quebram a importação: o campo de data fica `null` e a linha é marcada como `needsReview = true` (`"Necessita conferência: data inválida ou ausente"`).
3. **Proibição Estrita de Inventar Datas:**
   - Se `nextDueDate` estiver vazio na planilha, o sistema **não adiciona 12 meses automaticamente sem revisão**. A linha recebe `nextDueDate = null` e `needsReview = true`, entrando na fila **"Dados incompletos / Necessita conferência"**.
4. **Incompletude Técnica:**
   - Se o tipo do extintor não estiver identificado ou a quantidade for inválida, o registro recebe `needsReview = true` com a respectiva justificativa para conferência.
5. **Prevenção de Duplicatas:**
   - Gera uma chave normalizada `normalize(clientName) + "|" + normalize(extinguisherType) + "|" + normalize(capacity) + "|" + coalesce(nextDueDate, '')`.
   - Se já existir na carteira da empresa ou estiver repetida dentro da própria planilha, marca como `isDuplicate = true` na tela de prévia (desmarcada por padrão para evitar duplicação, permitindo revisão manual).
6. **Prévia Editável Antes da Confirmação:**
   - O usuário pode corrigir nomes, datas, quantidades e tipos diretamente na tabela de prévia antes de gravar no banco.

## 4. Casos de Borda
- Planilha vazia ou sem coluna de nome do cliente: exibir erro claro orientando o mapeamento.
- Arquivo acima de 5 MB ou com mais de 2.000 linhas: bloquear no início com mensagem explicativa de limite operacional do MVP.
- Codificação UTF-8 em arquivos `.CSV` com acentuação em português: decodificar explicitamente o `ArrayBuffer` via `TextDecoder('utf-8')` antes de passar ao parser `XLSX.read(..., { type: 'string' })` (e usar `codepage: 65001` para binários), garantindo preservação de caracteres acentuados como `"Próximo Acompanhamento"` e `"Condomínio"`.
