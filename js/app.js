let authorizedHashes = new Set();
let clockTimer = null;
let currentRut = "";

const form = document.getElementById("form-rut");
const rutInput = document.getElementById("rut");
const errorBox = document.getElementById("error");
const submitButton = document.getElementById("validar");
const consulta = document.getElementById("consulta");
const resultado = document.getElementById("resultado");
const otraConsulta = document.getElementById("otra-consulta");

function normalizeRut(value) {
  return String(value || "").replace(/[^0-9kK]/g, "").toUpperCase();
}
function formatRut(value) {
  const rut = normalizeRut(value);
  if (rut.length < 2) return rut;
  const body = rut.slice(0, -1);
  const dv = rut.slice(-1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}
function isValidChileanRut(value) {
  const rut = normalizeRut(value);
  if (!/^\d{7,8}[0-9K]$/.test(rut)) return false;
  const body = rut.slice(0, -1);
  const expected = rut.slice(-1);
  let sum = 0, multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const result = 11 - (sum % 11);
  const calculated = result === 11 ? "0" : result === 10 ? "K" : String(result);
  return calculated === expected;
}
async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function maskRut(rut) {
  return `RUT validado: ${formatRut(rut)}`;
}
function codeForCurrentWindow(rut) {
  const windowNumber = Math.floor(Date.now() / 30000);
  let value = 2166136261;
  const seed = `${normalizeRut(rut)}-${windowNumber}-TNP`;
  for (let i = 0; i < seed.length; i++) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}
function localDateTime() {
  const now = new Date();
  return {
    date: now.toLocaleDateString("es-CL"),
    time: now.toLocaleTimeString("es-CL")
  };
}
function updateGlobalClocks() {
  const parts = localDateTime();
  const footerDate = document.getElementById("footer-date");
  const footerTime = document.getElementById("footer-time");
  const resultClock = document.getElementById("result-clock");
  if (footerDate) footerDate.textContent = parts.date;
  if (footerTime) footerTime.textContent = parts.time;
  if (resultClock) resultClock.textContent = `${parts.date} · ${parts.time}`;
}
function updateProof(rut) {
  const parts = localDateTime();
  document.getElementById("codigo").textContent = codeForCurrentWindow(rut);
  document.getElementById("hora").textContent = `${parts.date} · ${parts.time}`;
  updateGlobalClocks();
}
function showResult(authorized, rut) {
  consulta.classList.add("hidden");
  resultado.className = `result-screen ${authorized ? "authorized" : "denied"}`;
  resultado.classList.remove("hidden");

  document.getElementById("estado-icono").textContent = authorized ? "✓" : "×";
  document.getElementById("estado-titulo").textContent =
    authorized ? "ACCESO AUTORIZADO" : "ACCESO NO AUTORIZADO";
  document.getElementById("estado-detalle").textContent = authorized
    ? "Muestra esta pantalla al personal de seguridad."
    : "Dirígete al punto de registro manual.";

  const proof = document.getElementById("comprobante");
  proof.classList.toggle("hidden", !authorized);
  currentRut = rut;
  document.getElementById("rut-masked").textContent = maskRut(rut);

  if (clockTimer) clearInterval(clockTimer);
  updateGlobalClocks();
  if (authorized) {
    updateProof(rut);
    clockTimer = setInterval(() => updateProof(rut), 1000);
  } else {
    clockTimer = setInterval(updateGlobalClocks, 1000);
  }
}
async function loadAuthorizedData() {
  const response = await fetch("data/autorizados.json", { cache: "no-store" });
  if (!response.ok) throw new Error("No fue posible cargar la nómina.");
  const data = await response.json();
  authorizedHashes = new Set(data.ruts);
}
rutInput.addEventListener("input", () => {
  rutInput.value = formatRut(rutInput.value);
  errorBox.textContent = "";
});
form.addEventListener("submit", async event => {
  event.preventDefault();
  const rut = normalizeRut(rutInput.value);
  if (!isValidChileanRut(rut)) {
    errorBox.textContent = "Ingrese un RUT chileno válido.";
    rutInput.focus();
    return;
  }
  submitButton.disabled = true;
  submitButton.innerHTML = "<span>◌</span> VALIDANDO…";
  try {
    const rutHash = await sha256(rut);
    await new Promise(resolve => setTimeout(resolve, 450));
    showResult(authorizedHashes.has(rutHash), rut);
  } catch {
    errorBox.textContent = "No fue posible realizar la consulta. Intente nuevamente.";
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = "<span>⌄</span> VALIDAR ACCESO";
  }
});
otraConsulta.addEventListener("click", () => {
  if (clockTimer) clearInterval(clockTimer);
  resultado.classList.add("hidden");
  resultado.classList.remove("authorized", "denied");
  consulta.classList.remove("hidden");
  form.reset();
  errorBox.textContent = "";
  rutInput.focus();
  updateGlobalClocks();
});
updateGlobalClocks();
setInterval(updateGlobalClocks, 1000);
loadAuthorizedData().catch(() => {
  errorBox.textContent = "La nómina no pudo cargarse. Contacte al responsable.";
  submitButton.disabled = true;
});
