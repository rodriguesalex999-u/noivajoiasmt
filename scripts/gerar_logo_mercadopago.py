"""Gera o logotipo da Noiva Joias MT para o painel do Mercado Pago.

O Mercado Pago pede JPG ou PNG de até 1 MB. O desenho é o mesmo do favicon
do site (dois anéis + losango), para a identidade não ficar dividida entre
o site e o painel de pagamentos.

Regra do projeto (AGENTS.md 4c): nada de marca de terceiro na imagem.
Este arquivo desenha a marca da Noiva Joias do zero.
"""
from PIL import Image, ImageDraw

LADO = 512          # PNG quadrado, bem acima do mínimo do painel
ESCALA = LADO / 64  # o favicon foi desenhado numa grade de 64

FUNDO = (11, 9, 7, 255)      # --bg do site
DOURADO = (201, 167, 91, 255)  # --gold
DOURADO_CLARO = (240, 220, 164, 255)  # --gold-light


def s(v):
    """Converte da grade de 64 para os pixels reais."""
    return v * ESCALA


img = Image.new("RGBA", (LADO, LADO), FUNDO)
d = ImageDraw.Draw(img)

# cantos arredondados (rx=14 na grade de 64)
raio = s(14)
d.rounded_rectangle([0, 0, LADO - 1, LADO - 1], radius=raio, fill=FUNDO)

# dois anéis: cx=24 e cx=40, cy=40, r=14, traço 3.4 na grade
espessura = max(1, int(round(s(3.4))))
for cx in (24, 40):
    caixa = [s(cx - 14), s(40 - 14), s(cx + 14), s(40 + 14)]
    d.ellipse(caixa, outline=DOURADO, width=espessura)

# losango no topo: M32 6 l7 8 -7 8 -7 -8 z
losango = [
    (s(32), s(6)),
    (s(39), s(14)),
    (s(32), s(22)),
    (s(25), s(14)),
]
d.polygon(losango, fill=DOURADO_CLARO)

saida = r"C:\Users\rodri\OneDrive\Documents\NOIVA_JOIAS_MT\logo-mercado-pago.png"
img.save(saida, "PNG", optimize=True)

import os
print("gerado:", saida)
print("tamanho:", img.size, "| bytes:", os.path.getsize(saida))
print("dentro do limite de 1 MB:", os.path.getsize(saida) < 1024 * 1024)