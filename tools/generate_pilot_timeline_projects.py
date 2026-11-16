import os

os.makedirs('media/projeto_edicao', exist_ok=True)
os.makedirs('public/projeto_edicao', exist_ok=True)

# 1. CMX 3600 EDL para a Cena-Piloto
edl_content = """TITLE: RENOVAEXT_CENA_PILOTO_17S
FCM: NON-DROP FRAME

001  CLIP05   V     C        00:00:00:00 00:00:08:18 00:00:00:00 00:00:08:18
* FROM CLIP: media/projeto_edicao/video_raw/clip_05_radar_e_filtros.mp4
* COMMENT: Radar comercial de vencimentos com clique em aba 30 dias

002  CLIP08   V     D 012    00:00:00:00 00:00:08:18 00:00:08:06 00:00:16:24
* FROM CLIP: media/projeto_edicao/video_raw/clip_08_preenchimento_precos.mp4
* COMMENT: Digitacao verdadeira de precos unitarios e calculo da proposta

003  VOICE_A  A     C        00:00:00:00 00:00:16:20 00:00:00:00 00:00:16:20
* FROM CLIP: public/amostras_voz/amostra_A_masculina_faber.mp3
* COMMENT: Locucao tratada - EBU R128 (-16 LUFS)

004  TRILHA   A2    C        00:00:00:00 00:00:16:24 00:00:00:00 00:00:16:24
* FROM CLIP: media/projeto_edicao/audio_music/trilha_harmonica_ambiente.mp3
* COMMENT: Trilha harmonica suave em -26 dB
"""

with open('media/projeto_edicao/cena_piloto_timeline.edl', 'w', encoding='utf-8') as f:
    f.write(edl_content)
with open('public/projeto_edicao/cena_piloto_timeline.edl', 'w', encoding='utf-8') as f:
    f.write(edl_content)

# 2. Final Cut Pro XML (FCPXML 1.8) compatível com DaVinci Resolve e CapCut
fcpxml_content = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.8">
    <resources>
        <format id="r1" name="FFVideoFormat1080p30" frameDuration="1001/30000s" width="1920" height="1080"/>
        <asset id="a1" name="clip_05_radar_e_filtros" src="file:///media/projeto_edicao/video_raw/clip_05_radar_e_filtros.mp4" start="0s" duration="332/30s" hasVideo="1"/>
        <asset id="a2" name="clip_08_preenchimento_precos" src="file:///media/projeto_edicao/video_raw/clip_08_preenchimento_precos.mp4" start="0s" duration="232/30s" hasVideo="1"/>
        <asset id="a3" name="amostra_A_masculina_faber" src="file:///public/amostras_voz/amostra_A_masculina_faber.mp3" start="0s" duration="500/30s" hasAudio="1"/>
        <asset id="a4" name="trilha_harmonica_ambiente" src="file:///media/projeto_edicao/audio_music/trilha_harmonica_ambiente.mp3" start="0s" duration="500/30s" hasAudio="1"/>
    </resources>
    <library>
        <event name="RenovaExt_Cena_Piloto">
            <project name="RenovaExt_Cena_Piloto_17s">
                <sequence format="r1" duration="501/30s">
                    <spine>
                        <clip name="Radar Comercial" offset="0s" duration="258/30s" format="r1">
                            <video ref="a1" offset="0s" duration="258/30s"/>
                        </clip>
                        <clip name="Proposta com Digitacao Real" offset="258/30s" duration="243/30s" format="r1">
                            <video ref="a2" offset="0s" duration="243/30s"/>
                        </clip>
                    </spine>
                </sequence>
            </project>
        </event>
    </library>
</fcpxml>
"""

with open('media/projeto_edicao/cena_piloto_timeline.fcpxml', 'w', encoding='utf-8') as f:
    f.write(fcpxml_content)
with open('public/projeto_edicao/cena_piloto_timeline.fcpxml', 'w', encoding='utf-8') as f:
    f.write(fcpxml_content)

print('Generated cena_piloto_timeline.edl and cena_piloto_timeline.fcpxml')
