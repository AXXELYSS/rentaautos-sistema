import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import {
  addDays,
  carState,
  daysBetween,
  demoData,
  money,
  shortDate,
  today,
  type BookingInput,
  type Car,
  type Reservation,
  type InspectionInput,
  type PaymentInput,
  paymentSummary,
  returnAlerts,
  isDelivered,
  type Snapshot,
} from './domain';
import {
  loadSnapshot,
  readableError,
  saveBooking,
  updateBooking,
  saveInspection,
  savePayment,
  supabase,
} from './supabase';
import { localQuote, inspectDemo, payDemo } from './operations';
import { bookingErrors, carErrors } from './validation';
import { Receipt } from './components/Receipt';
import { Brand, Status, Dialog, Tabs, Toolbar } from './components/ui';
import { CarTable, Timeline } from './components/Fleet';
import { BookingForm, CarForm, ReservationDetail, AuthForm } from './components/Forms';
import { exportCsv } from './export';

type View = 'resumen' | 'flota' | 'reservas' | 'clientes';
type Modal =
  | { type: 'booking'; carId?: string; original?: Reservation }
  | { type: 'car'; car?: Car }
  | { type: 'detail'; reservation: Reservation }
  | { type: 'receipt'; reservation: Reservation }
  | { type: 'auth' }
  | { type: 'help' };
const labels: Record<string, string> = {
  disponible: 'Disponible',
  alquilado: 'En alquiler',
  mantenimiento: 'Mantenimiento',
  activa: 'Activa',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};
const navigation = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'flota', label: 'Mi flota', icon: CarFront },
  { id: 'reservas', label: 'Reservas', icon: CalendarDays },
  { id: 'clientes', label: 'Clientes', icon: Users },
] as const;
export default function App() {
  const [view, setView] = useState<View>(() => {
    const path = location.hash.slice(1);
    return navigation.some((n) => n.id === path) ? (path as View) : 'resumen';
  });
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<Snapshot>(demoData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<Modal | null>(null);
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState(false);
  const [filter, setFilter] = useState('todos');
  const [week, setWeek] = useState(today);
  const [busy, setBusy] = useState(false);
  const demo = !session;
  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(readableError(error));
      setSession(data.session);
      setAuthReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);
  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      setData(await loadSnapshot());
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }, [session]);
  useEffect(() => {
    if (session) {
      setData({ autos: [], reservas: [], pagos: [], inspecciones: [] });
      void refresh();
    } else if (authReady) setData(demoData());
  }, [session?.user.id, authReady, refresh]);
  useEffect(() => {
    const handler = () => {
      const next = location.hash.slice(1);
      if (navigation.some((n) => n.id === next)) {
        setView(next as View);
        setFilter('todos');
        setSearch('');
      }
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  function navigate(next: View) {
    setView(next);
    if (location.hash !== `#${next}`) history.pushState(null, '', `#${next}`);
    setSearch('');
    setFilter('todos');
    setMenu(false);
  }
  async function mutate(action: () => Promise<void>, message: string, close = true) {
    setBusy(true);
    try {
      await action();
      if (session) await refresh();
      setNotice(message);
      if (close) setModal(null);
    } catch (err) {
      throw new Error(readableError(err));
    } finally {
      setBusy(false);
    }
  }
  async function createReservation(input: BookingInput, original?: Reservation) {
    await mutate(
      async () => {
        const errors = bookingErrors(input, original?.fecha_inicio);
        if (Object.keys(errors).length) throw Error(Object.values(errors)[0]);
        if (session) {
          if (original) await updateBooking(original.id, input, original);
          else await saveBooking(input);
          return;
        }
        const quote = localQuote(
          input.auto_id,
          input.fecha_inicio,
          input.fecha_fin,
          data,
          original,
        );
        setData((d) => ({
          ...d,
          reservas: original
            ? d.reservas.map((r) =>
                r.id === original.id
                  ? { ...r, ...input, total: quote.total, tarifa_aplicada: quote.tarifa_diaria }
                  : r,
              )
            : [
                ...d.reservas,
                {
                  ...input,
                  id: crypto.randomUUID(),
                  total: quote.total,
                  tarifa_aplicada: quote.tarifa_diaria,
                  estado: 'activa',
                  created_at: new Date().toISOString(),
                },
              ],
        }));
      },
      original ? 'Reserva actualizada.' : 'Reserva creada correctamente.',
    );
  }
  async function saveCar(car: Omit<Car, 'id'>, id?: string) {
    await mutate(
      async () => {
        const errors = carErrors(car);
        if (Object.keys(errors).length) throw Error(Object.values(errors)[0]);
        if (id && car.kilometraje < (data.autos.find((c) => c.id === id)?.kilometraje || 0))
          throw Error('El kilometraje no puede ser menor que el último registrado.');
        if (session) {
          const query = id
            ? supabase!.from('rental_autos').update(car).eq('id', id)
            : supabase!.from('rental_autos').insert(car);
          const { error } = await query;
          if (error) throw error;
          return;
        }
        if (data.autos.some((c) => c.placa === car.placa && c.id !== id))
          throw Error('Ya existe un vehículo con esa placa.');
        if (
          id &&
          car.estado !== 'disponible' &&
          data.reservas.some(
            (r) =>
              r.auto_id === id &&
              r.estado === 'activa' &&
              (r.fecha_fin >= today() || isDelivered(r.id, data.inspecciones)),
          )
        )
          throw Error(
            'El auto tiene reservas activas. Ciérralas antes de cambiar su disponibilidad.',
          );
        setData((d) => ({
          ...d,
          autos: id
            ? d.autos.map((c) => (c.id === id ? { ...car, id } : c))
            : [...d.autos, { ...car, id: crypto.randomUUID() }],
        }));
      },
      id ? 'Vehículo actualizado.' : 'Vehículo agregado a tu flota.',
    );
  }
  async function cancelReservation(reservation: Reservation) {
    await mutate(
      async () => {
        if (reservation.estado !== 'activa') throw Error('La reserva ya está cerrada.');
        if (isDelivered(reservation.id, data.inspecciones))
          throw Error(
            'El vehículo ya fue entregado. Registra su devolución para cerrar el alquiler.',
          );
        if (session) {
          const { data: row, error } = await supabase!
            .from('rental_reservas')
            .update({ estado: 'cancelada' })
            .eq('id', reservation.id)
            .eq('estado', 'activa')
            .select('id')
            .maybeSingle();
          if (error) throw error;
          if (!row) throw Error('La reserva ya fue cerrada. Actualiza la página.');
        } else
          setData((d) => ({
            ...d,
            reservas: d.reservas.map((r) =>
              r.id === reservation.id ? { ...r, estado: 'cancelada' } : r,
            ),
          }));
      },
      'Reserva cancelada. El período vuelve a estar disponible.',
      false,
    );
  }
  async function recordInspection(input: InspectionInput) {
    await mutate(
      async () => {
        if (session) await saveInspection(input);
        else setData(inspectDemo(data, input));
      },
      input.tipo === 'salida'
        ? 'Entrega registrada.'
        : 'Devolución registrada. Alquiler finalizado.',
      false,
    );
  }
  async function recordPayment(input: PaymentInput) {
    await mutate(
      async () => {
        if (session) await savePayment(input);
        else setData(payDemo(data, input));
      },
      input.tipo === 'pago' ? 'Pago registrado.' : 'Reembolso registrado.',
      false,
    );
  }
  async function initialize() {
    setBusy(true);
    setError('');
    try {
      const cars = demoData().autos.map(({ id, ...car }) => car);
      const { error } = await supabase!.from('rental_autos').insert(cars);
      if (error) throw error;
      await refresh();
      setNotice('Se cargaron los cuatro vehículos de ejemplo.');
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusy(false);
    }
  }
  const active = data.reservas.filter((r) => r.estado === 'activa');
  const available = data.autos.filter(
    (c) => carState(c, data.reservas, today(), data.inspecciones) === 'disponible',
  ).length;
  const rented = data.autos.filter(
    (c) => carState(c, data.reservas, today(), data.inspecciones) === 'alquilado',
  ).length;
  const maintenance = data.autos.filter((c) => c.estado === 'mantenimiento');
  const matches = (value: string) => value.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  const cars = data.autos.filter(
    (c) =>
      matches(`${c.marca} ${c.modelo} ${c.placa}`) &&
      (filter === 'todos' || carState(c, data.reservas, today(), data.inspecciones) === filter),
  );
  const reservations = data.reservas
    .filter((r) => {
      const car = data.autos.find((c) => c.id === r.auto_id);
      return (
        matches(
          `${r.cliente_nombre} ${r.cliente_dni} ${car?.placa} ${car?.marca} ${car?.modelo}`,
        ) &&
        (filter === 'todos' || r.estado === filter)
      );
    })
    .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
  const clients = Array.from(new Set(data.reservas.map((r) => r.cliente_dni)))
    .map((dni) => {
      const records = data.reservas.filter((r) => r.cliente_dni === dni);
      return {
        dni,
        nombre: records.at(-1)!.cliente_nombre,
        records,
        total: records.filter((r) => r.estado !== 'cancelada').reduce((s, r) => s + r.total, 0),
      };
    })
    .filter((c) => matches(`${c.nombre} ${c.dni}`));
  const alerts = returnAlerts(data);
  const received =
    data.pagos.reduce(
      (sum, p) => sum + (p.tipo === 'pago' ? 1 : -1) * Math.round(p.monto * 100),
      0,
    ) / 100;
  const pending =
    data.reservas.reduce(
      (sum, r) => sum + Math.round(paymentSummary(r, data.pagos).pending * 100),
      0,
    ) / 100;
  const upcoming = active
    .flatMap((r) => [
      ...(!isDelivered(r.id, data.inspecciones)
        ? [{ r, type: 'Recojo', date: r.fecha_inicio }]
        : []),
      { r, type: 'Devolución', date: r.fecha_fin },
    ])
    .filter(
      (e) =>
        e.date >= today() || (e.type === 'Devolución' && isDelivered(e.r.id, data.inspecciones)),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const titles = {
    resumen: 'Resumen de operaciones',
    flota: 'Mi flota',
    reservas: 'Reservas',
    clientes: 'Clientes',
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <aside className={`sidebar ${menu ? 'mobile-open' : ''}`} aria-label="Navegación principal">
        <Brand />
        <div className="workspace">
          <span className="office-mark">R</span>
          <div>
            <strong>Mi oficina</strong>
            <small>Gestión de alquileres</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-group-label">Operaciones</span>
        <nav>
          {navigation.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.id);
              }}
              className={view === item.id ? 'nav-item selected' : 'nav-item'}
              aria-current={view === item.id ? 'page' : undefined}
            >
              <item.icon size={18} />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => {
              setModal({ type: 'help' });
              setMenu(false);
            }}
          >
            <CircleHelp size={18} />
            Guía de uso
          </button>
          <div className="account">
            <span className="avatar">{session?.user.email?.slice(0, 2).toUpperCase() || 'DE'}</span>
            <div>
              <strong>{session ? 'Mi cuenta' : 'Espacio de prueba'}</strong>
              <small>{session?.user.email || 'Explora el sistema'}</small>
            </div>
            <button
              className="icon-button"
              aria-label={session ? 'Cerrar sesión' : 'Iniciar sesión'}
              onClick={() => {
                if (session)
                  void supabase!.auth.signOut().then(({ error }) => {
                    if (error) setError(readableError(error));
                  });
                else setModal({ type: 'auth' });
              }}
            >
              {session ? <LogOut size={16} /> : <LogIn size={16} />}
            </button>
          </div>
        </div>
      </aside>
      {menu && (
        <button className="menu-scrim" aria-label="Cerrar menú" onClick={() => setMenu(false)} />
      )}
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-toggle"
              aria-label="Abrir menú"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <span>Mi oficina</span>
            <ChevronRight size={13} />
            <strong>{navigation.find((n) => n.id === view)?.label}</strong>
          </div>
          <div className="connection">
            <i className={session ? 'online' : ''} />
            {session ? 'Supabase conectado' : 'Modo de prueba'}
            <span className="topbar-date">
              {new Intl.DateTimeFormat('es-PE', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'America/Lima',
              }).format(new Date())}
            </span>
          </div>
        </header>
        <main id="contenido" className="sheet" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <h1>{titles[view]}</h1>
              <p>
                {view === 'resumen'
                  ? `${available} de ${data.autos.length} vehículos disponibles hoy. Tu próxima salida, bajo control.`
                  : view === 'flota'
                    ? 'Cada vehículo, su tarifa y su disponibilidad.'
                    : view === 'reservas'
                      ? 'Del primer recojo a la última devolución.'
                      : 'El historial de quienes confían en tu flota.'}
              </p>
            </div>
            <button
              className="button primary"
              onClick={() => setModal(view === 'flota' ? { type: 'car' } : { type: 'booking' })}
            >
              <Plus size={17} />
              {view === 'flota' ? 'Agregar vehículo' : 'Nueva reserva'}
            </button>
          </div>
          {demo && (
            <div className="demo-notice">
              <div>
                <span className="demo-tag">Demo</span>
                <span>Prueba con datos de ejemplo. Los cambios se reinician al recargar.</span>
              </div>
              <button onClick={() => setModal({ type: 'auth' })}>
                Conectar mi oficina
                <ArrowRight size={15} />
              </button>
            </div>
          )}
          {error && (
            <div className="error-notice" role="alert">
              <span>{error}</span>
              <button onClick={() => void refresh()}>Reintentar</button>
            </div>
          )}
          {!authReady || loading ? (
            <div className="loading-state" role="status">
              <RefreshCw size={20} />
              Cargando tu oficina…
            </div>
          ) : (
            <>
              {session && data.autos.length === 0 && (
                <div className="onboarding">
                  <CarFront size={28} />
                  <h2>Tu flota comienza aquí</h2>
                  <p>
                    Agrega tu primer vehículo o carga los cuatro autos de ejemplo para conocer el
                    sistema.
                  </p>
                  <button className="button" disabled={busy} onClick={() => void initialize()}>
                    Cargar vehículos de ejemplo
                  </button>
                </div>
              )}
              {view === 'resumen' && (
                <>
                  <div className="metrics">
                    <div>
                      <span>Disponibles hoy</span>
                      <strong>
                        {available}
                        <small> / {data.autos.length}</small>
                      </strong>
                      <span className="metric-note">
                        <i className="data-dot" />
                        Listos para salir
                      </span>
                    </div>
                    <div>
                      <span>En alquiler hoy</span>
                      <strong>{rented}</strong>
                      <span className="metric-note">Vehículos en circulación</span>
                    </div>
                    <div>
                      <span>Reservas activas</span>
                      <strong>{active.length}</strong>
                      <span className="metric-note">En curso y por entregar</span>
                    </div>
                    <div>
                      <span>Importe reservado</span>
                      <strong className="money-metric">
                        {money(active.reduce((s, r) => s + r.total, 0))}
                      </strong>
                      <span className="metric-note">Total de reservas activas</span>
                    </div>
                  </div>
                  <div className="financial-summary">
                    <span>
                      Cobrado neto <strong>{money(received)}</strong>
                    </span>
                    <span>
                      Por cobrar <strong>{money(pending)}</strong>
                    </span>
                  </div>
                  <section
                    className={`return-alerts ${alerts.some((r) => r.fecha_fin < today()) ? 'has-overdue' : ''}`}
                    aria-label="Devoluciones pendientes"
                  >
                    <div>
                      <h2>Devoluciones pendientes</h2>
                      <p>
                        {alerts.length
                          ? `${alerts.length} vehículo(s) por regresar hoy o con retraso.`
                          : 'No hay vehículos entregados con devolución pendiente para hoy.'}
                      </p>
                    </div>
                    {alerts.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setModal({ type: 'detail', reservation: r })}
                      >
                        <strong>{data.autos.find((c) => c.id === r.auto_id)?.placa}</strong>
                        <span>
                          {r.fecha_fin < today()
                            ? `${daysBetween(r.fecha_fin, today())} día(s) de atraso`
                            : 'Regresa hoy'}
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ))}
                  </section>
                  <section className="panel calendar-panel">
                    <div className="section-heading">
                      <div>
                        <h2>Disponibilidad de la flota</h2>
                        <p>Planifica los próximos siete días por matrícula.</p>
                      </div>
                      <div className="date-controls">
                        <span>
                          {shortDate(week)} — {shortDate(addDays(week, 6))}
                        </span>
                        <button
                          className="icon-button"
                          aria-label="Semana anterior"
                          onClick={() => setWeek(addDays(week, -7))}
                        >
                          <ChevronLeft size={17} />
                        </button>
                        <button className="button small" onClick={() => setWeek(today())}>
                          Hoy
                        </button>
                        <button
                          className="icon-button"
                          aria-label="Semana siguiente"
                          onClick={() => setWeek(addDays(week, 7))}
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>
                    </div>
                    <Timeline
                      data={data}
                      start={week}
                      onSelect={(r) => setModal({ type: 'detail', reservation: r })}
                    />
                    <div className="calendar-footer">
                      <span>
                        <i className="legend booked" />
                        Reserva activa
                      </span>
                      <span>
                        <i className="legend maintenance" />
                        Mantenimiento
                      </span>
                      <span className="calendar-note">
                        Recojo y devolución incluidos en la ocupación
                      </span>
                    </div>
                  </section>
                  <div className="overview-grid">
                    <section className="panel">
                      <div className="section-heading">
                        <h2>Próximos movimientos</h2>
                        <button className="text-button" onClick={() => navigate('reservas')}>
                          Ver reservas
                          <ArrowRight size={15} />
                        </button>
                      </div>
                      <div className="movements">
                        {upcoming.length ? (
                          upcoming.map((e) => {
                            const car = data.autos.find((c) => c.id === e.r.auto_id)!;
                            return (
                              <button
                                key={e.r.id + e.type}
                                className="movement"
                                onClick={() => setModal({ type: 'detail', reservation: e.r })}
                              >
                                <span
                                  className={`movement-icon ${e.type === 'Recojo' ? 'out' : ''}`}
                                >
                                  {e.type === 'Recojo' ? (
                                    <ArrowRight size={17} />
                                  ) : (
                                    <ArrowLeft size={17} />
                                  )}
                                </span>
                                <span>
                                  <strong>{e.r.cliente_nombre}</strong>
                                  <small>
                                    {car.marca} {car.modelo} · {car.placa}
                                  </small>
                                </span>
                                <span className="movement-date">
                                  <strong>{e.date === today() ? 'Hoy' : shortDate(e.date)}</strong>
                                  <small>{e.type}</small>
                                </span>
                                <ChevronRight size={15} />
                              </button>
                            );
                          })
                        ) : (
                          <div className="empty-state">
                            No hay recojos ni devoluciones pendientes.
                            <button
                              className="text-button"
                              onClick={() => setModal({ type: 'booking' })}
                            >
                              Crear una reserva
                            </button>
                          </div>
                        )}
                      </div>
                    </section>
                    <section className="panel fleet-health">
                      <div className="section-heading">
                        <h2>Estado de la flota</h2>
                        <button className="text-button" onClick={() => navigate('flota')}>
                          Ver flota
                          <ArrowRight size={15} />
                        </button>
                      </div>
                      <div
                        className="fleet-distribution"
                        aria-label={`${available} disponibles, ${rented} en alquiler, ${maintenance.length} en mantenimiento`}
                      >
                        {data.autos.map((c) => (
                          <span
                            key={c.id}
                            className={carState(c, data.reservas, today(), data.inspecciones)}
                            title={`${c.placa}: ${labels[carState(c, data.reservas, today(), data.inspecciones)]}`}
                          />
                        ))}
                      </div>
                      <div className="health-counts">
                        <span>
                          <i className="data-dot" />
                          Disponibles<strong>{available}</strong>
                        </span>
                        <span>
                          <i className="data-dot neutral" />
                          En alquiler<strong>{rented}</strong>
                        </span>
                        <span>
                          <i className="data-dot amber" />
                          Mantenimiento<strong>{maintenance.length}</strong>
                        </span>
                      </div>
                      {maintenance.length > 0 && (
                        <div className="maintenance-note">
                          <Wrench size={17} />
                          <div>
                            <strong>{maintenance.map((c) => c.placa).join(', ')} en taller</strong>
                            <p>Fuera de disponibilidad hasta su habilitación.</p>
                          </div>
                          <button
                            className="icon-button"
                            aria-label="Revisar vehículo en mantenimiento"
                            onClick={() => setModal({ type: 'car', car: maintenance[0] })}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      )}
                    </section>
                  </div>
                  <div className="section-heading lower-heading">
                    <h2>Tu flota, de un vistazo</h2>
                    <button className="text-button" onClick={() => navigate('flota')}>
                      Gestionar vehículos
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  <CarTable
                    cars={data.autos.slice(0, 4)}
                    reservations={data.reservas}
                    inspections={data.inspecciones}
                    onEdit={(car) => setModal({ type: 'car', car })}
                    onBook={(carId) => setModal({ type: 'booking', carId })}
                  />
                </>
              )}
              {view === 'flota' && (
                <>
                  <Tabs
                    value={filter}
                    set={setFilter}
                    items={['todos', 'disponible', 'alquilado', 'mantenimiento']}
                    data={data}
                  />
                  <Toolbar
                    search={search}
                    setSearch={setSearch}
                    placeholder="Buscar marca, modelo o placa"
                    count={`${cars.length} vehículos`}
                    onExport={() =>
                      exportCsv(
                        'flota',
                        ['Placa', 'Marca', 'Modelo', 'Año', 'Tarifa diaria', 'Estado'],
                        cars.map((c) => [
                          c.placa,
                          c.marca,
                          c.modelo,
                          c.anio,
                          c.tarifa_diaria,
                          labels[carState(c, data.reservas, today(), data.inspecciones)],
                        ]),
                      )
                    }
                  />
                  <CarTable
                    cars={cars}
                    reservations={data.reservas}
                    inspections={data.inspecciones}
                    onEdit={(car) => setModal({ type: 'car', car })}
                    onBook={(carId) => setModal({ type: 'booking', carId })}
                  />
                </>
              )}
              {view === 'reservas' && (
                <>
                  <Tabs
                    value={filter}
                    set={setFilter}
                    items={['todos', 'activa', 'finalizada', 'cancelada']}
                    data={data}
                  />
                  <Toolbar
                    search={search}
                    setSearch={setSearch}
                    placeholder="Buscar cliente, DNI o vehículo"
                    count={`${reservations.length} reservas`}
                    onExport={() =>
                      exportCsv(
                        'reservas',
                        ['Cliente', 'DNI', 'Placa', 'Recojo', 'Devolución', 'Total', 'Estado'],
                        reservations.map((r) => [
                          r.cliente_nombre,
                          r.cliente_dni,
                          data.autos.find((c) => c.id === r.auto_id)?.placa || '',
                          r.fecha_inicio,
                          r.fecha_fin,
                          r.total,
                          labels[r.estado],
                        ]),
                      )
                    }
                  />
                  <div className="table-wrap">
                    <table className="reservation-table">
                      <thead>
                        <tr>
                          <th>Cliente / vehículo</th>
                          <th>Período de alquiler</th>
                          <th>Estado</th>
                          <th className="numeric">Total</th>
                          <th>
                            <span className="sr-only">Acciones</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservations.map((r) => {
                          const car = data.autos.find((c) => c.id === r.auto_id);
                          return (
                            <tr key={r.id}>
                              <td>
                                <strong>{r.cliente_nombre}</strong>
                                <small>
                                  {car?.marca} {car?.modelo} · {car?.placa} · DNI {r.cliente_dni}
                                </small>
                              </td>
                              <td>
                                <span>
                                  {shortDate(r.fecha_inicio)} — {shortDate(r.fecha_fin)}
                                </span>
                                <small>
                                  {daysBetween(r.fecha_inicio, r.fecha_fin)} días de alquiler
                                </small>
                              </td>
                              <td>
                                <Status
                                  state={
                                    r.estado === 'activa' && isDelivered(r.id, data.inspecciones)
                                      ? 'en_curso'
                                      : r.estado
                                  }
                                />
                              </td>
                              <td className="numeric">
                                {money(r.total)}
                                <small>
                                  {paymentSummary(r, data.pagos).label} ·{' '}
                                  {money(
                                    paymentSummary(r, data.pagos).refund ||
                                      paymentSummary(r, data.pagos).pending,
                                  )}{' '}
                                  {paymentSummary(r, data.pagos).refund
                                    ? 'por devolver'
                                    : 'pendiente'}
                                </small>
                              </td>
                              <td>
                                <button
                                  className="text-button"
                                  onClick={() => setModal({ type: 'detail', reservation: r })}
                                >
                                  Ver detalle
                                  <ChevronRight size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {!reservations.length && (
                      <div className="empty-state">
                        No hay reservas que coincidan con esta búsqueda.
                      </div>
                    )}
                  </div>
                </>
              )}
              {view === 'clientes' && (
                <>
                  <Toolbar
                    search={search}
                    setSearch={setSearch}
                    placeholder="Buscar nombre o DNI"
                    count={`${clients.length} clientes`}
                    onExport={() =>
                      exportCsv(
                        'clientes',
                        ['Nombre', 'DNI', 'Reservas', 'Importe reservado'],
                        clients.map((c) => [c.nombre, c.dni, c.records.length, c.total]),
                      )
                    }
                  />
                  <div className="table-wrap">
                    <table className="client-table">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>DNI</th>
                          <th className="numeric">Reservas</th>
                          <th className="numeric">Importe reservado</th>
                          <th>Último recojo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clients.map((c) => (
                          <tr key={c.dni}>
                            <td>
                              <div className="person">
                                <span className="avatar">
                                  {c.nombre
                                    .split(' ')
                                    .map((w) => w[0])
                                    .slice(0, 2)
                                    .join('')}
                                </span>
                                <strong>{c.nombre}</strong>
                              </div>
                            </td>
                            <td>{c.dni}</td>
                            <td className="numeric">{c.records.length}</td>
                            <td className="numeric">{money(c.total)}</td>
                            <td>
                              {shortDate(
                                c.records
                                  .map((r) => r.fecha_inicio)
                                  .sort()
                                  .at(-1)!,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!clients.length && (
                      <div className="empty-state">
                        Tus clientes aparecerán aquí cuando crees sus reservas.
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>Rentaautos · Gestión de alquileres</span>
            <span>
              {demo ? 'Datos de ejemplo · Cambios temporales' : 'Datos protegidos en Supabase'}
              <span className="footer-dot" />
              PEN · S/
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button
            className="icon-button"
            aria-label="Cerrar notificación"
            onClick={() => setNotice('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal?.type === 'booking' && (
        <Dialog
          title={modal.original ? 'Editar reserva' : 'Nueva reserva'}
          onClose={() => setModal(null)}
        >
          <BookingForm
            cars={data.autos}
            data={data}
            demo={demo}
            initialCar={modal.carId}
            busy={busy}
            original={modal.original}
            onSave={(input) => createReservation(input, modal.original)}
          />
        </Dialog>
      )}
      {modal?.type === 'car' && (
        <Dialog
          title={modal.car ? 'Editar vehículo' : 'Agregar vehículo'}
          onClose={() => setModal(null)}
        >
          <CarForm car={modal.car} busy={busy} onSave={saveCar} />
        </Dialog>
      )}
      {modal?.type === 'detail' &&
        (() => {
          const r = data.reservas.find((r) => r.id === modal.reservation.id) || modal.reservation;
          return (
            <Dialog title="Detalle de la reserva" wide onClose={() => setModal(null)}>
              <ReservationDetail
                reservation={r}
                car={data.autos.find((c) => c.id === r.auto_id)!}
                data={data}
                busy={busy}
                onEdit={() => setModal({ type: 'booking', original: r })}
                onReceipt={() => setModal({ type: 'receipt', reservation: r })}
                onInspection={recordInspection}
                onPayment={recordPayment}
                onCancel={() => cancelReservation(r)}
              />
            </Dialog>
          );
        })()}
      {modal?.type === 'receipt' &&
        (() => {
          const r = data.reservas.find((r) => r.id === modal.reservation.id) || modal.reservation;
          return (
            <Dialog title="Comprobante de reserva" wide onClose={() => setModal(null)}>
              <Receipt
                reservation={r}
                car={data.autos.find((c) => c.id === r.auto_id)!}
                payments={data.pagos}
              />
            </Dialog>
          );
        })()}
      {modal?.type === 'auth' && (
        <Dialog title="Tu oficina en Supabase" onClose={() => setModal(null)}>
          <AuthForm onDone={() => setModal(null)} />
        </Dialog>
      )}
      {modal?.type === 'help' && (
        <Dialog title="Alquileres, bajo control" onClose={() => setModal(null)}>
          <div className="help-content">
            <h3>Primero, tu flota</h3>
            <p>
              Registra la matrícula, la tarifa diaria en soles y el estado de cada vehículo desde Mi
              flota.
            </p>
            <h3>Después, la reserva</h3>
            <p>
              Selecciona un auto, las fechas y el cliente con su DNI. La cotización comprueba la
              disponibilidad y calcula el total antes de guardar.
            </p>
            <h3>Cierra cada alquiler</h3>
            <p>
              En Reservas puedes registrar la entrega y la devolución con kilometraje, combustible y
              observaciones. También puedes editar antes de entregar y registrar pagos o reembolsos.
              Las reservas canceladas dejan de ocupar el calendario.
            </p>
            <div className="info-well">
              El precio se calcula por la diferencia de días. Las fechas de recojo y devolución
              están incluidas en la ocupación: no se admiten dos reservas del mismo auto el mismo
              día.
            </div>
            <p>
              {session
                ? 'Tus datos se guardan en Supabase y están separados de otras cuentas.'
                : 'Estás en una demo temporal. Conecta tu oficina para guardar tus datos en Supabase.'}
            </p>
          </div>
        </Dialog>
      )}
    </div>
  );
}
