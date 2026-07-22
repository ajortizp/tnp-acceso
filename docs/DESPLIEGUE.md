# Instrucciones de despliegue

## 1. Google Sheets

Verifica que existan las pestañas:

- `Bitacora Accesos`
- `Nomina`

La fila 1 de `Nomina` debe contener:

```text
RUT | Usuario | Empresa
```

La fila 1 de `Bitacora Accesos` debe contener:

```text
Folio | Fecha | Hora | RUT | Resultado | Usuario | Empresa
```

## 2. Apps Script

1. Abre `Extensiones > Apps Script`.
2. Reemplaza todo el código por `apps-script/Code.gs`.
3. Guarda.
4. Ejecuta `probarRegistro`.
5. Confirma que se cree una fila con Rosa.
6. Ve a `Implementar > Gestionar implementaciones`.
7. Edita la aplicación web y crea una nueva versión.
8. Confirma:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: según la configuración necesaria para la página.
9. Verifica que la URL `/exec` sea la misma configurada en `js/app.js`.

## 3. GitHub

1. Abre `js/app.js`.
2. Reemplaza todo el contenido por el archivo incluido en este paquete.
3. Haz commit.
4. Espera entre uno y dos minutos.
5. Abre la página publicada en una ventana privada o fuerza la recarga con
   `Ctrl + F5`.

## 4. Prueba final

1. Consulta el RUT de Rosa.
2. La pantalla debe indicar `ACCESO AUTORIZADO`.
3. Revisa `Bitacora Accesos`.
4. Debe aparecer:
   - Resultado: `AUTORIZADO`
   - Usuario: Rosa
   - Empresa: EULEN

## Diagnóstico rápido

Si la página valida pero no registra:

- Actualiza la implementación de Apps Script.
- Confirma que la URL termine en `/exec`.
- Confirma que `Ejecutar como` esté configurado como **Yo**.
- Revisa `Apps Script > Ejecuciones`.
- Abre las herramientas del navegador y revisa la consola.
- Fuerza una recarga con `Ctrl + F5`.
