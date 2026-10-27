# Rentaautos

Sistema de gestión de alquileres reescrito en **TypeScript + React**, con **Supabase** como backend: PostgreSQL, Auth, RLS y API de datos. Interfaz en español y precios en soles peruanos.

## Ejecutar

Requiere Node.js 22.14 o posterior y npm.

```powershell
npm install
npm run dev
```

Abre http://127.0.0.1:3000. La configuración del proyecto Supabase ya está en `.env.local` de esta copia. Este archivo está excluido de Git. En otra máquina, copia `.env.example` a `.env.local` y configura la **clave pública** de tu proyecto. Nunca uses una clave secreta ni `service_role` en variables `VITE_`.

```powershell
npm run check
npm run build
npm start
npm test
```

`npm start` sirve la compilación local para revisión. Para publicar, sirve `dist/client` en un hosting estático y configura las URL de redirección de Auth en Supabase para el dominio elegido.

## Usar la aplicación

- La primera visita abre una demo con los cuatro vehículos originales y tres reservas ficticias. Puedes probar los formularios, búsquedas y cancelaciones. Los cambios de la demo viven en memoria y desaparecen al recargar.
- Pulsa **Conectar mi oficina**, crea una cuenta, confirma el correo si Supabase lo solicita e inicia sesión. Los datos de la cuenta se guardan en Supabase.
- Cada cuenta empieza con una oficina vacía. Agrega tus vehículos o pulsa **Cargar vehículos de ejemplo**. La demo del navegador no se importa automáticamente.
- Crea reservas con nombre, DNI de ocho dígitos, auto y fechas. La cotización comprueba disponibilidad; PostgreSQL vuelve a validar y calcula el total al guardar.
- Desde el detalle puedes editar una reserva antes de entregar el auto. Registra la entrega y la devolución con kilometraje, combustible y observaciones. La devolución finaliza el alquiler; cancelar libera el período antes de la entrega.
- En **Pagos**, registra adelantos, cobros y reembolsos; consulta cobrado neto y saldo. El **Comprobante** se puede imprimir o guardar como PDF desde el navegador.
- El resumen destaca devoluciones para hoy y atrasadas. Los mensajes de validación aparecen junto a cada campo.
- Flota, reservas y clientes tienen búsqueda y exportación CSV. El calendario permite recorrer semanas y abrir una reserva.

## Reglas del negocio

Precio = tarifa diaria × diferencia de días. Recojo y devolución son fechas ocupadas, de acuerdo con el proyecto original. Por ejemplo, una reserva del 10 al 13 cobra tres días e impide otra reserva del mismo auto que empiece el día 13. Se rechazan fechas invertidas, recojos pasados, DNI inválidos, placas duplicadas y vehículos en mantenimiento o alquiler externo.

La exclusión GiST de PostgreSQL protege las reservas activas contra solapamientos. Los totales enviados por el cliente se sustituyen por el cálculo de base de datos. RLS limita lecturas y escrituras a la cuenta propietaria; un cliente no puede cambiar el propietario de un auto ni acceder a la oficina de otra cuenta.

## Supabase configurado

Proyecto: `qexbfirzwpkmekdwmleo`.

- MCP registrado y autenticado mediante OAuth.
- Tres migraciones aplicadas: `rental_initial`, `rental_operations` y `rental_operations_hardening`. Tablas `rental_autos`, `rental_reservas`, `rental_pagos` y `rental_inspecciones`, protegidas con RLS.
- Tipos TypeScript generados desde el esquema desplegado.
- Clave pública configurada localmente. La autorización MCP administra el proyecto; la sesión de cada usuario de la aplicación se gestiona por separado con Supabase Auth.

Para un proyecto nuevo, aplica todos los archivos de `supabase/migrations/` en orden mediante Supabase CLI o el editor SQL. `supabase/tests/rental.sql` y `supabase/tests/operations.sql` verifican las reglas y RLS dentro de transacciones que terminan en ROLLBACK. No dejan usuarios ni datos de prueba.

## Estructura

```text
client/
  App.tsx                  Navegación, sesión y operaciones
  components/             Formularios, detalle, pagos, comprobante y autenticación
  components/Fleet.tsx     Calendario y lista de vehículos
  components/ui.tsx        Diálogos, filtros y controles comunes
  supabase.ts              Cliente tipado, consultas y errores
  database.types.ts        Tipos del esquema real
  domain.ts                Tipos, fechas, moneda y datos de demo
  operations.ts            Reglas operativas de la demo
  validation.ts            Validaciones compartidas por campo
  export.ts                Exportación CSV
  styles.css               Diseño responsive
supabase/migrations/       Esquema versionado aplicado
supabase/tests/            Pruebas SQL con rollback
e2e/                      Pruebas Playwright de interfaz y conexión remota
docs/                     Contexto, decisiones y evidencias
legacy/laravel/           Código PHP original conservado
```

El código antiguo no participa en la nueva aplicación. Se conserva para consulta, junto con sus dependencias y configuración originales. No se encontró una base de datos con datos reales que importar; esta migración implementa las entidades y reglas presentes en el código.

## Diseño y verificación

Se aplicó **Taste Skill**, dirección Framed sheet, seed `657109794`. La tipografía IBM Plex Sans se sirve localmente. La identidad utiliza un marco gris verdoso y un calendario de ocupación por matrícula; no utiliza fotografías externas. Los autos de la tabla son ilustraciones SVG esquemáticas.

Evidencias y límites de las comprobaciones: [docs/verification/RESULTADOS.md](docs/verification/RESULTADOS.md). El análisis del sistema original y las decisiones están en [docs/CONTEXTO.md](docs/CONTEXTO.md).

## Segunda revisión

Las seis mejoras de seguimiento están descritas en [docs/SEGUNDA-REVISION.md](docs/SEGUNDA-REVISION.md), con reglas, pruebas y casos de caja negra. Esta rama conserva la migración inicial a React/TypeScript y Supabase; el Laravel original permanece en `legacy/laravel`.
