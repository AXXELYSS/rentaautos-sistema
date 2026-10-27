# Rentaautos: contexto y decisiones

## Sistema original
Demo en PHP 8.2 / Laravel 12. Autos: placa única, marca, modelo, año, tarifa diaria en soles y estado. Reservas: auto, nombre, DNI peruano de ocho dígitos, fechas, total y estado. El servicio detectaba intervalos cruzados inclusivos y cobraba la diferencia de días. El controlador solo cotizaba; no creaba reservas. La portada era la página inicial de Laravel y el README no documentaba el negocio. La vista estaba en `Autos/` y el controlador solicitaba `autos/`, una incompatibilidad en sistemas sensibles a mayúsculas.

## Nueva implementación
TypeScript estricto y React. Backend: Supabase (PostgreSQL, Auth, Data API, RLS y funciones de base de datos). Sin servidor PHP, Express ni SQLite. El código PHP se conserva como referencia; su configuración de Vite y package.json originales están en docs/legacy.

Cada cuenta administra su propia flota y reservas. No se conceden permisos anónimos. El navegador usa exclusivamente la clave pública; nunca service_role. Los totales se calculan en PostgreSQL. Las reservas activas tienen una exclusión GiST para impedir solapamientos concurrentes. Se conserva el intervalo inclusivo original: recojo y devolución ocupan ambos días del calendario; la tarifa se cobra por la diferencia de días.

La demo local contiene los cuatro autos originales y tres reservas ficticias. Se puede explorar y modificar en memoria; se reinicia al recargar. La cuenta de Supabase comienza vacía y ofrece cargar ejemplos explícitamente. No se importan automáticamente datos personales del sistema anterior.

## Diseño Taste
Pregunta principal: ¿qué autos puedo alquilar y cuáles tienen una entrega o devolución próxima?
Dirección: Framed sheet, seed 657109794, sin redibujos. IBM Plex Sans alojada con la aplicación, marco gris verdoso, superficie blanca, tinta #131416, acento petróleo #1b6c80. El calendario de ocupación por matrícula es la pieza propia del producto. La flota, las reservas y los clientes responden respectivamente qué vehículos hay, qué alquileres hay que atender y quién ha reservado. No hay estadísticas de crecimiento inventadas.

Grid: sidebar de 228px; marco superior de 48px; hoja con inset de 8px y padding de 24px. Calendario ocupa todo el ancho. Fila inferior: (ancho - 24px) × 0.62 + 24px + (ancho - 24px) × 0.38 = ancho. Tablet y móvil pliegan la navegación y apilan los bloques.

## Segunda revisión
Se incorporaron edición previa a la entrega, inspecciones de salida y retorno, cobros/reembolsos, comprobante imprimible, avisos de devoluciones y validaciones por campo. Reglas y casos de prueba: [SEGUNDA-REVISION.md](SEGUNDA-REVISION.md).
