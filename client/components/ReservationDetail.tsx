import { useState } from 'react';
import { ArrowRight, FileText, Pencil } from 'lucide-react';
import {
  daysBetween,
  money,
  paymentSummary,
  shortDate,
  isDelivered,
  type Car,
  type Reservation,
  type Snapshot,
  type InspectionInput,
  type PaymentInput,
} from '../domain';
import { readableError } from '../supabase';
import { Status } from './ui';
import { VehicleArt } from './Fleet';
import { InspectionForm, PaymentForm, methodLabels } from './RentalForms';

export function ReservationDetail({
  reservation: r,
  car,
  data,
  busy,
  onEdit,
  onReceipt,
  onInspection,
  onPayment,
  onCancel,
}: {
  reservation: Reservation;
  car: Car;
  data: Snapshot;
  busy: boolean;
  onEdit: () => void;
  onReceipt: () => void;
  onInspection: (v: InspectionInput) => Promise<void>;
  onPayment: (v: PaymentInput) => Promise<void>;
  onCancel: () => Promise<void>;
}) {
  const [tab, setTab] = useState('resumen');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const inspections = data.inspecciones.filter((i) => i.reserva_id === r.id);
  const departure = inspections.find((i) => i.tipo === 'salida');
  const returned = inspections.find((i) => i.tipo === 'devolucion');
  const balance = paymentSummary(r, data.pagos);
  const payments = data.pagos.filter((p) => p.reserva_id === r.id);
  const editable = r.estado === 'activa' && !isDelivered(r.id, inspections);
  async function cancel() {
    try {
      await onCancel();
      setConfirm(false);
      if (balance.received > 0) setTab('pagos');
    } catch (err) {
      setError(readableError(err));
    }
  }
  return (
    <div className="form-content detail-content">
      <div className="detail-vehicle">
        <VehicleArt car={car} />
        <div>
          <h3>
            {car.marca} {car.modelo}
          </h3>
          <p>
            {car.placa} · {car.anio}
          </p>
        </div>
        <Status state={r.estado === 'activa' && departure ? 'en_curso' : r.estado} />
      </div>
      <div className="detail-tools">
        {editable && (
          <button className="button" onClick={onEdit}>
            <Pencil size={14} />
            Editar reserva
          </button>
        )}
        <button className="button" onClick={onReceipt}>
          <FileText size={14} />
          Comprobante
        </button>
        {r.estado === 'activa' && (
          <button className="button" onClick={() => setTab('vehiculo')}>
            {departure ? 'Registrar devolución' : 'Registrar entrega'}
            <ArrowRight size={14} />
          </button>
        )}
      </div>
      <div className="tabs detail-tabs" role="group" aria-label="Secciones de la reserva">
        {[
          ['resumen', 'Resumen'],
          ['vehiculo', 'Entrega y devolución'],
          ['pagos', 'Pagos'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'resumen' && (
        <>
          <dl className="detail-list">
            <div>
              <dt>Cliente</dt>
              <dd>{r.cliente_nombre}</dd>
            </div>
            <div>
              <dt>DNI</dt>
              <dd>{r.cliente_dni}</dd>
            </div>
            <div>
              <dt>Recojo</dt>
              <dd>
                {shortDate(r.fecha_inicio)} · {r.fecha_inicio.slice(0, 4)}
              </dd>
            </div>
            <div>
              <dt>Devolución prevista</dt>
              <dd>
                {shortDate(r.fecha_fin)} · {r.fecha_fin.slice(0, 4)}
              </dd>
            </div>
            <div>
              <dt>Tarifa acordada</dt>
              <dd>{money(r.tarifa_aplicada)} por día</dd>
            </div>
            <div>
              <dt>Duración</dt>
              <dd>{daysBetween(r.fecha_inicio, r.fecha_fin)} días</dd>
            </div>
            <div className="detail-total">
              <dt>Total reservado</dt>
              <dd>{money(r.total)}</dd>
            </div>
          </dl>
          <div className="balance-well">
            <span>{balance.label}</span>
            <strong>
              {balance.refund
                ? `Por devolver: ${money(balance.refund)}`
                : `Saldo pendiente: ${money(balance.pending)}`}
            </strong>
            <button className="text-button" onClick={() => setTab('pagos')}>
              Ver pagos
              <ArrowRight size={14} />
            </button>
          </div>
        </>
      )}
      {tab === 'vehiculo' && (
        <>
          <div className="inspection-history">
            {inspections.map((i) => (
              <div key={i.id} className="inspection-record">
                <h3>{i.tipo === 'salida' ? 'Entrega registrada' : 'Devolución registrada'}</h3>
                <p>
                  {new Intl.DateTimeFormat('es-PE', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'America/Lima',
                  }).format(new Date(i.created_at))}
                </p>
                <dl>
                  <div>
                    <dt>Kilometraje</dt>
                    <dd>{i.kilometraje.toLocaleString('es-PE')} km</dd>
                  </div>
                  <div>
                    <dt>Combustible</dt>
                    <dd>{i.combustible}%</dd>
                  </div>
                </dl>
                {i.observaciones && <p className="inspection-notes">{i.observaciones}</p>}
              </div>
            ))}
          </div>
          {r.estado === 'activa' && !returned ? (
            <InspectionForm
              key={departure ? 'return' : 'departure'}
              reservation={r}
              type={departure ? 'devolucion' : 'salida'}
              minKm={Math.max(car.kilometraje, departure?.kilometraje || 0)}
              departure={departure}
              busy={busy}
              onSave={onInspection}
            />
          ) : !inspections.length ? (
            <p className="field-hint">
              No hay registros de entrega o devolución para esta reserva histórica.
            </p>
          ) : null}
        </>
      )}
      {tab === 'pagos' && (
        <>
          <div className="payment-summary">
            <div>
              <span>Total</span>
              <strong>{money(r.total)}</strong>
            </div>
            <div>
              <span>Cobrado neto</span>
              <strong>{money(balance.received)}</strong>
            </div>
            <div>
              <span>{balance.refund ? 'Por devolver' : 'Por cobrar'}</span>
              <strong>{money(balance.refund || balance.pending)}</strong>
            </div>
          </div>
          <p className="payment-state">{balance.label}</p>
          {payments.length ? (
            <div className="payment-history">
              {payments.map((p) => (
                <div key={p.id}>
                  <span>
                    <strong>
                      {p.tipo === 'pago' ? 'Pago' : 'Reembolso'} · {methodLabels[p.metodo]}
                    </strong>
                    <small>
                      {shortDate(p.fecha_pago)}
                      {p.referencia ? ` · ${p.referencia}` : ''}
                    </small>
                  </span>
                  <strong>
                    {p.tipo === 'pago' ? '+' : '−'}
                    {money(p.monto)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="field-hint">
              Aún no hay pagos registrados. El importe reservado no representa dinero recibido.
            </p>
          )}
          <PaymentForm reservation={r} payments={data.pagos} busy={busy} onSave={onPayment} />
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {editable &&
        (confirm ? (
          <div className="confirm-box">
            <p>
              ¿Cancelar la reserva de {r.cliente_nombre}? Se liberarán las fechas del vehículo.
              {balance.received > 0 &&
                ` Deberás registrar un reembolso de ${money(balance.received)} al cliente.`}
            </p>
            <div>
              <button className="button" disabled={busy} onClick={() => setConfirm(false)}>
                Conservar reserva
              </button>
              <button className="button danger" disabled={busy} onClick={() => void cancel()}>
                Sí, cancelar reserva
              </button>
            </div>
          </div>
        ) : (
          <div className="cancel-reservation">
            <button className="text-button danger-text" onClick={() => setConfirm(true)}>
              Cancelar reserva
            </button>
          </div>
        ))}
    </div>
  );
}
