const SPREADSHEET_ID = "13EBGEDRvmEAGtBwMFmbbl7-msEjXQFlEdToJyTxATjM";
const HOJA_NOMINA = "Nomina";
const HOJA_BITACORA = "Bitacora Accesos";

function obtenerLibro() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function normalizarDocumento(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function esRutChileno(valor) {
  const rut = normalizarDocumento(valor);
  return /^\d{7,8}[0-9K]$/.test(rut);
}

function formatearDocumento(valor) {
  const documento = normalizarDocumento(valor);

  // Solo aplica formato de RUT cuando tiene estructura de RUT chileno.
  if (!esRutChileno(documento)) {
    return documento;
  }

  const cuerpo = documento.slice(0, -1);
  const dv = documento.slice(-1);
  return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
}

function buscarPersona(documentoBuscado) {
  const libro = obtenerLibro();
  const hojaNomina = libro.getSheetByName(HOJA_NOMINA);

  if (!hojaNomina) {
    throw new Error(`No existe la pestaña "${HOJA_NOMINA}".`);
  }

  const ultimaFila = hojaNomina.getLastRow();
  if (ultimaFila < 2) return null;

  // A = RUT/Documento, B = Nombre, C = Empresa
  const datos = hojaNomina.getRange(2, 1, ultimaFila - 1, 3).getValues();
  const documentoNormalizado = normalizarDocumento(documentoBuscado);

  for (const fila of datos) {
    if (normalizarDocumento(fila[0]) === documentoNormalizado) {
      return {
        usuario: String(fila[1] || "").trim(),
        empresa: String(fila[2] || "").trim()
      };
    }
  }

  return null;
}

function generarFolio(hoja, ahora) {
  const zona = Session.getScriptTimeZone();
  const fechaFolio = Utilities.formatDate(ahora, zona, "yyyyMMdd");
  const prefijo = "TNP-" + fechaFolio + "-";
  const ultimaFila = hoja.getLastRow();
  let correlativo = 1;

  if (ultimaFila >= 2) {
    const folios = hoja.getRange(2, 1, ultimaFila - 1, 1).getValues().flat();
    correlativo = folios.filter(folio => String(folio).startsWith(prefijo)).length + 1;
  }

  return prefijo + String(correlativo).padStart(6, "0");
}

function responder(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const bloqueo = LockService.getScriptLock();

  try {
    bloqueo.waitLock(10000);

    const libro = obtenerLibro();
    const hojaBitacora = libro.getSheetByName(HOJA_BITACORA);

    if (!hojaBitacora) {
      throw new Error(`No existe la pestaña "${HOJA_BITACORA}".`);
    }

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("La solicitud no contiene datos.");
    }

    const datos = JSON.parse(e.postData.contents);
    const documento = normalizarDocumento(datos.rut || datos.documento);

    if (!documento) {
      throw new Error("No se recibió un RUT o documento.");
    }

    // La hoja Nomina pasa a ser la confirmación de identidad del servidor.
    const persona = buscarPersona(documento);
    const autorizado = Boolean(persona);
    const resultado = autorizado ? "AUTORIZADO" : "DENEGADO";
    const usuario = persona ? persona.usuario : "NO IDENTIFICADO";
    const empresa = persona ? persona.empresa : "NO IDENTIFICADA";

    const ahora = new Date();
    const zona = Session.getScriptTimeZone();
    const fecha = Utilities.formatDate(ahora, zona, "dd-MM-yyyy");
    const hora = Utilities.formatDate(ahora, zona, "HH:mm:ss");
    const folio = generarFolio(hojaBitacora, ahora);

    hojaBitacora.appendRow([
      folio,
      fecha,
      hora,
      formatearDocumento(documento),
      resultado,
      usuario,
      empresa
    ]);

    return responder({
      status: "ok",
      folio,
      resultado,
      autorizado,
      usuario,
      empresa,
      documento: formatearDocumento(documento)
    });

  } catch (error) {
    return responder({ status: "error", message: error.message });
  } finally {
    try {
      bloqueo.releaseLock();
    } catch (_) {}
  }
}

function probarRegistro() {
  const evento = {
    postData: {
      contents: JSON.stringify({ rut: "11639043-4" })
    }
  };

  const respuesta = doPost(evento);
  Logger.log(respuesta.getContent());
}
