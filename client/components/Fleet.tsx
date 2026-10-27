import { ArrowRight, ChevronRight, Wrench } from 'lucide-react';
import {
  addDays,
  carState,
  daysBetween,
  money,
  shortDate,
  today,
  type Car,
  type Reservation,
  type Snapshot,
  type Inspection,
} from '../domain';
import { Status } from './ui';
export function VehicleArt({ car }: { car: Car }) {
  return (
    <svg
      className={`vehicle-art art-${car.marca.toLowerCase()}`}
      viewBox="0 0 110 48"
      aria-hidden="true"
    >
      <ellipse cx="54" cy="39" rx="44" ry="2" fill="#e3e8e9" />
      <path d="M8 30 12 22 30 19 41 10h28l15 11 13 4 5 10H8Z" fill="currentColor" />
      <path d="m34 20 10-8h23l11 9Z" fill="#b4c4c9" />
      <path d="m55 12-1 9" stroke="#eef2f3" strokeWidth="2" />
      <path d="M10 27h13m67 0h9" stroke="#fff" strokeWidth="3" />
      <path d="M44 25h8m13 0h7" stroke="#a1aeb1" strokeWidth="1.5" />
      <circle cx="28" cy="35" r="8" fill="#30393c" />
      <circle cx="28" cy="35" r="4" fill="#d2dadd" />
      <circle cx="82" cy="35" r="8" fill="#30393c" />
      <circle cx="82" cy="35" r="4" fill="#d2dadd" />
    </svg>
  );
}

export function Timeline({
  data,
  start,
  onSelect,
}: {
  data: Snapshot;
  start: string;
  onSelect: (r: Reservation) => void;
}) {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const occupiedUntil = (r: Reservation) =>
    data.inspecciones.some((i) => i.reserva_id === r.id && i.tipo === 'salida') &&
    !data.inspecciones.some((i) => i.reserva_id === r.id && i.tipo === 'devolucion') &&
    r.fecha_fin < today()
      ? today()
      : r.fecha_fin;
  return (
    <div className="timeline-scroll">
      <div className="timeline">
        <div className="timeline-head">
          <span>Vehículo</span>
          {dates.map((day) => (
            <div key={day} className={day === today() ? 'today' : ''}>
              <span>
                {new Intl.DateTimeFormat('es-PE', { weekday: 'short', timeZone: 'UTC' }).format(
                  new Date(day + 'T12:00:00Z'),
                )}
              </span>
              <strong>{Number(day.slice(8))}</strong>
              {day === today() && <i />}
            </div>
          ))}
        </div>
        {data.autos.map((car) => (
          <div className="timeline-row" key={car.id}>
            <div className="timeline-vehicle">
              <strong>
                {car.marca} {car.modelo}
              </strong>
              <span>{car.placa}</span>
            </div>
            <div className="timeline-track">
              {dates.map((day) => (
                <div key={day} className={`day-cell ${day === today() ? 'today' : ''}`} />
              ))}
              {car.estado === 'mantenimiento' ? (
                <span className="timeline-maintenance">
                  <Wrench size={13} />
                  En mantenimiento
                </span>
              ) : (
                data.reservas
                  .filter(
                    (r) =>
                      r.auto_id === car.id &&
                      r.estado === 'activa' &&
                      r.fecha_inicio <= dates[6] &&
                      occupiedUntil(r) >= start,
                  )
                  .map((r) => {
                    const offset = Math.max(0, daysBetween(start, r.fecha_inicio));
                    const end = Math.min(6, daysBetween(start, occupiedUntil(r)));
                    return (
                      <button
                        className="booking-bar"
                        style={{
                          left: `calc(${(offset / 7) * 100}% + 5px)`,
                          width: `calc(${((end - offset + 1) / 7) * 100}% - 10px)`,
                        }}
                        key={r.id}
                        title={`${r.cliente_nombre}: ${shortDate(r.fecha_inicio)} al ${shortDate(r.fecha_fin)}`}
                        onClick={() => onSelect(r)}
                      >
                        <span>{r.cliente_nombre}</span>
                        <ChevronRight size={12} />
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        ))}
        {!data.autos.length && (
          <div className="empty-state">Agrega un vehículo para ver su disponibilidad.</div>
        )}
      </div>
    </div>
  );
}

export function CarTable({
  cars,
  reservations,
  inspections = [],
  onEdit,
  onBook,
}: {
  cars: Car[];
  reservations: Reservation[];
  inspections?: Inspection[];
  onEdit: (c: Car) => void;
  onBook: (id: string) => void;
}) {
  return (
    <div className="table-wrap">
      <table className="car-table">
        <thead>
          <tr>
            <th>Vehículo</th>
            <th>Placa</th>
            <th>Estado actual</th>
            <th className="numeric">Tarifa diaria</th>
            <th>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cars.map((car) => (
            <tr key={car.id}>
              <td>
                <div className="vehicle-identity">
                  <VehicleArt car={car} />
                  <span>
                    <strong>
                      {car.marca} {car.modelo}
                    </strong>
                    <small>{car.anio} · Sedán</small>
                  </span>
                </div>
              </td>
              <td>
                <span className="plate">{car.placa}</span>
              </td>
              <td>
                <Status state={carState(car, reservations, today(), inspections)} />
              </td>
              <td className="numeric">
                <strong>{money(car.tarifa_diaria)}</strong>
                <small>por día</small>
              </td>
              <td>
                <div className="row-actions">
                  <button className="text-button" onClick={() => onEdit(car)}>
                    Editar
                  </button>
                  {car.estado === 'disponible' && (
                    <button className="button small" onClick={() => onBook(car.id)}>
                      Reservar
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!cars.length && (
        <div className="empty-state">No se encontraron vehículos para esta selección.</div>
      )}
    </div>
  );
}
