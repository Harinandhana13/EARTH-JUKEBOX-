# NASA Space Apps 2026: submission copy (edit before pasting)

## Project name
Earth Jukebox

## Summary (50-200 words)
Earth Jukebox turns NASA Earth science visuals into sound so people who cannot see a map can still explore it. Choose a scene or a NASA Earth Information Center frame, and computer vision (OpenCV) measures brightness, colour and edge detail. These drive the pitch, tempo, note density and volume of a live Tone.js soundscape. A second mode sonifies NASA GISS GISTEMP v4 global temperature anomalies from 1880 onward: each year is a note on a pentatonic scale, so warming is heard as rising pitch beside a warming-stripes picture. Every control works by keyboard, screen readers get plain-language descriptions, and results can be read aloud. Image mappings are clearly labelled artistic, not measured data. Climate data should be experienced by everyone, not only those who can see it.

## How it works
Flask serves the web app. For an image, OpenCV (server side) measures average brightness, saturation, the share of red-toned and blue-toned pixels, and edge density. These map to a central pitch, tempo, note density and volume, and Tone.js plays a looping chord pattern in a musical scale. For NASA data, the server downloads the GISTEMP v4 annual table (with a saved offline copy); each year becomes a note on a pentatonic scale, and a chart and warming stripes follow the music.

## Tech stack
Python, Flask, OpenCV, NumPy, JavaScript (Canvas, Web Speech API), Tone.js, HTML/CSS, gunicorn on Render.

## Creativity
Sound makes Earth data explorable without sight. The same visual idea works in two ways: a frame-to-music translation for imagery, and a data-to-melody translation where a warming planet is literally a rising tune, paired with warming stripes. Musical scales keep the output pleasant instead of noisy.

## Impact
EIC visualizations are mostly visual, which excludes blind and low-vision users. Earth Jukebox gives them, and everyone else, a second sense for climate data, plus screen-reader-friendly descriptions. It can be extended with more EIC datasets.

## NASA data used
NASA GISS GISTEMP v4 global land-ocean temperature anomalies (https://data.giss.nasa.gov/gistemp/). NASA Earth Information Center visualizations from the NASA Scientific Visualization Studio, included unaltered: (1) El Niño 2026 sea surface temperature anomaly, https://svs.gsfc.nasa.gov/5688 (JPL MUR SST); (2) El Niño 2026 ocean apparent visible wavelength, https://svs.gsfc.nasa.gov/5687 (NASA PACE); (3) DYAMOND global carbon dioxide, https://svs.gsfc.nasa.gov/5436/; (4) global atmospheric methane (GMAO GEOS model), https://svs.gsfc.nasa.gov/5116/; (5) methane emissions from wetlands, https://svs.gsfc.nasa.gov/5054/. Images saved 14 November 2026.

## AI / Super Intelligence disclosure (edit to match what is true)
AI assistance (Claude, by Anthropic) was used to help write and review the code and documentation. No AI-generated images, video or audio are used: gallery scenes are drawn by code and all audio is synthesized live by Tone.js. No NASA logos, flags or branding appear in AI-generated content.

## 7-slide deck outline (max 7 incl. title)
1. Title: Earth Jukebox, one-line promise, team name
2. Problem: EIC data is visual, so blind and low-vision users are shut out
3. Solution: frame in, soundscape out (screenshot of the gallery)
4. How the translation works: colour/edges to pitch, tempo, density
5. NASA data mode: GISTEMP years to notes, stripes, rising pitch
6. Accessibility and honesty: keyboard, screen reader, "artistic not measured"
7. Impact, next steps, link and QR code

## 30-second video script
0-5s: "NASA's Earth data is mostly visual." 5-12s: pick an EIC frame, press play, sound starts. 12-24s: switch to NASA data, press Play, pitch climbs as years go by, stripes turn red. 24-30s: "Earth Jukebox. Hear the planet." Record the screen with system audio on; add English captions.

## Final checklist
- [ ] Public link works in a private window, no login
- [x] Real EIC frames added and credited (re-check NASA reproduction guidelines)
- [ ] NASA data loads (try once online)
- [ ] Summary 50-200 words, AI disclosure matches reality
- [ ] Deck (7 slides) or video (30 s) uploaded
- [ ] Clicked "Submit for Judging" before Sun Nov 15, 11:59 PM
