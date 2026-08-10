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

  // Si es un RUT chileno válido, se acepta.
  if (isValidChileanRut(doc)) {
    return true;
  }

  /*
   * Documento extranjero.
   *
   * Se permiten:
   * - Letras A-Z
   * - Números 0-9
   * - Entre 5 y 20 caracteres
   *
   * Los puntos, guiones y espacios ya fueron eliminados
   * por normalizeRut().
   */
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
 * REGISTRO EN APPS SCRIPT
 * ========================================================= */

/*
 * No se agrega Content-Type: application/json para evitar
 * una solicitud CORS previa desde GitHub Pages.
 *
 * Apps Script procesa el cuerpo mediante:
 * e.postData.contents
 */

async function registrarAcceso(rut, autorizado) {
  const controller = new AbortController();

  const timeoutId = setTimeout(
    () => controller.abort(),
    8000
  );

  try {
    const response = await fetch(API_REGISTRO, {
      method: "POST",

      body: JSON.stringify({
        rut: normalizeRut(rut),

        resultado:
          autorizado
            ? "AUTORIZADO"
            : "DENEGADO"
      }),

      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

  } catch (error) {

    /*
     * La bitácora no debe impedir que se muestre
     * la validación al usuario.
     */

    console.error(
      "No fue posible registrar el acceso:",
      error
    );

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
  rut
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
   *
   * Si corresponde a un RUT chileno:
   * 12.345.678-9
   *
   * Si corresponde a documento extranjero:
   * AB123456
   * ===================================================== */

  const esRutChileno =
    isValidChileanRut(rut);

  document.getElementById(
    "rut-masked"
  ).textContent =
    esRutChileno

      ? `RUT validado: ${formatRut(rut)}`

      : `Documento validado: ${rut}`;


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
     * K, puntos o guion, asumimos que
     * el usuario está escribiendo un RUT
     * chileno y aplicamos el formato.
     */

    if (
      /^[0-9K.\-]*$/i.test(
        value
      )
    ) {

      value =
        formatRut(value);

    }


    /*
     * Si contiene otra letra,
     * se considera potencialmente
     * un documento extranjero y
     * NO se formatea como RUT.
     */

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


    /*
     * Normalización:
     *
     * RUT:
     * 12.345.678-9
     * ↓
     * 123456789
     *
     * Documento:
     * AB-123456
     * ↓
     * AB123456
     */

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
       * El hash siempre se calcula
       * sobre el documento normalizado.
       */

      const rutHash =
        await sha256(rut);


      /*
       * Pequeña espera visual.
       */

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            450
          )
      );


      /*
       * Busca el SHA-256 dentro de
       * autorizados.json.
       */

      const autorizado =
        authorizedHashes.has(
          rutHash.toLowerCase()
        );


      /* ---------- RESULTADO ---------- */

      showResult(
        autorizado,
        rut
      );


      /*
       * El registro en la bitácora
       * ocurre en segundo plano.
       *
       * No bloquea la respuesta visual.
       */

      void registrarAcceso(
        rut,
        autorizado
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
