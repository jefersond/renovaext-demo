"""
Script de Gravação Contínua em Vídeo Real (Full HD 1920x1080 @ 30fps)
das 9 Ações do RenovaExt MVP utilizando Playwright com Google Chrome.

Gravações brutas geradas em media/gravacoes_brutas/:
  1. clip_01_abertura_demo.mp4
  2. clip_02_importacao_planilha.mp4
  3. clip_03_mapeamento_colunas.mp4
  4. clip_04_carteira_clientes.mp4
  5. clip_05_radar_e_filtros.mp4
  6. clip_06_ficha_cliente.mp4
  7. clip_07_criacao_oportunidade.mp4
  8. clip_08_preenchimento_precos.mp4
  9. clip_09_geracao_abertura_pdf.mp4
"""

import os
import shutil
import subprocess
import time
from pathlib import Path
import imageio_ffmpeg
from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "media" / "gravacoes_brutas"
TMP_REC = ROOT / ".tmp" / "raw_recordings"
RAW_DIR.mkdir(parents=True, exist_ok=True)
TMP_REC.mkdir(parents=True, exist_ok=True)

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

CURSOR_HELPER_JS = """
(() => {
  if (window.__customCursorInjected) return;
  window.__customCursorInjected = true;

  const cursor = document.createElement('div');
  cursor.id = 'demo-virtual-cursor';
  cursor.style.position = 'fixed';
  cursor.style.top = '0px';
  cursor.style.left = '0px';
  cursor.style.width = '24px';
  cursor.style.height = '24px';
  cursor.style.zIndex = '9999999';
  cursor.style.pointerEvents = 'none';
  cursor.style.transform = 'translate(-4px, -4px)';
  cursor.style.transition = 'transform 0.08s ease-out';
  cursor.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 2L20 12L13 14L10 21L4 2Z" fill="#0d5148" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>
  `;
  document.body.appendChild(cursor);

  window.moveCursorTo = (x, y) => {
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
  };

  window.showClickRipple = (x, y) => {
    const ripple = document.createElement('div');
    ripple.style.position = 'fixed';
    ripple.style.left = (x - 20) + 'px';
    ripple.style.top = (y - 20) + 'px';
    ripple.style.width = '40px';
    ripple.style.height = '40px';
    ripple.style.borderRadius = '50%';
    ripple.style.border = '3px solid #116b59';
    ripple.style.backgroundColor = 'rgba(156, 231, 201, 0.45)';
    ripple.style.pointerEvents = 'none';
    ripple.style.zIndex = '9999998';
    ripple.style.transform = 'scale(0.3)';
    ripple.style.opacity = '1';
    ripple.style.transition = 'transform 0.4s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.4s ease-out';
    document.body.appendChild(ripple);
    requestAnimationFrame(() => {
      ripple.style.transform = 'scale(1.4)';
      ripple.style.opacity = '0';
    });
    setTimeout(() => ripple.remove(), 450);
  };
})();
"""


def smooth_move(page: Page, from_x: int, from_y: int, to_x: int, to_y: int, steps: int = 15, delay_ms: int = 12):
    for i in range(1, steps + 1):
        t = i / steps
        ease = 1 - (1 - t) ** 3
        curr_x = int(from_x + (to_x - from_x) * ease)
        curr_y = int(from_y + (to_y - from_y) * ease)
        page.evaluate(f"window.moveCursorTo({curr_x}, {curr_y})")
        page.mouse.move(curr_x, curr_y)
        page.wait_for_timeout(delay_ms)


def animated_click(page: Page, x: int, y: int):
    page.evaluate(f"window.showClickRipple({x}, {y})")
    page.mouse.click(x, y)
    page.wait_for_timeout(350)


def convert_webm_to_mp4(webm_path: Path, mp4_path: Path):
    cmd = [
        FFMPEG_EXE,
        "-y",
        "-i", str(webm_path),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-movflags", "+faststart",
        str(mp4_path),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def record_clip(clip_name: str, action_func, duration_pad_ms: int = 1200):
    clip_tmp = TMP_REC / clip_name
    if clip_tmp.exists():
        shutil.rmtree(clip_tmp)
    clip_tmp.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME_EXE,
            headless=True,
            args=["--disable-web-security", "--force-device-scale-factor=1"],
        )
        ctx = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(clip_tmp),
            record_video_size={"width": 1920, "height": 1080},
        )
        page = ctx.new_page()
        page.goto("http://localhost:4173/?demo=1", wait_until="networkidle")
        page.evaluate(CURSOR_HELPER_JS)
        page.wait_for_timeout(600)

        # Executa a ação da cena
        action_func(page)

        page.wait_for_timeout(duration_pad_ms)
        ctx.close()
        browser.close()

    webms = list(clip_tmp.glob("*.webm"))
    if not webms:
        raise RuntimeError(f"Nenhum arquivo de vídeo gerado para {clip_name}")

    out_mp4 = RAW_DIR / f"{clip_name}.mp4"
    convert_webm_to_mp4(webms[0], out_mp4)
    print(f"✓ Gravado: {out_mp4.name} ({out_mp4.stat().st_size} bytes)")


# ===========================================================================
# IMPLEMENTAÇÃO DAS 9 AÇÕES REAIS
# ===========================================================================

def action_01_abertura_demo(page: Page):
    # Abertura da demonstração interativa e visão geral do painel
    smooth_move(page, 960, 540, 480, 28, steps=18)
    page.wait_for_timeout(700)
    smooth_move(page, 480, 28, 230, 335, steps=16)  # Card Clientes: 7
    page.wait_for_timeout(600)
    smooth_move(page, 230, 335, 390, 335, steps=14)  # Card Atrasados: 2
    page.wait_for_timeout(700)
    smooth_move(page, 390, 335, 520, 335, steps=14)  # Card Próx 30/60/90d: 4
    page.wait_for_timeout(700)
    smooth_move(page, 520, 335, 600, 335, steps=14)  # Card Conferência: 1
    page.wait_for_timeout(900)


def action_02_importacao_planilha(page: Page):
    # Transição para Tela 2 e exibição do assistente
    btn_tela2 = page.locator("button:has-text('Tela 2: Importação & Carteira')")
    box = btn_tela2.bounding_box()
    if box:
        smooth_move(page, 960, 540, int(box['x'] + box['width']/2), int(box['y'] + box['height']/2), steps=18)
        animated_click(page, int(box['x'] + box['width']/2), int(box['y'] + box['height']/2))
    page.wait_for_timeout(800)
    smooth_move(page, int(box['x'] + box['width']/2), int(box['y'] + box['height']/2), 480, 380, steps=16)
    page.wait_for_timeout(1000)


def action_03_mapeamento_colunas(page: Page):
    page.click("button:has-text('Tela 2: Importação & Carteira')")
    page.wait_for_timeout(600)
    btn_sample = page.locator("button:has-text('Carregar Planilha de Exemplo no Assistente')")
    box_s = btn_sample.bounding_box()
    if box_s:
        smooth_move(page, 600, 300, int(box_s['x'] + box_s['width']/2), int(box_s['y'] + box_s['height']/2), steps=16)
        animated_click(page, int(box_s['x'] + box_s['width']/2), int(box_s['y'] + box_s['height']/2))
    page.wait_for_timeout(800)

    # Passo 2 aberto: Mapeamento de colunas
    smooth_move(page, 600, 400, 450, 520, steps=15)
    page.wait_for_timeout(700)

    # Clica no botão 'Gerar Prévia e Validar Registros →'
    btn_next = page.locator("button:has-text('Gerar Prévia e Validar Registros')")
    box_n = btn_next.bounding_box()
    if box_n:
        smooth_move(page, 450, 520, int(box_n['x'] + box_n['width']/2), int(box_n['y'] + box_n['height']/2), steps=16)
        animated_click(page, int(box_n['x'] + box_n['width']/2), int(box_n['y'] + box_n['height']/2))
    page.wait_for_timeout(1000)


def action_04_carteira_clientes(page: Page):
    page.click("button:has-text('Tela 2: Importação & Carteira')")
    page.wait_for_timeout(400)
    page.click("button:has-text('Carregar Planilha de Exemplo no Assistente')")
    page.wait_for_timeout(500)
    page.click("button:has-text('Gerar Prévia e Validar Registros')")
    page.wait_for_timeout(700)

    # Passo 3: Mostra a prévia e badges
    smooth_move(page, 600, 300, 500, 480, steps=15)
    page.wait_for_timeout(600)

    # Clica em 'Confirmar e Importar'
    btn_commit = page.locator("button:has-text('Confirmar e Importar')")
    box_c = btn_commit.bounding_box()
    if box_c:
        smooth_move(page, 500, 480, int(box_c['x'] + box_c['width']/2), int(box_c['y'] + box_c['height']/2), steps=16)
        animated_click(page, int(box_c['x'] + box_c['width']/2), int(box_c['y'] + box_c['height']/2))
    page.wait_for_timeout(1000)
    # Cursor passa pela carteira de clientes
    smooth_move(page, 500, 600, 350, 750, steps=16)
    page.wait_for_timeout(1000)


def action_05_radar_e_filtros(page: Page):
    # Volta para Tela 1 e clica nos filtros do Radar
    btn_tela1 = page.locator("button:has-text('Tela 1: Painel de Vencimentos')")
    box_t1 = btn_tela1.bounding_box()
    if box_t1:
        smooth_move(page, 960, 540, int(box_t1['x'] + box_t1['width']/2), int(box_t1['y'] + box_t1['height']/2), steps=16)
        animated_click(page, int(box_t1['x'] + box_t1['width']/2), int(box_t1['y'] + box_t1['height']/2))
    page.wait_for_timeout(700)

    # 1. Filtro "A conferir agora / Atrasados"
    btn_atrasados = page.locator("button:has-text('Atrasados')").first
    box1 = btn_atrasados.bounding_box()
    if box1:
        smooth_move(page, 492, 205, int(box1['x'] + box1['width']/2), int(box1['y'] + box1['height']/2), steps=14)
        animated_click(page, int(box1['x'] + box1['width']/2), int(box1['y'] + box1['height']/2))
        page.wait_for_timeout(800)

    # 2. Filtro "Próximos 30 dias"
    btn_30d = page.locator("button:has-text('Próximos 30 dias')").first
    box2 = btn_30d.bounding_box()
    if box2:
        smooth_move(page, int(box1['x'] + box1['width']/2), int(box1['y'] + box1['height']/2), int(box2['x'] + box2['width']/2), int(box2['y'] + box2['height']/2), steps=14)
        animated_click(page, int(box2['x'] + box2['width']/2), int(box2['y'] + box2['height']/2))
        page.wait_for_timeout(800)

    # 3. Filtro "Conferência"
    btn_conf = page.locator("button:has-text('Conferência')").first
    box3 = btn_conf.bounding_box()
    if box3:
        smooth_move(page, int(box2['x'] + box2['width']/2), int(box2['y'] + box2['height']/2), int(box3['x'] + box3['width']/2), int(box3['y'] + box3['height']/2), steps=14)
        animated_click(page, int(box3['x'] + box3['width']/2), int(box3['y'] + box3['height']/2))
        page.wait_for_timeout(800)

    # 4. Retorna para "Próximos 30 dias"
    if box2:
        smooth_move(page, int(box3['x'] + box3['width']/2), int(box3['y'] + box3['height']/2), int(box2['x'] + box2['width']/2), int(box2['y'] + box2['height']/2), steps=14)
        animated_click(page, int(box2['x'] + box2['width']/2), int(box2['y'] + box2['height']/2))
        page.wait_for_timeout(800)


def action_06_ficha_cliente(page: Page):
    btn_tab = page.locator("button:has-text('Próximos 30 dias')").first
    btn_tab.click()
    page.wait_for_timeout(600)

    btn_prop = page.locator("button:has-text('Oportunidade & Proposta')").first
    btn_prop.scroll_into_view_if_needed()
    page.wait_for_timeout(400)
    box = btn_prop.bounding_box()
    if box:
        smooth_move(page, 960, 540, int(box['x'] + box['width']/2), int(box['y'] + box['height']/2), steps=16)
        animated_click(page, int(box['x'] + box['width']/2), int(box['y'] + box['height']/2))
    page.wait_for_timeout(1000)

    # Tela 3 aberta: Cursor passa pelos dados de contato e equipamentos
    smooth_move(page, 600, 300, 320, 360, steps=15)
    page.wait_for_timeout(600)
    smooth_move(page, 320, 360, 580, 460, steps=15)
    page.wait_for_timeout(900)


def action_07_criacao_oportunidade(page: Page):
    page.click("button:has-text('Tela 3: Oportunidade & Proposta PDF')")
    page.wait_for_timeout(600)

    # Clica no botão de estágio 'Proposta preparada'
    btn_stage = page.locator("button:has-text('Proposta preparada')").first
    btn_stage.scroll_into_view_if_needed()
    page.wait_for_timeout(300)
    box = btn_stage.bounding_box()
    if box:
        smooth_move(page, 960, 540, int(box['x'] + box['width']/2), int(box['y'] + box['height']/2), steps=16)
        animated_click(page, int(box['x'] + box['width']/2), int(box['y'] + box['height']/2))
    page.wait_for_timeout(700)

    # Campo de anotações
    txt = page.locator("textarea").first
    if txt.count():
        txt.scroll_into_view_if_needed()
        box_t = txt.bounding_box()
        if box_t:
            smooth_move(page, 500, 400, int(box_t['x'] + 50), int(box_t['y'] + 20), steps=14)
            animated_click(page, int(box_t['x'] + 50), int(box_t['y'] + 20))
            page.keyboard.type("Contato via WhatsApp com síndico. Vencimento confirmado.", delay=25)
    page.wait_for_timeout(800)


def action_08_preenchimento_precos(page: Page):
    page.click("button:has-text('Tela 3: Oportunidade & Proposta PDF')")
    page.wait_for_timeout(600)

    # Localiza input de preço unitário
    price_input = page.locator("input[placeholder='0,00']").first
    if not price_input.count():
        price_input = page.locator("input[aria-label*='Preço unitário']").first
    if not price_input.count():
        price_input = page.locator("input[type='number']").first

    price_input.scroll_into_view_if_needed()
    page.wait_for_timeout(300)
    box = price_input.bounding_box()
    if box:
        smooth_move(page, 960, 540, int(box['x'] + box['width']/2), int(box['y'] + box['height']/2), steps=16)
        animated_click(page, int(box['x'] + box['width']/2), int(box['y'] + box['height']/2))
        price_input.fill("")
        page.keyboard.type("65", delay=80)
    page.wait_for_timeout(600)

    # Cursor move para o Total da Proposta atualizado
    total_lbl = page.locator("text=TOTAL DA PROPOSTA").first
    if total_lbl.count():
        total_lbl.scroll_into_view_if_needed()
        tb = total_lbl.bounding_box()
        if tb:
            smooth_move(page, 800, 600, int(tb['x'] + 50), int(tb['y'] + 10), steps=15)
    page.wait_for_timeout(1000)


def action_09_geracao_abertura_pdf(page: Page):
    page.click("button:has-text('Tela 3: Oportunidade & Proposta PDF')")
    page.wait_for_timeout(600)

    # Preenche preço se vazio para poder gerar
    price_input = page.locator("input[placeholder='0,00']").first
    if price_input.count() and not price_input.input_value():
        price_input.fill("65")
        page.wait_for_timeout(400)

    btn_pdf = page.locator("button:has-text('Salvar Proposta e Baixar PDF')").first
    if not btn_pdf.count():
        btn_pdf = page.locator("button:has-text('Baixar PDF')").first

    btn_pdf.scroll_into_view_if_needed()
    page.wait_for_timeout(400)
    box = btn_pdf.bounding_box()
    if box:
        smooth_move(page, 960, 540, int(box['x'] + box['width']/2), int(box['y'] + box['height']/2), steps=16)
        animated_click(page, int(box['x'] + box['width']/2), int(box['y'] + box['height']/2))
    page.wait_for_timeout(1800)


def run_all_recordings():
    actions = [
        ("clip_01_abertura_demo", action_01_abertura_demo),
        ("clip_02_importacao_planilha", action_02_importacao_planilha),
        ("clip_03_mapeamento_colunas", action_03_mapeamento_colunas),
        ("clip_04_carteira_clientes", action_04_carteira_clientes),
        ("clip_05_radar_e_filtros", action_05_radar_e_filtros),
        ("clip_06_ficha_cliente", action_06_ficha_cliente),
        ("clip_07_criacao_oportunidade", action_07_criacao_oportunidade),
        ("clip_08_preenchimento_precos", action_08_preenchimento_precos),
        ("clip_09_geracao_abertura_pdf", action_09_geracao_abertura_pdf),
    ]

    print("Iniciando gravação contínua das 9 ações reais em 1920x1080...")
    for name, func in actions:
        target_mp4 = RAW_DIR / f"{name}.mp4"
        if target_mp4.exists() and target_mp4.stat().st_size > 500000:
            print(f"• Já existe gravação válida: {target_mp4.name} (ignorando)")
            continue
        record_clip(name, func)
    print("Todas as 9 ações reais foram gravadas em media/gravacoes_brutas/!")


if __name__ == "__main__":
    run_all_recordings()
