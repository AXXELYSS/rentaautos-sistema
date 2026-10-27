import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { readableError, supabase } from '../supabase';
import { Brand } from './ui';
export { BookingForm } from './BookingForm';
export { CarForm } from './CarForm';
export { ReservationDetail } from './ReservationDetail';
export function AuthForm({ onDone }: { onDone: () => void }) {
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError('Configura las variables VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    const f = new FormData(event.currentTarget);
    const credentials = {
      email: String(f.get('email')).trim(),
      password: String(f.get('password')),
    };
    try {
      const { data, error } = signup
        ? await supabase.auth.signUp({
            ...credentials,
            options: { emailRedirectTo: location.origin },
          })
        : await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (data.session) onDone();
      else setMessage('Revisa tu correo para confirmar tu cuenta. Después podrás iniciar sesión.');
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-content" onSubmit={submit}>
      <div className="auth-intro">
        <Brand />
        <p>
          {signup
            ? 'Crea tu cuenta para guardar tu flota y tus reservas.'
            : 'Inicia sesión para abrir tu flota y tus reservas.'}
        </p>
      </div>
      <label>
        Correo electrónico
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="tu@correo.com"
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete={signup ? 'new-password' : 'current-password'}
          aria-describedby="password-hint"
        />
        <small className="field-hint" id="password-hint">
          Mínimo 8 caracteres.
        </small>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
      <button className="button primary full" disabled={busy} type="submit">
        {busy ? 'Conectando…' : signup ? 'Crear cuenta' : 'Iniciar sesión'}
        <ArrowRight size={16} />
      </button>
      <button
        className="text-button auth-switch"
        type="button"
        onClick={() => {
          setSignup(!signup);
          setError('');
          setMessage('');
        }}
      >
        {signup ? 'Ya tengo una cuenta' : 'Crear una cuenta nueva'}
      </button>
      <p className="field-hint">
        Cada cuenta tiene su propia oficina. Tus datos están protegidos con Supabase Auth.
      </p>
    </form>
  );
}
