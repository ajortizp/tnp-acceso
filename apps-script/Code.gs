function normalizarRut(valor) {
  return String(valor || "")
    .replace(/[^0-9kK]/g, "")
    .toUpperCase();
}

function formatearRut(valor) {
  const rut = normalizarRut(valor);

  if (rut.length < 2) {
    return rut;
  }

  const cuerpo = rut.slice(0, -1);
  const dv = rut.slice(-1);

  return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
}

function buscarPersona(rutBuscado) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hojaNomina = libro.getSheetByName("Nomina");

  if (!hojaNomina) {
    throw new Error('No existe la pestaña "Nomina".');
  }

  const ultimaFila = hojaNomina.getLastRow();

  if (ultimaFila < 2) {
    return null;
  }

  const datos = hojaNomina
    .getRange(2, 1, ultimaFila - 1, 3)
    .getValues();

  const rutNormalizado = normalizarRut(rutBuscado);

  for (const fila of datos) {
    if (normalizarRut(fila[0]) === rutNormalizado) {
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
    const folios = hoja
      .getRange(2, 1, ultimaFila - 1, 1)
      .getValues()
      .flat();

    correlativo =
      folios.filter(folio => String(folio).startsWith(prefijo)).length + 1;
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

    const libro = SpreadsheetApp.getActiveSpreadsheet();
    const hojaBitacora = libro.getSheetByName("Bitacora Accesos");

    if (!hojaBitacora) {
      throw new Error('No existe la pestaña "Bitacora Accesos".');
    }

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("La solicitud no contiene datos.");
    }

    const datos = JSON.parse(e.postData.contents);
    const rut = normalizarRut(datos.rut);
    const resultado = String(datos.resultado || "SIN RESULTADO")
      .trim()
      .toUpperCase();

    if (!rut) {
      throw new Error("No se recibió un RUT.");
    }

    const persona = buscarPersona(rut);

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
      formatearRut(rut),
      resultado,
      usuario,
      empresa
    ]);

    return responder({
      status: "ok",
      folio,
      usuario,
      empresa
    });

  } catch (error) {
    return responder({
      status: "error",
      message: error.message
    });

  } finally {
    try {
      bloqueo.releaseLock();
    } catch (_) {
      // El bloqueo puede no haberse adquirido si ocurrió un error temprano.
    }
  }
}

function probarRegistro() {
  const evento = {
    postData: {
      contents: JSON.stringify({
        rut: "11639043-4",
        resultado: "PRUEBA"
      })
    }
  };

  const respuesta = doPost(evento);
  Logger.log(respuesta.getContent());
}
