#!/usr/bin/env bash
# Generates placeholder firefly icons + Play Store graphics with ImageMagick.
# Usage: bash scripts/make-icons.sh   (outputs into assets/ and store/google-play/)
set -euo pipefail
cd "$(dirname "$0")/.."
T=$(mktemp -d)
mkdir -p store/google-play

# 4x4 grid, cell 200px, centred on a 1024 canvas. Trail = cell centres, head = last point.
C=(212 412 612 812)
pt() { echo "${C[$1]},${C[$2]}"; }
TRAIL="$(pt 0 0) $(pt 1 0) $(pt 1 1) $(pt 0 1) $(pt 0 2) $(pt 0 3) $(pt 1 3) $(pt 2 3) $(pt 2 2) $(pt 2 1) $(pt 2 0) $(pt 3 0) $(pt 3 1)"
HX=${C[3]}; HY=${C[1]}

# Background: night sky.
magick -size 1024x1024 radial-gradient:'#173257'-'#050816' "$T/bg.png"

# Cells (faint rounded squares).
CELLS=""
for i in 0 1 2 3; do for j in 0 1 2 3; do
  x=$((112 + i * 200 + 10)); y=$((112 + j * 200 + 10))
  CELLS+="roundrectangle $x,$y $((x + 180)),$((y + 180)) 34,34 "
done; done
magick -size 1024x1024 xc:none -fill '#16223F' -draw "$CELLS" "$T/cells.png"

# Trail: wide blurred glow + body + bright core.
magick -size 1024x1024 xc:none -fill none -stroke '#FFC53D' -strokewidth 150 \
  -draw "stroke-linecap round stroke-linejoin round polyline $TRAIL" -blur 0x45 "$T/glow.png"
magick -size 1024x1024 xc:none -fill none -stroke '#FFD45C' -strokewidth 84 \
  -draw "stroke-linecap round stroke-linejoin round polyline $TRAIL" \
  -stroke '#FFF6D0' -strokewidth 26 \
  -draw "stroke-linecap round stroke-linejoin round polyline $TRAIL" "$T/trail.png"

# Firefly head: green halo + white-hot dot.
magick -size 1024x1024 xc:none -fill '#D7FF7A' -draw "circle $HX,$HY $((HX + 120)),$HY" -blur 0x50 "$T/halo.png"
magick -size 1024x1024 xc:none -fill '#F7FFE0' -draw "circle $HX,$HY $((HX + 58)),$HY" "$T/head.png"

# Art layer without background (for adaptive foreground).
magick "$T/cells.png" "$T/glow.png" -composite "$T/trail.png" -composite \
  "$T/halo.png" -composite "$T/halo.png" -composite "$T/head.png" -composite "$T/art.png"

# iOS / generic icon: full bleed, no alpha.
magick "$T/bg.png" "$T/art.png" -composite -alpha off assets/icon.png
# Play Store hi-res icon 512x512 (32-bit PNG).
magick assets/icon.png -resize 512x512 store/google-play/icon-512.png
# Splash: art on transparent, the background colour comes from app.json.
cp "$T/art.png" assets/splash-icon.png
magick "$T/bg.png" "$T/art.png" -composite -resize 48x48 assets/favicon.png

# Android adaptive icon: keep art inside the 66% safe zone.
magick "$T/bg.png" assets/android-icon-background.png
magick -size 1024x1024 xc:none \( "$T/art.png" -resize 62% \) -gravity center -composite assets/android-icon-foreground.png
magick -size 1024x1024 xc:none \( "$T/trail.png" -resize 62% -fill white -colorize 100 \) \
  -gravity center -composite assets/android-icon-monochrome.png

# Feature graphic 1024x500: night gradient, icon art on the left, title on the right.
magick -size 1024x500 gradient:'#0C1B2A'-'#050816' \
  \( "$T/art.png" -resize 440x440 \) -gravity west -geometry +40+0 -composite \
  -gravity west -fill '#FFD45C' -pointsize 110 -font '/System/Library/Fonts/Supplemental/Arial Bold.ttf' -annotate +520-40 'Lumi' \
  -fill '#C9CEDC' -pointsize 34 -font '/System/Library/Fonts/SFNS.ttf' -annotate +526+50 'Firefly path puzzle' \
  store/google-play/feature-graphic.png

rm -rf "$T"
echo "icons generated"
