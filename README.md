# Control de Acceso TNP — Pack versión 2.0

Este paquete contiene los archivos necesarios para integrar la aplicación web
con una bitácora privada en Google Sheets.

## Contenido

- `js/app.js`: reemplazo completo del archivo JavaScript del sitio.
- `apps-script/Code.gs`: código completo para Google Apps Script.
- `docs/ARQUITECTURA.md`: descripción de la arquitectura.
- `docs/DESPLIEGUE.md`: instrucciones de instalación y prueba.

## Estructura esperada del Google Sheets

### Pestaña: Bitacora Accesos

| Folio | Fecha | Hora | RUT | Resultado | Usuario | Empresa |

### Pestaña: Nomina

| RUT | Usuario | Empresa |

La pestaña `Nomina` debe permanecer privada y protegida. Apps Script se ejecuta
como el propietario del documento, por lo que puede leerla aunque esté protegida
para otros editores.

## Importante

La aplicación web continúa usando `data/autorizados.json` solamente con hashes.
Los nombres y empresas no se publican en GitHub.
