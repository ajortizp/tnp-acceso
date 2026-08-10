/*
 * Control de Acceso TNP - app.js v2.0
 *
 * - Valida RUT chileno o documento extranjero.
 * - Calcula SHA-256 y consulta data/autorizados.json.
 * - Muestra el resultado de autorización.
 * - Envía el documento normalizado y el resultado a Google Apps Script.
 *
 * La nómina con nombres y empresas permanece privada en Google Sheets.
 */

let authorizedHashes = new Set();
let clockTimer = null;

const API_REGISTRO =
  "https://script.google.com/macros/s/AKfycby_vPCDenEovdtKl8U2lQuISr1pPO0M0ilnL8qac4iZ_2l4cenWfdgWOZsKpCy-Bqb2dg/exec";

const form = document.getElementById("form-rut");
const rutInput = document.getElementById("rut");
const errorBox = document.getElementById("error");
const submitButton = document.getElementById("validar");
const consulta = document.getElementById("consulta");
const resultado = document.getElementById("resultado");
const otraConsulta = document.getElementById("otra-consulta");


/* =========================================================
 * NORMALIZACIÓN DE RUT / DOCUMENTO
 * ========================================================= */

function normalizeRut(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}


/* =========================================================
 * FORMATO RUT CHILENO
 * ========================================================= */

function formatRut(value) {
  const rut = normalizeRut(value);

  if (rut.length < 2) {
    return rut;
  }

  const body = rut.slice(0, -1);
  const dv = rut.slice(-1);

  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}


/* =========================================================
 * VALIDACIÓN RUT CHILENO
 * ========================================================= */

function isValidChileanRut(value) {
  const rut = normalizeRut(value);

  if (!/^\d{7,8}[0-9K]$/.test(rut)) {
    return false;
  }

  const body = rut.slice(0, -1);
  const expected = rut.slice(-1);

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const result = 11 - (sum % 11);

  const calculated =
    result === 11
      ? "0"
      : result === 10
        ? "K"
        : String(result);

  return calculated === expected;
}


/* =========================================================
 * VALIDACIÓN GENERAL
 *
 * Acepta:
 * - RUT chileno válido.
 * - Documento extranjero alfanumérico.
 * ========================================================= */

function isValidDocument(value) {
  const doc = normalizeRut(value);

  if (isValidChileanRut(doc)) {
    return true;
  }

  return /^[A-Z0-9]{5,20}$/.test(doc);
}


/* =========================================================
 * SHA-256
 * ========================================================= */

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);

  const buffer = await crypto.subtle.digest(
    "SHA-256",
    bytes
  );

  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}


/* =========================================================
 * REGISTRO / CONSULTA EN APPS SCRIPT
 * ========================================================= */

async function registrarAcceso(rut, autorizadoLocal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(API_REGISTRO, {
      method: "POST",
      body: JSON.stringify({
        rut: normalizeRut(rut),
        resultadoLocal: autorizadoLocal ? "AUTORIZADO" : "DENEGADO"
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.status !== "ok") {
      throw new Error(
        data?.message ||
        "Respuesta inválida de Apps Script."
      );
    }

    return data;

  } catch (error) {
    console.error(
      "No fue posible registrar/consultar el acceso:",
      error
    );

    return null;

  } finally {
    clearTimeout(timeoutId);
  }
}


/* =========================================================
 * CÓDIGO DINÁMICO DE COMPROBACIÓN
 * ========================================================= */

function codeForCurrentWindow(rut) {
  const windowNumber =
    Math.floor(Date.now() / 30000);

  let value = 2166136261;

  const seed =
    `${normalizeRut(rut)}-${windowNumber}-TNP`;

  for (
    let i = 0;
    i < seed.length;
    i += 1
  ) {

    value ^= seed.charCodeAt(i);

    value =
      Math.imul(
        value,
        16777619
      );
  }

  return Math.abs(value >>> 0)
    .toString(36)
    .toUpperCase()
    .padStart(6, "0")
    .slice(0, 6);
}


/* =========================================================
 * FECHA Y HORA
 * ========================================================= */

function localDateTime() {
  const now = new Date();

  return {
    date:
      now.toLocaleDateString("es-CL"),

    time:
      now.toLocaleTimeString("es-CL")
  };
}


/* =========================================================
 * RELOJES
 * ========================================================= */

function updateGlobalClocks() {
  const parts = localDateTime();

  const footerDate =
    document.getElementById(
      "footer-date"
    );

  const footerTime =
    document.getElementById(
      "footer-time"
    );

  const resultClock =
    document.getElementById(
      "result-clock"
    );

  if (footerDate) {
    footerDate.textContent =
      parts.date;
  }

  if (footerTime) {
    footerTime.textContent =
      parts.time;
  }

  if (resultClock) {
    resultClock.textContent =
      `${parts.date} · ${parts.time}`;
  }
}


/* =========================================================
 * COMPROBANTE
 * ========================================================= */

function updateProof(rut) {
  const parts =
    localDateTime();

  const codigo =
    document.getElementById(
      "codigo"
    );

  const hora =
    document.getElementById(
      "hora"
    );

  if (codigo) {
    codigo.textContent =
      codeForCurrentWindow(rut);
  }

  if (hora) {
    hora.textContent =
      `${parts.date} · ${parts.time}`;
  }

  updateGlobalClocks();
}


/* =========================================================
 * MOSTRAR RESULTADO
 * ========================================================= */

function showResult(
  authorized,
  rut,
  persona = null
) {

  consulta.classList.add(
    "hidden"
  );

  resultado.className =
    `result-screen ${
      authorized
        ? "authorized"
        : "denied"
    }`;

  resultado.classList.remove(
    "hidden"
  );


  /* ---------- ICONO ---------- */

  document.getElementById(
    "estado-icono"
  ).textContent =
    authorized
      ? "✓"
      : "×";


  /* ---------- TÍTULO ---------- */

  document.getElementById(
    "estado-titulo"
  ).textContent =
    authorized
      ? "ACCESO AUTORIZADO"
      : "ACCESO NO AUTORIZADO";


  /* ---------- DETALLE ---------- */

  document.getElementById(
    "estado-detalle"
  ).textContent =
    authorized

      ? "Muestra esta pantalla al personal de seguridad."

      : "El RUT o documento no se encuentra en la nómina autorizada. Dirígete al registro manual.";


  /* ---------- COMPROBANTE ---------- */

  const proof =
    document.getElementById(
      "comprobante"
    );

  proof.classList.toggle(
    "hidden",
    !authorized
  );


  /* =====================================================
   * IDENTIFICACIÓN MOSTRADA
   * ===================================================== */

  const esRutChileno =
    isValidChileanRut(rut);

  document.getElementById(
    "rut-masked"
  ).textContent =
    esRutChileno

      ? `RUT validado: ${formatRut(rut)}`

      : `Documento validado: ${rut}`;


  /* =====================================================
   * NOMBRE Y EMPRESA
   * ===================================================== */

  const datosPersona =
    document.getElementById(
      "datos-persona"
    );

  const personaNombre =
    document.getElementById(
      "persona-nombre"
    );

  const personaEmpresa =
    document.getElementById(
      "persona-empresa"
    );


  if (
    authorized &&
    persona &&
    persona.usuario
  ) {

    personaNombre.textContent =
      persona.usuario;

    personaEmpresa.textContent =
      persona.empresa ||
      "Empresa no informada";

    datosPersona.classList.remove(
      "hidden"
    );

  } else {

    personaNombre.textContent =
      "";

    personaEmpresa.textContent =
      "";

    datosPersona.classList.add(
      "hidden"
    );
  }


  /* ---------- RELOJ ---------- */

  if (clockTimer) {
    clearInterval(
      clockTimer
    );
  }

  updateGlobalClocks();


  if (authorized) {

    updateProof(rut);

    clockTimer =
      setInterval(
        () => updateProof(rut),
        1000
      );

  } else {

    clockTimer =
      setInterval(
        updateGlobalClocks,
        1000
      );

  }
}


/* =========================================================
 * CARGAR NÓMINA AUTORIZADA
 * ========================================================= */

async function loadAuthorizedData() {

  const response =
    await fetch(
      "data/autorizados.json",
      {
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      "No fue posible cargar la nómina."
    );

  }


  const data =
    await response.json();


  if (
    !data ||
    !Array.isArray(data.ruts)
  ) {

    throw new Error(
      "El archivo de autorizados tiene un formato inválido."
    );

  }


  authorizedHashes =
    new Set(

      data.ruts

        .map(
          hash =>
            String(hash || "")
              .trim()
              .toLowerCase()
        )

        .filter(Boolean)

    );
}


/* =========================================================
 * CAMPO RUT / DOCUMENTO
 * ========================================================= */

rutInput.addEventListener(
  "input",
  () => {

    let value =
      rutInput.value
        .toUpperCase()
        .replace(
          /[^A-Z0-9.\-]/g,
          ""
        );


    /*
     * Si solamente contiene números,
     * K, puntos o guion,
     * se formatea como RUT.
     */

    if (
      /^[0-9K.\-]*$/i.test(
        value
      )
    ) {

      value =
        formatRut(value);

    }


    rutInput.value =
      value;

    errorBox.textContent =
      "";

  }
);


/* =========================================================
 * VALIDAR ACCESO
 * ========================================================= */

form.addEventListener(
  "submit",

  async event => {

    event.preventDefault();


    const rut =
      normalizeRut(
        rutInput.value
      );


    /* ---------- VALIDACIÓN ---------- */

    if (
      !isValidDocument(rut)
    ) {

      errorBox.textContent =
        "Ingrese un RUT o documento de identificación válido.";

      rutInput.focus();

      return;
    }


    /* ---------- BOTÓN ---------- */

    submitButton.disabled =
      true;

    submitButton.textContent =
      "VALIDANDO…";

    errorBox.textContent =
      "";


    try {

      /*
       * SHA-256 sobre documento normalizado.
       */

      const rutHash =
        await sha256(rut);


      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            450
          )
      );


      /*
       * Validación local contra autorizados.json
       */

      const autorizado =
        authorizedHashes.has(
          rutHash.toLowerCase()
        );


      /*
       * Apps Script:
       *
       * - consulta la hoja Nomina
       * - confirma identidad
       * - registra la bitácora
       * - devuelve Nombre y Empresa
       */

      const respuestaServidor =
        await registrarAcceso(
          rut,
          autorizado
        );


      /*
       * Si Apps Script responde,
       * su resultado contra Nomina
       * se considera definitivo.
       *
       * Si temporalmente no responde,
       * se conserva la validación local
       * mediante SHA-256.
       */

      const autorizadoFinal =
        respuestaServidor

          ? respuestaServidor.resultado ===
            "AUTORIZADO"

          : autorizado;


      showResult(
        autorizadoFinal,
        rut,
        respuestaServidor
      );


    } catch (error) {

      console.error(
        "Error durante la validación:",
        error
      );


      errorBox.textContent =
        "No fue posible realizar la consulta. Intente nuevamente.";


    } finally {

      submitButton.disabled =
        false;

      submitButton.textContent =
        "VALIDAR ACCESO";

    }
  }
);


/* =========================================================
 * NUEVA CONSULTA
 * ========================================================= */

otraConsulta.addEventListener(
  "click",
  () => {

    if (clockTimer) {

      clearInterval(
        clockTimer
      );

      clockTimer =
        null;

    }


    resultado.classList.add(
      "hidden"
    );


    resultado.classList.remove(
      "authorized",
      "denied"
    );


    consulta.classList.remove(
      "hidden"
    );


    form.reset();

    errorBox.textContent =
      "";

    rutInput.focus();

    updateGlobalClocks();

  }
);


/* =========================================================
 * INICIO
 * ========================================================= */

updateGlobalClocks();

setInterval(
  updateGlobalClocks,
  1000
);


loadAuthorizedData()
  .catch(error => {

    console.error(
      "Error al cargar la nómina:",
      error
    );


    errorBox.textContent =
      "La nómina no pudo cargarse. Contacte al responsable.";


    submitButton.disabled =
      true;

  });
