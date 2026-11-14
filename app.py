from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from pathlib import Path
import cv2
import numpy as np
import uuid
import csv
import io
import urllib.request
import json
import os
import time

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 80 * 1024 * 1024
BASE_DIR = Path(__file__).resolve().parent
FRAMES_DIR = BASE_DIR / "static" / "frames"
FRAMES_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
CACHE_FILE = DATA_DIR / "gistemp_cache.json"
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp"}

def analyze_frame(image_bytes):
    """Extract stable visual features and map them to musical controls."""
    data = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("The uploaded file could not be read as an image.")

    # Work at a modest size to keep analysis fast.
    image = cv2.resize(image, (256, 256), interpolation=cv2.INTER_AREA)
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    mean_rgb = rgb.mean(axis=(0, 1))
    brightness = float(hsv[:, :, 2].mean() / 255.0)
    saturation = float(hsv[:, :, 1].mean() / 255.0)

    # Red/blue shares are normalized pixel proportions, not temperatures.
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    red_mask = (r > g * 1.12) & (r > b * 1.12) & (r > 80)
    blue_mask = (b > r * 1.12) & (b > g * 1.02) & (b > 70)
    red_share = float(red_mask.mean())
    blue_share = float(blue_mask.mean())

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 70, 140)
    edge_density = float((edges > 0).mean())

    # Map visual statistics to a pleasant, bounded musical range.
    pitch = int(np.clip(180 + red_share * 900 - blue_share * 90 + brightness * 180, 130, 880))
    tempo = int(np.clip(65 + edge_density * 420 + saturation * 35, 60, 150))
    volume = float(np.clip(0.08 + brightness * 0.28, 0.06, 0.36))
    note_density = int(np.clip(1 + edge_density * 18 + saturation * 4, 1, 8))

    return {
        "brightness": round(brightness, 3),
        "saturation": round(saturation, 3),
        "red_share": round(red_share, 3),
        "blue_share": round(blue_share, 3),
        "edge_density": round(edge_density, 3),
        "mean_rgb": [int(x) for x in mean_rgb],
        "pitch_hz": pitch,
        "tempo_bpm": tempo,
        "volume": round(volume, 3),
        "note_density": note_density,
        "description": (
            f"Average brightness {brightness:.0%}; red-toned pixels {red_share:.0%}; "
            f"blue-toned pixels {blue_share:.0%}; visual edge density {edge_density:.0%}."
        )
    }


NASA_GISTEMP_CSV = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"

def load_nasa_gistemp():
    """Fetch NASA GISTEMP v4 global monthly/annual anomaly table."""
    req = urllib.request.Request(
        NASA_GISTEMP_CSV,
        headers={"User-Agent": "EarthJukebox/1.0 educational sonification"}
    )
    with urllib.request.urlopen(req, timeout=25) as response:
        raw = response.read().decode("utf-8-sig", errors="replace")

    rows = list(csv.reader(io.StringIO(raw)))
    header_index = next((i for i, row in enumerate(rows)
                         if row and row[0].strip().lower() == "year"), None)
    if header_index is None:
        raise ValueError("NASA data format was not recognized. Please try again later.")

    header = [h.strip() for h in rows[header_index]]
    annual_index = next((i for i, h in enumerate(header)
                         if h.upper() in {"J-D", "J-D*", "ANNUAL"}), None)
    if annual_index is None:
        raise ValueError("The annual anomaly column was not found in NASA's table.")

    result = []
    for row in rows[header_index + 1:]:
        if len(row) <= annual_index:
            continue
        try:
            year = int(row[0].strip())
            value_text = row[annual_index].strip().replace("*", "")
            if not value_text or value_text == "***":
                continue
            anomaly = float(value_text)
            result.append({"year": year, "anomaly_c": anomaly})
        except (ValueError, IndexError):
            continue
    if not result:
        raise ValueError("NASA's data table did not contain readable annual values.")
    return result

def read_cache():
    try:
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return None

@app.get("/api/nasa-gistemp")
def nasa_gistemp():
    """Live NASA data first; saved copy of a previous NASA download if offline."""
    meta = {
        "source": "NASA GISS GISTEMP v4",
        "dataset_url": NASA_GISTEMP_CSV,
        "baseline": "1951\u20131980 mean",
        "unit": "\u00b0C anomaly",
    }
    try:
        values = load_nasa_gistemp()
        stamp = time.strftime("%Y-%m-%d", time.gmtime())
        CACHE_FILE.write_text(json.dumps({"values": values, "fetched_at": stamp}), encoding="utf-8")
        return jsonify({**meta, "values": values, "cached": False, "fetched_at": stamp})
    except Exception as exc:
        app.logger.warning("Live NASA fetch failed: %s", exc)
        cached = read_cache()
        if cached and cached.get("values"):
            return jsonify({**meta, "values": cached["values"], "cached": True,
                            "fetched_at": cached.get("fetched_at", "unknown")})
        return jsonify({"error": "Could not reach NASA and no saved copy exists yet. "
                        "Connect to the internet once (or run fetch_nasa_data.py) and try again."}), 502

@app.get("/api/frames")
def frames():
    """List real NASA EIC frames in static/frames/, with titles, descriptions and credits from frames.json."""
    try:
        meta = json.loads((FRAMES_DIR / "frames.json").read_text(encoding="utf-8"))
    except Exception:
        meta = {}
    files = sorted(p.name for p in FRAMES_DIR.iterdir()
                   if p.suffix.lower().lstrip(".") in ALLOWED_IMAGE_EXTENSIONS)
    ordered = [f for f in meta if f in files] + [f for f in files if f not in meta]
    out = []
    for f in ordered:
        m = meta.get(f, {})
        out.append({"file": f,
                    "title": m.get("title", Path(f).stem.replace("_", " ")),
                    "alt": m.get("alt", ""),
                    "credit": m.get("credit", "NASA Earth Information Center frame.")})
    return jsonify({"frames": out})

@app.get("/")
def home():
    return render_template("index.html")

@app.post("/api/analyze")
def analyze():
    if "frame" not in request.files:
        return jsonify({"error": "No image frame was supplied."}), 400
    file = request.files["frame"]
    try:
        result = analyze_frame(file.read())
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        app.logger.exception("Frame analysis failed")
        return jsonify({"error": "Frame analysis failed. Try another image."}), 500

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "Earth Jukebox Sonification API"})

if __name__ == "__main__":
    app.run(host=os.environ.get("HOST", "127.0.0.1"),
            port=int(os.environ.get("PORT", 5000)),
            debug=os.environ.get("FLASK_DEBUG") == "1")
