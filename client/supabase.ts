import { createClient } from '@supabase/supabase-js';
import type {
  Car,
  Snapshot,
  Reservation,
  BookingInput,
  Payment,
  Inspection,
  PaymentInput,
  InspectionInput,
} from './domain';
import type { Database } from './database.types';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient<Database>(url, key) : null;
export async function loadSnapshot(): Promise<Snapshot> {
  if (!supabase) throw Error('Falta configurar la conexión a Supabase.');
  const [cars, bookings, payments, inspections] = await Promise.all([
    supabase
      .from('rental_autos')
      .select('id,placa,marca,modelo,anio,tarifa_diaria,estado,kilometraje')
      .order('created_at'),
    supabase
      .from('rental_reservas')
      .select(
        'id,auto_id,cliente_nombre,cliente_dni,fecha_inicio,fecha_fin,total,estado,tarifa_aplicada,created_at',
      )
      .order('fecha_inicio', { ascending: false }),
    supabase
      .from('rental_pagos')
      .select('id,reserva_id,tipo,monto,metodo,referencia,fecha_pago,created_at')
      .order('created_at'),
    supabase
      .from('rental_inspecciones')
      .select('id,reserva_id,tipo,kilometraje,combustible,observaciones,created_at')
      .order('created_at'),
  ]);
  if (cars.error) throw Error(cars.error.message);
  if (bookings.error) throw Error(bookings.error.message);
  if (payments.error) throw Error(payments.error.message);
  if (inspections.error) throw Error(inspections.error.message);
  return {
    autos: cars.data as Car[],
    reservas: bookings.data as Reservation[],
    pagos: payments.data as Payment[],
    inspecciones: inspections.data as Inspection[],
  };
}
export function readableError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : String((error as { message?: string })?.message || error);
  if (message.includes('rental_no_overlap') || message.includes('conflicting key'))
    return 'El auto ya tiene una reserva en esas fechas. Elige otro período.';
  if (message.includes('rental_autos_owner_id_placa_key'))
    return 'Ya existe un vehículo con esa placa.';
  if (message.includes('rental_inspecciones_reserva_id_tipo_key'))
    return 'Esta entrega o devolución ya fue registrada.';
  if (message.includes('rental_reservas_cliente_dni_check'))
    return 'El DNI debe contener exactamente 8 dígitos.';
  if (message.includes('rental_pagos_monto_check')) return 'El importe debe ser mayor que cero.';
  if (message.includes('Invalid login credentials'))
    return 'El correo o la contraseña no son correctos.';
  if (message.includes('Email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.';
  if (message.includes('Failed to fetch') || message.includes('fetch failed'))
    return 'No pudimos conectar. Revisa tu conexión y vuelve a intentarlo.';
  return message;
}
export async function saveBooking(input: BookingInput) {
  const { error } = await supabase!.from('rental_reservas').insert(input);
  if (error) throw error;
}
export async function updateBooking(id: string, input: BookingInput, original: Reservation) {
  const { data, error } = await supabase!
    .from('rental_reservas')
    .update(input)
    .eq('id', id)
    .eq('estado', 'activa')
    .eq('fecha_inicio', original.fecha_inicio)
    .eq('fecha_fin', original.fecha_fin)
    .eq('auto_id', original.auto_id)
    .eq('total', original.total)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw Error('La reserva cambió o ya fue cerrada. Actualiza y vuelve a intentarlo.');
}
export async function saveInspection(input: InspectionInput) {
  const { error } = await supabase!.from('rental_inspecciones').insert(input);
  if (error) throw error;
}
export async function savePayment(input: PaymentInput) {
  const { error } = await supabase!.from('rental_pagos').insert(input);
  if (error) throw error;
}
export async function quoteRental(
  autoId: string,
  start: string,
  end: string,
  reservationId?: string,
) {
  const { data, error } = await supabase!.rpc('rental_quote_edit', {
    p_auto_id: autoId,
    p_inicio: start,
    p_fin: end,
    p_reserva_id: reservationId || undefined,
  });
  if (error) throw error;
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    typeof data.dias !== 'number' ||
    typeof data.total !== 'number' ||
    typeof data.tarifa_diaria !== 'number'
  ) {
    throw Error('La cotización recibida no es válida. Inténtalo nuevamente.');
  }
  return { dias: data.dias, total: data.total, tarifa_diaria: data.tarifa_diaria };
}
