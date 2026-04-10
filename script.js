const audio = document.getElementById("audio");
const visuals = document.querySelectorAll(".visual");
const overlay = document.getElementById("overlay");

let audioContext;
let analyser;
let source;
let dataArray;
let started = false;

// 🎯 image switching state
let currentIndex = 0;

// 🎸 beat detection state (mids)
let lastMid = 0;
let beatCooldown = 0;

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

  analyser.fftSize = 1024;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
}

function getFrequencyRange(data, start, end) {
  let slice = data.slice(start, end);
  let sum = slice.reduce((a, b) => a + b, 0);
  return sum / slice.length / 255;
}

function animate() {
  requestAnimationFrame(animate);

  analyser.getByteFrequencyData(dataArray);

  let bass = getFrequencyRange(dataArray, 0, 40);
  let mids = getFrequencyRange(dataArray, 40, 200); // 🎸 guitar zone
  let highs = getFrequencyRange(dataArray, 200, 512);

  // 🎸 BEAT DETECTION (mid spikes)
  let midIncrease = mids - lastMid;

  if (midIncrease > 0.08 && mids > 0.2 && beatCooldown <= 0) {
    // switch image on guitar hit
    currentIndex = (currentIndex + 1) % visuals.length;

    beatCooldown = 10; // prevents rapid flicker
  }

  lastMid = mids;
  beatCooldown--;

  visuals.forEach((img, i) => {

    // 🖼️ FADE ACTIVE IMAGE
    img.style.opacity = i === currentIndex ? 0.85 : 0;

    // 🌈 KEEP YOUR EXISTING COLOR SYSTEM
    let hue = (mids * 200 + highs * 150 + bass * 100) % 360;

    let moveX = (bass - highs) * 40;
    let moveY = (mids - bass) * 25;

    img.style.filter = `
      blur(${2 + highs * 8}px)
      brightness(${1 + mids * 0.6})
      hue-rotate(${hue}deg)
    `;

    img.style.transform = `
      scale(1.05)
      translate(${moveX}px, ${moveY}px)
    `;
  });
}