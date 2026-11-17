import sys, json, numpy as np
from PIL import Image
def coeffs(dst, src):
    A=[];b=[]
    for (x,y),(X,Y) in zip(dst,src):
        A.append([x,y,1,0,0,0,-X*x,-X*y]); b.append(X)
        A.append([0,0,0,x,y,1,-Y*x,-Y*y]); b.append(Y)
    return np.linalg.solve(np.array(A,float),np.array(b,float)).tolist()
jobs = {
 "zoo_fenicotteri": ("A.jpg", [(202,136),(738,216),(740,530),(208,644)], (930,600)),
 "zoo_cavaliere":   ("B.jpg", [(214,174),(670,100),(680,690),(220,650)], (620,640)),
 "zoo_airone":      ("C.jpg", [(260,124),(636,100),(636,660),(256,656)], (430,620)),
 "zoo_fenicottero": ("D.jpg", [(182,166),(752,192),(756,590),(182,580)], (600,420)),
 "zoo_fiore":       ("E.jpg", [(114,126),(762,132),(760,600),(110,594)], (580,420)),
}
out = sys.argv[1]
for name,(f,quad,(w,h)) in jobs.items():
    im = Image.open(f)
    c = coeffs([(0,0),(w,0),(w,h),(0,h)], quad)
    r = im.transform((w,h), Image.PERSPECTIVE, c, Image.BICUBIC)
    r.save(f"{out}/{name}.jpg", quality=88)
print("ok")
