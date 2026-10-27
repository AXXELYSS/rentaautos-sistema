import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import {
  money,
  paymentSummary,
  today,
  type Reservation,
  type Inspection,
  type InspectionInput,
  type Payment,
  type PaymentInput,
  type PaymentMethod,
} from '../domain';
import { inspectionErrors, paymentErrors, type FieldErrors } from '../validation';
import { readableError } from '../supabase';
import { Field, fieldProps } from './ValidationField';
const number = (value: FormDataEntryValue | null) =>
  value === null || String(value).trim() === '' ? NaN : Number(value);
export const methodLabels: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  yape: 'Yape',
  otro: 'Otro',
};

export function InspectionForm({
  reservation,
  type,
  minKm,
  departure,
  busy,
  onSave,
}: {
  reservation: Reservation;
  type: 'salida' | 'devolucion';
  minKm: number;
  departure?: Inspection;
  busy: boolean;
  onSave: (v: InspectionInput) => Promise<void>;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const label = type === 'salida' ? 'entrega' : 'devolución';
  function read(form: HTMLFormElement): InspectionInput {
    const f = new FormData(form);
    return {
      reserva_id: reservation.id,
      tipo: type,
      kilometraje: number(f.get('kilometraje')),
      combustible: number(f.get('combustible')),
      observaciones: String(f.get('observaciones')).trim(),
    };
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = read(event.currentTarget);
    const next = inspectionErrors(value, minKm);
    setErrors(next);
    setError('');
    if (Object.keys(next).length) return;
    try {
      await onSave(value);
    } catch (err) {
      const message = readableError(err);
      if (message.includes('kilometraje')) setErrors((e) => ({ ...e, kilometraje: message }));
      else setError(message);
    }
  }
  return (
    <form
      className="rental-form"
      noValidate
      onSubmit={submit}
      onInput={(event) => {
        const field: EventTarget = event.target;
        if (
          !(
            field instanceof HTMLInputElement ||
            field instanceof HTMLSelectElement ||
            field instanceof HTMLTextAreaElement
          ) ||
          !field.form ||
          !errors[field.name]
        )
          return;
        const next = inspectionErrors(read(field.form), minKm);
        setErrors((current) => ({ ...current, [field.name]: next[field.name] || '' }));
      }}
      onBlur={(e) => {
        const field: EventTarget = e.target;
        if (!(
          field instanceof HTMLInputElement ||
          field instanceof HTMLSelectElement ||
          field instanceof HTMLTextAreaElement
        ))
          return;
        if (field.form && field.name) {
          const next = inspectionErrors(read(field.form), minKm);
          setErrors((v) => ({ ...v, [field.name]: next[field.name] || '' }));
        }
      }}
    >
      <h3>Registrar {label}</h3>
      <p className="field-hint">
        {type === 'salida'
          ? 'Registra cómo sale el vehículo de tu oficina.'
          : 'La devolución cerrará el alquiler y actualizará el kilometraje. El saldo pendiente se conserva.'}
      </p>
      <div className="form-row">
        <Field
          id="inspection-km"
          label={`Kilometraje de ${label}`}
          error={errors.kilometraje}
          hint={`Último registro: ${minKm.toLocaleString('es-PE')} km.`}
        >
          <input
            {...fieldProps('inspection-km', errors.kilometraje, 'km')}
            name="kilometraje"
            type="number"
            step="1"
            defaultValue={type === 'salida' ? minKm : undefined}
            required
          />
        </Field>
        <Field
          id="inspection-fuel"
          label="Combustible (%)"
          error={errors.combustible}
          hint="Porcentaje entero de 0 a 100."
        >
          <input
            {...fieldProps('inspection-fuel', errors.combustible, 'fuel')}
            name="combustible"
            type="number"
            step="1"
            defaultValue={type === 'salida' ? 100 : undefined}
            required
          />
        </Field>
      </div>
      {departure && (
        <p className="info-well compact">
          Entrega: {departure.kilometraje.toLocaleString('es-PE')} km · Combustible:{' '}
          {departure.combustible}%
        </p>
      )}
      <Field
        id="inspection-notes"
        label="Observaciones del vehículo"
        error={errors.observaciones}
        hint="Opcional. Hasta 2,000 caracteres."
      >
        <textarea
          {...fieldProps('inspection-notes', errors.observaciones, 'notes')}
          name="observaciones"
          rows={3}
          maxLength={2000}
          placeholder="Estado de la carrocería, accesorios o incidencias…"
        />
      </Field>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-action">
        <button className="button primary" disabled={busy} type="submit">
          <Check size={16} />
          {busy ? 'Guardando…' : `Guardar ${label}`}
        </button>
      </div>
    </form>
  );
}

export function PaymentForm({
  reservation,
  payments,
  busy,
  onSave,
}: {
  reservation: Reservation;
  payments: Payment[];
  busy: boolean;
  onSave: (v: PaymentInput) => Promise<void>;
}) {
  const balance = paymentSummary(reservation, payments);
  const [type, setType] = useState<'pago' | 'reembolso'>(
    reservation.estado === 'cancelada' || balance.pending === 0 ? 'reembolso' : 'pago',
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [formKey, setFormKey] = useState(0);
  const limit = type === 'pago' ? balance.pending : balance.received;
  const mayPay = reservation.estado !== 'cancelada' && balance.pending > 0;
  const actualType = type === 'pago' && !mayPay ? 'reembolso' : type;
  const actualLimit = actualType === 'pago' ? balance.pending : balance.received;
  function read(form: HTMLFormElement): PaymentInput {
    const f = new FormData(form);
    return {
      reserva_id: reservation.id,
      tipo: actualType,
      monto: number(f.get('monto')),
      metodo: String(f.get('metodo')) as PaymentMethod,
      referencia: String(f.get('referencia')).trim(),
      fecha_pago: String(f.get('fecha_pago')),
    };
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = read(event.currentTarget);
    const next = paymentErrors(value, actualLimit, today(new Date(reservation.created_at)));
    setErrors(next);
    setError('');
    if (Object.keys(next).length) return;
    try {
      await onSave(value);
      setFormKey((k) => k + 1);
    } catch (err) {
      const message = readableError(err);
      if (message.includes('saldo') || message.includes('importe'))
        setErrors((e) => ({ ...e, monto: message }));
      else if (message.includes('fecha')) setErrors((e) => ({ ...e, fecha_pago: message }));
      else setError(message);
    }
  }
  if (!mayPay && balance.received === 0)
    return <p className="field-hint">No hay importes pendientes para registrar.</p>;
  return (
    <form
      className="rental-form"
      noValidate
      onSubmit={submit}
      key={formKey}
      onInput={(event) => {
        const field: EventTarget = event.target;
        if (
          !(
            field instanceof HTMLInputElement ||
            field instanceof HTMLSelectElement ||
            field instanceof HTMLTextAreaElement
          ) ||
          !field.form ||
          !errors[field.name]
        )
          return;
        const next = paymentErrors(
          read(field.form),
          actualLimit,
          today(new Date(reservation.created_at)),
        );
        setErrors((current) => ({ ...current, [field.name]: next[field.name] || '' }));
      }}
      onBlur={(e) => {
        const field: EventTarget = e.target;
        if (!(
          field instanceof HTMLInputElement ||
          field instanceof HTMLSelectElement ||
          field instanceof HTMLTextAreaElement
        ))
          return;
        if (field.form && field.name) {
          const next = paymentErrors(
            read(field.form),
            actualLimit,
            today(new Date(reservation.created_at)),
          );
          setErrors((v) => ({ ...v, [field.name]: next[field.name] || '' }));
        }
      }}
    >
      <h3>{actualType === 'pago' ? 'Registrar pago' : 'Registrar reembolso'}</h3>
      <Field id="payment-type" label="Movimiento">
        <select
          id="payment-type"
          value={actualType}
          onChange={(e) => {
            setType(e.target.value as 'pago' | 'reembolso');
            setErrors({});
            setError('');
          }}
        >
          {mayPay && <option value="pago">Pago / adelanto</option>}
          {balance.received > 0 && <option value="reembolso">Reembolso al cliente</option>}
        </select>
      </Field>
      <div className="form-row">
        <Field
          id="payment-amount"
          label="Importe (S/)"
          error={errors.monto}
          hint={`Máximo: ${money(limit === actualLimit ? limit : actualLimit)}.`}
        >
          <input
            {...fieldProps('payment-amount', errors.monto, 'limit')}
            name="monto"
            type="number"
            step="0.01"
            required
          />
        </Field>
        <Field id="payment-date" label="Fecha del pago" error={errors.fecha_pago}>
          <input
            {...fieldProps('payment-date', errors.fecha_pago)}
            name="fecha_pago"
            type="date"
            defaultValue={today()}
            required
          />
        </Field>
      </div>
      <div className="form-row">
        <Field id="payment-method" label="Método">
          <select id="payment-method" name="metodo" defaultValue="efectivo">
            {Object.entries(methodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="payment-reference"
          label="Referencia"
          error={errors.referencia}
          hint="Opcional. Operación o recibo."
        >
          <input
            {...fieldProps('payment-reference', errors.referencia, 'reference')}
            name="referencia"
            maxLength={100}
          />
        </Field>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-action">
        <button className="button primary" disabled={busy} type="submit">
          <Check size={16} />
          {busy ? 'Guardando…' : actualType === 'pago' ? 'Guardar pago' : 'Guardar reembolso'}
        </button>
      </div>
    </form>
  );
}
