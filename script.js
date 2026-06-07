const names = [
  "Alice",
  "Bob",
  "Charlie",
  "Diana",
  "Ethan",
  "Fiona",
  "George",
  "Hannah",
];

const colors = [
  "#f5c518",
  "#e4572e",
  "#29335c",
  "#669bbc",
  "#669c35",
  "#a162e8",
  "#f49d37",
  "#d64550",
];

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spin-btn");
const resultEl = document.getElementById("result");

const radius = canvas.width / 2;
const sliceAngle = (2 * Math.PI) / names.length;

let currentRotation = 0;
let isSpinning = false;

function drawWheel(rotation) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(radius, radius);
  ctx.rotate(rotation);

  names.forEach((name, i) => {
    const startAngle = i * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    ctx.save();
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#1e1e2f";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillText(name, radius - 16, 6);
    ctx.restore();
  });

  ctx.restore();
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function spin() {
  if (isSpinning) return;
  isSpinning = true;
  spinBtn.disabled = true;
  resultEl.textContent = "";

  const extraSpins = 5 + Math.random() * 3;
  const targetRotation = currentRotation + extraSpins * 2 * Math.PI;
  const startRotation = currentRotation;
  const duration = 4000;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(t);
    currentRotation = startRotation + (targetRotation - startRotation) * eased;
    drawWheel(currentRotation);

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      spinBtn.disabled = false;
      announceWinner(currentRotation);
    }
  }

  requestAnimationFrame(animate);
}

function announceWinner(rotation) {
  // The pointer sits at the top (angle = -PI/2 in canvas terms, i.e. 3*PI/2).
  const normalized = ((3 * Math.PI) / 2 - (rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const winnerIndex = Math.floor(normalized / sliceAngle) % names.length;
  resultEl.textContent = `🎉 ${names[winnerIndex]}!`;
}

drawWheel(currentRotation);
spinBtn.addEventListener("click", spin);
