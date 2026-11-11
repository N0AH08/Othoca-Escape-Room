import sys, os, urllib.request
from concurrent.futures import ThreadPoolExecutor
B = "https://itisothoca.altervista.org/immagini-360"
def job(args):
    t, sid, rel, dest = args
    out = os.path.join(dest, sid, rel)
    if os.path.exists(out) and os.path.getsize(out) > 0: return None
    os.makedirs(os.path.dirname(out), exist_ok=True)
    try:
        with urllib.request.urlopen(f"{B}/{t}/app-files/tiles/{sid}/{rel}", timeout=30) as r: data = r.read()
        open(out, "wb").write(data); return None
    except Exception as e: return f"MISSING {sid}/{rel} {e}"
jobs = []
dest = sys.argv[1]
for pair in sys.argv[2:]:
    t, sid = pair.split(":")
    jobs.append((t, sid, "preview.jpg", dest))
    for f in "bdflru":
        for z, n in ((0,1),(1,1),(2,2),(3,4)):
            for y in range(n):
                for x in range(n): jobs.append((t, sid, f"{z}/{f}/{y}/{x}.jpg", dest))
with ThreadPoolExecutor(16) as ex:
    for r in ex.map(job, jobs):
        if r: print(r)
print("done", len(jobs))
