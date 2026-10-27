import type { ReactNode } from 'react';
export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && (
        <small className="field-hint" id={id + '-hint'}>
          {hint}
        </small>
      )}
      {error && (
        <small className="field-error" id={id + '-error'} aria-live="polite">
          {error}
        </small>
      )}
    </div>
  );
}
export function fieldProps(id: string, error?: string, hint?: string) {
  return {
    id,
    'aria-invalid': !!error,
    'aria-describedby':
      [hint ? id + '-hint' : '', error ? id + '-error' : ''].filter(Boolean).join(' ') || undefined,
  };
}
