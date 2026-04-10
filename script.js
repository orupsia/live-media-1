const audio = document.getElementById("audio");
const visuals = document.querySelectorAll(".visual");
const overlay = document.getElementById("overlay");

let audioContext, analyser, dataArray, source;
let started = false;

let activeIndex = 0;
let baseOpacity = 0.10;

let driftX = 0;
let driftY = 0;

// dynamic offsets per image — these now move with the song
let imgOffsets = [...visuals].map(() => ({
  x: (Math.random() - 0.5) * 20,
  y: (Math.random() - 0.5) * 20,
  rot: (Math.random() - 0.5) * 4
}));

let lastBass = 0;
let lastMid = 0;
let drumCooldown = 0;

document.body.addEventListener("click", async () => {
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

  // Stronger band splits for responsiveness
  const bass = getFreq(dataArray, 0, 60);         // kick drum
  const mids = getFreq(dataArray, 60, 250);       // guitar, body
  const highs = getFreq(dataArray, 250, 900);     // shimmer

  // ============================
  // 🥁 STRONGER DRUM REACTION
  // ============================
  const bassHit = bass > 0.14 && (bass - lastBass) > 0.03;

  if (bassHit && drumCooldown <= 0) {
    activeIndex = (activeIndex + 1) % visuals.length;
    drumCooldown = 10;
  }

  lastBass = bass;
  drumCooldown--;

  // ============================
  // 🎸 MORE RESPONSIVE GUITAR DRIFT
  // ============================
  driftX += (mids - 0.1) * 1.3;  // much stronger effect
  driftY += (highs - 0.1) * 1.1;

  // Slow the drift so it doesn't run away
  driftX *= 0.88;
  driftY *= 0.88;

  // ============================
  // APPLY VISUAL EFFECTS
  // ============================

  visuals.forEach((img, i) => {
    const dynamic = imgOffsets[i];

    // Bass pulses push image offsets
    dynamic.x += (Math.random() - 0.5) * bass * 20;
    dynamic.y += (Math.random() - 0.5) * mids * 20;
    dynamic.rot += (Math.random() - 0.5) * highs * 2;

    let isActive = (i === activeIndex);

    // MUCH stronger opacity difference so fading is visible
    const targetOpacity = isActive
      ? baseOpacity + 0.55 + bass * 0.9     // vivid glow
      : baseOpacity + mids * 0.10;          // faint ghost

    img.style.opacity = targetOpacity;

    // Very strong hue activity — kept like you wanted
    let hue = (mids * 200 + highs * 340 + bass * 500) % 360;

    // Scale pulsates heavily on bass
    let scale = 1.02 + bass * 0.22 + mids * 0.05;

    img.style.filter = `
      brightness(${0.85 + bass * 0.45})
      hue-rotate(${hue}deg)
      saturate(${1 + highs * 2})
    `;

    img.style.transform = `
      translate(${driftX * 25 + dynamic.x}px,
                ${driftY * 25 + dynamic.y}px)
      scale(${scale})
      rotate(${dynamic.rot}deg)
    `;
  });
}