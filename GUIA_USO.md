# Cómo instalar y usar Rentaautos

Guía para ejecutar la segunda revisión en Windows. Los comandos se escriben en PowerShell, dentro de la carpeta del proyecto.

## 1. Requisitos

- Node.js 22.14 o posterior, con npm.
- Git, para descargar el repositorio con los comandos siguientes.
- Conexión a Internet para instalar dependencias y utilizar Supabase.

Comprueba la instalación:

```powershell
node --version
npm --version
git --version
```

La versión actual funciona con React, TypeScript y Supabase. No necesitas iniciar PHP, Laravel, Composer, XAMPP ni una base de datos local.

## 2. Descargar la rama correcta

Abre PowerShell en la carpeta donde quieras guardar el proyecto y ejecuta:

```powershell
git clone --branch codex/segunda-revision-rentaautos --single-branch https://github.com/AXXELYSS/rentaautos-sistema.git rentaautos-segunda-revision
cd rentaautos-segunda-revision
npm ci
```

`npm ci` instala las versiones de las dependencias registradas en el proyecto. Solo debes ejecutarlo en la primera instalación o cuando cambien las dependencias.

## 3. Elegir cómo utilizarlo

### Opción A: probar la demo

No necesitas configurar claves para explorar la demo:

```powershell
npm run dev
```

Abre **http://127.0.0.1:3000** en el navegador. Mantén la terminal abierta mientras usas el sistema.

La demo tiene vehículos y reservas de ejemplo. Puedes editar reservas, registrar entregas, devoluciones y pagos, y generar comprobantes. **Sus cambios son temporales y se pierden al recargar la página.**

### Opción B: guardar datos reales en Supabase

Detén primero el servidor con `Ctrl + C` si está ejecutándose.

Si todavía no existe `.env.local`, créalo desde el ejemplo:

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Conserva la URL y sustituye el texto de ejemplo por la **clave pública del proyecto**, proporcionada por su responsable:

```dotenv
VITE_SUPABASE_URL=https://qexbfirzwpkmekdwmleo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=PEGA_AQUI_LA_CLAVE_PUBLICA
```

Guarda el archivo y ejecuta:

```powershell
npm run dev
```

En el navegador:

1. Abre **http://127.0.0.1:3000**.
2. Pulsa **Conectar mi oficina**.
3. Crea una cuenta o inicia sesión si ya tienes una.
4. Si se solicita, confirma tu correo y después inicia sesión.
5. Agrega tus vehículos o pulsa **Cargar vehículos de ejemplo**.

Al iniciar sesión, los datos se guardan en Supabase y se conservan después de recargar. Cada cuenta tiene su propia oficina independiente; la demo no se importa automáticamente.

El proyecto compartido de Supabase ya tiene las tablas y las migraciones aplicadas. Para usarlo no necesitas configurar un servidor MCP ni volver a ejecutar los archivos SQL.

`.env.local` está excluido de Git. No lo subas al repositorio. El frontend utiliza la clave pública; no coloques claves secretas ni `service_role` en ese archivo.

## 4. Qué ejecutar cada vez

Después de la primera instalación, abre PowerShell dentro de `rentaautos-segunda-revision` y ejecuta:

```powershell
npm run dev
```

Para apagar el sistema, vuelve a esa terminal y pulsa `Ctrl + C`.

Si quieres revisar una compilación lista para servir localmente, utiliza esta alternativa:

```powershell
npm run build
npm start
```

Utiliza una alternativa a la vez. `npm start` necesita que antes se haya ejecutado `npm run build`; es una vista previa local, no una publicación en Internet.

## 5. Uso básico

| Quiero… | Dónde hacerlo |
| --- | --- |
| Agregar un vehículo | Mi flota → Agregar vehículo |
| Cambiar tarifa o datos del auto | Mi flota → Editar |
| Crear una reserva | Nueva reserva → vehículo, fechas y cliente → Crear reserva |
| Editar una reserva | Reservas → Ver detalle → Editar reserva, antes de entregar el vehículo |
| Registrar la salida | Ver detalle → Registrar entrega → kilometraje, combustible y observaciones |
| Registrar el retorno | Ver detalle → Registrar devolución; al guardar se finaliza el alquiler |
| Registrar un adelanto o pago | Ver detalle → Pagos → importe, fecha y método → Guardar pago |
| Registrar dinero devuelto al cliente | Ver detalle → Pagos → Movimiento: Reembolso al cliente |
| Imprimir la reserva | Ver detalle → Comprobante → Imprimir comprobante |
| Guardar el comprobante en PDF | En la ventana de impresión, elige Guardar como PDF |
| Revisar devoluciones de hoy o atrasadas | Resumen → Devoluciones pendientes |
| Descargar un listado | Flota, Reservas o Clientes → Exportar CSV |

El DNI debe tener ocho dígitos. El precio se calcula en soles por la diferencia de días. Las fechas de recojo y devolución están incluidas en la ocupación: dos reservas del mismo auto no pueden compartir esos días.

## 6. Descargar actualizaciones

Con el servidor detenido y sin cambios locales pendientes, ejecuta dentro de la carpeta del proyecto:

```powershell
git pull --ff-only
npm ci
npm run dev
```

Si Git avisa que tienes cambios locales, consérvalos antes de actualizar; no necesitas borrar la carpeta ni tu archivo `.env.local`.

## 7. Comprobaciones opcionales

```powershell
npm run check
npm run build
npm test
```

- `check`: revisa los tipos de TypeScript.
- `build`: genera la aplicación compilada.
- `test`: ejecuta las pruebas del navegador; la configuración local utiliza Microsoft Edge y requiere que esté instalado.

La prueba de conexión real a Supabase se omite si no hay configuración en `.env.local`. Las pruebas de interfaz utilizan la demo para no modificar tus datos reales.

## 8. Problemas comunes

| Problema | Solución |
| --- | --- |
| `node` o `npm` no se reconoce | Instala Node.js y vuelve a abrir PowerShell. |
| PowerShell bloquea `npm.ps1` | Utiliza `npm.cmd` en lugar de `npm`, por ejemplo `npm.cmd ci` y `npm.cmd run dev`. |
| No encuentra `package.json` | Entra con `cd` en la carpeta que contiene `package.json` antes de ejecutar npm. |
| El puerto 3000 está ocupado | Detén la otra instancia del sistema con `Ctrl + C`. Si Vite anuncia otro puerto, abre la dirección que indica la terminal. |
| No aparece la versión nueva | Confirma que descargaste `codex/segunda-revision-rentaautos`, no la rama `main` de Laravel. |
| Los datos desaparecen al recargar | Estás en la demo. Configura Supabase e inicia sesión desde Conectar mi oficina. |
| No conecta a Supabase | Revisa la URL, la clave pública y tu conexión. Reinicia `npm run dev` después de cambiar `.env.local`. |
| No permite iniciar sesión tras registrarte | Comprueba si recibiste un correo de confirmación y confírmalo. |
| No deja editar una reserva | Solo se pueden editar reservas activas que todavía no tienen entrega registrada. |

La dirección `127.0.0.1` solo funciona en el equipo que ejecuta el sistema. Para utilizarlo desde otro equipo, sigue esta instalación allí. Para compartir un único enlace público hace falta publicar el frontend en un servicio de hosting.

Más detalles de las funciones y pruebas: [Segunda revisión](docs/SEGUNDA-REVISION.md).
