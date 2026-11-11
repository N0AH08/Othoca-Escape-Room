import sys, os, json, math, numpy as np
from PIL import Image, ImageDraw
def load_data():
    d = {}
    for fn in os.listdir('.'):
        if fn.endswith('.js') and not fn.startswith('dl') and 'backup' not in fn:
            s = open(fn).read(); s = s[s.index('{'):s.rindex('}')+1]
            for sc in json.loads(s)['scenes']: d[sc['id']] = sc
    return d
DATA = load_data()
def face(sid, f, z=2, n=2, ts=512):
    im = Image.new('RGB', (n*ts, n*ts))
    for y in range(n):
        for x in range(n): im.paste(Image.open(f'tiles/{sid}/{z}/{f}/{y}/{x}.jpg'), (x*ts, y*ts))
    return np.asarray(im)
def equirect(sid, W=2400, H=1200):
    F = {f: face(sid, f) for f in 'bdflru'}; N = F['f'].shape[0]
    yaw = (np.arange(W)+.5)/W*2*np.pi - np.pi
    pit = (np.arange(H)+.5)/H*np.pi - np.pi/2
    Y, P = np.meshgrid(yaw, pit)
    x = np.sin(Y)*np.cos(P); y = -np.sin(P); z = np.cos(Y)*np.cos(P)
    out = np.zeros((H, W, 3), np.uint8)
    ax, ay, az = abs(x), abs(y), abs(z)
    def put(mask, f, u, v):
        c = np.clip(((u+1)/2*N).astype(int), 0, N-1); r = np.clip(((v+1)/2*N).astype(int), 0, N-1)
        out[mask] = F[f][r[mask], c[mask]]
    m = (az>=ax)&(az>=ay)&(z>0); put(m,'f', x/az, -y/az)
    m = (az>=ax)&(az>=ay)&(z<0); put(m,'b', -x/az, -y/az)
    m = (ax>az)&(ax>=ay)&(x>0); put(m,'r', -z/ax, -y/ax)
    m = (ax>az)&(ax>=ay)&(x<0); put(m,'l', z/ax, -y/ax)
    m = (ay>ax)&(ay>az)&(y>0); put(m,'u', x/ay, z/ay)
    m = (ay>ax)&(ay>az)&(y<0); put(m,'d', x/ay, -z/ay)
    im = Image.fromarray(out); d = ImageDraw.Draw(im)
    for k in range(-6, 7):
        a = k*0.5; px = (a+math.pi)/(2*math.pi)*W
        d.line([(px,0),(px,H)], fill=(255,255,0), width=1); d.text((px+3, H/2+4), f"{a:+.1f}", fill=(255,255,0))
    for k in (-1,-0.5,0.5,1):
        py = (k+math.pi/2)/math.pi*H; d.line([(0,py),(W,py)], fill=(0,255,255), width=1); d.text((4,py+2), f"p{k:+.1f}", fill=(0,255,255))
    d.line([(0,H/2),(W,H/2)], fill=(0,255,255), width=1)
    for l in DATA.get(sid, {}).get('linkHotspots', []):
        px = (l['yaw']+math.pi)/(2*math.pi)*W; py = (l['pitch']+math.pi/2)/math.pi*H
        d.ellipse([px-10,py-10,px+10,py+10], outline=(255,0,0), width=3); d.text((px+12,py-6), l['target'][:18], fill=(255,60,60))
    return im
for sid in sys.argv[1:]:
    equirect(sid).crop((0,250,2400,950)).resize((1800,525)).save(f'eq_{sid}.jpg', quality=82)
    print('ok', sid)
