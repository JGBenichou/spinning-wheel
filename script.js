const defaultNames = [
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
  "#4cc9f0",
  "#669bbc",
  "#669c35",
  "#a162e8",
  "#f49d37",
  "#d64550",
];

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spin-btn");
const autoPickBtn = document.getElementById("auto-pick-btn");
const importBtn = document.getElementById("import-btn");
const importInput = document.getElementById("import-input");
const downloadBtn = document.getElementById("download-btn");
const downloadFormatSelect = document.getElementById("download-format");
const resultEl = document.getElementById("result");
const pickedListEl = document.getElementById("picked-list");
const confettiContainer = document.getElementById("confetti-container");

const confettiColors = ["#f5c518", "#e4572e", "#29335c", "#669bbc", "#669c35", "#a162e8", "#f49d37", "#d64550"];

const radius = canvas.width / 2;

// The pointer sits on the right side of the wheel, i.e. canvas angle 0.
const pointerAngle = 0;

let wheelNames = [...defaultNames];
let pickedNames = [];
let currentRotation = 0;
let isSpinning = false;
let audioCtx = null;
let autoPickRunning = false;
let stopRequested = false;

function sliceAngle() {
  return (2 * Math.PI) / wheelNames.length;
}

function drawWheel(rotation) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (wheelNames.length === 0) {
    return;
  }

  const slice = sliceAngle();

  ctx.save();
  ctx.translate(radius, radius);
  ctx.rotate(rotation);

  wheelNames.forEach((name, i) => {
    const startAngle = i * slice;
    const endAngle = startAngle + slice;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    ctx.save();
    ctx.rotate(startAngle + slice / 2);
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

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playNote(ac, freq, start, duration, type, peakGain) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peakGain, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration);
}

function playCheer() {
  const ac = getAudioContext();
  const now = ac.currentTime;

  // Warm ascending major arpeggio (C5 E5 G5 C6) on a soft sine tone
  const arpeggio = [523.25, 659.25, 783.99, 1046.5];
  arpeggio.forEach((freq, i) => {
    playNote(ac, freq, now + i * 0.1, 0.35, "sine", 0.3);
  });

  // Soft sustained major chord (E5 G5 C6) to land on, on a mellow triangle tone
  const chordStart = now + arpeggio.length * 0.1;
  const chord = [659.25, 783.99, 1046.5];
  chord.forEach((freq) => {
    playNote(ac, freq, chordStart, 1.1, "triangle", 0.14);
  });
}

function launchConfetti() {
  const pieceCount = 40;

  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    piece.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
    piece.style.animationDelay = `${Math.random() * 0.3}s`;

    piece.addEventListener("animationend", () => piece.remove());
    confettiContainer.appendChild(piece);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function updateButtonStates() {
  const empty = wheelNames.length === 0;
  spinBtn.disabled = isSpinning || autoPickRunning || empty;
  autoPickBtn.disabled = !autoPickRunning && (isSpinning || empty);
  downloadBtn.disabled = pickedNames.length === 0;
}

function renderPickedList() {
  pickedListEl.innerHTML = "";
  pickedNames.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    pickedListEl.appendChild(li);
  });
}

function announceWinner(rotation) {
  const slice = sliceAngle();
  const normalized = ((pointerAngle - rotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const winnerIndex = Math.floor(normalized / slice) % wheelNames.length;
  const winner = wheelNames[winnerIndex];

  wheelNames.splice(winnerIndex, 1);
  pickedNames.push(winner);

  resultEl.textContent = `🎉 ${winner}!`;
  renderPickedList();
  playCheer();
  launchConfetti();
  drawWheel(currentRotation);
}

function spin() {
  return new Promise((resolve) => {
    if (isSpinning || wheelNames.length === 0) {
      resolve();
      return;
    }

    isSpinning = true;
    updateButtonStates();
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
        announceWinner(currentRotation);
        updateButtonStates();
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

async function autoPickAll() {
  if (autoPickRunning) {
    stopRequested = true;
    autoPickBtn.disabled = true;
    autoPickBtn.textContent = "Stopping...";
    return;
  }

  autoPickRunning = true;
  stopRequested = false;
  autoPickBtn.textContent = "Stop Auto Pick";
  updateButtonStates();

  while (wheelNames.length > 0 && !stopRequested) {
    await spin();
    if (stopRequested) {
      break;
    }
    await wait(800);
  }

  autoPickRunning = false;
  stopRequested = false;
  autoPickBtn.textContent = "Auto Pick All";
  updateButtonStates();
}

function parseNamesFromText(text) {
  return text
    .split(/[\r\n,]+/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

function parseNamesFromWorkbook(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

  return rows
    .flat()
    .map((cell) => String(cell).trim())
    .filter((name) => name.length > 0);
}

function applyImportedNames(parsed) {
  if (parsed.length === 0) {
    return;
  }

  wheelNames = parsed;
  pickedNames = [];
  currentRotation = 0;
  resultEl.textContent = "";

  renderPickedList();
  drawWheel(currentRotation);
  updateButtonStates();
}

function importNames(file) {
  const reader = new FileReader();

  if (/\.xlsx$/i.test(file.name)) {
    reader.onload = () => applyImportedNames(parseNamesFromWorkbook(new Uint8Array(reader.result)));
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = () => applyImportedNames(parseNamesFromText(String(reader.result)));
    reader.readAsText(file);
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function downloadAsTxt() {
  const lines = pickedNames.map((name, i) => `${i + 1}. ${name}`);
  downloadBlob(new Blob([lines.join("\n")], { type: "text/plain" }), "picked-names.txt");
}

function downloadAsCsv() {
  const rows = ["Order,Name", ...pickedNames.map((name, i) => `${i + 1},"${name.replace(/"/g, '""')}"`)];
  downloadBlob(new Blob([rows.join("\n")], { type: "text/csv" }), "picked-names.csv");
}

function downloadAsXlsx() {
  const data = [["Order", "Name"], ...pickedNames.map((name, i) => [i + 1, name])];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Picked Names");
  const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  downloadBlob(new Blob([arrayBuffer], { type: "application/octet-stream" }), "picked-names.xlsx");
}

function downloadAsPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Picked Names", 14, 18);

  doc.setFontSize(12);
  pickedNames.forEach((name, i) => {
    doc.text(`${i + 1}. ${name}`, 14, 30 + i * 8);
  });

  doc.save("picked-names.pdf");
}

function downloadPickedNames() {
  if (pickedNames.length === 0) {
    return;
  }

  switch (downloadFormatSelect.value) {
    case "csv":
      downloadAsCsv();
      break;
    case "xlsx":
      downloadAsXlsx();
      break;
    case "pdf":
      downloadAsPdf();
      break;
    default:
      downloadAsTxt();
  }
}

drawWheel(currentRotation);
renderPickedList();
updateButtonStates();

spinBtn.addEventListener("click", spin);
autoPickBtn.addEventListener("click", autoPickAll);
importBtn.addEventListener("click", () => importInput.click());
importInput.addEventListener("change", () => {
  const file = importInput.files[0];
  if (file) {
    importNames(file);
  }
  importInput.value = "";
});
downloadBtn.addEventListener("click", downloadPickedNames);
