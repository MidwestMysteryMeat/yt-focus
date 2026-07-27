"""Render high-res store sizes (128/256/512) of both icon variants."""
import os
from render_icons import draw_icon
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
for suffix, focus in {"": False, "-focus": True}.items():
    master = draw_icon(focus)
    for size in (128, 256, 512):
        master.resize((size, size), Image.LANCZOS).save(
            os.path.join(HERE, f"icon{size}{suffix}.png"))
        print(f"wrote icon{size}{suffix}.png")
