const audio = document.getElementById("audio");
const visuals = document.querySelectorAll(".visual");
const overlay = document.getElementById("overlay");

let audioContext;
let analyser;
let source;
let dataArray;
let started = false;

document.body.addEventListener("click", async () => {
  if (started) return;
  started = true;

  setupAudio();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  audio.play();
  animate();

  overlay.style.opacity = 0;
  setTimeout(() => overlay.style.display = "none", 1000);
});

function setupAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();

  source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
}

function animate() {
  requestAnimationFrame(animate);

  analyser.getByteFrequencyData(dataArray);

  let avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
  let intensity = avg / 255;

  visuals.forEach((img, i) => {
    let depth = i / visuals.length; // 0 (front) → 1 (back)

    // 🎯 Cinematic tuning
    let blur = depth * 6 + intensity * 4; // reduced blur
    let scale = 1 + depth * 0.15 + intensity * 0.12;
    let opacity = 0.35 + (1 - depth) * 0.5;

    // subtle parallax movement
    let moveX = (intensity * 15) * (i % 2 === 0 ? 1 : -1);
    let moveY = intensity * 8;

    // gentle color shift (less aggressive)
    let hue = (avg * 1.5 + i * 40) % 360;

    img.style.filter = `
      blur(${blur}px)
      brightness(${1 + intensity * 0.6})
      hue-rotate(${hue}deg)
    `;

    img.style.opacity = opacity;

    img.style.transform = `
      scale(${scale})
      translate(${moveX}px, ${moveY}px)
    `;
  });
}