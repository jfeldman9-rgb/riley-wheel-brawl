# Waygate art prompts

Painted replacements for the procedural Ways backdrop. The game currently draws these in code (`bonus-waygate/game.js`) so the level never fetches an image. When a painting is ready, it should drop into this folder as a texture at **4096 px or smaller** on both sides (iPad limit). No text in the paintings. Riley and the Trollocs stay on the existing atlases.

Palette: near-black void `#070910`, cold stone `#3a465c` to `#8ea2b8`, guiding-stone light `#7dfff0`, Machin Shin `#c5e7ff` at low opacity. The walkable lane must stay the lightest large shape so fighters read against it.

## 1. Master backdrop (parallax plate, far)

Wide night void of the Ways, no floor, no characters. Endless dark, not a cave wall. A few dozen faint stars and a thin dust of colder specks. Three or four distant floating stone bridges and broken ramps hanging in the black, small enough to feel miles away. One far Guiding stone, a slim obelisk with a dim teal diamond, sitting on an island that has no visible support. Soft, matte stone. No lightning, no fire, no ruins of a city. Leave the lower third empty and darker so a nearer plate and the lane can sit on top. 2048×540 or 4096×1024, transparent or pure void in the empty areas.

## 2. Nearer islands (parallax plate, mid)

Same void, closer. Larger broken bridges, a ramp torn off at one end, a second Guiding stone half-lost in the dark. Edges chipped, undersides in deep shadow so each span has thickness. Still darker and smaller in contrast than the walkable lane. No people. 1600×400 or up to 4096 on the long side. Transparent background.

## 3. Machin Shin (screen-edge wind)

Not a creature and not a face. A cold wind you only see at the edges: thin horizontal wisps of pale blue-white, like breath on glass, denser toward the left and right borders and almost gone in the center. Faint, so it never hides a fighter who walks to the edge of the screen. Loopable horizontally. Transparent center. About 960×540.

## 4. The crumbling bridge (walkable, with depth)

A suspended stone-and-timber span seen from the side, the way a beat-em-up lane is drawn: the top surface is a readable gray-blue road, the front edge is a brighter lip, and the underside shows plank thickness, hanging boards, and chains dropping into black. Four gaps, obviously empty, with broken lips. A few planks cracked and stained darker, not neon. The void below is pure black. No characters. The walk surface must stay lighter than the void behind it.

## 5. Guiding stone (checkpoint)

A single waist-to-head-height obelisk of dark stone standing on the bridge. A cut diamond or leaf-shaped inlay near the top glows teal `#7dfff0`, enough to mark the checkpoint, not a floodlight. Chipped base, cold highlight on one edge. Transparent background. Under 512 px.

## 6. Waygate leaf (exit)

The Waygate's living mark, in the shape of an Avendesora trefoil: three almond leaves around a bright core, teal and white-gold, glowing as if the gate is only half awake. When the exit opens it should be able to pulse brighter. No arch text, no letters. Transparent background. Under 512 px. It sits in front of a faint stone ring, so the painting is the leaf itself, not the whole gate.
