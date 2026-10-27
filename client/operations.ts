import {
  daysBetween,
  today,
  paymentSummary,
  isDelivered,
  type Snapshot,
  type Reservation,
  type InspectionInput,
  type PaymentInput,
} from './domain';
import { bookingErrors, inspectionErrors, paymentErrors } from './validation';
export function localQuote(
  id: string,
  start: string,
  end: string,
  data: Snapshot,
  original?: Reservation,
) {
  const errors = bookingErrors(
    {
      auto_id: id,
      fecha_inicio: start,
      fecha_fin: end,
      cliente_nombre: 'Cliente',
      cliente_dni: '12345678',
    },
    original?.fecha_inicio,
  );
  if (Object.keys(errors).length) throw Error(Object.values(errors)[0]);
  const car = data.autos.find((c) => c.id === id);
  if (!car) throw Error('Selecciona un vehículo.');
  if (original && (original.estado !== 'activa' || isDelivered(original.id, data.inspecciones)))
    throw Error('Solo puedes editar reservas activas antes de entregar el vehículo.');
  if (car.estado !== 'disponible') throw Error('El vehículo no está disponible.');
  if (
    data.reservas.some(
      (r) =>
        r.id !== original?.id &&
        r.auto_id === id &&
        r.estado === 'activa' &&
        r.fecha_inicio <= end &&
        r.fecha_fin >= start,
    )
  )
    throw Error('El auto ya tiene una reserva en esas fechas. Elige otro período.');
  const dias = daysBetween(start, end);
  const rate = original && original.auto_id === id ? original.tarifa_aplicada : car.tarifa_diaria;
  const total = Math.round(dias * Math.round(rate * 100)) / 100;
  if (original && total < paymentSummary(original, data.pagos).received)
    throw Error(
      'El nuevo total es menor que lo cobrado. Registra primero el reembolso de la diferencia.',
    );
  return { dias, total, tarifa_diaria: rate };
}
export function inspectDemo(data: Snapshot, input: InspectionInput): Snapshot {
  const r = data.reservas.find((r) => r.id === input.reserva_id);
  if (!r || r.estado !== 'activa') throw Error('La reserva ya está cerrada.');
  const car = data.autos.find((c) => c.id === r.auto_id)!;
  const departure = data.inspecciones.find((i) => i.reserva_id === r.id && i.tipo === 'salida');
  if (data.inspecciones.some((i) => i.reserva_id === r.id && i.tipo === input.tipo))
    throw Error('Este registro ya existe.');
  if (input.tipo === 'salida') {
    if (r.fecha_inicio > today()) throw Error('No puedes entregar el vehículo antes del recojo.');
    if (r.fecha_fin < today())
      throw Error('La reserva ya venció. Actualiza las fechas antes de entregar.');
    if (car.estado !== 'disponible') throw Error('El vehículo no está disponible para entregar.');
    if (
      data.reservas.some(
        (other) =>
          other.auto_id === r.auto_id &&
          other.id !== r.id &&
          isDelivered(other.id, data.inspecciones) &&
          !data.inspecciones.some((i) => i.reserva_id === other.id && i.tipo === 'devolucion'),
      )
    )
      throw Error('El vehículo todavía no ha sido devuelto de otro alquiler.');
  } else if (!departure) throw Error('Registra la entrega antes de registrar la devolución.');
  const errors = inspectionErrors(input, Math.max(car.kilometraje, departure?.kilometraje || 0));
  if (Object.keys(errors).length) throw Error(Object.values(errors)[0]);
  return {
    ...data,
    inspecciones: [
      ...data.inspecciones,
      { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString() },
    ],
    autos: data.autos.map((c) => (c.id === car.id ? { ...c, kilometraje: input.kilometraje } : c)),
    reservas: data.reservas.map((b) =>
      b.id === r.id && input.tipo === 'devolucion' ? { ...b, estado: 'finalizada' } : b,
    ),
  };
}
export function payDemo(data: Snapshot, input: PaymentInput): Snapshot {
  const r = data.reservas.find((r) => r.id === input.reserva_id);
  if (!r) throw Error('La reserva no existe.');
  if (r.estado === 'cancelada' && input.tipo === 'pago')
    throw Error('No puedes cobrar una reserva cancelada.');
  const balance = paymentSummary(r, data.pagos);
  const errors = paymentErrors(
    input,
    input.tipo === 'pago' ? balance.pending : balance.received,
    today(new Date(r.created_at)),
  );
  if (Object.keys(errors).length) throw Error(Object.values(errors)[0]);
  return {
    ...data,
    pagos: [
      ...data.pagos,
      { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString() },
    ],
  };
}
