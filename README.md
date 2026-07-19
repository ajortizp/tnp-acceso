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
