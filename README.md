# TNP Acceso — versión funcional

Portal estático móvil para validar si un RUT pertenece a la nómina autorizada.

## Incluye
- Interfaz responsive.
- Validación de RUT chileno.
- Consulta local mediante hashes SHA-256.
- Resultado autorizado/no autorizado.
- Reloj y código visual temporal.
- Logo de Metro.

## Limitaciones
- No registra ingresos.
- No consulta SharePoint en tiempo real.
- No bloquea ingresos duplicados por día.
- Cada cambio de nómina requiere regenerar `data/autorizados.json`.


## Cambios V2
- Logo oficial Metro en SVG.
- RUT completo en la pantalla de resultado para comparación con cédula.
- Instrucción explícita de verificación de identidad.
- URL de publicación: https://ajortizp.github.io/tnp-acceso/

## Duplicados diarios
Esta versión sigue siendo estática. No puede bloquear un RUT usado desde otro teléfono,
porque los dispositivos no comparten estado. Para esa función se requiere una API o base
central (Azure Function, Power Pages, Dataverse u otro backend).
