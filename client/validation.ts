import {
  today,
  type BookingInput,
  type Car,
  type InspectionInput,
  type PaymentInput,
} from './domain';
export type FieldErrors = Record<string, string>;
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function bookingErrors(input: BookingInput, originalStart?: string): FieldErrors {
  const e: FieldErrors = {};
  if (!input.auto_id) e.auto_id = 'Selecciona un vehículo.';
  if (input.cliente_nombre.trim().length < 2 || input.cliente_nombre.trim().length > 100)
    e.cliente_nombre = 'Ingresa un nombre de 2 a 100 caracteres.';
  if (!/^\d{8}$/.test(input.cliente_dni))
    e.cliente_dni = 'El DNI debe contener exactamente 8 dígitos, sin letras ni espacios.';
  if (!validDate(input.fecha_inicio)) e.fecha_inicio = 'Ingresa una fecha de recojo válida.';
  else if (input.fecha_inicio < today() && input.fecha_inicio !== originalStart)
    e.fecha_inicio = 'El recojo no puede estar en el pasado.';
  if (!validDate(input.fecha_fin)) e.fecha_fin = 'Ingresa una fecha de devolución válida.';
  else if (input.fecha_fin <= input.fecha_inicio)
    e.fecha_fin = 'La devolución debe ser posterior al recojo.';
  return e;
}
const validMoney = (n: number) =>
  Number.isFinite(n) && n > 0 && Math.abs(n * 100 - Math.round(n * 100)) < 0.00001;
export function carErrors(input: Omit<Car, 'id'>): FieldErrors {
  const e: FieldErrors = {};
  if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(input.placa))
    e.placa = 'Ingresa una placa como ABC-123 (tres caracteres, guion y tres caracteres).';
  if (!input.marca || input.marca.length > 50) e.marca = 'Ingresa una marca de 1 a 50 caracteres.';
  if (!input.modelo || input.modelo.length > 50)
    e.modelo = 'Ingresa un modelo de 1 a 50 caracteres.';
  if (
    !Number.isInteger(input.anio) ||
    input.anio < 1950 ||
    input.anio > new Date().getFullYear() + 1
  )
    e.anio = `Ingresa un año entre 1950 y ${new Date().getFullYear() + 1}.`;
  if (!validMoney(input.tarifa_diaria) || input.tarifa_diaria > 100000)
    e.tarifa = 'Ingresa una tarifa mayor que 0, hasta S/100,000 y con máximo 2 decimales.';
  if (
    !Number.isInteger(input.kilometraje) ||
    input.kilometraje < 0 ||
    input.kilometraje > 2147483647
  )
    e.kilometraje = 'Ingresa un kilometraje entero de 0 a 2,147,483,647.';
  return e;
}
export function inspectionErrors(input: InspectionInput, minKm: number): FieldErrors {
  const e: FieldErrors = {};
  if (
    !Number.isInteger(input.kilometraje) ||
    input.kilometraje < minKm ||
    input.kilometraje > 2147483647
  )
    e.kilometraje = `El kilometraje debe ser un entero entre ${minKm.toLocaleString('es-PE')} y 2,147,483,647.`;
  if (!Number.isInteger(input.combustible) || input.combustible < 0 || input.combustible > 100)
    e.combustible = 'Ingresa el combustible como porcentaje entero de 0 a 100.';
  if (input.observaciones.length > 2000)
    e.observaciones = 'Las observaciones admiten hasta 2,000 caracteres.';
  return e;
}
export function paymentErrors(input: PaymentInput, limit: number, minDay?: string): FieldErrors {
  const e: FieldErrors = {};
  if (!validMoney(input.monto))
    e.monto = 'Ingresa un importe mayor que 0 y con máximo 2 decimales.';
  else if (input.monto > limit)
    e.monto =
      input.tipo === 'pago'
        ? 'El pago supera el saldo pendiente.'
        : 'El reembolso supera el importe recibido.';
  if (!validDate(input.fecha_pago) || input.fecha_pago > today())
    e.fecha_pago = 'Ingresa una fecha de pago válida, hasta hoy.';
  else if (minDay && input.fecha_pago < minDay)
    e.fecha_pago = `La fecha del pago no puede ser anterior a la creación de la reserva (${minDay}).`;
  if (input.referencia.length > 100) e.referencia = 'La referencia admite hasta 100 caracteres.';
  return e;
}
