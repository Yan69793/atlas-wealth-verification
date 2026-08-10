# -*- coding: utf-8 -*-
"""gera-card-social.py — desenha o cartao de previa dos links comerciais.

Saida: docs/go-to-market/atlas-card.png, 1200x630, referenciado no og:image
da apresentacao e do demo.

Por que desenhar em vez de recortar uma tela do sistema: captura de tela do
ATLAS ja carregou dado real de cliente antes, e a varredura final do
build-deploy.mjs existe justamente para barrar imagem na publicacao. O cartao
e a unica imagem liberada, entao ela tem de nascer de codigo, sem passar por
nenhuma tela com dado.

Paleta e tipografia sao as mesmas da apresentacao
(docs/go-to-market/apresentacao-atlas.html), modo claro.

Uso:
  python scripts/gera-card-social.py
  python scripts/gera-card-social.py <caminho-de-saida.png>

Depende de Pillow e das fontes do Windows (Georgia, Segoe UI, Consolas).
Rodar de novo so e necessario quando a mensagem do cartao mudar. O PNG fica
versionado, entao o build nao depende deste script.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
S = 3  # supersampling: desenha 3x e reduz, para o texto nao sair serrilhado

PAPEL = (251, 250, 248)
TINTA = (18, 24, 31)
MARINHO = (5, 48, 95)
OURO = (168, 136, 30)
CINZA = (110, 106, 99)
FIO = (221, 215, 205)
VERDE = (26, 107, 58)
AMBAR = (139, 90, 0)
VERMELHO = (139, 26, 26)

FONTES = "C:/Windows/Fonts/"

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PADRAO = os.path.join(RAIZ, "docs", "go-to-market", "atlas-card.png")


def fonte(nome, tamanho):
    return ImageFont.truetype(FONTES + nome, tamanho * S)


def largura(d, texto, f, tracking=0):
    """Largura do texto ja considerando o espacamento entre letras."""
    if not tracking:
        return d.textlength(texto, font=f)
    return sum(d.textlength(c, font=f) for c in texto) + tracking * S * (len(texto) - 1)


def escreve(d, xy, texto, f, cor, tracking=0, a_direita=False):
    """Escreve com tracking opcional. Pillow nao tem letter-spacing, entao com
    tracking cada caractere e desenhado na mao."""
    x, y = xy
    if a_direita:
        x -= largura(d, texto, f, tracking)
    if not tracking:
        d.text((x, y), texto, font=f, fill=cor)
        return
    for c in texto:
        d.text((x, y), c, font=f, fill=cor)
        x += d.textlength(c, font=f) + tracking * S


def mistura(cor, peso):
    """Aproxima a cor do papel. Usado nas pilulas de status, que na tela sao
    a mesma cor com transparencia."""
    return tuple(int(c + (PAPEL[i] - c) * peso) for i, c in enumerate(cor))


def desenha():
    img = Image.new("RGB", (W * S, H * S), PAPEL)
    d = ImageDraw.Draw(img)

    # Faixa superior: marinho ate 62% da largura, ouro no resto.
    corte = int(W * 0.62)
    d.rectangle([0, 0, corte * S, 8 * S], fill=MARINHO)
    d.rectangle([corte * S, 0, W * S, 8 * S], fill=OURO)

    # Selo da marca: o mesmo escudo com visto que fica na barra lateral do app.
    d.rounded_rectangle([72 * S, 60 * S, 126 * S, 114 * S], radius=12 * S,
                        outline=MARINHO, width=2 * S)
    cx, cy, r = 99 * S, 87 * S, 13.5 * S
    d.polygon(
        [
            (cx, cy - r),
            (cx + r * 0.78, cy - r * 0.62),
            (cx + r * 0.78, cy + r * 0.12),
            (cx, cy + r),
            (cx - r * 0.78, cy + r * 0.12),
            (cx - r * 0.78, cy - r * 0.62),
        ],
        outline=MARINHO, width=int(1.9 * S),
    )
    d.line(
        [(cx - r * 0.36, cy), (cx - r * 0.08, cy + r * 0.28), (cx + r * 0.40, cy - r * 0.26)],
        fill=MARINHO, width=int(2.1 * S), joint="curve",
    )

    escreve(d, (144 * S, 60 * S), "ATLAS", fonte("georgia.ttf", 40), MARINHO, tracking=6.4)
    escreve(d, (146 * S, 111 * S), "VERIFICAÇÃO MENSAL DE CARTEIRAS",
            fonte("segoeui.ttf", 15), CINZA, tracking=2.0)

    # Manchete: a mesma frase que abre a apresentacao.
    g54 = fonte("georgia.ttf", 54)
    escreve(d, (72 * S, 246 * S), "O erro que escapa chega ao cliente", g54, TINTA)
    x = 72 * S
    escreve(d, (x, 311 * S), "com a ", g54, TINTA)
    x += largura(d, "com a ", g54)
    escreve(d, (x, 311 * S), "assinatura da sua casa", g54, MARINHO)
    x += largura(d, "assinatura da sua casa", g54)
    escreve(d, (x, 311 * S), ".", g54, TINTA)

    s21 = fonte("segoeui.ttf", 21)
    escreve(d, (72 * S, 404 * S),
            "Concilia o patrimônio de todas as carteiras do mês, aponta o que não fecha", s21, CINZA)
    escreve(d, (72 * S, 435 * S),
            "em números e mostra o custo total que o cliente paga.", s21, CINZA)

    d.rectangle([72 * S, 520 * S, (W - 72) * S, 521 * S], fill=FIO)

    # Os tres estados com que uma carteira fecha o mes.
    m14 = fonte("consola.ttf", 14)
    x = 72 * S
    for texto, cor in [("LIBERAR", VERDE), ("COM ALERTA", AMBAR), ("CORRIGIR", VERMELHO)]:
        w = largura(d, texto, m14, tracking=1.0) + 30 * S
        d.rounded_rectangle([x, 548 * S, x + w, 584 * S], radius=18 * S,
                            fill=mistura(cor, 0.93), outline=mistura(cor, 0.58), width=S)
        escreve(d, (x + 15 * S, 558 * S), texto, m14, cor, tracking=1.0)
        x += w + 10 * S

    escreve(d, ((W - 72) * S, 542 * S), "DEMONSTRAÇÃO ABERTA",
            fonte("segoeui.ttf", 13), CINZA, tracking=1.3, a_direita=True)
    escreve(d, ((W - 72) * S, 566 * S), "demo.multi-assets.com",
            fonte("consola.ttf", 18), MARINHO, a_direita=True)

    return img.resize((W, H), Image.LANCZOS)


saida = sys.argv[1] if len(sys.argv) > 1 else PADRAO
desenha().save(saida, "PNG", optimize=True)
print(f"cartao gerado: {saida} ({os.path.getsize(saida)} bytes, {W}x{H})")
