const imageInput = document.getElementById("imageInput");
const dropZone = document.getElementById("dropZone");
const previewWrap = document.getElementById("previewWrap");
const previewImage = document.getElementById("previewImage");
const playButton = document.getElementById("playButton");
const stopButton = document.getElementById("stopButton");
const soundState = document.getElementById("soundState");
const soundOrb = document.getElementById("soundOrb");
const analysisText = document.getElementById("analysisText");
const accessibleDescription = document.getElementById("accessibleDescription");

let currentFeatures = null;
let synth = null;
let loop = null;
let imageUrl = null;

function percent(value) { return `${Math.round(value * 100)}%`; }

async function analyzeBlob(blob) {
  const form = new FormData();
  form.append("frame", blob, "earth-frame.png");
  analysisText.textContent = "Analyzing image features…";
  const response = await fetch("/api/analyze", { method: "POST", body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Analysis failed.");
  currentFeatures = data;
  document.getElementById("brightness").textContent = percent(data.brightness);
  document.getElementById("redShare").textContent = percent(data.red_share);
  document.getElementById("blueShare").textContent = percent(data.blue_share);
  document.getElementById("edgeDensity").textContent = percent(data.edge_density);
  analysisText.textContent = data.description;
  accessibleDescription.textContent =
    `Image analysis: ${data.description} The generated central tone is ${data.pitch_hz} hertz, ` +
    `the tempo is ${data.tempo_bpm} beats per minute, and the sound level is mapped from image brightness.`;
  playButton.disabled = false;
  soundState.textContent = "Image analyzed — ready to listen";
}

async function loadImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    analysisText.textContent = "Please choose a supported image file.";
    return;
  }
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = URL.createObjectURL(file);
  previewImage.src = imageUrl;
  previewWrap.hidden = false;
  stopSound();
  try { await analyzeBlob(file); }
  catch (err) { analysisText.textContent = err.message; }
}

imageInput.addEventListener("change", e => loadImage(e.target.files[0]));
document.getElementById("removeImage").addEventListener("click", () => {
  stopSound(); currentFeatures = null; previewWrap.hidden = true;
  imageInput.value = ""; playButton.disabled = true;
  analysisText.textContent = "Choose an image to analyze its visual features.";
  ["brightness","redShare","blueShare","edgeDensity"].forEach(id => document.getElementById(id).textContent = "—");
  accessibleDescription.textContent = "No image has been analyzed yet.";
  soundState.textContent = "Your soundscape is waiting";
});
["dragenter","dragover"].forEach(name => dropZone.addEventListener(name, e => {
  e.preventDefault(); dropZone.classList.add("dragging");
}));
["dragleave","drop"].forEach(name => dropZone.addEventListener(name, e => {
  e.preventDefault(); dropZone.classList.remove("dragging");
}));
dropZone.addEventListener("drop", e => loadImage(e.dataTransfer.files[0]));

function noteFromFrequency(freq) {
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  return Tone.Frequency(midi, "midi").toNote();
}
async function startSound() {
  if (!currentFeatures) return;
  await Tone.start();
  stopSound();
  const f = currentFeatures;
  const mode = document.getElementById("instrument").value;
  const speed = Number(document.getElementById("speed").value);
  const volume = Math.max(-30, Math.min(-8, 20 * Math.log10(f.volume)));
  const synthOptions = mode === "pluck"
    ? { oscillator: { type: "triangle" }, envelope: { attack: .01, decay: .3, sustain: .05, release: 1 } }
    : mode === "ambient"
      ? { oscillator: { type: "sine" }, envelope: { attack: .5, decay: .8, sustain: .45, release: 2 } }
      : { oscillator: { type: "triangle" }, envelope: { attack: .04, decay: .2, sustain: .25, release: .7 } };
  synth = new Tone.PolySynth(Tone.Synth, synthOptions).toDestination();
  synth.volume.value = volume;
  const base = noteFromFrequency(f.pitch_hz);
  const intervals = [0, 3, 7, 12, 15, 19, 24, 28];
  let step = 0;
  const count = Math.max(1, Math.min(5, f.note_density));
  const intervalSeconds = 60 / (f.tempo_bpm * speed) / 2;
  loop = new Tone.Loop(time => {
    for (let n=0; n<count; n++) {
      const idx = (step + n * 2) % intervals.length;
      const midi = Tone.Frequency(base).toMidi() + intervals[idx];
      const note = Tone.Frequency(midi, "midi").toNote();
      synth.triggerAttackRelease(note, mode === "ambient" ? "2n" : "8n", time + n * .035);
    }
    step = (step + 1) % intervals.length;
  }, intervalSeconds);
  loop.start(0);
  Tone.Transport.start();
  soundOrb.classList.add("playing");
  playButton.disabled = true; stopButton.disabled = false;
  soundState.textContent = "Playing a soundscape based on the selected image";
}
function stopSound() {
  if (loop) { loop.stop(); loop.dispose(); loop = null; }
  if (synth) { synth.releaseAll(); synth.dispose(); synth = null; }
  if (Tone.Transport.state === "started") Tone.Transport.stop();
  soundOrb.classList.remove("playing");
  playButton.disabled = !currentFeatures;
  stopButton.disabled = true;
  if (currentFeatures) soundState.textContent = "Soundscape paused";
}
playButton.addEventListener("click", () => startSound().catch(err => {
  console.error(err); soundState.textContent = "Audio could not start. Check your browser audio permission.";
}));
stopButton.addEventListener("click", stopSound);

document.getElementById("speakButton").addEventListener("click", () => {
  if (!("speechSynthesis" in window)) {
    soundState.textContent = "Text-to-speech is not supported in this browser."; return;
  }
  const utterance = new SpeechSynthesisUtterance(accessibleDescription.textContent);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
});
window.addEventListener("beforeunload", () => {
  stopSound();
  if (imageUrl) URL.revokeObjectURL(imageUrl);
});

// NASA GISTEMP numeric-data sonification mode
let nasaValues = [];
let nasaSynth = null;
let nasaTimer = null;
let nasaIndex = 0;
const nasaStatus = document.getElementById("nasaStatus");
const nasaCanvas = document.getElementById("nasaChart");
const nasaSlider = document.getElementById("nasaYearSlider");
const nasaYearLabel = document.getElementById("nasaYearLabel");
const nasaReading = document.getElementById("nasaReading");

function drawNasaChart() {
  if (!nasaValues.length) return;
  const ctx = nasaCanvas.getContext("2d");
  const w = nasaCanvas.width, h = nasaCanvas.height;
  ctx.clearRect(0, 0, w, h);
  const pad = {l: 48, r: 16, t: 18, b: 34};
  const vals = nasaValues.map(v => v.anomaly_c);
  const min = Math.min(-0.6, ...vals), max = Math.max(1.3, ...vals);
  const x = i => pad.l + i * (w-pad.l-pad.r) / Math.max(1, vals.length-1);
  const y = v => pad.t + (max-v) * (h-pad.t-pad.b) / (max-min);
  ctx.strokeStyle = "#d6deea"; ctx.lineWidth = 1;
  for (let t = Math.ceil(min*2)/2; t <= max; t += .5) {
    ctx.beginPath(); ctx.moveTo(pad.l,y(t)); ctx.lineTo(w-pad.r,y(t)); ctx.stroke();
    ctx.fillStyle="#65738a"; ctx.font="12px sans-serif"; ctx.fillText(t.toFixed(1), 8, y(t)+4);
  }
  ctx.beginPath(); ctx.strokeStyle="#e66a4e"; ctx.lineWidth=2.5;
  vals.forEach((v,i)=>{ if(i===0) ctx.moveTo(x(i),y(v)); else ctx.lineTo(x(i),y(v)); }); ctx.stroke();
  const current = nasaValues[nasaIndex];
  ctx.beginPath(); ctx.fillStyle="#173e76"; ctx.arc(x(nasaIndex),y(current.anomaly_c),5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#65738a"; ctx.font="12px sans-serif";
  ctx.fillText(String(nasaValues[0].year), pad.l, h-9);
  ctx.fillText(String(nasaValues[nasaValues.length-1].year), w-58, h-9);
}

function stripeColor(v) {
  const t = Math.max(-1, Math.min(1, v / 1.2));
  const r = t > 0 ? 235 : 235 + t * 170, b = t < 0 ? 235 : 235 - t * 170, g = 235 - Math.abs(t) * 150;
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}
function drawStripes() {
  const cv = document.getElementById("nasaStripes");
  if (!cv || !nasaValues.length) return;
  const ctx = cv.getContext("2d"), w = cv.width / nasaValues.length;
  nasaValues.forEach((v, i) => { ctx.fillStyle = stripeColor(v.anomaly_c); ctx.fillRect(i * w, 0, w + 1, cv.height); });
  ctx.fillStyle = "#fff"; ctx.fillRect(nasaIndex * w - 1, 0, Math.max(3, w), cv.height);
}
const PENTATONIC = [0, 2, 4, 7, 9];
function anomalyToMidi(a) {
  const d = Math.round((Math.max(-0.6, Math.min(1.5, a)) + 0.6) / 2.1 * 14);
  return 48 + 12 * Math.floor(d / 5) + PENTATONIC[d % 5];
}
function updateNasaSelection(index) {
  if (!nasaValues.length) return;
  nasaIndex = Math.max(0, Math.min(nasaValues.length-1, Number(index)));
  const item = nasaValues[nasaIndex];
  nasaSlider.value = String(nasaIndex);
  nasaYearLabel.textContent = item.year;
  nasaReading.textContent = `${item.year}: ${item.anomaly_c >= 0 ? "+" : ""}${item.anomaly_c.toFixed(2)} °C relative to the 1951–1980 average.`;
  drawNasaChart(); drawStripes();
}

document.getElementById("loadNasaButton").addEventListener("click", async () => {
  const button = document.getElementById("loadNasaButton");
  button.disabled = true; nasaStatus.textContent = "Connecting to NASA GISS…";
  try {
    const response = await fetch("/api/nasa-gistemp");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "NASA data could not be loaded.");
    nasaValues = data.values;
    nasaSlider.max = String(nasaValues.length-1); nasaSlider.disabled = false;
    document.getElementById("nasaDataPanel").hidden = false;
    nasaStatus.textContent = `${nasaValues.length} annual records from ${data.source}` + (data.cached ? ` (saved copy from ${data.fetched_at}; NASA was unreachable).` : ` (downloaded ${data.fetched_at}).`);
    updateNasaSelection(0);
    document.getElementById("playNasaButton").disabled = false;
  } catch (error) { nasaStatus.textContent = error.message; }
  finally { button.disabled = false; }
});

nasaSlider.addEventListener("input", e => updateNasaSelection(e.target.value));

async function playNasaData() {
  if (!nasaValues.length) return;
  await Tone.start(); stopNasaData();
  nasaSynth = new Tone.Synth({oscillator:{type:"sine"}, envelope:{attack:.04, decay:.2, sustain:.25, release:.7}}).toDestination();
  nasaSynth.volume.value = -13;
  document.getElementById("playNasaButton").disabled = true;
  document.getElementById("stopNasaButton").disabled = false;
  const playNext = () => {
    if (nasaIndex >= nasaValues.length) { stopNasaData(); return; }
    const item = nasaValues[nasaIndex];
    // Map the measured anomaly (°C) to a note on a C major pentatonic scale (C3-A5).
    nasaSynth.triggerAttackRelease(Tone.Frequency(anomalyToMidi(item.anomaly_c), "midi").toNote(), 0.45);
    updateNasaSelection(nasaIndex);
    nasaIndex += 1;
    nasaTimer = window.setTimeout(playNext, 520);
  };
  playNext();
}
function stopNasaData() {
  if (nasaTimer) { clearTimeout(nasaTimer); nasaTimer = null; }
  if (nasaSynth) { nasaSynth.dispose(); nasaSynth = null; }
  document.getElementById("playNasaButton").disabled = !nasaValues.length;
  document.getElementById("stopNasaButton").disabled = true;
}
document.getElementById("playNasaButton").addEventListener("click", () => {
  if (nasaIndex >= nasaValues.length-1) updateNasaSelection(0);
  playNasaData().catch(err => nasaStatus.textContent = "Audio could not start: " + err.message);
});
document.getElementById("stopNasaButton").addEventListener("click", stopNasaData);
window.addEventListener("beforeunload", stopNasaData);
