# 🎬 Bancada de Avaliação de Vozes e Cena-Piloto Audiovisual Premium (Fases 1 e 2)

> **Data:** 16 de Novembro de 2026  
> **Status:** Amostras de Voz e Cena-Piloto Prontas para Decisão do Fundador  
> **URL da Prévia Comercial:** `https://jefersond.github.io/renovaext-demo/preview/comercial.html`  
> **Diretriz Mandatória:** Não avançar para o vídeo completo de 75–100s antes da aprovação explícita da **Voz** e da **Cena-Piloto**.

---

## 1. Contexto e Mudança Definitiva de Método

Após a rejeição do material anterior — caracterizado por voz sintética automatizada (`pt-BR-AntonioNeural`), cortes estáticos e ausência de acabamento comercial —, a produção audiovisual do RenovaExt passou por uma reformulação estrutural:

1. **Abandono do pipeline robótico:** Não foram utilizados o gerador anterior em bloco único nem transições mecânicas padronizadas;
2. **Separação estrita em etapas com aprovação prévia:**
   - **Fase 1:** Entrega de três testes de voz de 15 a 20 segundos com o **mesmo texto padronizado**, com auditoria completa de licenças comerciais e custos;
   - **Fase 2:** Entrega de uma **cena-piloto de 17 segundos**, construída sobre as gravações reais da interface em Full HD, com movimentação fluida de cursor, enquadramento dinâmico (zoom suave) nos pontos de interesse e digitação verdadeira de preços unitários pela oficina;
   - **Fase 3 (Futura):** Produção do vídeo final de 75 a 100 segundos **somente após aprovação formal** da voz escolhida e da linguagem visual da cena-piloto.
3. **Revisão obrigatória de promessas comerciais:**
   - Removida qualquer garantia de que a oficina *"nunca mais perderá renovações"*;
   - Removida qualquer presunção de que *"todo extintor exige recarga anual"*;
   - Esclarecido que a proposta em PDF é um **orçamento comercial** e não um laudo de conformidade técnica ou certificado oficial do Corpo de Bombeiros / INMETRO;
   - O RenovaExt posiciona-se estritamente como **ferramenta de gestão comercial de carteira**.

---

## 2. Fase 1 — Bancada Comparativa das Três Vozes (15 a 20 Segundos)

As três amostras foram gravadas utilizando o mesmo texto padronizado, focado na rotina comercial de oficinas de manutenção de extintores, com pronúncia cuidada de *“RenovaExt”*, *“extintores”* e *“planilhas”*:

### 2.1. Texto Padronizado de Teste
> *"Se a sua empresa cuida da manutenção de extintores, você sabe como planilhas podem atrasar o seu comercial. O RenovaExt organiza a sua carteira, destaca os prazos cadastrados e ajuda a emitir propostas com agilidade. Uma rotina simples para acompanhar seus clientes, sem promessas exageradas."*
> 
> *(43 palavras • ritmo cadenciado entre 120 e 135 ppm • duração alvo: 15s a 20s)*

---

### 2.2. Detalhamento Técnico das Três Amostras Masterizadas

| Amostra | Perfil Vocal | Tecnologia / Modelo | Duração Real | Licença Comercial | Custo Estimado | Arquivo Master (EBU R128) |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **Amostra A** | **Masculina**<br>Adulta, natural, tom seguro e direto | Piper Faber Neural (`pt_BR-faber-medium` ONNX) | **16,66 s** | **CC0 (Domínio Público)**<br>Uso comercial livre sem royalties | **R$ 0,00** | [amostra_A_masculina_faber.mp3](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/public/amostras_voz/amostra_A_masculina_faber.mp3) |
| **Amostra B** | **Feminina**<br>Adulta, clara, ágil e acolhedora | Azure Multilingual Thalita Neural (`pt-BR-Thalita`) | **19,10 s** | **Avaliação Privada**<br>Requer Azure Speech para veiculação pública | ~$0,01 por vídeo (~R$ 0,06) | [amostra_B_feminina_thalita.mp3](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/public/amostras_voz/amostra_B_feminina_thalita.mp3) |
| **Amostra C** | **Narrador Maduro**<br>Tom corporativo de documentário SaaS | Piper Cadu Neural (`pt_BR-cadu-medium` ONNX) | **17,96 s** | **CC0 (Domínio Público)**<br>Uso comercial livre sem royalties | **R$ 0,00** | [amostra_C_narrador_cadu.mp3](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/public/amostras_voz/amostra_C_narrador_cadu.mp3) |

#### Cadeia de Masterização Aplicada (EBU R128 / Padrão Broadcast)
Todas as faixas de áudio passaram por processamento dinâmico via FFmpeg:
1. **Filtro Passa-Alta (High-Pass):** Corte em 80 Hz para eliminar ruídos de sub-grave;
2. **Equalização Corretiva:** +1.5 dB em 200 Hz (calor corporal de locução), +2.0 dB em 3.0 kHz (inteligibilidade da voz) e atenuação em 6.5 kHz contra sibilância;
3. **Compressão Broadcast:** Controle dinâmico suave com ataque rápido (20ms) e liberação de 200ms;
4. **Normalização de Loudness:** **-16.0 LUFS** com True Peak limitado a **-1.0 dBTP**, garantindo clareza e ausência de distorção em smartphones e navegadores desktop.

---

### 2.3. Auditoria de Opções Comerciais (ElevenLabs, Locutor Humano e APIs)

Caso o fundador considere que qualquer voz sintética (IA) ainda transmite percepção artificial, apresentamos a análise completa das alternativas de mercado:

```
+----------------------------------------------------------------------------------------------------------+
| 1. LOCUTOR HUMANO PROFISSIONAL (BRASIL) — RECOMENDAÇÃO DE MÁXIMA CREDIBILIDADE B2B                      |
| • Plataformas: Workana, 20pila, Locutores.com.br, Fiverr Brasil.                                        |
| • Custo Médio: R$ 80 a R$ 180 por locução de 60 a 90 segundos com direitos de veiculação em internet.    |
| • Prazo de Entrega: 24 a 48 horas úteis.                                                                |
| • Vantagens: Respiração humana 100% autêntica, zero estranheza mecânica, calor humano insubstituível.   |
|   Donos de oficinas de extintores são empresários tradicionais que respondem melhor à voz humana real.   |
+----------------------------------------------------------------------------------------------------------+
| 2. ELEVENLABS (PLANO STARTER COM LICENÇA COMERCIAL)                                                     |
| • Licenciamento: O Plano Gratuito NÃO permite uso comercial em SaaS/anúncios (exige plano pago).         |
| • Custo Oficial: $5/mês (~R$ 28/mês, com promoção de $1 no primeiro mês) para 30.000 créditos.          |
| • Vozes Recomendadas em pt-BR: Daniel (Narrador maduro), Camila (Acolhedora) e George (Documentário).    |
| • Ativação: O fundador pode assinar o plano Starter diretamente em elevenlabs.io e fornecer a chave     |
|   de API para a renderização automatizada do roteiro completo aprovado.                                  |
+----------------------------------------------------------------------------------------------------------+
| 3. OPENAI AUDIO API (TTS-1-HD)                                                                          |
| • Custo: $0.030 por 1.000 caracteres (~$0,04 por vídeo completo de 100s = ~R$ 0,25).                     |
| • Licença Comercial: Inclusa automaticamente no uso da API da OpenAI.                                   |
| • Vozes: Onyx (masculina profunda/narrativa), Nova (feminina energética), Echo (masculina equilibrada).  |
+----------------------------------------------------------------------------------------------------------+
| 4. MODELOS ABERTOS ONNX (PIPER FABER / CADU)                                                             |
| • Custo: R$ 0,00 (execução local 100% independente de servidores externos).                             |
| • Licença: CC0 (Domínio Público irrestrito).                                                            |
| • Estado: Disponíveis e já gerados na prévia.                                                           |
+----------------------------------------------------------------------------------------------------------+
```

---

## 3. Fase 2 — Cena-Piloto Audiovisual Premium (17 Segundos)

Para validar a direção de arte e o ritmo da edição antes de avançar para o vídeo longo, foi construída uma **Cena-Piloto de 16,7 segundos** em Full HD `1920×1080 @ 30fps`, combinando duas ações operacionais essenciais do RenovaExt:

### 3.1. Estrutura Visual da Cena-Piloto
1. **Tomada 1 (0.0s a 8.2s) — Radar Comercial de Vencimentos (`clip_05_radar_e_filtros`):**
   - Inicia no plano geral limpo do painel (7 clientes, 142 extintores registrados);
   - Aos 2.0s, o cursor se move com movimentação interpolada suave até a aba *“Próximos 30 dias”*;
   - A câmera realiza uma aproximação dinâmica suave (zoom de 1.0 para 1.14x centrado na área dos cards);
   - O clique real é acompanhado de efeito visual de feedback (*click ripple*);
   - Callout corporativo translúcido no rodapé:  
     `RADAR COMERCIAL DE VENCIMENTOS • Acompanhamento preventivo dos prazos informados pela oficina` (fundo slate-900 translúcido, cantos arredondados, sem sobrepor botões);
2. **Transição Cinematográfica (8.2s):**
   - Dissolvência cruzada (*cross-dissolve*) de 0.4s conectando diretamente o cliente identificado à elaboração de sua proposta;
3. **Tomada 2 (8.2s a 16.7s) — Digitação Verdadeira de Preços Unitários (`clip_08_preenchimento_precos`):**
   - Enquadramento dinâmico com zoom suave de 1.18x focado na tabela de equipamentos e no total da proposta;
   - O espectador assiste à **digitação real de preços unitários** pela oficina (`65,00` no extintor PQS ABC / Água);
   - O total da proposta é recalculado instantaneamente na tela (`R$ 1.560,00`), evidenciando que o software não inventa preços;
   - O botão *“Salvar Proposta e Baixar PDF”* ganha destaque visual natural;
   - Callout corporativo:  
     `PROPOSTA COMERCIAL ÁGIL • Preços unitários definidos pela oficina, sem valores inventados`;
4. **Mixagem Sonora:**
   - Locução masterizada da Amostra A (Voz Masculina Natural) em primeiro plano;
   - Trilha harmônica sutil em `-26 dB` ao fundo, eliminando silêncios estéreis sem disputar atenção com a fala;
   - Normalização final do vídeo completo para **-16.0 LUFS** / **-1.0 dBTP**.

---

## 4. Declaração Transparente sobre Editores Gráficos (DaVinci / Premiere)

> [!IMPORTANT]
> **Declaração Formal de Ambiente:**  
> Os softwares DaVinci Resolve, Adobe Premiere Pro e CapCut Desktop **não estão instalados** neste ambiente Windows. Em cumprimento irrestrito à diretriz de *"não fingir que utilizou e entregar arquivos organizados para edição real no computador do fundador"*, foram gerados e exportados os projetos nativos de timeline:
> 
> - **FCPXML 1.8 (DaVinci Resolve / CapCut):** [public/projeto_edicao/cena_piloto_timeline.fcpxml](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/public/projeto_edicao/cena_piloto_timeline.fcpxml)
> - **CMX 3600 EDL (Premiere Pro / DaVinci Resolve):** [public/projeto_edicao/cena_piloto_timeline.edl](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/public/projeto_edicao/cena_piloto_timeline.edl)
> - **Gravações Brutas em Full HD 1080p:** Organizadas e preservadas em [media/projeto_edicao/video_raw/](file:///c:/Users/jefer/Desktop/Jeferson/Saas%20em%20teste/RenovaExt/media/projeto_edicao/video_raw/)
> 
> Ambos os arquivos estão disponíveis para download imediato tanto pelo repositório quanto pela própria página de prévia.

---

## 5. Publicação e Como Avaliar na Prévia

Tanto a Cena-Piloto quanto os 3 áudios de teste e os links dos projetos foram incorporados à URL de prévia oficial:

👉 **`https://jefersond.github.io/renovaext-demo/preview/comercial.html`**

### Na página, o fundador pode:
1. Assistir à **Cena-Piloto de 17s** em Full HD com reprodução imediata;
2. Alternar entre a *Cena-Piloto (17s)* e o *Vídeo Anterior (100s)* pelos botões da barra superior;
3. Clicar em "Play" individualmente em cada um dos **3 players de áudio** para avaliar o timbre, dicção e velocidade das vozes;
4. Baixar os arquivos `.fcpxml` e `.edl` diretamente para seu computador.

> [!NOTE]
> A raiz pública de produção (`/comercial.html` e `/index.html`) permanece **100% intacta e inalterada**, sem qualquer publicação antes de aprovação expressa.

---

## 6. Decisões Necessárias do Fundador para a Fase 3

Para iniciarmos a montagem do vídeo final de 75 a 100 segundos, solicitamos a definição dos dois pontos essenciais:

1. **Escolha da Voz:**
   - ( ) **Amostra A:** Voz Masculina Brasileira (Piper Faber Neural • R$ 0,00 CC0);
   - ( ) **Amostra B:** Voz Feminina Brasileira (Azure Multilingual Thalita);
   - ( ) **Amostra C:** Narrador Corporativo Maduro (Piper Cadu Neural • R$ 0,00 CC0);
   - ( ) **ElevenLabs Starter ($5/mês):** O fundador prefere ativar uma conta Starter para usarmos uma voz cinematográfica de IA;
   - ( ) **Locutor Humano Profissional:** O fundador prefere contratar um locutor humano (R$ 80 a R$ 180 no Workana/20pila) para credibilidade humana total.
2. **Aprovação da Linguagem da Cena-Piloto:**
   - Avaliar se a combinação de enquadramento dinâmico, movimentação fluida de cursor, badges sutis de rodapé e digitação verdadeira de preços unitários atende ao padrão de apresentação comercial desejado para o RenovaExt.
