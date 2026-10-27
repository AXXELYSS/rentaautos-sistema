import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowDownToLine, Search, X } from 'lucide-react';
import { carState, type Snapshot } from '../domain';
const labels: Record<string, string> = {
  disponible: 'Disponible',
  alquilado: 'En alquiler',
  mantenimiento: 'Mantenimiento',
  activa: 'Activa',
  en_curso: 'En curso',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};
export function Brand() {
  return (
    <div className="brand">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M7 25V7h10c10 0 10 12 0 12h-5m6 0 8 6" />
      </svg>
      <span>
        rentaautos<span className="brand-dot">.</span>
      </span>
    </div>
  );
}

export function Status({ state }: { state: string }) {
  return (
    <span className={`status ${state}`}>
      <i />
      {labels[state] || state}
    </span>
  );
}

export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? 'dialog wide' : 'dialog'}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-header">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-button" aria-label="Cerrar ventana" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function Tabs({
  items,
  value,
  set,
  data,
}: {
  items: string[];
  value: string;
  set: (v: string) => void;
  data: Snapshot;
}) {
  return (
    <div className="tabs" role="group" aria-label="Filtrar por estado">
      {items.map((item) => (
        <button
          key={item}
          className={item === value ? 'active' : ''}
          aria-pressed={item === value}
          onClick={() => set(item)}
        >
          {item === 'todos' ? 'Todos' : labels[item]}
          <span>
            {item === 'todos'
              ? items.includes('activa')
                ? data.reservas.length
                : data.autos.length
              : items.includes('activa')
                ? data.reservas.filter((r) => r.estado === item).length
                : data.autos.filter(
                    (c) => carState(c, data.reservas, undefined, data.inspecciones) === item,
                  ).length}
          </span>
        </button>
      ))}
    </div>
  );
}

export function Toolbar({
  search,
  setSearch,
  placeholder,
  count,
  onExport,
}: {
  search: string;
  setSearch: (s: string) => void;
  placeholder: string;
  count: string;
  onExport: () => void;
}) {
  return (
    <div className="toolbar">
      <label className="search-field">
        <Search size={16} />
        <input
          aria-label={placeholder}
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="icon-button"
            aria-label="Limpiar búsqueda"
            onClick={() => setSearch('')}
          >
            <X size={14} />
          </button>
        )}
      </label>
      <span>{count}</span>
      <button className="button" onClick={onExport}>
        <ArrowDownToLine size={15} />
        Exportar CSV
      </button>
    </div>
  );
}
