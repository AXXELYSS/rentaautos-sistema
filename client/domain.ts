export type CarState = 'disponible' | 'alquilado' | 'mantenimiento';
export type ReservationState = 'activa' | 'finalizada' | 'cancelada';
export interface Car {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  tarifa_diaria: number;
  estado: CarState;
  kilometraje: number;
}
export interface Reservation {
  id: string;
  auto_id: string;
  cliente_nombre: string;
  cliente_dni: string;
  fecha_inicio: string;
  fecha_fin: string;
  total: number;
  estado: ReservationState;
  tarifa_aplicada: number;
  created_at: string;
}
export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'yape' | 'otro';
export interface Payment {
  id: string;
  reserva_id: string;
  tipo: 'pago' | 'reembolso';
  monto: number;
  metodo: PaymentMethod;
  referencia: string;
  fecha_pago: string;
  created_at: string;
}
export interface Inspection {
  id: string;
  reserva_id: string;
  tipo: 'salida' | 'devolucion';
  kilometraje: number;
  combustible: number;
  observaciones: string;
  created_at: string;
}
export type PaymentInput = Omit<Payment, 'id' | 'created_at'>;
export type InspectionInput = Omit<Inspection, 'id' | 'created_at'>;
export interface Snapshot {
  autos: Car[];
  reservas: Reservation[];
  pagos: Payment[];
  inspecciones: Inspection[];
}
export interface BookingInput {
  auto_id: string;
  cliente_nombre: string;
  cliente_dni: string;
  fecha_inicio: string;
  fecha_fin: string;
}
export const money = (value: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
export function today(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export const addDays = (day: string, count: number) =>
  new Date(Date.parse(day + 'T12:00:00Z') + count * 86400000).toISOString().slice(0, 10);
export const daysBetween = (start: string, end: string) =>
  Math.round((Date.parse(end) - Date.parse(start)) / 86400000);
export const shortDate = (day: string) =>
  new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(day + 'T12:00:00Z'),
  );
export function carState(
  car: Car,
  reservations: Reservation[],
  day = today(),
  inspections: Inspection[] = [],
): CarState {
  if (car.estado !== 'disponible') return car.estado;
  if (
    reservations.some(
      (r) =>
        r.auto_id === car.id &&
        r.estado === 'activa' &&
        inspections.some((i) => i.reserva_id === r.id && i.tipo === 'salida') &&
        !inspections.some((i) => i.reserva_id === r.id && i.tipo === 'devolucion'),
    )
  )
    return 'alquilado';
  return reservations.some(
    (r) =>
      r.auto_id === car.id && r.estado === 'activa' && r.fecha_inicio <= day && r.fecha_fin >= day,
  )
    ? 'alquilado'
    : 'disponible';
}
export function demoData(): Snapshot {
  const now = today();
  return {
    autos: [
      {
        id: 'demo-1',
        placa: 'ABC-123',
        marca: 'Toyota',
        modelo: 'Corolla',
        anio: 2023,
        tarifa_diaria: 150,
        estado: 'disponible',
        kilometraje: 35000,
      },
      {
        id: 'demo-2',
        placa: 'XYZ-789',
        marca: 'Honda',
        modelo: 'Civic',
        anio: 2024,
        tarifa_diaria: 180,
        estado: 'disponible',
        kilometraje: 21000,
      },
      {
        id: 'demo-3',
        placa: 'DEF-456',
        marca: 'Nissan',
        modelo: 'Sentra',
        anio: 2023,
        tarifa_diaria: 120,
        estado: 'disponible',
        kilometraje: 42300,
      },
      {
        id: 'demo-4',
        placa: 'JKL-012',
        marca: 'Kia',
        modelo: 'Rio',
        anio: 2023,
        tarifa_diaria: 110,
        estado: 'mantenimiento',
        kilometraje: 48000,
      },
    ],
    reservas: [
      {
        id: 'res-1',
        auto_id: 'demo-3',
        cliente_nombre: 'Lucía Mendoza',
        cliente_dni: '48271936',
        fecha_inicio: addDays(now, -2),
        fecha_fin: addDays(now, 2),
        total: 480,
        estado: 'activa',
        tarifa_aplicada: 120,
        created_at: addDays(now, -3) + 'T15:00:00Z',
      },
      {
        id: 'res-2',
        auto_id: 'demo-1',
        cliente_nombre: 'Diego Salazar',
        cliente_dni: '73168429',
        fecha_inicio: addDays(now, 1),
        fecha_fin: addDays(now, 4),
        total: 450,
        estado: 'activa',
        tarifa_aplicada: 150,
        created_at: now + 'T12:00:00Z',
      },
      {
        id: 'res-3',
        auto_id: 'demo-2',
        cliente_nombre: 'Valeria Torres',
        cliente_dni: '61582437',
        fecha_inicio: addDays(now, -7),
        fecha_fin: addDays(now, -3),
        total: 720,
        estado: 'finalizada',
        tarifa_aplicada: 180,
        created_at: addDays(now, -8) + 'T15:00:00Z',
      },
    ],
    pagos: [],
    inspecciones: [
      {
        id: 'inspection-demo-1',
        reserva_id: 'res-1',
        tipo: 'salida',
        kilometraje: 42300,
        combustible: 100,
        observaciones: 'Entrega de ejemplo. Carrocería sin observaciones.',
        created_at: addDays(now, -2) + 'T15:00:00Z',
      },
    ],
  };
}
export function paymentSummary(reservation: Reservation, payments: Payment[]) {
  const received =
    Math.round(
      payments
        .filter((p) => p.reserva_id === reservation.id)
        .reduce((sum, p) => sum + (p.tipo === 'pago' ? 1 : -1) * Math.round(p.monto * 100), 0),
    ) / 100;
  const pending =
    reservation.estado === 'cancelada'
      ? 0
      : Math.max(0, Math.round((reservation.total - received) * 100) / 100);
  const refund = reservation.estado === 'cancelada' ? received : 0;
  return {
    received,
    pending,
    refund,
    label:
      refund > 0
        ? 'Reembolso pendiente'
        : reservation.estado === 'cancelada'
          ? 'Sin saldo'
          : received === 0
            ? 'Sin pagos'
            : pending > 0
              ? 'Adelanto'
              : 'Pagado',
  };
}
export function isDelivered(id: string, inspections: Inspection[]) {
  return inspections.some((i) => i.reserva_id === id && i.tipo === 'salida');
}
export function returnAlerts(data: Snapshot, day = today()) {
  return data.reservas
    .filter(
      (r) =>
        r.estado === 'activa' &&
        r.fecha_fin <= day &&
        isDelivered(r.id, data.inspecciones) &&
        !data.inspecciones.some((i) => i.reserva_id === r.id && i.tipo === 'devolucion'),
    )
    .sort((a, b) => a.fecha_fin.localeCompare(b.fecha_fin));
}
