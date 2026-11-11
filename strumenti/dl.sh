#!/bin/bash
# uso: dl.sh <tour-path> <scene-id> <dest>
B=https://itisothoca.altervista.org/immagini-360
t=$1; id=$2; dest=$3
urls=()
for f in b d f l r u; do
  for z in 0 1; do echo "$z/$f/0/0"; done
  for y in 0 1; do for x in 0 1; do echo "2/$f/$y/$x"; done; done
  for y in 0 1 2 3; do for x in 0 1 2 3; do echo "3/$f/$y/$x"; done; done
done | xargs -P 12 -I{} sh -c "mkdir -p \"$dest/$id/\$(dirname {})\" && curl -sfL \"$B/$t/app-files/tiles/$id/{}.jpg\" -o \"$dest/$id/{}.jpg\" || echo MISSING $id/{}"
curl -sfL "$B/$t/app-files/tiles/$id/preview.jpg" -o "$dest/$id/preview.jpg"
