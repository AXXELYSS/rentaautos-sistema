import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import {
  addDays,
  today,
  money,
  type BookingInput,
  type Car,
  type Reservation,
  type Snapshot,
} from '../domain';
import { bookingErrors, type FieldErrors } from '../validation';
import { localQuote } from '../operations';
import { quoteRental, readableError } from '../supabase';
import { Field, fieldProps } from './ValidationField';

export function BookingForm({
  cars,
  data,
  demo,
  initialCar,
  busy,
  onSave,
  original,
}: {
  cars: Car[];
  data: Snapshot;
  demo: boolean;
  initialCar?: string;
  busy: boolean;
  onSave: (v: BookingInput) => Promise<void>;
  original?: Reservation;
}) {
  const [values, setValues] = useState<BookingInput>(() => ({
    auto_id:
      original?.auto_id ||
      initialCar ||
      cars.find((c) => {
        try {
          localQuote(c.id, today(), addDays(today(), 1), data);
          return true;
        } catch {
          return false;
        }
      })?.id ||
      cars.find((c) => c.estado === 'disponible')?.id ||
      '',
    fecha_inicio: original?.fecha_inicio || today(),
    fecha_fin: original?.fecha_fin || addDays(today(), 1),
    cliente_nombre: original?.cliente_nombre || '',
    cliente_dni: original?.cliente_dni || '',
  }));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [quote, setQuote] = useState<{ dias: number; total: number; tarifa_diaria: number } | null>(
    null,
  );
  const [quoteError, setQuoteError] = useState('');
  const [quoting, setQuoting] = useState(true);
  const [error, setError] = useState('');
  const errors = bookingErrors(values, original?.fecha_inicio);
  const fieldError = (key: keyof BookingInput) =>
    submitted || touched[key] ? errors[key] : undefined;
  function change(key: keyof BookingInput, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setError('');
  }
  const blur = (key: keyof BookingInput) => () => setTouched((t) => ({ ...t, [key]: true }));
  useEffect(() => {
    let current = true;
    setQuote(null);
    setQuoteError('');
    setQuoting(true);
    const timer = setTimeout(async () => {
      try {
        const result = demo
          ? localQuote(values.auto_id, values.fecha_inicio, values.fecha_fin, data, original)
          : await quoteRental(values.auto_id, values.fecha_inicio, values.fecha_fin, original?.id);
        if (current) setQuote(result);
      } catch (err) {
        if (current) setQuoteError(readableError(err));
      } finally {
        if (current) setQuoting(false);
      }
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [values.auto_id, values.fecha_inicio, values.fecha_fin, data, demo, original]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setError('');
    if (Object.keys(errors).length) return;
    try {
      await onSave({ ...values, cliente_nombre: values.cliente_nombre.trim() });
    } catch (err) {
      setError(readableError(err));
    }
  }
  const renderInput = (key: keyof BookingInput, label: string, type = 'text', hint?: string) => {
    const id = 'booking-' + key;
    const error = fieldError(key);
    return (
      <Field id={id} label={label} error={error} hint={hint}>
        <input
          {...fieldProps(id, error, hint)}
          aria-label={label}
          name={key}
          type={type}
          value={values[key]}
          onChange={(e) => change(key, e.target.value)}
          onBlur={blur(key)}
          required
          {...(key === 'cliente_dni'
            ? { inputMode: 'numeric', maxLength: 8 }
            : key === 'cliente_nombre'
              ? { maxLength: 100, autoComplete: 'name' }
              : {})}
        />
      </Field>
    );
  };
  return (
    <form className="form-content" noValidate onSubmit={submit}>
      <p className="form-intro">
        {original
          ? 'Actualiza el vehículo, las fechas o el cliente antes de la entrega. Al conservar el auto se respeta la tarifa acordada.'
          : 'Elige el vehículo y las fechas. Comprobamos la disponibilidad antes de guardar.'}
      </p>
      <Field id="booking-auto_id" label="Vehículo" error={fieldError('auto_id')}>
        <select
          {...fieldProps('booking-auto_id', fieldError('auto_id'))}
          aria-label="Vehículo"
          value={values.auto_id}
          onChange={(e) => change('auto_id', e.target.value)}
          onBlur={blur('auto_id')}
          required
        >
          <option value="" disabled>
            Selecciona un vehículo
          </option>
          {cars.map((c) => (
            <option key={c.id} value={c.id} disabled={c.estado !== 'disponible'}>
              {c.marca} {c.modelo} · {c.placa} ·{' '}
              {money(original?.auto_id === c.id ? original.tarifa_aplicada : c.tarifa_diaria)}/día
              {c.estado !== 'disponible' ? ' · No disponible' : ''}
            </option>
          ))}
        </select>
      </Field>
      <div className="form-row">
        {renderInput('fecha_inicio', 'Fecha de recojo', 'date')}
        {renderInput('fecha_fin', 'Fecha de devolución', 'date')}
      </div>
      <div className={`quote-box ${quoteError ? 'quote-error' : ''}`} aria-live="polite">
        {quoting ? (
          <span>Comprobando disponibilidad…</span>
        ) : quote ? (
          <>
            <span>
              <Check size={15} />
              Disponible · {quote.dias} {quote.dias === 1 ? 'día' : 'días'} ×{' '}
              {money(quote.tarifa_diaria)}
            </span>
            <strong>{money(quote.total)}</strong>
          </>
        ) : (
          <span>{quoteError}</span>
        )}
      </div>
      <p className="field-hint">Recojo y devolución incluidos en la ocupación del vehículo.</p>
      <h3>Datos del cliente</h3>
      {renderInput('cliente_nombre', 'Nombre completo')}
      {renderInput('cliente_dni', 'DNI', 'text', 'Documento peruano de ocho dígitos.')}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="form-footer">
        <span>
          {demo ? 'Se guardará solo en esta demo.' : 'Se guardará en tu oficina de Supabase.'}
        </span>
        <button className="button primary" disabled={busy || quoting || !quote} type="submit">
          {busy ? 'Guardando…' : original ? 'Guardar cambios' : 'Crear reserva'}
          <ArrowRight size={15} />
        </button>
      </div>
    </form>
  );
}

export type BookingFieldErrors = FieldErrors;
