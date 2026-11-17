# Foglio di viste prospettiche: 8 direzioni + pavimento + soffitto, con etichette dello yaw
import sys, subprocess, numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, ".")
src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert("RGB")); ih, iw = im.shape[:2]
def view(yaw, pitch, fov, W, H):
    f = 0.5 * W / np.tan(np.radians(fov) / 2)
    xs, ys = np.meshgrid(np.arange(W) - W / 2 + 0.5, np.arange(H) - H / 2 + 0.5)
    d = np.stack([xs, -ys, np.full_like(xs, f)], -1); d /= np.linalg.norm(d, axis=-1, keepdims=True)
    p, y = np.radians(pitch), np.radians(yaw)
    Rx = np.array([[1, 0, 0], [0, np.cos(p), np.sin(p)], [0, -np.sin(p), np.cos(p)]]); Ry = np.array([[np.cos(y), 0, np.sin(y)], [0, 1, 0], [-np.sin(y), 0, np.cos(y)]])
    d = d @ Rx.T @ Ry.T
    lon = np.arctan2(d[..., 0], d[..., 2]); lat = np.arcsin(np.clip(d[..., 1], -1, 1))
    u = ((lon / (2 * np.pi) + 0.5) * iw).astype(int) % iw; v = np.clip(((0.5 - lat / np.pi) * ih).astype(int), 0, ih - 1)
    return Image.fromarray(im[v, u])
tiles = [(y, 0, 80) for y in range(0, 360, 45)] + [(0, -89.9, 90), (0, 89.9, 90)]
S = Image.new("RGB", (4 * 480, 3 * 320)); dr = ImageDraw.Draw(S)
for i, (y, p, f) in enumerate(tiles):
    t = view(y, p, f, 480, 320); x0, y0 = (i % 4) * 480, (i // 4) * 320; S.paste(t, (x0, y0))
    dr.rectangle([x0, y0, x0 + 150, y0 + 22], fill="black"); dr.text((x0 + 5, y0 + 5), f"yaw {y} pitch {p:.0f}", fill="yellow")
S.save(out, quality=82)
