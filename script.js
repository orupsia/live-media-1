const audio = document.getElementById("audio");
const visuals = document.querySelectorAll(".visual");
const overlay = document.getElementById("overlay");

let audioContext, analyser, dataArray, source;
let started = false;

let activeIndex = 0;
let baseOpacity = 0.10;

let driftX = 0;
let driftY = 0;
let driftRot = 0;

let lastBass = 0;
let drumCooldown = 0;

// ✅ FIX: listen on overlay instead of body
overlay.addEventListener("click", async () => {
  if (started) return;
  started = true;

  setupAudio();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  audio.play();
  animate();

  overlay.style.display = "none";
});

function setupAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();

  source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  analyser.fftSize = 2048;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
}

function getFreq(data, start, end) {
  let slice = data.slice(start, end);
  let sum = slice.reduce((a, b) => a + b, 0);
  return sum / slice.length / 255;
}

function animate() {
  requestAnimationFrame(animate);
  analyser.getByteFrequencyData(dataArray);

  const bass = getFreq(dataArray, 0, 60);
  const mids = getFreq(dataArray, 60, 250);
  const highs = getFreq(dataArray, 250, 900);

  // ============================
  // 🥁 DRUM DETECTION
  // ============================
  const bassHit = bass > 0.14 && (bass - lastBass) > 0.03;

  if (bassHit && drumCooldown <= 0) {
    activeIndex = (activeIndex + 1) % visuals.length;

    // 💥 camera kick
    driftX += (Math.random() - 0.5) * 25;
    driftY += (Math.random() - 0.5) * 25;

    drumCooldown = 10;
  }

  lastBass = bass;
  drumCooldown--;

  // ============================
  // 🎥 CAMERA SHAKE
  // ============================

  // high frequency jitter
  driftX += (Math.random() - 0.5) * highs * 8;
  driftY += (Math.random() - 0.5) * highs * 8;

  // mid sway
  driftX += (mids - 0.1) * 2;
  driftY += (mids - 0.1) * 2;

  // rotation
  driftRot += (Math.random() - 0.5) * highs * 2;
  driftRot += (mids - 0.1) * 0.5;

  // 🔑 damping (keeps everything centered)
  driftX *= 0.75;
  driftY *= 0.75;
  driftRot *= 0.8;

  // ============================
  // APPLY TO IMAGES
  // ============================

  visuals.forEach((img, i) => {
    let isActive = (i === activeIndex);

    const targetOpacity = isActive
      ? baseOpacity + 0.55 + bass * 0.9
      : baseOpacity + mids * 0.10;

    img.style.opacity = targetOpacity;

    let hue = (mids * 200 + highs * 340 + bass * 500) % 360;
    let scale = 1.02 + bass * 0.22 + mids * 0.05;

    img.style.filter = `
      brightness(${0.85 + bass * 0.45})
      hue-rotate(${hue}deg)
      saturate(${1 + highs * 2})
    `;

    img.style.transform = `
      translate(${driftX}px, ${driftY}px)
      scale(${scale})
      rotate(${driftRot}deg)
    `;
  });
}