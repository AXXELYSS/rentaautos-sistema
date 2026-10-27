import { Printer } from 'lucide-react';
import {
  daysBetween,
  money,
  paymentSummary,
  type Car,
  type Reservation,
  type Payment,
} from '../domain';
import { Brand } from './ui';
import { methodLabels } from './RentalForms';
export function Receipt({
  reservation: r,
  car,
  payments,
}: {
  reservation: Reservation;
  car: Car;
  payments: Payment[];
}) {
  const balance = paymentSummary(r, payments);
  const entries = payments.filter((p) => p.reserva_id === r.id);
  return (
    <>
      <div className="receipt">
        <header>
          <Brand />
          <span>Comprobante de reserva</span>
        </header>
        <div className="receipt-meta">
          <div>
            <h3>Reserva {r.id.slice(0, 8).toUpperCase()}</h3>
            <p>
              Emitido:{' '}
              {new Intl.DateTimeFormat('es-PE', {
                dateStyle: 'medium',
                timeZone: 'America/Lima',
              }).format(new Date())}
            </p>
          </div>
          <strong>
            {r.estado === 'cancelada'
              ? 'Cancelada'
              : r.estado === 'finalizada'
                ? 'Finalizada'
                : 'Activa'}
          </strong>
        </div>
        <div className="receipt-parties">
          <section>
            <h3>Cliente</h3>
            <p>{r.cliente_nombre}</p>
            <p>DNI: {r.cliente_dni}</p>
          </section>
          <section>
            <h3>Vehículo</h3>
            <p>
              {car.marca} {car.modelo} · {car.anio}
            </p>
            <p>Placa: {car.placa}</p>
          </section>
        </div>
        <table>
          <thead>
            <tr>
              <th>Recojo</th>
              <th>Devolución prevista</th>
              <th className="numeric">Días</th>
              <th className="numeric">Tarifa diaria</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{r.fecha_inicio}</td>
              <td>{r.fecha_fin}</td>
              <td className="numeric">{daysBetween(r.fecha_inicio, r.fecha_fin)}</td>
              <td className="numeric">{money(r.tarifa_aplicada)}</td>
            </tr>
          </tbody>
        </table>
        <dl className="receipt-totals">
          <div>
            <dt>Total reservado</dt>
            <dd>{money(r.total)}</dd>
          </div>
          <div>
            <dt>Cobrado neto</dt>
            <dd>{money(balance.received)}</dd>
          </div>
          <div>
            <dt>{balance.refund ? 'Reembolso pendiente' : 'Saldo pendiente'}</dt>
            <dd>{money(balance.refund || balance.pending)}</dd>
          </div>
        </dl>
        {entries.length > 0 && (
          <section className="receipt-payments">
            <h3>Movimientos registrados</h3>
            {entries.map((p) => (
              <p key={p.id}>
                <span>
                  {p.fecha_pago} · {p.tipo === 'pago' ? 'Pago' : 'Reembolso'} ·{' '}
                  {methodLabels[p.metodo]}
                  {p.referencia ? ` · ${p.referencia}` : ''}
                </span>
                <strong>
                  {p.tipo === 'reembolso' ? '−' : ''}
                  {money(p.monto)}
                </strong>
              </p>
            ))}
          </section>
        )}
        <footer>
          Importes en soles (PEN). El precio corresponde a la diferencia de días; las fechas de
          recojo y devolución están incluidas en la ocupación.
        </footer>
      </div>
      <div className="receipt-actions">
        <p>En la ventana de impresión puedes elegir «Guardar como PDF».</p>
        <button className="button primary" onClick={() => window.print()}>
          <Printer size={16} />
          Imprimir comprobante
        </button>
      </div>
    </>
  );
}
