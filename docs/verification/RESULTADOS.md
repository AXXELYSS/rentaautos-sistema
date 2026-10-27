# Verificación de Rentaautos v2

## Resultado

- `npm run build`: correcto; TypeScript estricto y compilación de producción.
- `npm test`: 16 pruebas Playwright aprobadas en Microsoft Edge.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- PostgreSQL remoto: todas las comprobaciones de `supabase/tests/rental.sql` aprobadas; transacción revertida sin dejar datos ni usuarios de prueba.
- Supabase Auth: endpoint real accesible; acceso anónimo a las cuatro tablas rechazado mediante HTTP.
- Supabase advisors de seguridad: lista vacía.
- Advisors de rendimiento: avisos informativos de índices todavía no utilizados en la base nueva. Se conservan porque sostienen las consultas y la restricción de solapamientos.

## Cobertura

Navegación, búsqueda y filtros; descarga CSV; creación y edición de vehículos; placa duplicada; cotización; creación y cancelación de reserva; conservación de cambios de demo al navegar y reinicio al recargar; períodos cruzados y fechas invertidas; formulario de acceso y creación de cuenta; vistas a 1440, 768 y 390px sin desbordamiento de la página.

En PostgreSQL se comprobó el total calculado por la base frente a un importe manipulado, solapamiento inclusivo, inmutabilidad del historial, protección del vehículo con reserva activa, finalización anticipada rechazada, cancelación que libera fechas, DNI y fechas inválidas, aislamiento RLS entre dos identidades e intento de suplantar al propietario. Los usuarios temporales solo existieron dentro de una transacción con ROLLBACK.

El alta y la confirmación de correo de una cuenta personal no se automatizaron. El acceso real a datos autenticados se comprobó en SQL bajo el rol `authenticated`; las pruebas de formulario usan la demo para no enviar correos ni crear cuentas ajenas.

## Revisión Taste

Framed sheet, seed 657109794, sin redibujos. IBM Plex Sans local. Firma del producto: calendario de disponibilidad por matrícula, con el mismo conjunto de reservas que alimenta indicadores y movimientos. Los cuatro vehículos y los tres clientes de la demo son ejemplos, no actividad comercial real. No se usaron fotografías; las miniaturas son dibujos SVG esquemáticos de sedanes.

Inspector sobre la compilación de producción: **0 FAIL, 2 WARN** a 1440, 768 y 390px. Se abrieron las seis imágenes del inspector después de la última revisión de diseño.

Advertencias defendidas:

- `tiny-text`: las fechas del calendario, las matrículas y los metadatos secundarios usan 11–12px; los datos principales usan 13–14px. Ningún bloque queda por debajo de 11px. Se mantiene la distinción entre datos y metadatos para una sesión de trabajo.
- `no-data-hue`: el calendario utiliza barras HTML de petróleo pálido con borde de mayor saturación. La medición de tono de los gráficos no reconoce estas marcas; el color visible distingue reservas de mantenimiento, sin saturar el fondo.
- El lint de fuente avisa de dos sombras: corresponden exclusivamente a un diálogo y una notificación flotante, permitidos por la guía para overlays.

Crítica final de pantallas:

1. La pregunta «¿qué autos puedo alquilar?» se responde con disponibles hoy y el calendario, seguido por los movimientos que requieren atención.
2. Los bordes de calendario, filas, indicadores y bloques inferiores comparten la hoja; en móvil se apilan y las tablas pasan a listas. El calendario conserva desplazamiento interno para mantener la escala de siete días.
3. El marco toma un gris verdoso propio; el acento petróleo aparece en ocupación y marca; los estados tienen tonos semánticos suaves.
4. Importes, cantidades y movimientos se calculan desde las mismas filas. La demo presenta 2 disponibles, 1 alquilado, 1 en mantenimiento y S/930.00 en reservas activas.
5. Los ceros se imprimen y las oficinas nuevas conservan estructura con una acción para agregar vehículos.
6. La leyenda de ocupación corresponde a las marcas del calendario. Los nombres largos se truncan y conservan su contenido completo en el título de la barra.
7. En tablet y móvil se pliega la navegación. Los controles principales móviles tienen altura mínima de 44px y el contenido no produce scroll horizontal de la página.

Correcciones entre revisiones: texto móvil mínimo, nombres accesibles de los campos y tamaño de los controles táctiles. Límite de diseño conservado: en un teléfono se desplaza horizontalmente el calendario para consultar toda la semana.

Las capturas PNG de resumen y reservas en esta carpeta son evidencias de la aplicación. El informe del inspector está en `.taste-skill/inspect/report.json`.

## Segunda revisión

Se ejecutaron también las 24 aserciones de `supabase/tests/operations.sql`, cubriendo edición, tarifas acordadas, sobrepagos, reembolsos, historial inmutable, combustible, odómetro, entrega/devolución y aislamiento entre cuentas. El comprobante se comprobó con estilos de impresión a un ancho de 794px (aproximación A4). Se añadieron evidencias `segunda-revision-*.png`.

El inspector mantiene 0 FAIL y 2 WARN; los avisos de metadatos pequeños y detección del color de las barras HTML conservan las justificaciones anteriores. El lint señala además un `box-shadow: none` en estilos de impresión: elimina la sombra del diálogo y no añade una sombra a una superficie.
