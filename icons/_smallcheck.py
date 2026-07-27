import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
# show 16 and 32 px at true size AND magnified 6x (nearest) so pixels are visible
rows = []
for suffix in ("", "-focus"):
    for size in (16, 32, 48):
        im = Image.open(os.path.join(HERE, f"icon{size}{suffix}.png")).convert("RGBA")
        rows.append((f"{size}{suffix or '-plain'}", im))

scale = 6
cellw = 48 * scale
sheet = Image.new("RGBA", (cellw * 3 + 40, (len(rows) // 3) * (cellw + 10) + 20), (30, 30, 34, 255))
from PIL import ImageDraw
d = ImageDraw.Draw(sheet)
for i, (label, im) in enumerate(rows):
    big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    col = i % 3
    row = i // 3
    x = 10 + col * (cellw + 10)
    y = 10 + row * (cellw + 10)
    sheet.alpha_composite(big, (x + (cellw - big.width) // 2, y))
    d.text((x + 4, y + cellw - 4), label, fill=(200, 200, 205, 255))
sheet.save(os.path.join(HERE, "..", "icon_smallcheck.png"))
print("wrote icon_smallcheck.png")
