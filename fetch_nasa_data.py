"""Download NASA GISTEMP once so the demo also works offline. Run: python fetch_nasa_data.py"""
import json, time
from app import load_nasa_gistemp, CACHE_FILE
values = load_nasa_gistemp()
CACHE_FILE.write_text(json.dumps({"values": values, "fetched_at": time.strftime("%Y-%m-%d", time.gmtime())}), encoding="utf-8")
print(f"Saved {len(values)} annual NASA GISTEMP records to {CACHE_FILE}")
