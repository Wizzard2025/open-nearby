"""Рендер PNG: иконки, favicon, логотипы и рекламные креативы (через headless Chrome).

    python render_all.py
"""
import os, subprocess, re
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
LOGO = os.path.join(ROOT, "logo")
PNG = os.path.join(ROOT, "png")
ADS = os.path.join(ROOT, "ads")
TMP = os.path.join(HERE, "render")
for d in (PNG, ADS, TMP):
    os.makedirs(d, exist_ok=True)

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
URL_SITE = "betahopen.app"


def uri(p):
    return "file:///" + p.replace("\\", "/")


def shot(html, out, w, h, scale=1, transparent=False):
    path = os.path.join(TMP, os.path.basename(out) + ".html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    args = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
            f"--window-size={w},{h}", f"--force-device-scale-factor={scale}",
            "--virtual-time-budget=3000", f"--screenshot={out}"]
    if transparent:
        args.append("--default-background-color=00000000")
    subprocess.run(args + [uri(path)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def img_page(svg, w, h):
    return (f'<!doctype html><html><head><style>html,body{{margin:0;background:transparent}}'
            f'img{{display:block;width:{w}px;height:{h}px}}</style></head>'
            f'<body><img src="{uri(os.path.join(LOGO, svg))}"></body></html>')


# ---------------- иконки ----------------
for s in (16, 32, 48):
    shot(img_page("icon-simple.svg", s, s), os.path.join(PNG, f"icon-{s}.png"), s, s, transparent=True)
for s in (64, 128, 192, 256, 512, 1024):
    shot(img_page("icon.svg", s, s), os.path.join(PNG, f"icon-{s}.png"), s, s, transparent=True)
for s in (192, 512):
    shot(img_page("icon-maskable.svg", s, s), os.path.join(PNG, f"icon-maskable-{s}.png"), s, s)
shot(img_page("icon-maskable.svg", 180, 180), os.path.join(PNG, "apple-touch-icon.png"), 180, 180)
ico = [Image.open(os.path.join(PNG, f"icon-{s}.png")).convert("RGBA") for s in (16, 32, 48)]
ico[2].save(os.path.join(PNG, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:2])

# Google Play требует 512×512 без прозрачности, App Store — 1024×1024 без прозрачности
shot(img_page("icon-maskable.svg", 512, 512), os.path.join(PNG, "store-google-play-512.png"), 512, 512)
shot(img_page("icon-maskable.svg", 1024, 1024), os.path.join(PNG, "store-app-store-1024.png"), 1024, 1024)

# ---------------- логотипы ----------------
for f in sorted(os.listdir(LOGO)):
    if not f.endswith(".svg") or f.startswith("icon"):
        continue
    txt = open(os.path.join(LOGO, f), encoding="utf-8").read()
    w, h = map(int, re.search(r'viewBox="0 0 (\d+) (\d+)"', txt).groups())
    shot(img_page(f, w, h), os.path.join(PNG, f.replace(".svg", ".png")), w, h, scale=2, transparent=True)

# ---------------- рекламные креативы ----------------
COPY = {
    "he": dict(dir="rtl", beta="בטא", head="לא צריך לחפש<br><em>מה פתוח</em>",
               short="מה פתוח<br><em>עכשיו?</em>", lb="לא צריך לחפש <em>מה פתוח</em>",
               sub="הנה כולם, על מפה אחת. סופר, בית מרקחת, מאפייה ותחנת דלק. כולל שבת וחגים.",
               cta="לפתוח בחינם", rows=[
                   ("cart", "סופרמרקט", "350 מ׳", "open", "פתוח עד 23:00"),
                   ("cross", "בית מרקחת", "600 מ׳", "soon", "נסגר בעוד 9 דק׳"),
                   ("bread", "מאפייה", "1.2 ק״מ", "closed", "סגור · ייפתח ב־07:00")]),
    "ru": dict(dir="ltr", beta="БЕТА", head="Не ищите,<br><em>где открыто</em>",
               short="Где сейчас<br><em>открыто?</em>", lb="Не ищите, <em>где открыто</em>",
               sub="Вот они все, на одной карте. Продукты, аптеки, пекарни и заправки. Шаббат и праздники учтены.",
               cta="Открыть бесплатно", rows=[
                   ("cart", "Супермаркет", "350 м", "open", "Открыто до 23:00"),
                   ("cross", "Аптека", "600 м", "soon", "Закроется через 9 мин"),
                   ("bread", "Пекарня", "1,2 км", "closed", "Закрыто · откроется в 07:00")]),
    "en": dict(dir="ltr", beta="BETA", head="Stop searching<br><em>for what’s open</em>",
               short="What’s open<br><em>right now?</em>", lb="Stop searching <em>for what’s open</em>",
               sub="Here they all are, on one map. Groceries, pharmacies, bakeries and gas. Shabbat &amp; holidays included.",
               cta="Open it free", rows=[
                   ("cart", "Supermarket", "350 m", "open", "Open until 23:00"),
                   ("cross", "Pharmacy", "600 m", "soon", "Closes in 9 min"),
                   ("bread", "Bakery", "1.2 km", "closed", "Closed · opens 07:00")]),
}

ICONS = {
    "cart": '<path d="M3 4h2.2l2.1 10.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.2L20.6 8H6.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="19.5" r="1.5" fill="currentColor"/><circle cx="17" cy="19.5" r="1.5" fill="currentColor"/>',
    "cross": '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z" fill="currentColor"/>',
    "bread": '<path d="M4 11.5C4 7.9 7.6 5.5 12 5.5s8 2.4 8 6c0 1.3-.8 2-1.6 2.3V18a1.5 1.5 0 0 1-1.5 1.5H7.1A1.5 1.5 0 0 1 5.6 18v-4.2C4.8 13.5 4 12.8 4 11.5z" fill="currentColor"/><path d="M9 9.5l-1 3M12.5 9.5l-1 3M16 9.5l-1 3" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
}

CSS = f"""
@font-face{{font-family:Rubik;src:url('{uri(os.path.join(HERE, "Rubik.ttf"))}');font-weight:300 900}}
*{{box-sizing:border-box;margin:0}}
html,body{{width:var(--w);height:var(--h);overflow:hidden}}
body{{font-family:Rubik,sans-serif;color:#E8F6FC;background:#0A0F13;
  background:radial-gradient(90% 70% at 88% 4%,rgba(60,196,242,.22) 0%,rgba(60,196,242,0) 60%),
             linear-gradient(180deg,#0E141A 0%,#070B0E 100%);
  position:relative}}
.grid{{position:absolute;inset:0;opacity:.06;
  background-image:linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px);
  background-size:calc(var(--u)*6) calc(var(--u)*6)}}
.wrap{{position:relative;height:100%;display:flex;flex-direction:column;padding:calc(var(--u)*7)}}
.top{{display:flex;align-items:center;gap:calc(var(--u)*2.4)}}
.top img{{height:calc(var(--u)*7.6)}}
.beta{{font-weight:600;font-size:calc(var(--u)*2.2);letter-spacing:.08em;padding:.35em .8em;border-radius:99px;
  color:#3CC4F2;background:rgba(60,196,242,.1);border:1px solid rgba(60,196,242,.4)}}
h1{{font-weight:700;line-height:1.06;letter-spacing:-.01em}}
h1 em{{font-style:normal;color:#3CC4F2;text-shadow:0 0 .5em rgba(60,196,242,.45)}}
p.sub{{color:rgba(232,246,252,.78);font-weight:400;line-height:1.35}}
.cards{{display:flex;flex-direction:column;gap:calc(var(--u)*1.6)}}
.card{{background:#fff;color:#15201E;border-radius:calc(var(--u)*2.6);display:flex;align-items:center;
  gap:calc(var(--u)*2);padding:calc(var(--u)*2.1) calc(var(--u)*2.4);box-shadow:0 calc(var(--u)*1.2) calc(var(--u)*3) rgba(0,0,0,.4)}}
.ic{{width:calc(var(--u)*6.2);height:calc(var(--u)*6.2);border-radius:calc(var(--u)*1.6);display:grid;place-items:center;flex:none}}
.ic svg{{width:56%;height:56%}}
.nm{{flex:1;min-width:0}}
.nm b{{display:block;font-weight:600;font-size:calc(var(--u)*2.9)}}
.nm span{{color:#5C6A66;font-size:calc(var(--u)*2.3)}}
.st{{font-weight:600;font-size:calc(var(--u)*2.25);padding:.45em .85em;border-radius:99px;white-space:nowrap;display:flex;align-items:center;gap:.45em}}
.st::before{{content:"";width:.6em;height:.6em;border-radius:50%;background:currentColor}}
.open .st{{color:#137A42;background:#E3F5EA}} .open .ic{{background:#E3F5EA;color:#1F9D55}}
.soon .st{{color:#965A00;background:#FFF1D6}} .soon .ic{{background:#FFF1D6;color:#B86E00}}
.closed .st{{color:#97392F;background:#F8E6E3}} .closed .ic{{background:#F8E6E3;color:#A8443C}}
.cta{{display:flex;align-items:center;gap:calc(var(--u)*2.4);flex-wrap:wrap}}
.btn{{background:#3CC4F2;color:#04141D;font-weight:700;border-radius:99px;padding:.7em 1.4em;
  box-shadow:0 0 1.2em rgba(60,196,242,.45);white-space:nowrap}}
.url{{color:rgba(232,246,252,.7);font-weight:500;direction:ltr;unicode-bidi:isolate}}
"""


def cards(rows):
    out = []
    for icon, name, dist, st, label in rows:
        out.append(f'<div class="card {st}"><div class="ic"><svg viewBox="0 0 24 24">{ICONS[icon]}</svg></div>'
                   f'<div class="nm"><b>{name}</b><span>{dist}</span></div><div class="st">{label}</div></div>')
    return '<div class="cards">' + "".join(out) + "</div>"


def page(lang, w, h, u, body, extra=""):
    c = COPY[lang]
    return (f'<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><style>'
            f':root{{--w:{w}px;--h:{h}px;--u:{u}px}}{CSS}{extra}</style></head>'
            f'<body><div class="grid"></div><div dir="{c["dir"]}" style="position:relative;height:100%">{body}</div></body></html>')


def logo(lang):
    return f'<img src="{uri(os.path.join(LOGO, f"logo-{lang}-dark.svg"))}" alt="">'


for lang, c in COPY.items():
    top = f'<div class="top">{logo(lang)}<span class="beta">{c["beta"]}</span></div>'
    cta = f'<div class="cta"><span class="btn">{c["cta"]}</span><span class="url">{URL_SITE}</span></div>'

    # Пост 1080×1080 (Instagram / Facebook / Telegram)
    body = (f'<div class="wrap">{top}'
            f'<h1 style="font-size:{c.get("hs",84)}px;margin-top:56px">{c["head"]}</h1>'
            f'<p class="sub" style="font-size:32px;margin-top:28px;max-width:860px">{c["sub"]}</p>'
            f'<div style="margin-top:auto">{cards(c["rows"])}</div>'
            f'<div style="margin-top:44px;font-size:30px">{cta}</div></div>')
    shot(page(lang, 1080, 1080, 10, body), os.path.join(ADS, f"post-1080x1080-{lang}.png"), 1080, 1080)

    # Сторис / Reels / TikTok 1080×1920 (безопасная зона: 250 px сверху и снизу)
    body = (f'<div class="wrap" style="padding:250px 80px">{top}'
            f'<h1 style="font-size:104px;margin-top:90px">{c["head"]}</h1>'
            f'<p class="sub" style="font-size:40px;margin-top:40px">{c["sub"]}</p>'
            f'<div style="margin-top:auto">{cards(c["rows"])}</div>'
            f'<div style="margin-top:70px;font-size:40px">{cta}</div></div>')
    shot(page(lang, 1080, 1920, 13, body), os.path.join(ADS, f"story-1080x1920-{lang}.png"), 1080, 1920)

    # Превью ссылки (Open Graph) 1200×630 — для WhatsApp, Telegram, Facebook
    body = (f'<div class="wrap" style="flex-direction:row;gap:56px;padding:60px 64px;align-items:stretch">'
            f'<div style="flex:1.05;display:flex;flex-direction:column">{top}'
            f'<h1 style="font-size:58px;margin-top:40px">{c["head"]}</h1>'
            f'<p class="sub" style="font-size:24px;margin-top:22px">{c["sub"]}</p>'
            f'<div style="margin-top:auto;font-size:24px">{cta}</div></div>'
            f'<div style="flex:1;display:flex;flex-direction:column;justify-content:center">{cards(c["rows"])}</div></div>')
    shot(page(lang, 1200, 630, 7.4, body, ".top img{height:52px}"), os.path.join(ADS, f"og-1200x630-{lang}.png"), 1200, 630)

    # Медийный баннер 300×250 (Google Ads / РСЯ)
    body = (f'<div class="wrap" style="padding:20px 22px">'
            f'<div class="top">{logo(lang)}</div>'
            f'<h1 style="font-size:34px;margin-top:18px">{c["short"]}</h1>'
            f'<div style="margin-top:auto;font-size:17px" class="cta"><span class="btn">{c["cta"]}</span></div></div>')
    shot(page(lang, 300, 250, 4, body, ".top img{height:30px}"), os.path.join(ADS, f"banner-300x250-{lang}.png"), 300, 250)

    # Лидерборд 728×90
    body = (f'<div class="wrap" style="flex-direction:row;align-items:center;gap:18px;padding:0 20px">'
            f'<div class="top">{logo(lang)}</div>'
            f'<h1 style="font-size:21px;flex:1;white-space:nowrap">{c["lb"]}</h1>'
            f'<div style="font-size:15px" class="cta"><span class="btn">{c["cta"]}</span></div></div>')
    shot(page(lang, 728, 90, 3, body, ".top img{height:34px}"), os.path.join(ADS, f"banner-728x90-{lang}.png"), 728, 90)
    print("ads", lang, "ok")

print("done")
