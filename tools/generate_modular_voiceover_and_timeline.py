"""
Motor de Produção Audiovisual Profissional do RenovaExt:
1. Gera 10 takes de locução modular em PT-BR (edge-tts pt-BR-AntonioNeural) em media/projeto_edicao/audio_voice/
2. Gera trilha ambiente sutil em media/projeto_edicao/audio_music/
3. Exporta arquivos de intercâmbio de timeline:
   - media/projeto_edicao/renovaext_timeline.fcpxml (DaVinci Resolve / CapCut / Final Cut Pro)
   - media/projeto_edicao/renovaext_timeline.edl (Adobe Premiere / DaVinci CMX 3600)
4. Monta o vídeo final MP4 Full HD (1920x1080 @ 30fps H.264 + AAC -16 LUFS) a partir das gravações reais em public/video-demo-renovaext.mp4
5. Gera legendas sincronizadas em public/legendas-demo-ptbr.vtt e thumbnail em public/video-thumbnail.png
"""

import asyncio
import json
import math
import os
import shutil
import subprocess
from pathlib import Path

import edge_tts
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
MEDIA_DIR = ROOT / "media"
RAW_DIR = MEDIA_DIR / "gravacoes_brutas"
PROJ_DIR = MEDIA_DIR / "projeto_edicao"
VOICE_DIR = PROJ_DIR / "audio_voice"
MUSIC_DIR = PROJ_DIR / "audio_music"
GRAPHICS_DIR = PROJ_DIR / "graphics"
PUBLIC_DIR = ROOT / "public"
TMP_DIR = ROOT / ".tmp" / "timeline_build"

for d in [RAW_DIR, PROJ_DIR, VOICE_DIR, MUSIC_DIR, GRAPHICS_DIR, PUBLIC_DIR, TMP_DIR]:
    d.mkdir(parents=True, exist_ok=True)

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
VOICE_MODEL = "pt-BR-AntonioNeural"

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REGULAR = "C:/Windows/Fonts/segoeui.ttf"


def get_font(bold: bool, size: int) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if bold else FONT_REGULAR
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


# Definição dos 10 Takes Modulares
TAKES = [
    {
        "id": "take_01_problema",
        "clip_name": "clip_01_abertura_demo.mp4",
        "title": "1. O Problema das Planilhas Espalhadas",
        "tag": "PAINEL DA CARTEIRA • VISÃO GERAL",
        "text": (
            "Se a sua empresa de manutenção de extintores ainda depende de planilhas para acompanhar os clientes, "
            "você sabe que sempre tem renovação se perdendo pelo caminho."
        ),
        "rate": "-3%",
        "pitch": "-1Hz",
    },
    {
        "id": "take_02_solucao",
        "clip_name": "clip_02_importacao_planilha.mp4",
        "title": "2. Importação Sem Trocar de Sistema",
        "tag": "IMPORTAÇÃO CSV E EXCEL (.XLSX)",
        "text": (
            "O RenovaExt organiza tudo isso sem você precisar trocar o sistema que já usa. "
            "Você traz a sua planilha atual de clientes e extintores direto para cá."
        ),
        "rate": "-2%",
        "pitch": "-1Hz",
    },
    {
        "id": "take_03_mapeamento",
        "clip_name": "clip_03_mapeamento_colunas.mp4",
        "title": "3. Mapeamento Automático de Colunas",
        "tag": "MAPEAMENTO TÉCNICO DE EQUIPAMENTOS",
        "text": (
            "O assistente reconhece o nome do condomínio, a quantidade e o tipo de extintor. "
            "Você só confere as colunas em poucos segundos."
        ),
        "rate": "-2%",
        "pitch": "-1Hz",
    },
    {
        "id": "take_04_carteira",
        "clip_name": "clip_04_carteira_clientes.mp4",
        "title": "4. Validação e Carteira Organizada",
        "tag": "CONFERÊNCIA TÉCNICA E SEM DUPLICATAS",
        "text": (
            "Registros sem data ou com erro de digitação são marcados para conferência técnica. "
            "O sistema nunca inventa prazos nem cria cadastros duplicados."
        ),
        "rate": "-2%",
        "pitch": "-1Hz",
    },
    {
        "id": "take_05_radar",
        "clip_name": "clip_05_radar_e_filtros.mp4",
        "title": "5. Radar de Vencimentos 30, 60 e 90 Dias",
        "tag": "RADAR COMERCIAL DE VENCIMENTOS",
        "text": (
            "No painel, o Radar divide sua carteira por urgência: quem já venceu e quem vence em 30, 60 ou 90 dias. "
            "Sua equipe abre a tela e já sabe para quem ligar hoje."
        ),
        "rate": "-3%",
        "pitch": "-1Hz",
    },
    {
        "id": "take_06_ficha",
        "clip_name": "clip_06_ficha_cliente.mp4",
        "title": "6. Ficha Cadastral e Inventário de Extintores",
        "tag": "FICHA DO CLIENTE E CONTATO",
        "text": (
            "Ao abrir o cliente, você vê o contato do síndico, o telefone e todos os extintores cadastrados daquele condomínio."
        ),
        "rate": "-2%",
        "pitch": "-1Hz",
    },
    {
        "id": "take_07_oportunidade",
        "clip_name": "clip_07_criacao_oportunidade.mp4",
        "title": "7. Funil Comercial de 7 Etapas",
        "tag": "HISTÓRICO E GESTÃO DO FUNIL",
        "text": (
            "Você atualiza a etapa da negociação, anota o retorno da conversa no WhatsApp e não deixa nenhum orçamento esquecido."
        ),
        "rate": "-2%",
        "pitch": "-1Hz",
    },
    {
        "id": "take_08_precos",
        "clip_name": "clip_08_preenchimento_precos.mp4",
        "title": "8. Cotação com os Preços da Sua Oficina",
        "tag": "PREÇOS PRATICADOS PELA OFICINA",
        "text": (
            "Para cotar, é só digitar os valores que a sua oficina pratica. "
            "O RenovaExt calcula o subtotal e o total da proposta na hora."
        ),
        "rate": "-2%",
        "pitch": "-1Hz",
    },
    {
        "id": "take_09_pdf",
        "clip_name": "clip_09_geracao_abertura_pdf.mp4",
        "title": "9. Proposta Comercial em PDF com Normas ABNT",
        "tag": "PROPOSTA COMERCIAL EM PDF",
        "text": (
            "Com um clique, sua proposta em PDF fica pronta, com número oficial, seus dados e nota técnica das normas vigentes, "
            "pronta para enviar ao síndico."
        ),
        "rate": "-2%",
        "pitch": "-1Hz",
    },
    {
        "id": "take_10_encerramento",
        "clip_name": None,  # Tela gráfica final com logo e chamada
        "title": "10. Chamada Final e Piloto de 30 Dias",
        "tag": "DEMONSTRAÇÃO E PILOTO DE 30 DIAS",
        "text": (
            "Teste agora mesmo a demonstração interativa ou solicite o seu piloto comercial de 30 dias."
        ),
        "rate": "-3%",
        "pitch": "-1Hz",
    },
]


async def generate_voice_takes():
    print("Gerando takes modulares de locução em PT-BR...")
    for idx, t in enumerate(TAKES):
        out_mp3 = VOICE_DIR / f"{t['id']}.mp3"
        comm = edge_tts.Communicate(t["text"], VOICE_MODEL, rate=t["rate"], pitch=t["pitch"])
        await comm.save(str(out_mp3))
        print(f"✓ Locução {t['id']}.mp3 gerada")


def get_media_duration_sec(media_path: Path) -> float:
    cmd = [
        FFMPEG_EXE,
        "-i", str(media_path),
    ]
    res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.DEVNULL, text=True, encoding="utf-8", errors="ignore")
    for line in res.stderr.splitlines():
        if "Duration:" in line:
            # Duration: 00:00:08.45, start: ...
            part = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = part.split(":")
            return float(h) * 3600 + float(m) * 60 + float(s)
    return 8.0


def generate_ambient_music(total_seconds: float):
    print("Gerando trilha harmônica ambiente masterizada (-26 dB)...")
    out_wav = MUSIC_DIR / "trilha_harmonica_ambiente.wav"
    out_mp3 = MUSIC_DIR / "trilha_harmonica_ambiente.mp3"

    sample_rate = 44100
    n_samples = int(sample_rate * (total_seconds + 5))
    t = np.linspace(0, total_seconds + 5, n_samples, endpoint=False)

    # Harmonia calma e corporativa (acordes em Ré Maior / Si menor com modulação lenta)
    # Frequências fundamentais de D3 (146.8 Hz), F#3 (185 Hz), A3 (220 Hz), D4 (293.6 Hz), E4 (329.6 Hz)
    sig = (
        0.045 * np.sin(2 * np.pi * 146.83 * t) +
        0.035 * np.sin(2 * np.pi * 185.00 * t) +
        0.035 * np.sin(2 * np.pi * 220.00 * t) +
        0.020 * np.sin(2 * np.pi * 293.66 * t) +
        0.015 * np.sin(2 * np.pi * 440.00 * t)
    )
    # LFO suave de 0.08 Hz (respiração harmônica suave)
    lfo = 0.75 + 0.25 * np.sin(2 * np.pi * 0.08 * t)
    sig = sig * lfo

    # Fade in de 2s e fade out de 3s
    fade_in_n = int(2.0 * sample_rate)
    fade_out_n = int(3.0 * sample_rate)
    sig[:fade_in_n] *= np.linspace(0, 1, fade_in_n)
    sig[-fade_out_n:] *= np.linspace(1, 0, fade_out_n)

    # 16-bit PCM estéreo
    audio_int16 = (sig * 32767).astype(np.int16)
    audio_stereo = np.column_stack((audio_int16, audio_int16))

    import wave
    with wave.open(str(out_wav), "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_stereo.tobytes())

    # Converte para MP3 160kbps
    cmd = [
        FFMPEG_EXE, "-y",
        "-i", str(out_wav),
        "-b:a", "160k",
        str(out_mp3)
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    out_wav.unlink(missing_ok=True)
    print(f"✓ Trilha musical gerada: {out_mp3.name}")


def generate_end_card():
    print("Gerando tela final de conversão (End Card 1920x1080)...")
    img = Image.new("RGBA", (1920, 1080), (12, 55, 62, 255))
    draw = ImageDraw.Draw(img)

    # Fundo estilizado com gradiente discreto
    for y in range(1080):
        alpha = int(255 * (1 - y / 2500))
        draw.line([(0, y), (1920, y)], fill=(12, 55, 62, alpha))

    # Icone centralizado
    icon_src = ROOT / "public" / "brand" / "renovaext-icone-quadrado.png"
    if icon_src.exists():
        icon_img = Image.open(icon_src).convert("RGBA").resize((180, 180), Image.Resampling.LANCZOS)
        img.paste(icon_img, (870, 160), icon_img)

    # Título da Marca
    f_brand = get_font(True, 72)
    w_brand = draw.textlength("RenovaExt", font=f_brand)
    draw.text(((1920 - w_brand) / 2, 370), "Renova", font=f_brand, fill=(255, 255, 255, 255))
    w_ren = draw.textlength("Renova", font=f_brand)
    draw.text(((1920 - w_brand) / 2 + w_ren, 370), "Ext", font=f_brand, fill=(156, 231, 201, 255))

    # Subtítulo de posicionamento
    f_sub = get_font(True, 26)
    sub_txt = "AGENDA COMERCIAL DE RENOVAÇÕES PARA EMPRESAS DE EXTINTORES DE INCÊNDIO"
    w_sub = draw.textlength(sub_txt, font=f_sub)
    draw.text(((1920 - w_sub) / 2, 465), sub_txt, font=f_sub, fill=(191, 233, 217, 255))

    # Dois cartões dos planos de piloto
    # Card 1: R$ 49
    draw.rounded_rectangle([380, 540, 920, 780], radius=24, fill=(247, 250, 248, 255))
    draw.text((420, 570), "PLANO INICIAL", font=get_font(True, 20), fill=(13, 81, 72, 255))
    draw.text((420, 605), "R$ 49", font=get_font(True, 56), fill=(16, 33, 38, 255))
    draw.text((580, 630), "/mês (Piloto de 30 dias)", font=get_font(False, 22), fill=(79, 100, 104, 255))
    draw.text((420, 685), "• Até 150 clientes na carteira", font=get_font(False, 20), fill=(31, 51, 56, 255))
    draw.text((420, 715), "• Radar 30 / 60 / 90 dias e Propostas PDF", font=get_font(False, 20), fill=(31, 51, 56, 255))

    # Card 2: R$ 79
    draw.rounded_rectangle([960, 540, 1540, 780], radius=24, fill=(18, 73, 81, 255), outline=(156, 231, 201, 255), width=2)
    draw.text((1000, 570), "PLANO PROFISSIONAL", font=get_font(True, 20), fill=(156, 231, 201, 255))
    draw.text((1000, 605), "R$ 79", font=get_font(True, 56), fill=(255, 255, 255, 255))
    draw.text((1160, 630), "/mês (Piloto de 30 dias)", font=get_font(False, 22), fill=(191, 233, 217, 255))
    draw.text((1000, 685), "• Até 500 clientes na carteira", font=get_font(False, 20), fill=(235, 248, 243, 255))
    draw.text((1000, 715), "• Suporte na importação e sem fidelidade", font=get_font(False, 20), fill=(235, 248, 243, 255))

    # Faixa inferior de chamada
    draw.rounded_rectangle([380, 820, 1540, 920], radius=20, fill=(17, 107, 89, 255))
    call_txt = "Teste a demonstração interativa ou solicite o seu piloto de 30 dias"
    f_call = get_font(True, 28)
    w_call = draw.textlength(call_txt, font=f_call)
    draw.text(((1920 - w_call) / 2, 852), call_txt, font=f_call, fill=(255, 255, 255, 255))

    # Rodapé institucional
    foot_txt = "renovaext.com.br • Sistema comercial sem troca de ERP fiscal"
    f_foot = get_font(False, 20)
    w_foot = draw.textlength(foot_txt, font=f_foot)
    draw.text(((1920 - w_foot) / 2, 980), foot_txt, font=f_foot, fill=(156, 231, 201, 255))

    out_card = GRAPHICS_DIR / "screen_10_encerramento.png"
    img.save(out_card, "PNG")
    print(f"✓ End Card gerado: {out_card.name}")


def export_timeline_exchange_files(scenes_durations):
    print("Gerando arquivos de intercâmbio de timeline (FCPXML e EDL)...")

    # 1. Final Cut Pro XML (FCPXML 1.8) compatível com DaVinci Resolve e CapCut
    total_frames = int(sum(scenes_durations) * 30)
    fcpxml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.8">
  <resources>
    <format id="r1" name="FFVideoFormat1080p30" frameDuration="1/30s" width="1920" height="1080"/>
  </resources>
  <library>
    <event name="RenovaExt Video Demonstrativo Oficial">
      <project name="RenovaExt Demo 1080p">
        <sequence format="r1" duration="{total_frames}/30s">
          <spine>
"""
    curr_frame = 0
    for idx, (t, dur) in enumerate(zip(TAKES, scenes_durations)):
        frames = int(dur * 30)
        cname = t["clip_name"] or "screen_10_encerramento.png"
        fcpxml += f"""            <!-- Cena {idx+1}: {t['title']} -->
            <video name="{cname}" offset="{curr_frame}/30s" duration="{frames}/30s" start="0s">
              <audio lane="-1" offset="{curr_frame}/30s" duration="{frames}/30s" name="{t['id']}.mp3"/>
            </video>
"""
        curr_frame += frames

    fcpxml += """          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
"""
    (PROJ_DIR / "renovaext_timeline.fcpxml").write_text(fcpxml, encoding="utf-8")

    # 2. EDL CMX 3600 (Adobe Premiere / DaVinci Resolve)
    edl = "TITLE: RENOVAEXT_DEMO_TIMELINE\nFCM: NON-DROP FRAME\n\n"
    curr_s = 0.0
    for idx, (t, dur) in enumerate(zip(TAKES, scenes_durations)):
        cname = (t["clip_name"] or "END_CARD")[:8].upper()
        in_tc = "00:00:00:00"
        out_f = int(dur * 30)
        out_tc = f"00:00:{int(dur):02d}:{int(out_f % 30):02d}"
        rec_in_f = int(curr_s * 30)
        rec_in_tc = f"00:00:{int(curr_s):02d}:{int(rec_in_f % 30):02d}"
        rec_out_f = int((curr_s + dur) * 30)
        rec_out_tc = f"00:00:{int(curr_s + dur):02d}:{int(rec_out_f % 30):02d}"
        curr_s += dur

        edl += f"{idx+1:03d}  AX       V     C        {in_tc} {out_tc} {rec_in_tc} {rec_out_tc}\n"
        edl += f"* FROM CLIP NAME: {t['clip_name'] or 'screen_10_encerramento.png'}\n"
        edl += f"* COMMENT: {t['title']}\n\n"

    (PROJ_DIR / "renovaext_timeline.edl").write_text(edl, encoding="utf-8")
    print("✓ FCPXML e EDL gerados em media/projeto_edicao/")


def build_final_video_master(scenes_durations):
    print("Montando vídeo final Full HD masterizado (H.264 + AAC -16 LUFS)...")
    cuts_dir = TMP_DIR / "cuts"
    if cuts_dir.exists():
        shutil.rmtree(cuts_dir)
    cuts_dir.mkdir(parents=True, exist_ok=True)

    # 1. Cria cada segmento de vídeo com a duração exata do take de locução + lower-third sutil
    v_segments = []
    for idx, (t, dur) in enumerate(zip(TAKES, scenes_durations)):
        seg_mp4 = cuts_dir / f"scene_{idx+1:02d}.mp4"
        tag_text = t["tag"].replace("'", "")

        if t["clip_name"]:
            raw_clip = RAW_DIR / t["clip_name"]
            # Loop/trim para preencher dur segundos @ 30fps
            cmd = [
                FFMPEG_EXE, "-y",
                "-stream_loop", "1",
                "-i", str(raw_clip),
                "-t", f"{dur:.2f}",
                "-vf", (
                    f"fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,"
                    f"drawbox=y=36:x=36:w=480:h=44:color=#0c373e@0.92:t=fill,"
                    f"drawtext=text='{tag_text}':fontcolor=white:fontsize=18:x=56:y=50:font='Segoe UI'"
                ),
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "18",
                "-pix_fmt", "yuv420p",
                "-an",
                str(seg_mp4)
            ]
        else:
            # End card estático de 7 segundos
            end_card_img = GRAPHICS_DIR / "screen_10_encerramento.png"
            cmd = [
                FFMPEG_EXE, "-y",
                "-loop", "1",
                "-i", str(end_card_img),
                "-t", f"{dur:.2f}",
                "-vf", "fps=30,scale=1920:1080",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "18",
                "-pix_fmt", "yuv420p",
                "-an",
                str(seg_mp4)
            ]

        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        v_segments.append(seg_mp4)
        print(f"✓ Cena {idx+1:02d} processada ({dur:.2f}s)")

    # 2. Concatena os clipes de vídeo em um stream contínuo
    concat_txt = TMP_DIR / "concat_video.txt"
    with open(concat_txt, "w", encoding="utf-8") as f:
        for s in v_segments:
            f.write(f"file '{s.resolve().as_posix()}'\n")

    video_only = TMP_DIR / "video_stream.mp4"
    cmd_cat = [
        FFMPEG_EXE, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_txt),
        "-c", "copy",
        str(video_only)
    ]
    subprocess.run(cmd_cat, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 3. Concatena os takes de áudio de voz com pausas suaves entre eles
    voice_segments = []
    concat_voice_txt = TMP_DIR / "concat_voice.txt"
    with open(concat_voice_txt, "w", encoding="utf-8") as f:
        for idx, (t, dur) in enumerate(zip(TAKES, scenes_durations)):
            src_voice = VOICE_DIR / f"{t['id']}.mp3"
            v_dur = get_media_duration_sec(src_voice)
            pad_dur = max(0.2, dur - v_dur)
            # Adiciona silêncio no final do áudio para sincronizar com a cena
            padded_voice = cuts_dir / f"voice_pad_{idx+1:02d}.wav"
            cmd_pad = [
                FFMPEG_EXE, "-y",
                "-i", str(src_voice),
                "-af", f"apad=pad_dur={pad_dur:.2f}",
                "-t", f"{dur:.2f}",
                str(padded_voice)
            ]
            subprocess.run(cmd_pad, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            f.write(f"file '{padded_voice.resolve().as_posix()}'\n")

    voice_only = TMP_DIR / "voice_stream.wav"
    subprocess.run([
        FFMPEG_EXE, "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(concat_voice_txt),
        "-c:a", "pcm_s16le",
        str(voice_only)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 4. Mixagem Broadcast Final: Voz com prioridade + Música ambiente atenuada (-26 dB) + Normalização EBU R128 (-16 LUFS)
    music_src = MUSIC_DIR / "trilha_harmonica_ambiente.mp3"
    final_mp4 = PUBLIC_DIR / "video-demo-renovaext.mp4"
    total_dur = sum(scenes_durations)

    filter_complex = (
        "[0:v]copy[v];"
        "[1:a]volume=1.0[voice];"
        f"[2:a]volume=0.065,atrim=0:{total_dur:.2f}[music];"
        "[voice][music]amix=inputs=2:duration=first:dropout_transition=2,"
        "loudnorm=I=-16:TP=-1.0:LRA=7[a]"
    )

    cmd_mix = [
        FFMPEG_EXE, "-y",
        "-i", str(video_only),
        "-i", str(voice_only),
        "-i", str(music_src),
        "-filter_complex", filter_complex,
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-c:a", "aac",
        "-b:a", "160k",
        "-movflags", "+faststart",
        str(final_mp4)
    ]
    subprocess.run(cmd_mix, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"✓ VÍDEO FINAL GERADO: {final_mp4.name} ({final_mp4.stat().st_size} bytes, {total_dur:.1f}s)")


def generate_subtitles_and_thumbnail(scenes_durations):
    print("Gerando legendas WebVTT sincronizadas e Thumbnail...")

    # 1. Legendas WebVTT
    vtt_lines = ["WEBVTT", "Kind: captions", "Language: pt-BR", ""]
    curr = 0.0

    def fmt_vtt(sec: float) -> str:
        mm = int(sec // 60)
        ss = int(sec % 60)
        ms = int((sec % 1) * 1000)
        return f"{mm:02d}:{ss:02d}.{ms:03d}"

    for idx, (t, dur) in enumerate(zip(TAKES, scenes_durations)):
        start_ts = fmt_vtt(curr)
        end_ts = fmt_vtt(curr + dur - 0.2)
        vtt_lines.append(f"{idx+1}")
        vtt_lines.append(f"{start_ts} --> {end_ts}")
        vtt_lines.append(t["text"])
        vtt_lines.append("")
        curr += dur

    vtt_path = PUBLIC_DIR / "legendas-demo-ptbr.vtt"
    vtt_path.write_text("\n".join(vtt_lines), encoding="utf-8")
    print(f"✓ Legendas WebVTT: {vtt_path.name}")

    # 2. Thumbnail Profissional
    thumb_path = PUBLIC_DIR / "video-thumbnail.png"
    # Copia o frame da tela 1 real como base e sobrepõe badge profissional e botão de play
    t1_shot = RAW_DIR / "clip_01_abertura_demo.mp4"
    frame_tmp = TMP_DIR / "thumb_frame.png"
    subprocess.run([
        FFMPEG_EXE, "-y",
        "-ss", "00:00:02.500",
        "-i", str(t1_shot),
        "-vframes", "1",
        str(frame_tmp)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    img_th = Image.open(frame_tmp).convert("RGBA")
    draw_th = ImageDraw.Draw(img_th)

    # Overlay escuro suave
    draw_th.rectangle([0, 0, 1920, 1080], fill=(12, 55, 62, 110))

    # Badge de topo
    draw_th.rounded_rectangle([720, 80, 1200, 140], radius=30, fill=(13, 81, 72, 240))
    b_txt = "DEMONSTRAÇÃO REAL DO APLICATIVO"
    f_b = get_font(True, 20)
    wb = draw_th.textlength(b_txt, font=f_b)
    draw_th.text(((1920 - wb)/2, 98), b_txt, font=f_b, fill=(255, 255, 255, 255))

    # Botão de Play central
    cx, cy = 960, 540
    draw_th.ellipse([cx - 75, cy - 75, cx + 75, cy + 75], fill=(156, 231, 201, 240), outline=(255, 255, 255, 255), width=4)
    draw_th.polygon([(cx - 20, cy - 35), (cx - 20, cy + 35), (cx + 38, cy)], fill=(12, 55, 62, 255))

    # Faixa inferior
    draw_th.rounded_rectangle([360, 920, 1560, 1010], radius=24, fill=(12, 55, 62, 240), outline=(156, 231, 201, 255), width=2)
    f_title = get_font(True, 30)
    th_title = "RenovaExt • Da Planilha de Extintores à Proposta em PDF"
    wt = draw_th.textlength(th_title, font=f_title)
    draw_th.text(((1920 - wt)/2, 946), th_title, font=f_title, fill=(255, 255, 255, 255))

    img_th.save(thumb_path, "PNG")
    print(f"✓ Thumbnail: {thumb_path.name}")


async def main():
    await generate_voice_takes()

    # Mede as durações de cada take de áudio e calcula a duração de cada cena
    scenes_durations = []
    for t in TAKES:
        voice_file = VOICE_DIR / f"{t['id']}.mp3"
        dur = get_media_duration_sec(voice_file)
        # Adiciona respiro natural de 0.6s
        scene_dur = max(6.0, dur + 0.6)
        scenes_durations.append(scene_dur)

    total_duration = sum(scenes_durations)
    print(f"Duração total estimada: {total_duration:.1f} segundos ({total_duration/60:.2f} min)")

    generate_ambient_music(total_duration)
    generate_end_card()
    export_timeline_exchange_files(scenes_durations)
    build_final_video_master(scenes_durations)
    generate_subtitles_and_thumbnail(scenes_durations)
    print("\n🎉 PIPELINE PROFISSIONAL CONCLUÍDO COM SUCESSO!")


if __name__ == "__main__":
    asyncio.run(main())
