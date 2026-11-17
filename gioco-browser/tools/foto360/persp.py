# Vista prospettica da una foto equirettangolare: persp.py img out yaw pitch fov w h
import sys, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
yaw, pitch, fov = map(float, sys.argv[3:6]); W, H = int(sys.argv[6]), int(sys.argv[7])
im = np.asarray(Image.open(src).convert("RGB")); ih, iw = im.shape[:2]
f = 0.5 * W / np.tan(np.radians(fov) / 2)
xs, ys = np.meshgrid(np.arange(W) - W / 2 + 0.5, np.arange(H) - H / 2 + 0.5)
d = np.stack([xs, -ys, np.full_like(xs, f)], -1); d /= np.linalg.norm(d, axis=-1, keepdims=True)
p, y = np.radians(pitch), np.radians(yaw)
Rx = np.array([[1, 0, 0], [0, np.cos(p), np.sin(p)], [0, -np.sin(p), np.cos(p)]])
Ry = np.array([[np.cos(y), 0, np.sin(y)], [0, 1, 0], [-np.sin(y), 0, np.cos(y)]])
d = d @ Rx.T @ Ry.T
lon = np.arctan2(d[..., 0], d[..., 2]); lat = np.arcsin(np.clip(d[..., 1], -1, 1))
u = ((lon / (2 * np.pi) + 0.5) * iw).astype(int) % iw; v = np.clip(((0.5 - lat / np.pi) * ih).astype(int), 0, ih - 1)
Image.fromarray(im[v, u]).save(out, quality=90)
