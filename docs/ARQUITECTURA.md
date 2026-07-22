# Arquitectura de la versión 2.0

```text
Navegador
  |
  |-- Normaliza el RUT
  |-- Calcula SHA-256
  |-- Compara con data/autorizados.json
  |-- Muestra AUTORIZADO o DENEGADO
  |
  +---- POST: RUT + resultado
            |
            v
      Google Apps Script
            |
            |-- Busca el RUT en la pestaña privada Nomina
            |-- Obtiene Usuario y Empresa
            |-- Genera Folio, Fecha y Hora
            |
            v
      Bitacora Accesos
```

## Separación de responsabilidades

- **GitHub Pages / DMZ:** interfaz y validación mediante hashes.
- **Google Sheets — Nomina:** datos privados de personas y empresas.
- **Apps Script:** servicio de integración.
- **Bitacora Accesos:** auditoría de consultas.

## Consideración de seguridad

La URL de Apps Script queda visible en el JavaScript del cliente. Esta versión
evita exponer la nómina, pero no impide que alguien que conozca la URL intente
enviar solicitudes. Para un entorno corporativo definitivo se recomienda una
API de TI con autenticación, control de origen, registro de IP y políticas de
retención.
