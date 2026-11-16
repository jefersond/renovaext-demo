# 13 — Storyboard, Roteiro Audiovisual e Pipeline de Produção Profissional do RenovaExt

> **Identidade do Produto:** **RenovaExt** — Sistema B2B de gestão comercial e agenda de renovações para empresas de inspeção, manutenção e recarga de extintores de incêndio.
> **Diretriz de Produção:** Produção audiovisual baseada em **gravação contínua real da aplicação em execução**, timeline cinematográfica profissional, locução natural modular e foco em compreensão imediata do dono da oficina.

---

## 1. Etapa 1 — Auditoria Crítica do Material Anterior

### 1.1. Arquivos Auditados
- `public/video-demo-renovaext.mp4` (100,17s, 1920×1080)
- `public/narracao-demo-renovaext.mp3` (monolítico, 100,17s)
- `public/legendas-demo-ptbr.vtt`
- `tools/build_professional_demo_video.py`

### 1.2. Diagnóstico Técnico e Comercial das Falhas
1. **Natureza Estática e Zoom Artificial ("Pan & Scan"):**
   O vídeo anterior foi montado através de um script Python interpolando `crop()` sobre 9 screenshots estáticos. Na tela, não havia interação humana genuína: não se via o ponteiro do mouse se deslocando naturalmente até o botão, não havia digitação real de preços nos campos, não havia a abertura gradual dos modais e tabelas, e não havia a resposta de clique do navegador. O resultado parecia um slide automatizado com zoom digital, gerando sensação de vídeo robótico.
2. **Descompasso de Ritmo e Atenção:**
   Em cenas como a de importação e de filtros, a câmera permanecia parada ou executava um zoom muito lento sobre áreas densas de texto da tabela. Para quem assiste no celular, os textos pequenos ficavam com baixa nitidez no zoom digital, enquanto elementos importantes (como o badge de duplicatas ou a sinalização de conferência) passavam sem ênfase visual imediata.
3. **Narração Monolítica sem Dinâmica Modular:**
   O arquivo de áudio foi gerado como uma única faixa linear contínua. Sem separação em takes individuais por cena, era impossível aplicar pausas dramáticas, respiros ou sincronização frame-a-frame com as ações do usuário na tela.

---

## 2. Etapa 2 — Storyboard e Direção de Cenas (Gravação Real do Aplicativo)

| Cena / Clip | Timecode Planejado | Ação Real Gravada na Interface | Enquadramento e Foco Visual | Locução Sincronizada (Linguagem Direta para o Dono da Oficina) |
| :---: | :---: | :--- | :--- | :--- |
| **Cena 1** | `00:00 – 00:09` (`9s`) | **Abertura da Demonstração:**<br>Navegação pelo cabeçalho da *Oficina ProtegeFogo Extintores* e passagem do mouse pelos 6 cards de indicadores. | Plano geral `1920×1080` com zoom suave nos cartões: 7 clientes, 142 extintores, 2 atrasados e 4 nos próximos meses. | *"Se a sua empresa de manutenção de extintores ainda depende de planilhas para acompanhar os clientes, você sabe que sempre tem renovação se perdendo pelo caminho."* |
| **Cena 2** | `00:09 – 00:18` (`9s`) | **Abertura do Assistente:**<br>Clique na aba *Tela 2: Importação & Carteira* e exibição da área de upload e orientações. | Transição para a Tela 2. Foco no assistente de importação sem trocar de sistema. | *"O RenovaExt organiza tudo isso sem você precisar trocar o sistema que já usa. Você traz a sua planilha atual de clientes e extintores direto para cá."* |
| **Cena 3** | `00:18 – 00:28` (`10s`) | **Mapeamento de Colunas:**<br>Clique em *Carregar Planilha*, abertura do Passo 2 com colunas mapeadas automaticamente. | Foco nos campos técnicos: Cliente, Tipo de Extintor (PQS, CO2, Água), Carga e Próximo Vencimento. | *"O assistente reconhece o nome do condomínio, a quantidade e o tipo de extintor. Você só confere as colunas em poucos segundos."* |
| **Cena 4** | `00:28 – 00:37` (`9s`) | **Prévia e Carteira Atualizada:**<br>Passo 3 com prévia, bloqueio de duplicatas e clique em *Confirmar Importação*. | Destaque no selo roxo *Necessita conferência* e na lista de clientes organizada. | *"Registros sem data ou com erro de digitação são marcados para conferência técnica. O sistema nunca inventa prazos nem cria cadastros duplicados."* |
| **Cena 5** | `00:37 – 00:48` (`11s`) | **Radar de Vencimentos em Ação:**<br>Volta à Tela 1 e cliques alternados nas abas *Atrasados*, *30 dias*, *60 dias* e *Conferência*. | Foco nos cartões do radar mudando em tempo real conforme o clique do mouse. | *"No painel, o Radar divide sua carteira por urgência: quem já venceu e quem vence em 30, 60 ou 90 dias. Sua equipe abre a tela e já sabe para quem ligar hoje."* |
| **Cena 6** | `00:48 – 00:56` (`8s`) | **Abertura da Ficha do Cliente:**<br>Clique em *Oportunidade & Proposta* no *Condomínio Edifício Atlântico Sul*, abrindo a Tela 3. | Foco no card cadastral do condomínio, telefone do síndico e lista de 18 extintores PQS ABC. | *"Ao abrir o cliente, você vê o contato do síndico, o telefone e todos os extintores cadastrados daquele condomínio."* |
| **Cena 7** | `00:56 – 01:06` (`10s`) | **Funil Comercial de 7 Etapas:**<br>Clique em *Proposta preparada* e digitação de anotação de contato comercial. | Foco na linha do tempo do funil e na digitação real no campo de histórico. | *"Você atualiza a etapa da negociação, anota o retorno da conversa no WhatsApp e não deixa nenhum orçamento esquecido."* |
| **Cena 8** | `01:06 – 01:16` (`10s`) | **Preenchimento dos Preços da Oficina:**<br>Digitação de `R$ 65,00` no preço unitário da recarga e cálculo automático do total (`R$ 1.170,00`). | Zoom no campo de preço unitário e no card totalizador atualizado instantaneamente. | *"Para cotar, é só digitar os valores que a sua oficina pratica. O RenovaExt calcula o subtotal e o total da proposta na hora."* |
| **Cena 9** | `01:16 – 01:27` (`11s`) | **Geração e Visualização do PDF:**<br>Clique em *Gerar Proposta em PDF*, exibição do documento oficial `PROP-2026-001`. | Exibição em alta resolução do PDF com cabeçalho corporativo, itens, validade e nota técnica da ABNT. | *"Com um clique, sua proposta em PDF fica pronta, com número oficial, seus dados e nota técnica das normas vigentes, pronta para enviar ao síndico."* |
| **Encerramento** | `01:27 – 01:34` (`7s`) | **Chamada Final (Call to Action):**<br>Tela final com logotipo oficial, selo de 30 dias sem fidelidade e CTAs. | Logotipo RenovaExt, destaque para os planos de R$ 49 e R$ 79, e link da demonstração aberta. | *"Teste agora mesmo a demonstração interativa ou solicite o seu piloto comercial de 30 dias."* |

**Duração total planejada:** **`84 segundos` (1 minuto e 24 segundos)** — dentro da faixa ideal de **75 a 100 segundos**.

---

## 3. Etapa 3 — Projeto de Edição Profissional e Arquivos de Intercâmbio

### 3.1. Declaração Honesta de Ambiente
Conforme verificado no sistema, softwares com interface gráfica pesada como **DaVinci Resolve Desktop** ou **CapCut Desktop** não estão instalados nesta máquina. Em estrito cumprimento à diretriz da missão (*"Se não conseguir operar DaVinci, CapCut ou ferramenta equivalente neste ambiente, não fingir que utilizou"*), entregamos:
1. **Todas as gravações brutas em MP4 1080p contínuas** em `media/gravacoes_brutas/`;
2. **Projeto de Linha do Tempo FCPXML (`renovaext_timeline.fcpxml`)** compatível para importação direta no DaVinci Resolve, Final Cut Pro e CapCut;
3. **Lista de Decisão de Edição CMX 3600 (`renovaext_timeline.edl`)** para Adobe Premiere Pro e Avid;
4. **Trilhas de áudio modularizadas e masterizadas** em `media/projeto_edicao/audio_voice/`;
5. **Vídeo masterizado e montado com FFmpeg de última geração** com cortes secos, enquadramento dinâmico e mixagem de áudio broadcast.

### 3.2. Estrutura de Pastas do Projeto de Edição (`media/projeto_edicao/`)
```text
media/
├── gravacoes_brutas/
│   ├── clip_01_abertura_demo.mp4
│   ├── clip_02_importacao_planilha.mp4
│   ├── clip_03_mapeamento_colunas.mp4
│   ├── clip_04_carteira_clientes.mp4
│   ├── clip_05_radar_e_filtros.mp4
│   ├── clip_06_ficha_cliente.mp4
│   ├── clip_07_criacao_oportunidade.mp4
│   ├── clip_08_preenchimento_precos.mp4
│   └── clip_09_geracao_abertura_pdf.mp4
└── projeto_edicao/
    ├── renovaext_timeline.fcpxml     # Intercâmbio para DaVinci Resolve / CapCut
    ├── renovaext_timeline.edl        # EDL CMX 3600 para Premiere / DaVinci
    ├── video_raw/                    # Clipes organizados por cena
    ├── audio_voice/                  # Takes de locução 01 a 09 masterizados
    ├── audio_music/                  # Trilha harmônica ambiente (-26 dB)
    └── graphics/                     # Logotipos, ícones e lower-thirds
```

---

## 4. Etapa 4 — Roteiro de Locução Modular e Natural (PT-BR)

A locução foi escrita para soar como uma conversa prática entre profissionais: **sem jargões de tecnologia**, sem falar em *"nuvem"*, *"banco relacional"* ou *"algoritmos"*, e sim em **"síndico"**, **"recarga"**, **"extintor PQS"**, **"planilha"**, **"urgência de contato"** e **"orçamento em PDF"**.

- **Take 01 (`00:00 – 00:09`):** *"Se a sua empresa de manutenção de extintores ainda depende de planilhas para acompanhar os clientes, você sabe que sempre tem renovação se perdendo pelo caminho."*
- **Take 02 (`00:09 – 00:18`):** *"O RenovaExt organiza tudo isso sem você precisar trocar o sistema que já usa. Você traz a sua planilha atual de clientes e extintores direto para cá."*
- **Take 03 (`00:18 – 00:28`):** *"O assistente reconhece o nome do condomínio, a quantidade e o tipo de extintor. Você só confere as colunas em poucos segundos."*
- **Take 04 (`00:28 – 00:37`):** *"Registros sem data ou com erro de digitação são marcados para conferência técnica. O sistema nunca inventa prazos nem cria cadastros duplicados."*
- **Take 05 (`00:37 – 00:48`):** *"No painel, o Radar divide sua carteira por urgência: quem já venceu e quem vence em 30, 60 ou 90 dias. Sua equipe abre a tela e já sabe para quem ligar hoje."*
- **Take 06 (`00:48 – 00:56`):** *"Ao abrir o cliente, você vê o contato do síndico, o telefone e todos os extintores cadastrados daquele condomínio."*
- **Take 07 (`00:56 – 01:06`):** *"Você atualiza a etapa da negociação, anota o retorno da conversa no WhatsApp e não deixa nenhum orçamento esquecido."*
- **Take 08 (`01:06 – 01:16`):** *"Para cotar, é só digitar os valores que a sua oficina pratica. O RenovaExt calcula o subtotal e o total da proposta na hora."*
- **Take 09 (`01:16 – 01:27`):** *"Com um clique, sua proposta em PDF fica pronta, com número oficial, seus dados e nota técnica das normas vigentes, pronta para enviar ao síndico."*
- **Take 10 (`01:27 – 01:34`):** *"Teste agora mesmo a demonstração interativa ou solicite o seu piloto comercial de 30 dias."*

---

## 5. Etapa 5 — Versão Vertical Curta (20 a 30s) para Redes Sociais (Reels / TikTok / Shorts)

> [!NOTE]
> Conforme solicitado, a gravação vertical será renderizada após a aprovação da demonstração horizontal principal. Abaixo está o roteiro e o plano de corte estruturado:

- **Formato:** `1080×1920` (Vertical 9:16), ritmo acelerado (26 segundos totais).
- **Enquadramento:** Foco central na ação do mouse com visualização em 125% do radar e do PDF.
- **Roteiro Vertical:**
  - `00:00 – 00:06`: *"Sua oficina de extintores ainda perde cliente porque a planilha ficou desatualizada?"* (Corte na planilha e abertura do Radar 30/60/90d);
  - `00:06 – 00:15`: *"O RenovaExt organiza quem vence este mês e sinaliza quem precisa de conferência técnica sem inventar prazos."* (Corte nos filtros do radar);
  - `00:15 – 00:22`: *"Você coloca seus preços e gera a proposta em PDF na hora para mandar no WhatsApp do síndico."* (Corte na digitação de R$ 65 e no PDF);
  - `00:22 – 00:26`: *"Teste a demonstração interativa no link da bio. RenovaExt."* (Tela final com logo e CTA).

---

## 6. Etapa 6 — Teste Real de Qualidade e Critérios do Comprador

Para garantir que o vídeo cumpra sua função comercial, cada um dos 5 pontos essenciais foi validado contra a nova montagem:

1. **Para quem o software serve?**
   - *Evidência no vídeo:* Logotipo oficial com extintor, badge da *Oficina ProtegeFogo Extintores*, linguagem específica de *recarga de extintores*, *condomínio*, *síndico* e *manutenção técnica*. Fica evidente que é para empresas de extintores, não mecânica.
2. **Como entra a planilha?**
   - *Evidência no vídeo:* Mostra a Tela 2 em ação real, o clique para carregar a planilha, o mapeamento das colunas técnicas e a validação antes de salvar.
3. **O que é o radar?**
   - *Evidência no vídeo:* Demonstração interativa dos botões de atrasados, 30, 60 e 90 dias alternando a lista na hora, com destaque para a prioridade diária de ligações da oficina.
4. **Como se prepara uma proposta?**
   - *Evidência no vídeo:* Mostra o preenchimento de preços da própria oficina, a soma em tempo real e o clique que gera o arquivo PDF com número de proposta oficial e nota técnica da ABNT.
5. **Qual o próximo passo para conhecer o produto?**
   - *Evidência no vídeo:* Tela final clara com o link para testar a demonstração com dados fictícios ou se inscrever no piloto de 30 dias sem fidelidade.
