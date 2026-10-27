import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import type { Car, CarState } from '../domain';
import { carErrors, type FieldErrors } from '../validation';
import { readableError } from '../supabase';
import { Field, fieldProps } from './ValidationField';

export function CarForm({
  car,
  busy,
  onSave,
}: {
  car?: Car;
  busy: boolean;
  onSave: (v: Omit<Car, 'id'>, id?: string) => Promise<void>;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  function read(form: HTMLFormElement): Omit<Car, 'id'> {
    const f = new FormData(form);
    const number = (key: string) => (String(f.get(key)).trim() === '' ? NaN : Number(f.get(key)));
    return {
      placa: String(f.get('placa')).trim().toUpperCase(),
      marca: String(f.get('marca')).trim(),
      modelo: String(f.get('modelo')).trim(),
      anio: number('anio'),
      tarifa_diaria: number('tarifa'),
      estado: String(f.get('estado')) as CarState,
      kilometraje: number('kilometraje'),
    };
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = read(event.currentTarget);
    const next = carErrors(value);
    setErrors(next);
    setError('');
    if (Object.keys(next).length) return;
    try {
      await onSave(value, car?.id);
    } catch (err) {
      const message = readableError(err);
      if (message.includes('placa')) setErrors((e) => ({ ...e, placa: message }));
      else if (message.includes('kilometraje')) setErrors((e) => ({ ...e, kilometraje: message }));
      else setError(message);
    }
  }
  function input(
    name: string,
    label: string,
    defaultValue: string | number | undefined,
    type = 'text',
    hint?: string,
  ) {
    const id = 'car-' + name;
    const e = errors[name];
    return (
      <Field id={id} label={label} error={e} hint={hint}>
        <input
          {...fieldProps(id, e, hint)}
          aria-label={label}
          name={name}
          type={type}
          defaultValue={defaultValue}
          required
          {...(type === 'number'
            ? { step: name === 'tarifa' ? '0.01' : '1' }
            : { maxLength: name === 'placa' ? 7 : 50 })}
        />
      </Field>
    );
  }
  return (
    <form
      className="form-content"
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
        const next = carErrors(read(field.form));
        setErrors((current) => ({ ...current, [field.name]: next[field.name] || '' }));
      }}
      onBlur={(event) => {
        const field: EventTarget = event.target;
        if (!(
          field instanceof HTMLInputElement ||
          field instanceof HTMLSelectElement ||
          field instanceof HTMLTextAreaElement
        ))
          return;
        if (!field.name || !field.form) return;
        const next = carErrors(read(field.form));
        setErrors((e) => ({ ...e, [field.name]: next[field.name] || '' }));
      }}
    >
      <p className="form-intro">
        Los datos del vehículo, su kilometraje y su tarifa diaria en soles.
      </p>
      <div className="form-row">
        {input('marca', 'Marca', car?.marca)}
        {input('modelo', 'Modelo', car?.modelo)}
      </div>
      <div className="form-row">
        {input('placa', 'Placa', car?.placa, 'text', 'Formato ABC-123.')}
        {input('anio', 'Año', car?.anio || new Date().getFullYear(), 'number')}
      </div>
      <div className="form-row">
        {input('tarifa', 'Tarifa diaria (S/)', car?.tarifa_diaria, 'number')}
        {input('kilometraje', 'Kilometraje actual', car?.kilometraje || 0, 'number')}
      </div>
      <Field
        id="car-estado"
        label="Disponibilidad operativa"
        hint="Los alquileres del sistema aparecen automáticamente en el calendario."
      >
        <select id="car-estado" name="estado" defaultValue={car?.estado || 'disponible'}>
          <option value="disponible">Disponible para reservas</option>
          <option value="mantenimiento">En mantenimiento</option>
          <option value="alquilado">En alquiler externo</option>
        </select>
      </Field>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="form-footer">
        <span>Placa única por oficina.</span>
        <button className="button primary" disabled={busy} type="submit">
          {busy ? 'Guardando…' : 'Guardar vehículo'}
          <Check size={16} />
        </button>
      </div>
    </form>
  );
}
