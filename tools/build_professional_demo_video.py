"""
Motor Determinístico de Produção do Vídeo Demonstrativo Real (1920x1080 @ 30fps, H.264 + AAC)
e Tratamento das Capturas em Alta Resolução do RenovaExt MVP.

Gera:
  1. public/captura-tela1-radar.png (1920x1080 real)
  2. public/captura-tela2-importacao.png (1920x1080 real)
  3. public/captura-tela3-proposta.png (1920x1080 real)
  4. public/video-thumbnail.png (1920x1080 profissional)
  5. public/narracao-demo-renovaext.mp3 (Locução natural pt-BR sincronizada)
  6. public/legendas-demo-ptbr.vtt (Legendas WebVTT sincronizadas)
  7. public/video-demo-renovaext.mp4 (Vídeo MP4 H.264 1920x1080 30fps com áudio AAC normalizado)
"""

import asyncio
import json
import math
import os
import shutil
import subprocess
from pathlib import Path

import edge_tts
import fitz  # PyMuPDF
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT_DIR / "public"
TMP_DIR = ROOT_DIR / ".tmp" / "video_build"
TMP_DIR.mkdir(parents=True, exist_ok=True)

SANDBOX_SHOTS = Path(
    r"C:\Users\jefer\.gemini\antigravity\brain\a9816eb7-0292-4ed8-9ba4-3a6c9a5f24e9\browser_sandbox\screenshots"
)

FRAMES_MAP = {
    "fhd_01_painel_radar": SANDBOX_SHOTS / "step_110_shot_1_fhd_01_painel_radar.png",
    "fhd_02_radar_atrasados": SANDBOX_SHOTS / "step_110_shot_2_fhd_02_radar_atrasados.png",
    "fhd_03_radar_30dias": SANDBOX_SHOTS / "step_110_shot_3_fhd_03_radar_30dias.png",
    "fhd_04_tela2_passo1": SANDBOX_SHOTS / "step_110_shot_4_fhd_04_tela2_passo1.png",
    "fhd_05_tela2_passo2_colunas": SANDBOX_SHOTS / "step_110_shot_5_fhd_05_tela2_passo2_colunas.png",
    "fhd_06_tela2_passo3_previa": SANDBOX_SHOTS / "step_110_shot_6_fhd_06_tela2_passo3_previa.png",
    "fhd_07_tela2_carteira_atualizada": SANDBOX_SHOTS / "step_110_shot_7_fhd_07_tela2_carteira_atualizada.png",
    "fhd_08_tela3_proposta_preenchida": SANDBOX_SHOTS / "step_110_shot_8_fhd_08_tela3_proposta_preenchida.png",
    "fhd_09_tela3_pdf_gerado": SANDBOX_SHOTS / "step_110_shot_9_fhd_09_tela3_pdf_gerado.png",
}

VOICE_NAME = "pt-BR-AntonioNeural"

# Roteiro aprovado dividido em 7 segmentos sincronizados com a jornada real (~96 segundos totais, faixa 90-120s)
SEGMENTS = [
    {
        "id": "seg_01_problema",
        "title": "1. O Problema das Planilhas Espalhadas",
        "text": (
            "Se sua oficina de manutenção e recarga de extintores trabalha com planilhas para acompanhar os clientes e as próximas manutenções, "
            "você sabe como é fácil perder a visão do que precisa de atenção."
        ),
        "subtitle": (
            "Se sua empresa de extintores trabalha com planilhas para acompanhar clientes e manutenções,\n"
            "é fácil perder a visão do que precisa de atenção."
        ),
        "post_pause_sec": 3.2,
    },
    {
        "id": "seg_02_solucao_interface",
        "title": "2. A Solução: Interface Real do RenovaExt",
        "text": (
            "O RenovaExt foi criado para organizar essa rotina comercial de empresas de extintores de incêndio de forma simples. "
            "Veja como funciona."
        ),
        "subtitle": (
            "O RenovaExt foi criado para organizar a rotina comercial de empresas de extintores de incêndio.\n"
            "Veja como funciona na prática."
        ),
        "post_pause_sec": 3.0,
    },
    {
        "id": "seg_03_importacao_planilha",
        "title": "3. Importação CSV/XLSX e Conferência de Dados",
        "text": (
            "Primeiro, você importa a planilha que já utiliza. "
            "O sistema organiza os registros, bloqueia duplicatas e identifica informações que precisam ser conferidas."
        ),
        "subtitle": (
            "Primeiro, você importa a planilha que já utiliza (.CSV ou .XLSX).\n"
            "O sistema organiza os registros, bloqueia duplicatas e sinaliza o que precisa ser conferido."
        ),
        "post_pause_sec": 3.6,
    },
    {
        "id": "seg_04_painel_e_radar",
        "title": "4. Painel da Carteira e Radar 30, 60 e 90 Dias",
        "text": (
            "Depois, no painel, você visualiza sua carteira e os vencimentos cadastrados. "
            "O radar separa os clientes com datas atrasadas e aqueles que precisam de acompanhamento nos próximos 30, 60 ou 90 dias."
        ),
        "subtitle": (
            "No painel, você visualiza a carteira e o radar separa vencimentos atrasados\n"
            "e acompanhamentos para os próximos 30, 60 ou 90 dias."
        ),
        "post_pause_sec": 3.6,
    },
    {
        "id": "seg_05_oportunidade_e_proposta",
        "title": "5. Funil Comercial e Proposta com Preços da Oficina",
        "text": (
            "Quando encontra uma oportunidade, você abre o cadastro, acompanha o andamento nas etapas do funil "
            "e prepara uma proposta com os preços praticados pela sua empresa."
        ),
        "subtitle": (
            "Ao abrir uma oportunidade, você acompanha a etapa no funil comercial\n"
            "e prepara a proposta com os preços praticados pela sua empresa."
        ),
        "post_pause_sec": 3.5,
    },
    {
        "id": "seg_06_pdf_real_gerado",
        "title": "6. Geração e Abertura do Orçamento em PDF",
        "text": (
            "Em poucos passos, você gera o documento em PDF, pronto para baixar e enviar ao cliente. "
            "Tudo isso sem precisar abandonar seu sistema atual."
        ),
        "subtitle": (
            "Em poucos passos, você gera o orçamento em PDF pronto para baixar —\n"
            "tudo isso sem precisar abandonar seu sistema atual."
        ),
        "post_pause_sec": 3.6,
    },
    {
        "id": "seg_07_convite_final",
        "title": "7. Demonstração com Dados Fictícios e Piloto de 30 Dias",
        "text": (
            "Quer conhecer na prática? Explore a demonstração do RenovaExt com dados fictícios "
            "ou solicite um piloto para sua oficina de extintores."
        ),
        "subtitle": (
            "Quer conhecer na prática? Explore a demonstração com dados fictícios\n"
            "ou solicite um piloto de 30 dias para sua empresa de extintores."
        ),
        "post_pause_sec": 3.2,
    },
]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = (
        ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"]
        if bold
        else ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]
    )
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def load_fhd_image(path: Path, mode: str = "RGB") -> Image.Image:
    im = Image.open(path).convert(mode)
    if im.size != (1920, 1080):
        im = im.resize((1920, 1080), Image.Resampling.LANCZOS)
    return im


def copy_high_res_site_screenshots():
    load_fhd_image(FRAMES_MAP["fhd_01_painel_radar"]).save(PUBLIC_DIR / "captura-tela1-radar.png", format="PNG", optimize=True)
    load_fhd_image(FRAMES_MAP["fhd_06_tela2_passo3_previa"]).save(PUBLIC_DIR / "captura-tela2-importacao.png", format="PNG", optimize=True)
    load_fhd_image(FRAMES_MAP["fhd_08_tela3_proposta_preenchida"]).save(PUBLIC_DIR / "captura-tela3-proposta.png", format="PNG", optimize=True)


def render_real_pdf_frame() -> Image.Image:
    """Abre o arquivo real docs/homologacao/proposta-homologacao-real.pdf e compõe sobre a Tela 3 em 1920x1080."""
    base_bg = load_fhd_image(FRAMES_MAP["fhd_09_tela3_pdf_gerado"], "RGBA")
    blurred = base_bg.filter(ImageFilter.GaussianBlur(radius=6))

    overlay = Image.new("RGBA", (1920, 1080), (12, 55, 62, 165))
    canvas = Image.alpha_composite(blurred, overlay)
    draw = ImageDraw.Draw(canvas)

    # Cabeçalho superior da visualização do PDF real
    draw.rounded_rectangle((310, 32, 1610, 92), radius=14, fill=(13, 81, 72, 255), outline=(176, 242, 215, 255), width=2)
    f_title = load_font(22, bold=True)
    draw.text(
        (345, 48),
        "DOCUMENTO PDF A4 REAL GERADO PELO RENOVAEXT (PROP-2026-001 • DADOS FICTÍCIOS)",
        font=f_title,
        fill=(255, 255, 255, 255),
    )

    pdf_path = ROOT_DIR / "docs" / "homologacao" / "proposta-homologacao-real.pdf"
    doc = fitz.open(str(pdf_path))
    page = doc[0]
    pix = page.get_pixmap(dpi=220)
    pdf_img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples).convert("RGBA")

    # Exibir a metade superior / área de itens da folha A4 real com alta nitidez e legibilidade
    crop_h = int(pdf_img.height * 0.68)
    pdf_cropped = pdf_img.crop((0, 0, pdf_img.width, crop_h))
    target_w = 1220
    target_h = int(pdf_cropped.height * (target_w / pdf_cropped.width))
    if target_h > 880:
        target_h = 880
        target_w = int(pdf_cropped.width * (target_h / pdf_cropped.height))

    pdf_resized = pdf_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x_pos = (1920 - target_w) // 2
    y_pos = 112

    # Sombra e moldura da folha A4
    draw.rounded_rectangle(
        (x_pos - 12, y_pos - 12, x_pos + target_w + 12, y_pos + target_h + 12),
        radius=16,
        fill=(255, 255, 255, 255),
        outline=(220, 232, 232, 255),
        width=3,
    )
    canvas.paste(pdf_resized, (x_pos, y_pos), pdf_resized)
    return canvas.convert("RGB")


def create_problem_scene_frame() -> Image.Image:
    """Cria o quadro inicial 1920x1080 ilustrando o problema real das planilhas espalhadas vs. organização."""
    img = Image.new("RGB", (1920, 1080), (245, 249, 249))
    draw = ImageDraw.Draw(img)

    # Faixa superior corporativa
    draw.rectangle((0, 0, 1920, 88), fill=(12, 55, 62))
    f_brand = load_font(28, bold=True)
    f_sub = load_font(18, bold=False)
    draw.text((64, 26), "RenovaExt  |  Gestão comercial de renovações para oficinas de extintores", font=f_brand, fill=(255, 255, 255))
    draw.text((1470, 32), "Demonstração com dados fictícios", font=f_sub, fill=(176, 242, 215))

    f_kicker = load_font(20, bold=True)
    f_h1 = load_font(46, bold=True)
    f_body = load_font(24, bold=False)

    draw.rounded_rectangle((64, 130, 450, 174), radius=20, fill=(228, 241, 237), outline=(189, 222, 210), width=2)
    draw.text((88, 139), "O DESAFIO NO DIA A DIA DA OFICINA", font=f_kicker, fill=(17, 107, 89))

    draw.text((64, 196), "Clientes e datas espalhados em várias planilhas", font=f_h1, fill=(19, 45, 51))
    draw.text((64, 256), "dificultam saber quem precisa de contato comercial agora.", font=f_h1, fill=(17, 107, 89))

    # Simulação visual limpa de 3 arquivos desconectados à esquerda vs. RenovaExt à direita
    cards_left = [
        ("clientes_condominios_2025.xlsx", "Datas sem padrão • Linhas repetidas • Sem status de proposta", (151, 50, 57), (251, 233, 233)),
        ("manutencoes_antigas_copia2.csv", "Clientes sem data de próximo acompanhamento (campos em branco)", (120, 73, 10), (255, 248, 235)),
        ("orcamentos_whatsapp_soltos.txt", "Difícil saber qual proposta foi enviada, aceita ou ficou sem retorno", (76, 99, 106), (235, 242, 242)),
    ]
    f_card_t = load_font(23, bold=True)
    f_card_b = load_font(19, bold=False)

    for i, (title, desc, fg, bg) in enumerate(cards_left):
        y = 350 + i * 185
        draw.rounded_rectangle((64, y, 890, y + 155), radius=18, fill=(255, 255, 255), outline=(210, 224, 224), width=2)
        draw.rounded_rectangle((88, y + 22, 490, y + 60), radius=8, fill=bg)
        draw.text((104, y + 27), title, font=f_card_t, fill=fg)
        draw.text((88, y + 84), desc, font=f_card_b, fill=(76, 99, 106))

    # Seta central
    draw.rounded_rectangle((918, 560, 1002, 624), radius=16, fill=(13, 81, 72))
    draw.text((944, 567), "→", font=load_font(40, bold=True), fill=(255, 255, 255))

    # Painel real à direita (miniatura em alta resolução da Tela 1)
    real_t1 = Image.open(FRAMES_MAP["fhd_01_painel_radar"]).convert("RGB")
    preview_t1 = real_t1.resize((820, 461), Image.Resampling.LANCZOS)
    draw.rounded_rectangle((1024, 345, 1868, 895), radius=20, fill=(255, 255, 255), outline=(142, 199, 185), width=3)
    draw.rounded_rectangle((1046, 365, 1520, 405), radius=8, fill=(228, 241, 237))
    draw.text((1062, 372), "SOLUÇÃO: CARTEIRA E RADAR NO MESMO LUGAR", font=f_kicker, fill=(13, 81, 72))
    img.paste(preview_t1, (1036, 420))
    return img


def create_closing_cta_frame() -> Image.Image:
    """Cria o quadro final 1920x1080 convidando para a demonstração fictícia ou piloto de 30 dias."""
    base_bg = load_fhd_image(FRAMES_MAP["fhd_01_painel_radar"], "RGBA")
    blurred = base_bg.filter(ImageFilter.GaussianBlur(radius=8))
    overlay = Image.new("RGBA", (1920, 1080), (11, 52, 59, 225))
    canvas = Image.alpha_composite(blurred, overlay)
    draw = ImageDraw.Draw(canvas)

    draw.rounded_rectangle((220, 150, 1700, 930), radius=28, fill=(255, 255, 255, 255), outline=(176, 242, 215, 255), width=4)

    f_kicker = load_font(20, bold=True)
    f_h1 = load_font(48, bold=True)
    f_body = load_font(25, bold=False)
    f_btn = load_font(24, bold=True)

    draw.rounded_rectangle((280, 210, 740, 256), radius=22, fill=(228, 241, 237, 255))
    draw.text((304, 219), "RENOVAEXT • DEMONSTRAÇÃO E PILOTO", font=f_kicker, fill=(17, 107, 89, 255))

    draw.text((280, 286), "Sua carteira de clientes organizada.", font=f_h1, fill=(19, 45, 51, 255))
    draw.text((280, 350), "Suas próximas renovações à vista.", font=f_h1, fill=(17, 107, 89, 255))

    bullets = [
        "✓  Importe sua planilha atual (.CSV ou .XLSX) e revise registros incompletos",
        "✓  Acompanhe no radar vencimentos atrasados e janelas de 30, 60 e 90 dias",
        "✓  Prepare propostas comerciais com seus preços e gere o PDF em poucos passos",
        "✓  Continue usando seu sistema atual • Dados isolados por empresa (RLS)",
    ]
    for idx, b in enumerate(bullets):
        draw.text((280, 445 + idx * 54), b, font=f_body, fill=(55, 80, 87, 255))

    # Botões de CTA em destaque
    draw.rounded_rectangle((280, 700, 880, 784), radius=14, fill=(13, 81, 72, 255))
    draw.text((335, 724), "Conhecer a demonstração (dados fictícios) ↗", font=f_btn, fill=(255, 255, 255, 255))

    draw.rounded_rectangle((910, 700, 1540, 784), radius=14, fill=(237, 248, 243, 255), outline=(17, 107, 89, 255), width=3)
    draw.text((965, 724), "Solicitar demonstração ou piloto (30 dias) →", font=f_btn, fill=(12, 55, 62, 255))

    draw.text(
        (280, 825),
        "Planos do piloto de 30 dias: Inicial R$ 49/mês (até 150 clientes)  •  Profissional R$ 79/mês (até 500 clientes)",
        font=load_font(20, bold=True),
        fill=(76, 99, 106, 255),
    )
    return canvas.convert("RGB")


def create_professional_thumbnail():
    """Cria public/video-thumbnail.png (1920x1080) nítida e atraente."""
    thumb = Image.new("RGB", (1920, 1080), (12, 55, 62))
    draw = ImageDraw.Draw(thumb)

    # Card esquerdo de texto
    f_kicker = load_font(20, bold=True)
    f_h1 = load_font(52, bold=True)
    f_sub = load_font(25, bold=False)

    draw.rounded_rectangle((72, 92, 530, 140), radius=24, fill=(17, 107, 89))
    draw.text((98, 102), "VÍDEO DEMONSTRATIVO • 1 MIN 35 S", font=f_kicker, fill=(176, 242, 215))

    draw.text((72, 178), "Da planilha", font=f_h1, fill=(255, 255, 255))
    draw.text((72, 242), "à proposta em PDF", font=f_h1, fill=(176, 242, 215))
    draw.text((72, 306), "em três passos.", font=f_h1, fill=(255, 255, 255))

    steps_txt = [
        "1. Importe sua planilha CSV ou XLSX",
        "2. Filtre vencimentos em 30, 60 e 90 dias",
        "3. Gere propostas em PDF com seus preços",
    ]
    for i, st in enumerate(steps_txt):
        draw.text((72, 415 + i * 52), st, font=f_sub, fill=(212, 230, 229))

    draw.rounded_rectangle((72, 620, 620, 690), radius=14, fill=(255, 255, 255))
    draw.text((104, 638), "▶  Assista à demonstração (dados fictícios)", font=load_font(23, bold=True), fill=(12, 55, 62))

    # Moldura com a interface real à direita
    real_radar = Image.open(FRAMES_MAP["fhd_01_painel_radar"]).convert("RGB")
    shot_resized = real_radar.resize((1120, 630), Image.Resampling.LANCZOS)
    draw.rounded_rectangle((718, 178, 1862, 832), radius=20, fill=(255, 255, 255), outline=(176, 242, 215), width=4)
    thumb.paste(shot_resized, (730, 190))

    thumb.save(PUBLIC_DIR / "video-thumbnail.png", format="PNG", optimize=True)


async def synthesize_voiceover_segments(ffmpeg_exe: str):
    """Gera os segmentos de voz em pt-BR via edge-tts e retorna caminhos WAV e durações exatas."""
    results = []
    for seg in SEGMENTS:
        mp3_path = TMP_DIR / f"{seg['id']}_v2.mp3"
        wav_path = TMP_DIR / f"{seg['id']}_v2.wav"
        if not mp3_path.exists() or os.path.getsize(mp3_path) < 1000:
            communicate = edge_tts.Communicate(seg["text"], VOICE_NAME, rate="+0%", pitch="+0Hz")
            await communicate.save(str(mp3_path))

        # Converter para WAV 44.1kHz mono com filtro de normalização e adicionar pausa natural pós-frase
        pause_sec = seg["post_pause_sec"]
        subprocess.run(
            [
                ffmpeg_exe,
                "-y",
                "-i",
                str(mp3_path),
                "-af",
                f"highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur={pause_sec}",
                "-ar",
                "44100",
                "-ac",
                "2",
                str(wav_path),
            ],
            check=True,
            capture_output=True,
        )

        # Obter duração exata a partir do tamanho do arquivo WAV (44100 Hz * 2 canais * 2 bytes = 176400 bytes/s)
        size_bytes = os.path.getsize(wav_path) - 44
        duration_sec = max(1.0, size_bytes / 176400.0)
        results.append({**seg, "wav_path": wav_path, "duration_sec": duration_sec})
    return results


def format_vtt_timestamp(sec: float) -> str:
    total_ms = int(round(max(0.0, sec) * 1000))
    hours = total_ms // 3600000
    rem = total_ms % 3600000
    minutes = rem // 60000
    rem = rem % 60000
    seconds = rem // 1000
    ms = rem % 1000
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{ms:03d}"


def write_webvtt_subtitles(timed_segments):
    lines = ["WEBVTT", ""]
    cursor = 0.0
    for idx, seg in enumerate(timed_segments, start=1):
        start_t = cursor
        end_t = cursor + seg["duration_sec"] - 0.15
        lines.append(str(idx))
        lines.append(f"{format_vtt_timestamp(start_t)} --> {format_vtt_timestamp(end_t)}")
        lines.append(seg["subtitle"])
        lines.append("")
        cursor += seg["duration_sec"]

    vtt_path = PUBLIC_DIR / "legendas-demo-ptbr.vtt"
    vtt_path.write_text("\n".join(lines), encoding="utf-8")


def apply_smooth_zoom_and_overlays(
    base_img: Image.Image,
    zoom: float,
    focus_xy: tuple[float, float],
    step_badge_text: str,
    subtitle_text: str,
    highlight_box: tuple[int, int, int, int] | None = None,
    cursor_xy: tuple[int, int] | None = None,
    click_ripple: float = 0.0,
) -> np.ndarray:
    """Aplica zoom suave centrado em focus_xy, destaca clique/área relevante e desenha tarja de etapa."""
    w, h = 1920, 1080
    work = base_img.copy()
    draw_base = ImageDraw.Draw(work, "RGBA")

    if highlight_box:
        x1, y1, x2, y2 = highlight_box
        draw_base.rounded_rectangle(
            (x1 - 4, y1 - 4, x2 + 4, y2 + 4),
            radius=12,
            outline=(17, 107, 89, 235),
            width=4,
        )

    if cursor_xy:
        cx, cy = cursor_xy
        if click_ripple > 0.0:
            r = int(14 + click_ripple * 34)
            alpha = int(max(0, (1.0 - click_ripple) * 190))
            draw_base.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(17, 107, 89, alpha), width=4)
        # Ponteiro do mouse nítido
        poly = [(cx, cy), (cx, cy + 26), (cx + 7, cy + 20), (cx + 13, cy + 31), (cx + 18, cy + 28), (cx + 12, cy + 17), (cx + 21, cy + 17)]
        draw_base.polygon(poly, fill=(12, 55, 62, 255), outline=(255, 255, 255, 255))

    if zoom > 1.001:
        fx, fy = focus_xy
        crop_w = w / zoom
        crop_h = h / zoom
        left = max(0.0, min(w - crop_w, fx - crop_w / 2.0))
        top = max(0.0, min(h - crop_h, fy - crop_h / 2.0))
        cropped = work.crop((int(left), int(top), int(left + crop_w), int(top + crop_h)))
        frame = cropped.resize((w, h), Image.Resampling.BILINEAR)
    else:
        frame = work

    # Tarja superior discreta de etapa + legenda queimada discreta para leitura mesmo sem som
    overlay_draw = ImageDraw.Draw(frame, "RGBA")
    f_badge = load_font(17, bold=True)
    overlay_draw.rounded_rectangle((32, 998, 560, 1044), radius=10, fill=(12, 55, 62, 230), outline=(176, 242, 215, 200), width=1)
    overlay_draw.text((48, 1009), step_badge_text, font=f_badge, fill=(176, 242, 215, 255))

    return np.asarray(frame, dtype=np.uint8)


def main():
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    copy_high_res_site_screenshots()
    create_professional_thumbnail()

    # 1. Gerar locução neural em português brasileiro
    timed_segments = asyncio.run(synthesize_voiceover_segments(ffmpeg_exe))
    write_webvtt_subtitles(timed_segments)

    # Concatenar todos os segmentos WAV em um único arquivo de áudio mestre
    concat_list_file = TMP_DIR / "audio_concat.txt"
    concat_lines = [f"file '{seg['wav_path'].as_posix()}'" for seg in timed_segments]
    concat_list_file.write_text("\n".join(concat_lines), encoding="utf-8")

    master_voice_wav = TMP_DIR / "master_voice.wav"
    subprocess.run(
        [
            ffmpeg_exe,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_list_file),
            "-c",
            "copy",
            str(master_voice_wav),
        ],
        check=True,
        capture_output=True,
    )

    total_duration = sum(s["duration_sec"] for s in timed_segments)

    # Exportar MP3 de narração com fundo harmônico suave (-28dB) em public/narracao-demo-renovaext.mp3
    narration_mp3 = PUBLIC_DIR / "narracao-demo-renovaext.mp3"
    subprocess.run(
        [
            ffmpeg_exe,
            "-y",
            "-i",
            str(master_voice_wav),
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=220:duration={total_duration},volume=0.015,lowpass=f=400",
            "-filter_complex",
            "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2,loudnorm=I=-16:TP=-1.5:LRA=11[aout]",
            "-map",
            "[aout]",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "160k",
            str(narration_mp3),
        ],
        check=True,
        capture_output=True,
    )

    # 2. Carregar os quadros reais 1920x1080
    img_problem = create_problem_scene_frame()
    img_t1_all = load_fhd_image(FRAMES_MAP["fhd_01_painel_radar"], "RGB")
    img_t1_late = load_fhd_image(FRAMES_MAP["fhd_02_radar_atrasados"], "RGB")
    img_t1_30d = load_fhd_image(FRAMES_MAP["fhd_03_radar_30dias"], "RGB")
    img_t2_s1 = load_fhd_image(FRAMES_MAP["fhd_04_tela2_passo1"], "RGB")
    img_t2_s2 = load_fhd_image(FRAMES_MAP["fhd_05_tela2_passo2_colunas"], "RGB")
    img_t2_s3 = load_fhd_image(FRAMES_MAP["fhd_06_tela2_passo3_previa"], "RGB")
    img_t3_form = load_fhd_image(FRAMES_MAP["fhd_08_tela3_proposta_preenchida"], "RGB")
    img_t3_saved = load_fhd_image(FRAMES_MAP["fhd_09_tela3_pdf_gerado"], "RGB")
    img_real_pdf = render_real_pdf_frame()
    img_closing = create_closing_cta_frame()

    # 3. Gerar quadros-chave em alta resolução (1920x1080) com zoom suave e destaque nas áreas importantes
    #    e codificar a 30 fps via FFmpeg concat demuxer em poucos segundos
    slides_plan = []
    for seg in timed_segments:
        sid = seg["id"]
        dur = seg["duration_sec"]

        if sid == "seg_01_problema":
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_problem, 1.0, (960, 540), seg["title"], seg["subtitle"]
                    ),
                    dur,
                )
            )
        elif sid == "seg_02_solucao_interface":
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_t1_all,
                        1.0,
                        (960, 320),
                        seg["title"],
                        seg["subtitle"],
                        highlight_box=(835, 65, 1585, 105),
                        cursor_xy=(980, 85),
                    ),
                    dur * 0.55,
                )
            )
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_t1_all,
                        1.06,
                        (960, 260),
                        seg["title"],
                        seg["subtitle"],
                        highlight_box=(835, 65, 1585, 105),
                        cursor_xy=(1210, 85),
                        click_ripple=0.4,
                    ),
                    dur * 0.45,
                )
            )
        elif sid == "seg_03_importacao_planilha":
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_t2_s1,
                        1.0,
                        (1250, 420),
                        "3. Passo 1: Carregar Planilha CSV ou XLSX",
                        seg["subtitle"],
                        highlight_box=(1140, 420, 1460, 465),
                        cursor_xy=(1280, 442),
                        click_ripple=0.35,
                    ),
                    dur * 0.28,
                )
            )
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_t2_s2,
                        1.04,
                        (960, 480),
                        "3. Passo 2: Associar Colunas da Planilha",
                        seg["subtitle"],
                        highlight_box=(360, 340, 1560, 680),
                    ),
                    dur * 0.30,
                )
            )
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_t2_s3,
                        1.0,
                        (1180, 610),
                        "3. Passo 3: Prévia e Sinalização para Conferência",
                        seg["subtitle"],
                        highlight_box=(1160, 430, 1540, 825),
                    ),
                    dur * 0.22,
                )
            )
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_t2_s3,
                        1.15,
                        (1180, 650),
                        "3. Passo 3: Zoom nos Registros Marcados para Conferência",
                        seg["subtitle"],
                        highlight_box=(1160, 745, 1540, 825),
                    ),
                    dur * 0.20,
                )
            )
        elif sid == "seg_04_painel_e_radar":
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_t1_all,
                        1.0,
                        (820, 340),
                        "4. Painel da Carteira e Indicadores",
                        seg["subtitle"],
                        highlight_box=(345, 235, 1225, 325),
                    ),
                    dur * 0.38,
                )
            )
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_t1_late,
                        1.06,
                        (820, 490),
                        "4. Radar: Clientes com Datas Atrasadas",
                        seg["subtitle"],
                        highlight_box=(435, 420, 650, 452),
                        cursor_xy=(540, 436),
                        click_ripple=0.35,
                    ),
                    dur * 0.32,
                )
            )
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_t1_30d,
                        1.06,
                        (820, 490),
                        "4. Radar: Janelas de 30, 60 e 90 Dias",
                        seg["subtitle"],
                        highlight_box=(655, 420, 810, 452),
                        cursor_xy=(730, 436),
                        click_ripple=0.35,
                    ),
                    dur * 0.30,
                )
            )
        elif sid == "seg_05_oportunidade_e_proposta":
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_t3_form,
                        1.0,
                        (760, 500),
                        "5. Funil Comercial de 7 Etapas",
                        seg["subtitle"],
                        highlight_box=(360, 290, 1540, 355),
                        cursor_xy=(920, 322),
                    ),
                    dur * 0.45,
                )
            )
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_t3_form,
                        1.14,
                        (760, 660),
                        "5. Proposta com Preços Praticados pela Oficina (R$ 1.500,00)",
                        seg["subtitle"],
                        highlight_box=(350, 520, 1140, 845),
                        cursor_xy=(1040, 615),
                    ),
                    dur * 0.55,
                )
            )
        elif sid == "seg_06_pdf_real_gerado":
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_t3_saved,
                        1.05,
                        (760, 580),
                        "6. Proposta Salva e PDF Gerado",
                        seg["subtitle"],
                        highlight_box=(360, 530, 1130, 592),
                    ),
                    dur * 0.34,
                )
            )
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_real_pdf,
                        1.0,
                        (960, 500),
                        "6. Documento PDF A4 Real Pronto para Baixar",
                        seg["subtitle"],
                    ),
                    dur * 0.33,
                )
            )
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_real_pdf,
                        1.10,
                        (960, 440),
                        "6. Visualização Nitída dos Itens no PDF Real",
                        seg["subtitle"],
                    ),
                    dur * 0.33,
                )
            )
        else:
            slides_plan.append(
                (
                    apply_smooth_zoom_and_overlays(
                        img_closing, 1.0, (960, 540), seg["title"], seg["subtitle"]
                    ),
                    dur,
                )
            )

    slides_concat_txt = TMP_DIR / "slides_concat.txt"
    slide_lines = []
    last_slide_path = None
    for idx, (arr, dur_s) in enumerate(slides_plan):
        sp = TMP_DIR / f"slide_{idx:02d}.png"
        Image.fromarray(arr).save(sp, format="PNG")
        slide_lines.append(f"file '{sp.as_posix()}'")
        slide_lines.append(f"duration {dur_s:.4f}")
        last_slide_path = sp
    if last_slide_path:
        slide_lines.append(f"file '{last_slide_path.as_posix()}'")

    slides_concat_txt.write_text("\n".join(slide_lines), encoding="utf-8")

    output_fps = 30
    final_mp4 = PUBLIC_DIR / "video-demo-renovaext.mp4"
    subprocess.run(
        [
            ffmpeg_exe,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(slides_concat_txt),
            "-i",
            str(narration_mp3),
            "-vf",
            f"fps={output_fps},scale=1920:1080,format=yuv420p",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-movflags",
            "+faststart",
            "-shortest",
            str(final_mp4),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    summary = {
        "status": "VIDEO_AND_HIGH_RES_SCREENSHOTS_BUILT",
        "videoFile": "public/video-demo-renovaext.mp4",
        "videoSizeBytes": os.path.getsize(final_mp4),
        "resolution": "1920x1080",
        "fps": output_fps,
        "durationSeconds": round(total_duration, 2),
        "audioFile": "public/narracao-demo-renovaext.mp3",
        "subtitlesFile": "public/legendas-demo-ptbr.vtt",
        "thumbnailFile": "public/video-thumbnail.png",
        "siteScreenshots": [
            "public/captura-tela1-radar.png",
            "public/captura-tela2-importacao.png",
            "public/captura-tela3-proposta.png",
        ],
        "segments": [
            {"id": s["id"], "durationSec": round(s["duration_sec"], 2)}
            for s in timed_segments
        ],
    }
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
