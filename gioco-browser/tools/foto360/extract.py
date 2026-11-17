# Ritaglia texture dalle foto 360°: vista prospettica (yaw, pitch, fov) + riquadro normalizzato
import sys, numpy as np
from PIL import Image, ImageEnhance
U = sys.argv[1]; OUT = sys.argv[2]
cache = {}
def load(p):
    if p not in cache: cache[p] = np.asarray(Image.open(f"{U}/{p}.jpg").convert("RGB"))
    return cache[p]
def view(im, yaw, pitch, fov, W, H):
    ih, iw = im.shape[:2]; f = 0.5 * W / np.tan(np.radians(fov) / 2)
    xs, ys = np.meshgrid(np.arange(W) - W / 2 + 0.5, np.arange(H) - H / 2 + 0.5)
    d = np.stack([xs, -ys, np.full_like(xs, f)], -1); d /= np.linalg.norm(d, axis=-1, keepdims=True)
    p, y = np.radians(pitch), np.radians(yaw)
    Rx = np.array([[1, 0, 0], [0, np.cos(p), np.sin(p)], [0, -np.sin(p), np.cos(p)]]); Ry = np.array([[np.cos(y), 0, np.sin(y)], [0, 1, 0], [-np.sin(y), 0, np.cos(y)]])
    d = d @ Rx.T @ Ry.T
    lon = np.arctan2(d[..., 0], d[..., 2]); lat = np.arcsin(np.clip(d[..., 1], -1, 1))
    u = ((lon / (2 * np.pi) + 0.5) * iw).astype(int) % iw; v = np.clip(((0.5 - lat / np.pi) * ih).astype(int), 0, ih - 1)
    return Image.fromarray(im[v, u])
ONLY = set(sys.argv[3].split(",")) if len(sys.argv) > 3 else None
JOBS = [
 ("chem_floor", "Chemistry/Chemistry_09", 0, -89.9, 90, (0.03, 0.06, 0.40, 0.94)),
 ("chem_postersA", "Chemistry/Chemistry_09", 90, 0, 80, (0.0, 0.355, 0.285, 0.47)),
 ("chem_postersB", "Chemistry/Chemistry_09", 90, 0, 80, (0.485, 0.355, 0.69, 0.47)),
 ("chem_cabinets", "Chemistry/Chemistry_09", 270, 0, 80, (0.33, 0.17, 1.0, 0.83)),
 ("chem_hood", "Chemistry/Chemistry_09", 0, 0, 80, (0.41, 0.32, 0.67, 0.70)),
 ("chem_ceiling", "Chemistry/Chemistry_09", 0, 89.9, 90, (0.1, 0.0, 0.62, 1.0)),
 ("work_floor", "Workshop/Workshop_07", 0, -89.9, 90, (0.06, 0.30, 0.36, 0.95)),
 ("work_signs", "Workshop/Workshop_07", 90, 0, 80, (0.46, 0.14, 0.88, 0.31)),
 ("work_ceiling", "Workshop/Workshop_07", 0, 89.9, 90, (0.25, 0.0, 0.75, 1.0)),
 ("pneu_floor", "Pneumatics/Pneumatics_05", 0, -89.9, 90, (0.62, 0.05, 0.98, 0.48)),
 ("pneu_panel_red", "Pneumatics/Pneumatics_05", 0, 0, 80, (0.575, 0.355, 0.915, 0.79)),
 ("pneu_panel_white", "Pneumatics/Pneumatics_05", 0, 0, 80, (0.0, 0.33, 0.37, 0.72)),
 ("pneu_window", "Pneumatics/Pneumatics_05", 270, 0, 80, (0.72, 0.05, 1.0, 0.52)),
 ("info_cabinet", "Informatics/Informatics_02", 270, 0, 80, (0.63, 0.33, 0.79, 0.98)),
 ("info_window", "Informatics/Informatics_02", 180, 0, 80, (0.07, 0.12, 0.86, 0.62)),
 ("info_shelves", "Informatics/Informatics_02", 90, 0, 80, (0.0, 0.53, 0.42, 0.87)),
 ("class_window", "Classroom/Classroom_01", 90, 0, 80, (0.13, 0.16, 0.5, 0.66)),
 ("gym_ceiling", "Gym/Gym_04", 0, 89.9, 90, (0.0, 0.0, 1.0, 1.0)),
 ("gym_floor", "Gym/Gym_04", 0, -89.9, 90, (0.55, 0.55, 0.98, 1.0)),
 ("gym_climb", "Gym/Gym_04", 180, 0, 80, (0.75, 0.0, 0.89, 0.58)),
 ("theatre_ceiling", "Theatre/Theatre_08", 0, 89.9, 90, (0.03, 0.10, 0.38, 0.50)),
 ("theatre_floor", "Theatre/Theatre_08", 0, -89.9, 90, (0.05, 0.28, 0.60, 0.43)),
 ("theatre_band", "Theatre/Theatre_08", 90, 0, 80, (0.0, 0.0, 0.6, 0.17)),
]
for name, photo, yaw, pitch, fov, (u0, v0, u1, v1) in JOBS:
    if ONLY and name not in ONLY: continue
    W, H = 2400, 1600
    v = view(load(photo), yaw, pitch, fov, W, H)
    c = v.crop((int(u0 * W), int(v0 * H), int(u1 * W), int(v1 * H)))
    c = ImageEnhance.Contrast(c).enhance(1.08); c = ImageEnhance.Color(c).enhance(1.1)
    mx = 1024
    if max(c.size) > mx: k = mx / max(c.size); c = c.resize((int(c.width * k), int(c.height * k)), Image.LANCZOS)
    c.save(f"{OUT}/{name}.jpg", quality=86)
    print(name, c.size)
