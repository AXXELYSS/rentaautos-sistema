# Segunda revisión: seguimiento del alquiler

## Funciones implementadas

| Función | Cómo usarla | Reglas |
| --- | --- | --- |
| Editar una reserva | Reservas → Ver detalle → Editar reserva | Solo activa y sin entrega registrada. Cotiza excluyendo su propio período. Conserva la tarifa acordada del mismo auto y toma la tarifa vigente si cambia de auto. No permite un total inferior a lo cobrado neto. |
| Entrega del vehículo | Detalle → Registrar entrega | Fecha de recojo alcanzada, reserva vigente, kilometraje no decreciente, combustible entero de 0 a 100 y observaciones opcionales. Un vehículo físicamente entregado no se puede entregar a otro alquiler hasta que regrese. |
| Devolución | Detalle → Registrar devolución | Requiere entrega previa. Kilometraje no menor que el de salida. Guarda combustible y observaciones, actualiza el odómetro y finaliza la reserva. No borra los saldos pendientes. |
| Pagos | Detalle → Pagos | Adelantos, saldo pendiente, cobrado neto y métodos de pago. Bloquea sobrepagos. Los movimientos son inmutables: los errores se compensan con reembolsos, nunca borrando el historial. |
| Comprobante | Detalle → Comprobante → Imprimir | Cliente, DNI, vehículo, fechas, tarifa acordada, días, total, cobrado, saldo y movimientos. Desde la impresión del navegador se puede guardar en PDF. |
| Devoluciones pendientes | Resumen de operaciones | Identifica vehículos entregados que deben regresar hoy y los atrasados. Un vehículo no devuelto sigue en alquiler aunque venza su fecha prevista. |
| Validaciones | Junto a cada campo | DNI, fechas, placa, año, tarifa, kilometraje, combustible e importe. Errores asociados al campo con `aria-describedby` y `aria-invalid`. |

Las reservas canceladas con adelantos muestran el importe por devolver. Se puede registrar el reembolso y conservar ambos movimientos. Las reservas entregadas se cierran mediante una devolución, no mediante cancelación. El precio no se prorratea automáticamente por devolución temprana ni se añaden multas por retraso.

## Datos y permisos

Las migraciones se aplican en orden de nombre:

1. `rental_initial`: autos, reservas y protección por cuenta.
2. `rental_operations`: tarifa acordada, odómetro, edición, pagos e inspecciones.
3. `rental_operations_hardening`: sello de creación del servidor, fecha de pago en America/Lima y protección del kilometraje.

Tablas nuevas: `rental_pagos` y `rental_inspecciones`, con RLS, claves foráneas que incluyen al propietario y permisos de solo lectura e inserción para cuentas autenticadas. Las restricciones existentes de solapamientos continúan activas. Las operaciones sobre pagos y entregas bloquean la reserva en PostgreSQL durante su validación para evitar carreras entre escrituras.

La demo reproduce estas operaciones en memoria y continúa reiniciándose al recargar. El acceso autenticado usa las tablas y funciones de Supabase.

## Pruebas

- 16 casos Playwright: los nueve anteriores y siete nuevos de edición, entrega/devolución, pagos/comprobante, cancelación con reembolso, validaciones, avisos por fecha y detalle móvil.
- 24 aserciones SQL adicionales en `supabase/tests/operations.sql`, ejecutadas bajo `authenticated` dentro de una transacción revertida.
- Se conserva `supabase/tests/rental.sql` como regresión del cálculo y las reglas iniciales.
- Verificación HTTP de Auth y rechazo anónimo en las cuatro tablas.
- Compilación TypeScript estricta y auditoría de dependencias.

Los casos de la demo no envían correos ni crean usuarios permanentes. La base de datos se prueba con identidades temporales dentro de `ROLLBACK`. CI en GitHub usa Chromium y omite la prueba remota si no se configuran las variables de Supabase.

## Caja negra: ejemplos para exposición

| Prueba | Entrada | Esperado |
| --- | --- | --- |
| DNI válido | Ocho dígitos | Crear reserva si el resto es válido |
| DNI alfanumérico | `abc12345` | Error junto al DNI; no guardar |
| Fechas invertidas | Devolución igual o anterior al recojo | No cotizar ni guardar |
| Placa duplicada | `ABC-123` en otro auto de la misma oficina | Error junto a la placa |
| Sobrepago | S/300 con saldo de S/260 | Rechazar sin crear movimiento |
| Combustible fuera de rango | `101` | Rechazar el registro |
| Kilometraje inferior | Devolver con menos km que en la salida | Rechazar sin finalizar |
| Entrega y devolución válidas | Odómetro creciente y combustible 0–100 | Guardar ambos registros y finalizar |

Los roles de administrador, empleado y cliente quedan como una ampliación futura; esta revisión mantiene una oficina independiente por cuenta.
