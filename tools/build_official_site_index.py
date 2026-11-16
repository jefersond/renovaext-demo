import os

# Ler base de public/comercial.html
with open('public/comercial.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Atualizar Título e Meta Tags
html = html.replace(
    '<title>RenovaExt | Gestão de renovações para empresas de extintores</title>',
    '<title>RenovaExt | Gestão Comercial de Renovações para Empresas de Extintores</title>\n  <link rel="canonical" href="https://www.renovaext.com.br/">'
)

# 2. Atualizar links da demonstração para demo.html
html = html.replace('href="./index.html?demo=1"', 'href="./demo.html"')
html = html.replace('href="/index.html?demo=1"', 'href="./demo.html"')
html = html.replace('<a href="#video-demonstrativo">Vídeo (2 min)</a>', '<a href="#recursos">Recursos</a>')

# 3. Substituir a seção de vídeo pela nova seção nobre de Interface Showcase
showcase_css = """
.showcase{background:var(--white);border-bottom:1px solid var(--line)}.showcase-grid{display:flex;flex-direction:column;gap:56px;margin-top:28px}.showcase-card{display:grid;grid-template-columns:1.2fr .8fr;gap:clamp(24px,4vw,56px);align-items:center;background:#fff;border:1px solid #dce8e8;border-radius:18px;overflow:hidden;box-shadow:0 12px 35px #0c373e0a;padding:clamp(16px,2.5vw,32px)}.showcase-card.reverse{grid-template-columns:.8fr 1.2fr}.showcase-card.reverse .showcase-img-wrap{order:2}.showcase-card.reverse .showcase-body{order:1}.showcase-img-wrap{border:1px solid #d1e4e4;border-radius:12px;overflow:hidden;background:#f8fafb;box-shadow:0 8px 24px rgba(12,55,62,0.08)}.showcase-img-wrap img{width:100%;height:auto;display:block}.showcase-badge{display:inline-block;padding:4px 10px;background:#e2f3ec;color:#0d5148;border-radius:20px;font-size:.72rem;font-weight:800;letter-spacing:.05em;margin-bottom:12px}.showcase-body h3{font-size:1.45rem;margin:0 0 10px;color:var(--dark)}.showcase-body p{font-size:.92rem;color:var(--muted);line-height:1.6;margin:0 0 16px}.showcase-points{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}.showcase-points li{display:flex;align-items:center;gap:8px;font-size:.85rem;color:#1e293b;font-weight:600}.showcase-points span{color:#10b981;font-weight:800}.showcase-footer-cta{margin-top:48px;background:#0c373e;border-radius:16px;padding:clamp(24px,4vw,40px);color:#fff}.showcase-cta-box{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px}.showcase-cta-box h3{color:#fff;font-size:1.35rem;margin:0 0 6px}.showcase-cta-box p{color:#c4deda;margin:0;font-size:.9rem;max-width:560px}@media(max-width:900px){.showcase-card,.showcase-card.reverse{grid-template-columns:1fr;gap:24px}.showcase-card.reverse .showcase-img-wrap{order:1}.showcase-card.reverse .showcase-body{order:2}}
"""

# Inserir CSS do showcase no <style>
html = html.replace('</style>', showcase_css + '\n</style>')

# Definir markup do showcase
showcase_html = """
  <!-- Seção de Recursos em Destaque: Capturas Reais em Alta Resolução da Interface -->
  <section class="section showcase" id="recursos">
    <div class="wrap">
      <div class="section-intro">
        <p class="eyebrow">POR DENTRO DO RENOVAEXT • TELAS REAIS DO APLICATIVO</p>
        <h2>Veja como sua oficina organiza a rotina comercial em três telas.</h2>
        <p>Interface moderna e responsiva, desenvolvida sob medida para empresas de inspeção, manutenção e recarga de extintores de incêndio — sem laudos técnicos falsos e sem complicação de ERP.</p>
      </div>

      <div class="showcase-grid">
        <!-- Tela 1 -->
        <article class="showcase-card">
          <div class="showcase-img-wrap">
            <img src="./captura-tela1-radar.png" alt="Tela 1 do RenovaExt: Painel Principal e Radar de Vencimentos" width="1920" height="1080" loading="lazy">
          </div>
          <div class="showcase-body">
            <span class="showcase-badge">TELA 1 • PAINEL & RADAR</span>
            <h3>Radar Comercial de Vencimentos</h3>
            <p>Acompanhe todos os prazos registrados por condomínio e cliente industrial. Filtre com um clique as renovações vencidas, os próximos 30, 60 ou 90 dias e os registros que precisam de conferência técnica.</p>
            <ul class="showcase-points">
              <li><span>✓</span> Indicadores em tempo real de clientes e extintores cadastrados</li>
              <li><span>✓</span> Filtro de prazos por faixas de acompanhamento preventivo</li>
              <li><span>✓</span> Alertas de cadastros incompletos sem inventar datas ausentes</li>
            </ul>
          </div>
        </article>

        <!-- Tela 2 -->
        <article class="showcase-card reverse">
          <div class="showcase-img-wrap">
            <img src="./captura-tela2-importacao.png" alt="Tela 2 do RenovaExt: Assistente de Importação Inteligente de Planilhas" width="1920" height="1080" loading="lazy">
          </div>
          <div class="showcase-body">
            <span class="showcase-badge">TELA 2 • IMPORTAÇÃO & CARTEIRA</span>
            <h3>Assistente de Planilhas com Prévia e Revisão</h3>
            <p>Traga seus dados de planilhas CSV ou Excel (.xlsx) em poucos segundos. O assistente mapeia as colunas, detecta equipamentos semelhantes e previne linhas duplicadas antes de gravar na carteira.</p>
            <ul class="showcase-points">
              <li><span>✓</span> Compatível com planilhas reais de qualquer formato comum</li>
              <li><span>✓</span> Detecção e bloqueio automático de linhas duplicadas</li>
              <li><span>✓</span> Prévia interativa para conferir nomes e tipos de extintores</li>
            </ul>
          </div>
        </article>

        <!-- Tela 3 -->
        <article class="showcase-card">
          <div class="showcase-img-wrap">
            <img src="./captura-tela3-proposta.png" alt="Tela 3 do RenovaExt: Ficha do Cliente e Emissão de Proposta em PDF" width="1920" height="1080" loading="lazy">
          </div>
          <div class="showcase-body">
            <span class="showcase-badge">TELA 3 • OPORTUNIDADE & PROPOSTA PDF</span>
            <h3>Orçamento Comercial com Preços Definidos pela Oficina</h3>
            <p>Abra a ficha do condomínio, acompanhe o histórico do contato no funil comercial e emita a proposta em PDF. Você digita os preços unitários de manutenção e recarga que pratica — o sistema nunca inventa valores.</p>
            <ul class="showcase-points">
              <li><span>✓</span> Funil comercial em 7 etapas da conferência ao aceite</li>
              <li><span>✓</span> Preços unitários informados pela oficina com cálculo automático</li>
              <li><span>✓</span> Download imediato de proposta em PDF pronta para envio</li>
            </ul>
          </div>
        </article>
      </div>

      <div class="showcase-footer-cta">
        <div class="showcase-cta-box">
          <div>
            <h3>Deseja testar as telas com dados fictícios agora mesmo?</h3>
            <p>Abra a demonstração interativa no seu navegador. Você pode navegar pelos filtros, abrir clientes e testar a geração do PDF.</p>
          </div>
          <a class="button primary" style="background:#116b59" href="./demo.html" target="_blank" rel="noopener">Navegar pela demonstração interativa ↗</a>
        </div>
      </div>
    </div>
  </section>
"""

# Substituir a seção de vídeo inteira (desde <!-- Seção do Vídeo até </section>)
start_marker = '<!-- Seção do Vídeo'
end_marker = '</section>\n\n  <section class="section features"'

start_idx = html.find(start_marker)
end_idx = html.find(end_marker)

if start_idx != -1 and end_idx != -1:
    html = html[:start_idx] + showcase_html + '\n' + html[end_idx + len('</section>\n\n  '):]
    print("Replaced video section with interface showcase successfully!")
else:
    print(f"Warning: Markers not found! start: {start_idx}, end: {end_idx}")

# Remover referências e scripts de controle de vídeo já que não há vídeo no site oficial
script_video_marker = '// Controles do Player de Vídeo Real HTML5'
if script_video_marker in html:
    html = html[:html.find(script_video_marker)] + '</script>\n</body>\n</html>'

# Gravar index.html oficial
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Generated official index.html for www.renovaext.com.br")
