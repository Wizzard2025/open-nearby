"""Генератор логотипов «בטח פתוח · Betcha it's open · Точно открыто».

Все надписи переводятся в кривые (шрифт Rubik), поэтому SVG выглядят
одинаково везде, даже где шрифт не установлен.

    python make_logos.py [путь к Rubik[wght].ttf]
"""
import sys, os
import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "Rubik.ttf")
OUT = os.path.join(HERE, "..", "logo")
os.makedirs(OUT, exist_ok=True)

# ---------- палитра (совпадает с приложением) ----------
GRAPHITE = "#0E141A"     # фон шапки, иконки
GRAPHITE_2 = "#070B0E"
CYAN = "#3CC4F2"         # «огонёк» — главный акцент
CYAN_DEEP = "#0A78B0"    # акцент на светлом фоне
INK = "#10171C"          # текст на светлом
ICE = "#E8F6FC"          # текст на тёмном

blob = hb.Blob(open(FONT, "rb").read())
face = hb.Face(blob)


def shape_path(text, size, x, y, wght=700):
    """(svg path d, ширина) для строки, базовая линия в y. RTL определяется сам."""
    font = hb.Font(face)
    font.set_variations({"wght": wght})
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True})
    s = size / face.upem
    pen = SVGPathPen(None)
    cx = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        tp = TransformPen(pen, (s, 0, 0, -s, x + (cx + pos.x_offset) * s, y - pos.y_offset * s))
        font.draw_glyph_with_pen(info.codepoint, tp)
        cx += pos.x_advance
    return pen.getCommands(), cx * s


def cap_height():
    font = hb.Font(face)
    font.set_variations({"wght": 700})
    ext = font.get_glyph_extents(font.get_nominal_glyph(ord("H")))
    return ext.y_bearing / face.upem


CAP = cap_height()

# ---------- знак: метка с горящей точкой ----------
# Поле 512×512, габарит метки: x 124..388, y 88..420, центр точки (256, 220).
PIN = ("M256 88a132 132 0 0 1 132 132c0 92-96 170-132 200"
       "c-36-30-132-108-132-200a132 132 0 0 1 132-132z")
PIN_BOX = (124, 88, 264, 332)
CX, CY = 256, 220
HOLE = "M256 156a64 64 0 1 0 0.01 0z"   # отверстие для одноцветной версии


def pin(pin_fill, dot, tx=0, ty=0, scale=1.0, halo=True, glow_id=None, simple=False):
    p = [f'<path d="{PIN}" fill="{pin_fill}"/>']
    if halo and not simple:
        p.append(f'<circle cx="{CX}" cy="{CY}" r="86" fill="none" stroke="{dot}" stroke-opacity=".38" stroke-width="16"/>')
    if glow_id:
        p.append(f'<circle cx="{CX}" cy="{CY}" r="58" fill="{dot}" filter="url(#{glow_id})" opacity=".9"/>')
    p.append(f'<circle cx="{CX}" cy="{CY}" r="{64 if simple else 54}" fill="{dot}"/>')
    return f'<g transform="translate({tx:.2f} {ty:.2f}) scale({scale:.4f})">' + "".join(p) + "</g>"


def mono_pin(fill, tx=0, ty=0, scale=1.0):
    return (f'<path transform="translate({tx:.2f} {ty:.2f}) scale({scale:.4f})" fill="{fill}" '
            f'fill-rule="evenodd" d="{PIN}{HOLE}"/>')


def svg(w, h, body, title, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" '
            f'width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{defs}{body}</svg>\n')


def write(name, content):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(content)


GLOW = '<filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="22"/></filter>'


def app_icon(simple=False, maskable=False):
    defs = (f'<defs><radialGradient id="bg" cx=".5" cy=".38" r=".75">'
            f'<stop offset="0" stop-color="#16222B"/><stop offset="1" stop-color="{GRAPHITE_2}"/></radialGradient>'
            f'{GLOW}</defs>')
    bg = (f'<rect width="512" height="512" fill="url(#bg)"/>' if maskable
          else f'<rect width="512" height="512" rx="116" fill="url(#bg)"/>')
    scale = 0.72 if maskable else (1.12 if simple else 0.92)
    ph = PIN_BOX[3] * scale
    tx = 256 - (PIN_BOX[0] + PIN_BOX[2] / 2) * scale
    ty = 256 - ph / 2 - PIN_BOX[1] * scale
    ring_c = (tx + CX * scale, ty + CY * scale)
    rings = ""
    if not simple:
        for r, o in ((150, .22), (205, .12), (262, .06)):
            rings += (f'<circle cx="{ring_c[0]:.1f}" cy="{ring_c[1]:.1f}" r="{r * scale / 0.92:.1f}" fill="none" '
                      f'stroke="{CYAN}" stroke-opacity="{o}" stroke-width="5"/>')
        if not maskable:
            rings = f'<clipPath id="c"><rect width="512" height="512" rx="116"/></clipPath><g clip-path="url(#c)">{rings}</g>'
    g = pin("#FFFFFF", CYAN, tx, ty, scale, halo=True, glow_id=None if simple else "glow", simple=simple)
    return svg(512, 512, bg + rings + g, "בטח פתוח", defs)


# --- иконки приложения ---
write("icon.svg", app_icon())
write("icon-simple.svg", app_icon(simple=True))          # 16–48 px
write("icon-maskable.svg", app_icon(maskable=True))      # Android adaptive / PWA maskable / сторы

# --- знак без подложки ---
write("mark.svg", svg(264, 332, pin(INK, CYAN, -124, -88), "בטח פתוח"))           # на светлом
write("mark-dark.svg", svg(264, 332, pin("#FFFFFF", "#18A9DD", -124, -88), "בטח פתוח"))  # на тёмном
write("mark-white.svg", svg(264, 332, mono_pin("#FFFFFF", -124, -88), "בטח פתוח"))
write("mark-black.svg", svg(264, 332, mono_pin(INK, -124, -88), "בטח פתוח"))

# ---------- горизонтальные логотипы ----------
# второе слово — «открыто» — всегда горит акцентом
LOCKUPS = {
    "he": (["בטח", " פתוח"], True, "בטח פתוח"),
    "ru": (["Точно", " открыто"], False, "Точно открыто"),
    "en": (["Betcha it’s", " open"], False, "Betcha it’s open"),
}
THEMES = {
    "light": dict(pin=INK, dot=CYAN, w1=INK, w2=CYAN_DEEP),
    "dark": dict(pin="#FFFFFF", dot="#18A9DD", w1=ICE, w2=CYAN),
    "white": None,
}

FS, PIN_H, PAD, GAP = 120, 168, 24, 38
for lang, (words, rtl, title) in LOCKUPS.items():
    for theme, c in THEMES.items():
        sc = PIN_H / PIN_BOX[3]
        pin_w = PIN_BOX[2] * sc
        H = PIN_H + PAD * 2
        dot_y = PAD + (CY - PIN_BOX[1]) * sc
        baseline = dot_y + CAP * FS / 2
        _, w1 = shape_path(words[0], FS, 0, 0)
        _, w2 = shape_path(words[1], FS, 0, 0)
        W = PAD + pin_w + GAP + w1 + w2 + PAD
        if rtl:   # знак справа, первое слово правее второго
            pin_x, text_x = W - PAD - pin_w, PAD
            d2, _ = shape_path(words[1], FS, text_x, baseline)
            d1, _ = shape_path(words[0], FS, text_x + w2, baseline)
        else:
            pin_x, text_x = PAD, PAD + pin_w + GAP
            d1, _ = shape_path(words[0], FS, text_x, baseline)
            d2, _ = shape_path(words[1], FS, text_x + w1, baseline)
        tx, ty = pin_x - PIN_BOX[0] * sc, PAD - PIN_BOX[1] * sc
        if c is None:
            body = mono_pin("#FFFFFF", tx, ty, sc) + f'<path d="{d1}{d2}" fill="#FFFFFF"/>'
        else:
            body = (pin(c["pin"], c["dot"], tx, ty, sc) +
                    f'<path d="{d1}" fill="{c["w1"]}"/><path d="{d2}" fill="{c["w2"]}"/>')
        write(f"logo-{lang}-{theme}.svg", svg(W, H, body, title))
        print(f"logo-{lang}-{theme}.svg  {W:.0f}x{H:.0f}")

print("ok ->", os.path.abspath(OUT))
