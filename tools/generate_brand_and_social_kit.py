"""
Gera o pacote oficial de Identidade Visual e Kit de Redes Sociais do RenovaExt:
- SaaS para empresas de inspecao, manutencao e recarga de EXTINTORES DE INCENDIO (nao oficinas mecanicas).
- Sem simbolo (R).
- Paleta oficial: Azul-petroleo (#0c373e), Verde-esmeralda (#0d5148 / #116b59), Menta (#9ce7c9), Fundo claro (#f7faf8).
- Versoes geradas em public/brand/:
  1. renovaext-logo-horizontal-claro.svg e .png (transparente para fundo claro)
  2. renovaext-logo-horizontal-escuro.svg e .png (transparente para fundo escuro)
  3. renovaext-logo-fundo-claro.svg e .png (com placa de fundo claro #f7faf8)
  4. renovaext-logo-fundo-escuro.svg e .png (com placa de fundo escuro #0c373e)
  5. renovaext-icone-quadrado.svg e .png
  6. renovaext-logo-monocromatica-escura.svg e .png
  7. renovaext-logo-monocromatica-clara.svg e .png
- Kit Instagram em public/brand/instagram/:
  - perfil-instagram-1080x1080.png
  - post-01-agenda-renovacoes-extintores.png (1080x1080)
  - post-02-como-funciona-3-passos.png (1080x1080)
  - post-03-piloto-30-dias.png (1080x1080)
  - destaque-01-como-funciona.png (1080x1920)
  - destaque-02-demonstracao.png (1080x1920)
  - destaque-03-planos-piloto.png (1080x1920)
  - destaque-04-duvidas.png (1080x1920)
"""

import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BRAND_DIR = ROOT / "public" / "brand"
IG_DIR = BRAND_DIR / "instagram"
BRAND_DIR.mkdir(parents=True, exist_ok=True)
IG_DIR.mkdir(parents=True, exist_ok=True)

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REGULAR = "C:/Windows/Fonts/segoeui.ttf"


def get_font(bold: bool, size: int) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if bold else FONT_REGULAR
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


# ---------------------------------------------------------------------------
# 1. GERACAO DOS ARQUIVOS SVG EDITAVEIS (SEM SIMBOLO (R))
# ---------------------------------------------------------------------------

def build_icon_svg_inner(bg_color: str, arc_color: str, ext_color: str, dot_color: str) -> str:
    return f"""
  <!-- Fundo arredondado do icone -->
  <rect x="16" y="16" width="480" height="480" rx="116" fill="{bg_color}"/>
  <!-- Arco superior de renovacao continua (calendario/ciclo) -->
  <path d="M 118 232 A 144 144 0 0 1 372 152" fill="none" stroke="{arc_color}" stroke-width="28" stroke-linecap="round"/>
  <path d="M 332 156 L 380 156 L 380 108" fill="none" stroke="{arc_color}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Arco inferior de renovacao continua -->
  <path d="M 394 280 A 144 144 0 0 1 140 360" fill="none" stroke="{arc_color}" stroke-width="28" stroke-linecap="round"/>
  <path d="M 180 356 L 132 356 L 132 404" fill="none" stroke="{arc_color}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Cilindro de Extintor de Incendio Central -->
  <rect x="206" y="206" width="100" height="142" rx="34" fill="{ext_color}"/>
  <!-- Base tecnica de calendario/agenda no corpo do extintor (6 pontos de agenda) -->
  <circle cx="234" cy="268" r="6.5" fill="{dot_color}"/>
  <circle cx="256" cy="268" r="6.5" fill="{dot_color}"/>
  <circle cx="278" cy="268" r="6.5" fill="{dot_color}"/>
  <circle cx="234" cy="292" r="6.5" fill="{dot_color}"/>
  <circle cx="256" cy="292" r="6.5" fill="{dot_color}"/>
  <circle cx="278" cy="292" r="6.5" fill="{dot_color}"/>
  <!-- Valvula e manometro superior do extintor -->
  <rect x="238" y="176" width="36" height="34" rx="7" fill="{ext_color}"/>
  <circle cx="256" cy="192" r="7" fill="{arc_color}"/>
  <!-- Alavanca de acionamento e difusor -->
  <path d="M 220 172 L 296 172 L 316 156" fill="none" stroke="{ext_color}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Mangueira lateral do extintor -->
  <path d="M 208 228 Q 174 236 172 284" fill="none" stroke="{ext_color}" stroke-width="14" stroke-linecap="round"/>
"""


def save_all_svgs():
    # 1. Icone quadrado oficial (512x512)
    svg_square = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="none">
{build_icon_svg_inner("#0c373e", "#9ce7c9", "#ffffff", "#0c373e")}
</svg>
"""
    (BRAND_DIR / "renovaext-icone-quadrado.svg").write_text(svg_square, encoding="utf-8")
    (ROOT / "public" / "icon.svg").write_text(svg_square, encoding="utf-8")

    # 2. Horizontal Claro (transparente para uso sobre fundos claros)
    svg_horiz_light = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 240" width="1080" height="240" fill="none">
  <g transform="translate(20, 20) scale(0.390625)">
    {build_icon_svg_inner("#0c373e", "#9ce7c9", "#ffffff", "#0c373e")}
  </g>
  <text x="246" y="128" font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" font-size="88" font-weight="800" letter-spacing="-2.5" fill="#102126">Renova<tspan fill="#0d5148">Ext</tspan></text>
  <text x="250" y="174" font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="1.8" fill="#4f6468">AGENDA E RENOVAÇÕES PARA EMPRESAS DE EXTINTORES</text>
</svg>
"""
    (BRAND_DIR / "renovaext-logo-horizontal-claro.svg").write_text(svg_horiz_light, encoding="utf-8")

    # 3. Horizontal Fundo Claro (com placa #f7faf8)
    svg_plate_light = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 240" width="1080" height="240" fill="none">
  <rect x="0" y="0" width="1080" height="240" rx="32" fill="#f7faf8"/>
  <g transform="translate(20, 20) scale(0.390625)">
    {build_icon_svg_inner("#0c373e", "#9ce7c9", "#ffffff", "#0c373e")}
  </g>
  <text x="246" y="128" font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" font-size="88" font-weight="800" letter-spacing="-2.5" fill="#102126">Renova<tspan fill="#0d5148">Ext</tspan></text>
  <text x="250" y="174" font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="1.8" fill="#4f6468">AGENDA E RENOVAÇÕES PARA EMPRESAS DE EXTINTORES</text>
</svg>
"""
    (BRAND_DIR / "renovaext-logo-fundo-claro.svg").write_text(svg_plate_light, encoding="utf-8")

    # 4. Horizontal Escuro (com placa #0c373e para visualizacao direta e uso em fundos escuros)
    svg_horiz_dark = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 240" width="1080" height="240" fill="none">
  <rect x="0" y="0" width="1080" height="240" rx="32" fill="#0c373e"/>
  <g transform="translate(20, 20) scale(0.390625)">
    {build_icon_svg_inner("#116b59", "#9ce7c9", "#ffffff", "#0c373e")}
  </g>
  <text x="246" y="128" font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" font-size="88" font-weight="800" letter-spacing="-2.5" fill="#ffffff">Renova<tspan fill="#9ce7c9">Ext</tspan></text>
  <text x="250" y="174" font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="1.8" fill="#bfe9d9">AGENDA E RENOVAÇÕES PARA EMPRESAS DE EXTINTORES</text>
</svg>
"""
    (BRAND_DIR / "renovaext-logo-horizontal-escuro.svg").write_text(svg_horiz_dark, encoding="utf-8")
    (BRAND_DIR / "renovaext-logo-fundo-escuro.svg").write_text(svg_horiz_dark, encoding="utf-8")

    # 5. Monocromatica Escura (#102126)
    svg_mono_dark = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 240" width="1080" height="240" fill="none">
  <g transform="translate(20, 20) scale(0.390625)">
    {build_icon_svg_inner("#102126", "#ffffff", "#ffffff", "#102126")}
  </g>
  <text x="246" y="128" font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" font-size="88" font-weight="800" letter-spacing="-2.5" fill="#102126">RenovaExt</text>
  <text x="250" y="174" font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="1.8" fill="#102126">AGENDA E RENOVAÇÕES PARA EMPRESAS DE EXTINTORES</text>
</svg>
"""
    (BRAND_DIR / "renovaext-logo-monocromatica-escura.svg").write_text(svg_mono_dark, encoding="utf-8")

    # 6. Monocromatica Clara (#ffffff sobre placa escura neutra para contraste ou transparente)
    svg_mono_light = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 240" width="1080" height="240" fill="none">
  <rect x="0" y="0" width="1080" height="240" rx="32" fill="#102126"/>
  <g transform="translate(20, 20) scale(0.390625)">
    {build_icon_svg_inner("#ffffff", "#102126", "#102126", "#ffffff")}
  </g>
  <text x="246" y="128" font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" font-size="88" font-weight="800" letter-spacing="-2.5" fill="#ffffff">RenovaExt</text>
  <text x="250" y="174" font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="1.8" fill="#ffffff">AGENDA E RENOVAÇÕES PARA EMPRESAS DE EXTINTORES</text>
</svg>
"""
    (BRAND_DIR / "renovaext-logo-monocromatica-clara.svg").write_text(svg_mono_light, encoding="utf-8")


# ---------------------------------------------------------------------------
# 2. GERACAO DOS ARQUIVOS PNG DE ALTA NITIDEZ (SUPER-SAMPLING 2X)
# ---------------------------------------------------------------------------

def draw_icon_symbol(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    size: int,
    bg_color,
    arc_color,
    ext_color,
    dot_color=None,
):
    if dot_color is None:
        dot_color = bg_color
    pad = int(size * 0.03125)
    rx = int(size * 0.226)
    draw.rounded_rectangle([x0 + pad, y0 + pad, x0 + size - pad, y0 + size - pad], radius=rx, fill=bg_color)

    cx, cy = x0 + size // 2, y0 + size // 2
    r = int(size * 0.281)
    stroke_w = max(4, int(size * 0.055))

    # Arcos circulares de renovacao
    bbox = [cx - r, cy - r, cx + r, cy + r]
    draw.arc(bbox, start=192, end=332, fill=arc_color, width=stroke_w)
    draw.arc(bbox, start=12, end=152, fill=arc_color, width=stroke_w)

    # Pontas de seta arredondadas
    ax1, ay1 = cx + int(size * 0.24), cy - int(size * 0.195)
    arm = int(size * 0.095)
    draw.line([(ax1 - arm, ay1), (ax1, ay1), (ax1, ay1 - arm)], fill=arc_color, width=stroke_w, joint="curve")

    ax2, ay2 = cx - int(size * 0.24), cy + int(size * 0.195)
    draw.line([(ax2 + arm, ay2), (ax2, ay2), (ax2, ay2 + arm)], fill=arc_color, width=stroke_w, joint="curve")

    # Cilindro do extintor
    ew = int(size * 0.195)
    eh = int(size * 0.278)
    ex0 = cx - ew // 2
    ey0 = cy - int(size * 0.098)
    draw.rounded_rectangle([ex0, ey0, ex0 + ew, ey0 + eh], radius=int(size * 0.066), fill=ext_color)

    # Grade de 6 pontos de calendario/agenda no cilindro
    dot_r = max(2, int(size * 0.013))
    for row_idx, ry_off in enumerate([0.115, 0.165]):
        for col_idx, rx_off in enumerate([-0.043, 0.0, 0.043]):
            dx = cx + int(size * rx_off)
            dy = ey0 + int(size * ry_off)
            draw.ellipse([dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r], fill=dot_color)

    # Valvula superior + manometro
    vw = int(size * 0.070)
    vh = int(size * 0.066)
    vy0 = ey0 - vh + int(size * 0.01)
    draw.rounded_rectangle([cx - vw // 2, vy0, cx + vw // 2, ey0 + int(size * 0.01)], radius=max(2, int(size * 0.014)), fill=ext_color)
    mr = max(2, int(size * 0.014))
    mcy = vy0 + vh // 2
    draw.ellipse([cx - mr, mcy - mr, cx + mr, mcy + mr], fill=arc_color)

    # Alavanca superior e difusor
    lw = max(3, int(size * 0.029))
    ly = vy0 - int(size * 0.006)
    draw.line(
        [(cx - int(size * 0.07), ly), (cx + int(size * 0.078), ly), (cx + int(size * 0.117), ly - int(size * 0.031))],
        fill=ext_color,
        width=lw,
    )

    # Mangueira lateral
    hw = max(3, int(size * 0.027))
    hx0 = ex0 + int(size * 0.008)
    hy0 = ey0 + int(size * 0.05)
    draw.arc([hx0 - int(size * 0.072), hy0, hx0 + int(size * 0.05), hy0 + int(size * 0.19)], start=175, end=270, fill=ext_color, width=hw)


def render_horizontal_png(
    out_path: Path,
    plate_bg,
    icon_bg,
    icon_arc,
    icon_ext,
    icon_dot,
    text_main,
    text_accent,
    sub_color,
):
    # Renderizamos em 2x (2160x480) e reduzimos com LANCZOS para 1080x240 para anti-aliasing perfeito
    W, H = 2160, 480
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if plate_bg is not None:
        draw.rounded_rectangle([0, 0, W, H], radius=64, fill=plate_bg)

    draw_icon_symbol(draw, 40, 40, 400, icon_bg, icon_arc, icon_ext, icon_dot)

    f_title = get_font(True, 172)
    f_sub = get_font(True, 36)

    x_text = 488
    y_title = 72
    draw.text((x_text, y_title), "Renova", font=f_title, fill=text_main)
    w_renova = draw.textlength("Renova", font=f_title)
    draw.text((x_text + w_renova, y_title), "Ext", font=f_title, fill=text_accent)

    draw.text(
        (x_text + 6, 304),
        "AGENDA E RENOVAÇÕES PARA EMPRESAS DE EXTINTORES",
        font=f_sub,
        fill=sub_color,
    )

    img_final = img.resize((1080, 240), Image.Resampling.LANCZOS)
    img_final.save(out_path, "PNG")


def save_all_logo_pngs():
    # 1. Icone quadrado 512x512 (renderizado em 1024x1024)
    sq_hi = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw_sq = ImageDraw.Draw(sq_hi)
    draw_icon_symbol(draw_sq, 0, 0, 1024, (12, 55, 62, 255), (156, 231, 201, 255), (255, 255, 255, 255), (12, 55, 62, 255))
    sq_hi.resize((512, 512), Image.Resampling.LANCZOS).save(BRAND_DIR / "renovaext-icone-quadrado.png", "PNG")

    # 2. Horizontal Claro (transparente)
    render_horizontal_png(
        BRAND_DIR / "renovaext-logo-horizontal-claro.png",
        plate_bg=None,
        icon_bg=(12, 55, 62, 255),
        icon_arc=(156, 231, 201, 255),
        icon_ext=(255, 255, 255, 255),
        icon_dot=(12, 55, 62, 255),
        text_main=(16, 33, 38, 255),
        text_accent=(13, 81, 72, 255),
        sub_color=(79, 100, 104, 255),
    )

    # 3. Horizontal Fundo Claro (placa #f7faf8)
    render_horizontal_png(
        BRAND_DIR / "renovaext-logo-fundo-claro.png",
        plate_bg=(247, 250, 248, 255),
        icon_bg=(12, 55, 62, 255),
        icon_arc=(156, 231, 201, 255),
        icon_ext=(255, 255, 255, 255),
        icon_dot=(12, 55, 62, 255),
        text_main=(16, 33, 38, 255),
        text_accent=(13, 81, 72, 255),
        sub_color=(79, 100, 104, 255),
    )

    # 4. Horizontal Escuro / Fundo Escuro (placa #0c373e para contraste imediato)
    render_horizontal_png(
        BRAND_DIR / "renovaext-logo-horizontal-escuro.png",
        plate_bg=(12, 55, 62, 255),
        icon_bg=(17, 107, 89, 255),
        icon_arc=(156, 231, 201, 255),
        icon_ext=(255, 255, 255, 255),
        icon_dot=(12, 55, 62, 255),
        text_main=(255, 255, 255, 255),
        text_accent=(156, 231, 201, 255),
        sub_color=(191, 233, 217, 255),
    )
    render_horizontal_png(
        BRAND_DIR / "renovaext-logo-fundo-escuro.png",
        plate_bg=(12, 55, 62, 255),
        icon_bg=(17, 107, 89, 255),
        icon_arc=(156, 231, 201, 255),
        icon_ext=(255, 255, 255, 255),
        icon_dot=(12, 55, 62, 255),
        text_main=(255, 255, 255, 255),
        text_accent=(156, 231, 201, 255),
        sub_color=(191, 233, 217, 255),
    )

    # 5. Monocromatica Escura
    render_horizontal_png(
        BRAND_DIR / "renovaext-logo-monocromatica-escura.png",
        plate_bg=None,
        icon_bg=(16, 33, 38, 255),
        icon_arc=(255, 255, 255, 255),
        icon_ext=(255, 255, 255, 255),
        icon_dot=(16, 33, 38, 255),
        text_main=(16, 33, 38, 255),
        text_accent=(16, 33, 38, 255),
        sub_color=(16, 33, 38, 255),
    )

    # 6. Monocromatica Clara (sobre placa escura neutra #102126)
    render_horizontal_png(
        BRAND_DIR / "renovaext-logo-monocromatica-clara.png",
        plate_bg=(16, 33, 38, 255),
        icon_bg=(255, 255, 255, 255),
        icon_arc=(16, 33, 38, 255),
        icon_ext=(16, 33, 38, 255),
        icon_dot=(255, 255, 255, 255),
        text_main=(255, 255, 255, 255),
        text_accent=(255, 255, 255, 255),
        sub_color=(255, 255, 255, 255),
    )


# ---------------------------------------------------------------------------
# 3. GERACAO DO KIT DE INSTAGRAM (PERFIL, 3 POSTS RICOS, 4 DESTAQUES)
# ---------------------------------------------------------------------------

def draw_brand_header_bar(draw: ImageDraw.ImageDraw, dark_theme: bool):
    # Mini logo no topo esquerdo + tag setorial no topo direito
    if dark_theme:
        draw_icon_symbol(draw, 76, 68, 68, (17, 107, 89, 255), (156, 231, 201, 255), (255, 255, 255, 255), (12, 55, 62, 255))
        draw.text((158, 78), "Renova", font=get_font(True, 34), fill=(255, 255, 255, 255))
        w_r = draw.textlength("Renova", font=get_font(True, 34))
        draw.text((158 + w_r, 78), "Ext", font=get_font(True, 34), fill=(156, 231, 201, 255))
        pill_bg = (17, 107, 89, 255)
        pill_fg = (216, 245, 232, 255)
    else:
        draw_icon_symbol(draw, 76, 68, 68, (12, 55, 62, 255), (156, 231, 201, 255), (255, 255, 255, 255), (12, 55, 62, 255))
        draw.text((158, 78), "Renova", font=get_font(True, 34), fill=(16, 33, 38, 255))
        w_r = draw.textlength("Renova", font=get_font(True, 34))
        draw.text((158 + w_r, 78), "Ext", font=get_font(True, 34), fill=(13, 81, 72, 255))
        pill_bg = (13, 81, 72, 255)
        pill_fg = (255, 255, 255, 255)

    draw.rounded_rectangle([540, 74, 1004, 126], radius=26, fill=pill_bg)
    draw.text((566, 86), "PARA EMPRESAS DE EXTINTORES", font=get_font(True, 21), fill=pill_fg)


def draw_brand_footer_bar(draw: ImageDraw.ImageDraw, dark_theme: bool):
    footer_bg = (17, 107, 89, 255) if dark_theme else (12, 55, 62, 255)
    draw.rounded_rectangle([76, 946, 1004, 1016], radius=20, fill=footer_bg)
    draw.text(
        (106, 966),
        "RenovaExt  •  Agenda comercial e renovações para oficinas de extintores",
        font=get_font(True, 22),
        fill=(255, 255, 255, 255),
    )


def generate_instagram_kit():
    # 1. Foto de Perfil Instagram (1080x1080)
    prof = Image.new("RGBA", (2160, 2160), (247, 250, 248, 255))
    d_prof = ImageDraw.Draw(prof)
    draw_icon_symbol(d_prof, 80, 80, 2000, (12, 55, 62, 255), (156, 231, 201, 255), (255, 255, 255, 255), (12, 55, 62, 255))
    prof.resize((1080, 1080), Image.Resampling.LANCZOS).save(IG_DIR / "perfil-instagram-1080x1080.png", "PNG")

    # 2. Post 01 — Radar de Renovacoes (1080x1080)
    p1 = Image.new("RGBA", (1080, 1080), (247, 250, 248, 255))
    d1 = ImageDraw.Draw(p1)
    draw_brand_header_bar(d1, dark_theme=False)

    f_h1 = get_font(True, 56)
    f_body = get_font(False, 29)
    y = 176
    for line in [
        "Sua carteira de manutenção",
        "de extintores organizada.",
        "Suas renovações à vista.",
    ]:
        d1.text((76, y), line, font=f_h1, fill=(16, 33, 38, 255))
        y += 68

    y += 14
    for line in [
        "Transforme sua planilha atual de clientes e extintores em uma",
        "agenda comercial clara de vencimentos — sem trocar de sistema.",
    ]:
        d1.text((76, y), line, font=f_body, fill=(79, 100, 104, 255))
        y += 40

    # Cards visuais do Radar na metade inferior
    cards_p1 = [
        ("Atrasados / Conferir agora", "Prioridade imediata de contato", (254, 226, 226, 255), (185, 28, 28, 255)),
        ("Próximos 30 dias", "Renovações do mês corrente", (254, 243, 199, 255), (180, 83, 9, 255)),
        ("Próximos 60 e 90 dias", "Antecipação para condomínios e empresas", (209, 250, 229, 255), (13, 81, 72, 255)),
        ("Necessita conferência", "Cadastros sem data sinalizados com segurança", (243, 232, 255, 255), (109, 40, 217, 255)),
    ]
    cy = 528
    for title_c, desc_c, badge_bg, badge_fg in cards_p1:
        d1.rounded_rectangle([76, cy, 1004, cy + 88], radius=18, fill=(255, 255, 255, 255), outline=(216, 228, 224, 255), width=2)
        d1.rounded_rectangle([98, cy + 20, 392, cy + 68], radius=12, fill=badge_bg)
        d1.text((116, cy + 31), title_c, font=get_font(True, 21), fill=badge_fg)
        d1.text((418, cy + 30), desc_c, font=get_font(False, 23), fill=(31, 51, 56, 255))
        cy += 100

    draw_brand_footer_bar(d1, dark_theme=False)
    p1.save(IG_DIR / "post-01-agenda-renovacoes-extintores.png", "PNG")

    # 3. Post 02 — Como Funciona em 3 Passos (1080x1080)
    p2 = Image.new("RGBA", (1080, 1080), (12, 55, 62, 255))
    d2 = ImageDraw.Draw(p2)
    draw_brand_header_bar(d2, dark_theme=True)

    y = 176
    for line in [
        "Da planilha de extintores",
        "à proposta em PDF",
        "em 3 passos simples.",
    ]:
        d2.text((76, y), line, font=f_h1, fill=(255, 255, 255, 255))
        y += 68

    steps_p2 = [
        (
            "01",
            "Importe sua planilha CSV ou Excel (.xlsx)",
            "Organiza clientes e lotes de extintores (PQS ABC, CO2, H2O),",
            "barra duplicatas e sinaliza itens sem data para conferência.",
        ),
        (
            "02",
            "Priorize contatos pelo Radar de 30, 60 e 90 dias",
            "Saiba exatamente para qual síndico, condomínio ou empresa",
            "ligar em cada semana sem esquecer nenhuma renovação.",
        ),
        (
            "03",
            "Gere a Proposta Comercial em PDF com seus preços",
            "Acompanhe as 7 etapas do funil comercial e envie o orçamento",
            "pronto em PDF diretamente no WhatsApp ou por e-mail.",
        ),
    ]
    cy = 430
    for num, st_title, st_line1, st_line2 in steps_p2:
        d2.rounded_rectangle([76, cy, 1004, cy + 150], radius=22, fill=(18, 73, 81, 255), outline=(36, 118, 105, 255), width=2)
        d2.rounded_rectangle([102, cy + 28, 174, cy + 100], radius=18, fill=(156, 231, 201, 255))
        d2.text((120, cy + 44), num, font=get_font(True, 30), fill=(12, 55, 62, 255))
        d2.text((198, cy + 26), st_title, font=get_font(True, 28), fill=(255, 255, 255, 255))
        d2.text((198, cy + 72), st_line1, font=get_font(False, 22), fill=(205, 230, 223, 255))
        d2.text((198, cy + 102), st_line2, font=get_font(False, 22), fill=(205, 230, 223, 255))
        cy += 166

    draw_brand_footer_bar(d2, dark_theme=True)
    p2.save(IG_DIR / "post-02-como-funciona-3-passos.png", "PNG")

    # 4. Post 03 — Programa Piloto de 30 Dias (1080x1080)
    p3 = Image.new("RGBA", (1080, 1080), (238, 246, 242, 255))
    d3 = ImageDraw.Draw(p3)
    draw_brand_header_bar(d3, dark_theme=False)

    y = 176
    for line in [
        "Organize o comercial da sua",
        "empresa de extintores",
        "no Piloto de 30 Dias.",
    ]:
        d3.text((76, y), line, font=f_h1, fill=(16, 33, 38, 255))
        y += 68

    d3.text(
        (76, y + 8),
        "Apoio direto na importação inicial da sua planilha e uso real por 30 dias:",
        font=f_body,
        fill=(79, 100, 104, 255),
    )

    # Dois cards lado a lado: R$ 49 e R$ 79
    # Card 1: Inicial R$ 49
    d3.rounded_rectangle([76, 470, 524, 820], radius=24, fill=(255, 255, 255, 255), outline=(210, 225, 220, 255), width=2)
    d3.text((110, 504), "PLANO INICIAL", font=get_font(True, 22), fill=(13, 81, 72, 255))
    d3.text((110, 544), "R$ 49", font=get_font(True, 64), fill=(16, 33, 38, 255))
    d3.text((290, 574), "/mês", font=get_font(False, 28), fill=(79, 100, 104, 255))
    for idx, item in enumerate([
        "• Até 150 clientes ativos",
        "• Importação CSV e Excel",
        "• Radar 30 / 60 / 90 dias",
        "• Propostas em PDF ilimitadas",
    ]):
        d3.text((110, 640 + idx * 38), item, font=get_font(False, 23), fill=(31, 51, 56, 255))

    # Card 2: Profissional R$ 79
    d3.rounded_rectangle([556, 470, 1004, 820], radius=24, fill=(12, 55, 62, 255))
    d3.text((590, 504), "PLANO PROFISSIONAL", font=get_font(True, 22), fill=(156, 231, 201, 255))
    d3.text((590, 544), "R$ 79", font=get_font(True, 64), fill=(255, 255, 255, 255))
    d3.text((770, 574), "/mês", font=get_font(False, 28), fill=(191, 233, 217, 255))
    for idx, item in enumerate([
        "• Até 500 clientes ativos",
        "• Apoio na importação inicial",
        "• Funil comercial de 7 etapas",
        "• Sem fidelidade contratual",
    ]):
        d3.text((590, 640 + idx * 38), item, font=get_font(False, 23), fill=(235, 248, 243, 255))

    # Faixa de garantia operacional
    d3.rounded_rectangle([76, 844, 1004, 920], radius=16, fill=(216, 243, 232, 255))
    banner_txt = "Sem cobrança automática no site  •  Demonstração interativa aberta com dados fictícios"
    f_ban = get_font(True, 20)
    bw = d3.textlength(banner_txt, font=f_ban)
    d3.text(
        ((1080 - bw) / 2, 870),
        banner_txt,
        font=f_ban,
        fill=(13, 81, 72, 255),
    )

    draw_brand_footer_bar(d3, dark_theme=False)
    p3.save(IG_DIR / "post-03-piloto-30-dias.png", "PNG")

    # 5. 4 Capas de Destaques do Instagram (1080x1920)
    highlights = [
        ("destaque-01-como-funciona.png", "Como Funciona", "RADAR 30/60/90"),
        ("destaque-02-demonstracao.png", "Demonstração", "TESTE INTERATIVO"),
        ("destaque-03-planos-piloto.png", "Piloto 30 Dias", "R$ 49 / R$ 79"),
        ("destaque-04-duvidas.png", "Dúvidas", "FAQ SETORIAL"),
    ]
    for fname, title_h, badge_h in highlights:
        hl = Image.new("RGBA", (1080, 1920), (12, 55, 62, 255))
        dh = ImageDraw.Draw(hl)
        # Circulo central para recorte do Instagram
        dh.ellipse([320, 620, 760, 1060], fill=(17, 107, 89, 255), outline=(156, 231, 201, 255), width=8)
        # Icone oficial centralizado dentro do destaque
        draw_icon_symbol(dh, 410, 710, 260, (12, 55, 62, 255), (156, 231, 201, 255), (255, 255, 255, 255), (12, 55, 62, 255))
        # Titulo e subtitulo abaixo do circulo
        f_ht = get_font(True, 46)
        tw = dh.textlength(title_h, font=f_ht)
        dh.text(((1080 - tw) / 2, 1110), title_h, font=f_ht, fill=(255, 255, 255, 255))
        f_hb = get_font(True, 24)
        bw = dh.textlength(badge_h, font=f_hb)
        dh.rounded_rectangle([(1080 - bw) / 2 - 28, 1184, (1080 + bw) / 2 + 28, 1236], radius=26, fill=(18, 79, 69, 255))
        dh.text(((1080 - bw) / 2, 1196), badge_h, font=f_hb, fill=(156, 231, 201, 255))
        hl.save(IG_DIR / fname, "PNG")


if __name__ == "__main__":
    save_all_svgs()
    save_all_logo_pngs()
    generate_instagram_kit()
    print("Pacote de identidade visual e Instagram atualizado com sucesso.")
