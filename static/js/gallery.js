// Earth scene gallery: built-in illustrative scenes + real NASA EIC frames from static/frames/.
const galleryEl = document.getElementById("gallery");

function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

const SCENES = [
  { id: "temp", name: "Temperature anomaly",
    alt: "Illustrative world-style map: blue cooler areas in the south, orange and red warmer patches strongest toward the north.",
    draw(ctx, w, h) {
      const g = ctx.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, "#1c4f8f"); g.addColorStop(.5, "#2aa7a0"); g.addColorStop(1, "#e4573b");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const r = rng(7);
      for (let i = 0; i < 70; i++) {
        const y = r() * h, warm = y < h * .55;
        ctx.fillStyle = warm ? "rgba(255,120,70,.33)" : "rgba(80,170,230,.25)";
        ctx.beginPath(); ctx.ellipse(r() * w, y, 20 + r() * 50, 8 + r() * 22, 0, 0, 6.3); ctx.fill();
      }
    } },
  { id: "ice", name: "Arctic sea ice",
    alt: "Illustrative polar view: dark blue ocean with a bright white, ragged ice cap in the centre.",
    draw(ctx, w, h) {
      ctx.fillStyle = "#0c2a55"; ctx.fillRect(0, 0, w, h);
      const r = rng(11), cx = w / 2, cy = h / 2;
      ctx.beginPath();
      for (let a = 0; a <= 6.29; a += .06) {
        const rad = 95 + Math.sin(a * 5) * 16 + r() * 18;
        ctx[a ? "lineTo" : "moveTo"](cx + Math.cos(a) * rad * 1.4, cy + Math.sin(a) * rad);
      }
      ctx.closePath(); ctx.fillStyle = "#eef6fb"; ctx.fill();
      for (let i = 0; i < 40; i++) { ctx.fillStyle = "rgba(170,210,240,.4)"; ctx.fillRect(cx - 120 + r() * 240, cy - 70 + r() * 140, 14, 5); }
    } },
  { id: "ocean", name: "Ocean colour",
    alt: "Illustrative ocean view: deep blue water with swirling green and teal patches near the edges.",
    draw(ctx, w, h) {
      ctx.fillStyle = "#0a2a5e"; ctx.fillRect(0, 0, w, h);
      const r = rng(23);
      for (let i = 0; i < 120; i++) {
        const edge = r() < .6, x = edge ? (r() < .5 ? r() * 130 : w - r() * 130) : r() * w;
        ctx.fillStyle = `rgba(${40 + r() * 40},${180 + r() * 60},${120 + r() * 60},${.15 + r() * .25})`;
        ctx.beginPath(); ctx.arc(x, r() * h, 10 + r() * 38, 0, 6.3); ctx.fill();
      }
    } },
  { id: "veg", name: "Vegetation",
    alt: "Illustrative land view: bands of dark green forest, lighter green grassland and tan dry ground.",
    draw(ctx, w, h) {
      const bands = ["#7a6a3c", "#b8a463", "#6fa84a", "#2e7d32", "#1b5e20", "#4f9a3a", "#b8a463"];
      const r = rng(31), bh = h / bands.length;
      bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * bh, w, bh + 1); });
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = `rgba(${r() < .5 ? "20,90,30" : "190,170,100"},.22)`;
        ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 12 + r() * 40, 6 + r() * 14, r() * 3, 0, 6.3); ctx.fill();
      }
    } },
];

async function useBlob(blob, previewSrc, note) {
  stopSound();
  previewImage.src = previewSrc; previewWrap.hidden = false;
  try { await analyzeBlob(blob); accessibleDescription.textContent = `${note} ${accessibleDescription.textContent}`; }
  catch (err) { analysisText.textContent = err.message; }
}

function addButton(label, thumbSrc, onClick) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "scene-button";
  b.innerHTML = `<img alt="" src="${thumbSrc}"><span></span>`;
  b.querySelector("span").textContent = label;
  b.addEventListener("click", () => {
    galleryEl.querySelectorAll(".scene-button").forEach(x => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true"); onClick();
  });
  b.setAttribute("aria-pressed", "false");
  galleryEl.appendChild(b);
}

function addBuiltIns() { SCENES.forEach(scene => {
  const cv = document.createElement("canvas"); cv.width = 640; cv.height = 360;
  scene.draw(cv.getContext("2d"), 640, 360);
  const url = cv.toDataURL("image/png");
  addButton(scene.name, url, () => cv.toBlob(blob => useBlob(blob, url, `Illustrative scene, not NASA imagery: ${scene.alt}`), "image/png"));
}); }

fetch("/api/frames").then(r => r.json()).then(({ frames }) => {
  frames.forEach(f => {
    const src = `/static/frames/${encodeURIComponent(f.file)}`;
    addButton(f.title, src, async () => {
      const blob = await (await fetch(src)).blob();
      await useBlob(blob, src, `NASA Earth Information Center frame: ${f.title}. ${f.alt}`);
      document.getElementById("galleryHint").textContent = "Credit: " + f.credit;
    });
  });
  if (frames.length) document.getElementById("galleryHint").textContent = "Frames with photo thumbnails are real NASA Earth Information Center visualizations. The remaining scenes are illustrative images generated in your browser.";
}).catch(() => {}).finally(addBuiltIns);
