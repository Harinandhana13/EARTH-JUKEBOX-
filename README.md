# Earth Jukebox: hear the planet

Earth Jukebox turns Earth science visuals into sound, so people who cannot see a map can still explore it.

- **Image mode:** pick a scene (or a real NASA Earth Information Center frame) and OpenCV measures brightness, colour and edge detail. These drive the pitch, tempo, note density and volume of a live Tone.js soundscape. These are artistic features, **not physical measurements**.
- **NASA data mode:** loads NASA GISS GISTEMP v4 annual global temperature anomalies (1880 to present). Each year is played as a note on a C major pentatonic scale (anomaly -0.6 to +1.5 °C maps to C3 to A5), with a warming-stripes picture and a chart that follow the music.

## Run locally (Windows)

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py app.py
```
macOS/Linux: `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python3 app.py`

Open http://127.0.0.1:5000. If PowerShell blocks activation, use Command Prompt and `.venv\Scripts\activate.bat`.

## Before the demo (2 minutes)
1. **Real NASA EIC frames** are already included in `static/frames/` (ocean colour, sea surface temperature, global CO2, global methane, wetland methane). To add more, drop png/jpg/webp files there and optionally describe them in `static/frames/frames.json` (title, alt text, credit). Restart the app.
2. **Cache NASA data:** with internet on, run `python fetch_nasa_data.py` (or just click "Load NASA GISTEMP data" once). A saved copy is then used automatically if NASA is unreachable.

## Deploy a public link (required for submission)
Push this folder to a public GitHub repo, then on Render.com choose New > Web Service > connect the repo. `render.yaml` and `Procfile` are included (start command: `gunicorn app:app`). Open the Render URL in a private window to confirm it works without login.

## Accessibility
Skip link, visible keyboard focus, all controls reachable by keyboard, `aria-live` status messages, alt-style descriptions for every scene, "Read description aloud", reduced-motion support, and sound that never starts without a button press.

## NASA data and attribution
NASA Goddard Institute for Space Studies (GISS), GISS Surface Temperature Analysis (GISTEMP), version 4: https://data.giss.nasa.gov/gistemp/ (CSV: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv). Anomalies are relative to the 1951-1980 mean. Check NASA's current citation guidance on the dataset page before submitting.

### Included NASA frames (SVS images, unaltered)
- Sea surface temperature, El Niño 2026: NASA SVS, Kel Elkins, JPL MUR SST data. https://svs.gsfc.nasa.gov/5688
- Ocean colour, El Niño 2026: NASA SVS, Kel Elkins, NASA PACE data. https://svs.gsfc.nasa.gov/5687
- Global CO2 (DYAMOND), 2020: NASA SVS, AJ Christensen, Greg Shirah, Helen-Nicole Kostis, Mark SubbaRao; scientist Lesley Ott. https://svs.gsfc.nasa.gov/5436/
- Global methane, 2021: NASA SVS, Helen-Nicole Kostis and AJ Christensen; scientists Lesley Ott and Brad Weir; GMAO GEOS model data. https://svs.gsfc.nasa.gov/5116/
- Methane from wetlands, Sep 2021: NASA SVS. https://svs.gsfc.nasa.gov/5054/
The El Niño pages update daily, so the saved images are the versions downloaded on 14 November 2026.

The four extra built-in scenes are illustrative images generated in the browser and are not NASA imagery. The app contains no NASA logos.

## Notes
Needs Python 3.10+, a modern browser and internet for the Tone.js CDN (and NASA data on first load). Scientific caution: red does not automatically mean hot in an image; always read the original legend.
