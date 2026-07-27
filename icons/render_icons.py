"""Render the YT Focus icons with Pillow (no SVG rasterizer available).

Draws at 8x supersample then downscales with LANCZOS for clean anti-aliased
edges. Two variants — plain and focus-bracket — at 16/32/48/96 px, plus a
side-by-side comparison sheet. Geometry mirrors icon.svg / icon-focus.svg.
"""
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
RED = (255, 59, 48, 255)     # #ff3b30 — popup accent
WHITE = (255, 255, 255, 255)
S = 8                        # supersample factor
BASE = 96


def draw_icon(focus: bool) -> Image.Image:
    n = BASE * S
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def sc(v):
        return v * S

    # rounded square
    d.rounded_rectangle([0, 0, n - 1, n - 1], radius=sc(22), fill=RED)

    # play triangle
    tri = [(39, 30), (68, 48), (39, 66)] if focus else [(37, 26), (72, 48), (37, 70)]
    d.polygon([(sc(x), sc(y)) for x, y in tri], fill=WHITE)

    if focus:
        t = sc(5)                       # stroke thickness
        r = t / 2
        arm = sc(12)                    # bracket arm length
        wa = (255, 255, 255, 235)
        # each corner = horizontal arm + vertical arm as rounded rects
        corners = [
            (sc(18), sc(18), 1, 1),     # top-left  (dx, dy directions)
            (sc(78), sc(18), -1, 1),    # top-right
            (sc(78), sc(78), -1, -1),   # bottom-right
            (sc(18), sc(78), 1, -1),    # bottom-left
        ]
        for cx, cy, dx, dy in corners:
            # horizontal arm
            x0, x1 = sorted([cx, cx + dx * arm])
            d.rounded_rectangle([x0, cy - r, x1, cy + r], radius=r, fill=wa)
            # vertical arm
            y0, y1 = sorted([cy, cy + dy * arm])
            d.rounded_rectangle([cx - r, y0, cx + r, y1], radius=r, fill=wa)

    return img


def main():
    variants = {"": False, "-focus": True}
    masters = {}
    for suffix, focus in variants.items():
        master = draw_icon(focus)
        masters[suffix] = master
        for size in (16, 32, 48, 96):
            out = master.resize((size, size), Image.LANCZOS)
            name = f"icon{size}{suffix}.png"
            out.save(os.path.join(HERE, name))
            print("wrote", name)

    # comparison sheet: both variants at 96 on a neutral card
    pad, gap, chip = 24, 40, 96
    sheet = Image.new("RGBA", (pad * 2 + chip * 2 + gap, pad * 2 + chip + 40),
                      (28, 28, 30, 255))
    d = ImageDraw.Draw(sheet)
    for i, suffix in enumerate(("", "-focus")):
        icon = masters[suffix].resize((chip, chip), Image.LANCZOS)
        x = pad + i * (chip + gap)
        sheet.alpha_composite(icon, (x, pad))
        label = "plain" if suffix == "" else "focus brackets"
        d.text((x, pad + chip + 12), label, fill=(200, 200, 205, 255))
    sheet.save(os.path.join(HERE, "..", "icon_compare.png"))
    print("wrote icon_compare.png")


main()
