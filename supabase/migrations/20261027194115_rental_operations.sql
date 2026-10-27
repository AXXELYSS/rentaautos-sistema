-- Segunda revisión: edición previa a entrega, inspecciones y libro de pagos.
alter table public.rental_autos add column kilometraje integer not null default 0 check (kilometraje >= 0);
alter table public.rental_reservas add column tarifa_aplicada numeric(10,2);
update public.rental_reservas set tarifa_aplicada=round(total/(fecha_fin-fecha_inicio),2);
alter table public.rental_reservas alter column tarifa_aplicada set not null;
alter table public.rental_reservas alter column tarifa_aplicada set default 0;
alter table public.rental_reservas add constraint rental_rate_positive check (tarifa_aplicada>0);
alter table public.rental_reservas add constraint rental_reservation_owner_unique unique(id,owner_id);

create table public.rental_pagos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reserva_id uuid not null,
  tipo text not null default 'pago' check (tipo in ('pago','reembolso')),
  monto numeric(12,2) not null check (monto>0),
  metodo text not null check (metodo in ('efectivo','transferencia','tarjeta','yape','otro')),
  referencia text not null default '' check (length(referencia)<=100),
  fecha_pago date not null default (now() at time zone 'America/Lima')::date,
  created_at timestamptz not null default now(),
  foreign key(reserva_id,owner_id) references public.rental_reservas(id,owner_id)
);
create table public.rental_inspecciones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reserva_id uuid not null,
  tipo text not null check (tipo in ('salida','devolucion')),
  kilometraje integer not null check (kilometraje>=0),
  combustible integer not null check (combustible between 0 and 100),
  observaciones text not null default '' check (length(observaciones)<=2000),
  created_at timestamptz not null default now(),
  unique(reserva_id,tipo),
  foreign key(reserva_id,owner_id) references public.rental_reservas(id,owner_id)
);
create index rental_pagos_reserva_owner on public.rental_pagos(reserva_id,owner_id);
create index rental_pagos_owner_date on public.rental_pagos(owner_id,fecha_pago);
create index rental_inspecciones_reserva_owner on public.rental_inspecciones(reserva_id,owner_id);
create index rental_inspecciones_owner on public.rental_inspecciones(owner_id);
alter table public.rental_pagos enable row level security;
alter table public.rental_inspecciones enable row level security;
create policy own_payments_select on public.rental_pagos for select to authenticated using(owner_id=(select auth.uid()));
create policy own_payments_insert on public.rental_pagos for insert to authenticated with check(owner_id=(select auth.uid()));
create policy own_inspections_select on public.rental_inspecciones for select to authenticated using(owner_id=(select auth.uid()));
create policy own_inspections_insert on public.rental_inspecciones for insert to authenticated with check(owner_id=(select auth.uid()));
revoke all on public.rental_pagos,public.rental_inspecciones from anon,authenticated;
grant select,insert on public.rental_pagos,public.rental_inspecciones to authenticated;

create or replace function public.rental_validate_booking() returns trigger
language plpgsql security invoker set search_path='' as $$
declare vehicle public.rental_autos; local_today date := (now() at time zone 'America/Lima')::date;
  changed boolean; received numeric;
begin
  if TG_OP='UPDATE' then
    if (new.id,new.owner_id,new.created_at) is distinct from (old.id,old.owner_id,old.created_at)
      then raise exception 'No se puede cambiar la identidad de la reserva.'; end if;
    if old.estado<>'activa' then raise exception 'La reserva ya está cerrada.'; end if;
    if new.total<>old.total or new.tarifa_aplicada<>old.tarifa_aplicada
      then raise exception 'El precio se calcula en el sistema; no se puede modificar directamente.'; end if;
    changed := (new.auto_id,new.cliente_nombre,new.cliente_dni,new.fecha_inicio,new.fecha_fin)
      is distinct from (old.auto_id,old.cliente_nombre,old.cliente_dni,old.fecha_inicio,old.fecha_fin);
    if new.estado<>old.estado then
      if changed then raise exception 'Guarda los cambios de la reserva antes de cerrarla.'; end if;
      if new.estado='cancelada' and exists(select 1 from public.rental_inspecciones where reserva_id=old.id and tipo='salida')
        then raise exception 'El vehículo ya fue entregado. Registra su devolución para cerrar el alquiler.'; end if;
      if new.estado='finalizada' and not exists(select 1 from public.rental_inspecciones where reserva_id=old.id and tipo='devolucion')
        then raise exception 'Registra la devolución del vehículo antes de finalizar el alquiler.'; end if;
      return new;
    end if;
    if exists(select 1 from public.rental_inspecciones where reserva_id=old.id)
      then raise exception 'La reserva ya tiene una entrega registrada y no se puede editar.'; end if;
    if not changed then return new; end if;
    if new.fecha_inicio<>old.fecha_inicio and new.fecha_inicio<local_today
      then raise exception 'El recojo no puede estar en el pasado.'; end if;
  else
    if new.fecha_inicio<local_today then raise exception 'El recojo no puede estar en el pasado.'; end if;
    if new.estado<>'activa' then raise exception 'La nueva reserva debe estar activa.'; end if;
  end if;
  select * into vehicle from public.rental_autos where id=new.auto_id and owner_id=new.owner_id for update;
  if not found then raise exception 'El vehículo no existe o no pertenece a tu oficina.'; end if;
  if vehicle.estado<>'disponible' then raise exception 'El vehículo no está disponible: %.',vehicle.estado; end if;
  if new.fecha_fin<=new.fecha_inicio then raise exception 'La devolución debe ser posterior al recojo.'; end if;
  if TG_OP='INSERT' then new.tarifa_aplicada:=vehicle.tarifa_diaria;
  elsif new.auto_id<>old.auto_id then new.tarifa_aplicada:=vehicle.tarifa_diaria;
  else new.tarifa_aplicada:=old.tarifa_aplicada; end if;
  new.total:=(new.fecha_fin-new.fecha_inicio)*new.tarifa_aplicada;
  if TG_OP='UPDATE' then
    select coalesce(sum(case when tipo='pago' then monto else -monto end),0) into received from public.rental_pagos where reserva_id=old.id;
    if new.total<received then raise exception 'El nuevo total es menor que lo cobrado. Registra primero el reembolso de la diferencia.'; end if;
  end if;
  new.cliente_nombre:=trim(new.cliente_nombre);
  return new;
end $$;

create function public.rental_quote_edit(p_auto_id uuid,p_inicio date,p_fin date,p_reserva_id uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare vehicle public.rental_autos; booking public.rental_reservas; rate numeric; received numeric;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para cotizar.'; end if;
  if p_reserva_id is not null then
    select * into booking from public.rental_reservas where id=p_reserva_id;
    if not found then raise exception 'La reserva no existe.'; end if;
    if booking.estado<>'activa' or exists(select 1 from public.rental_inspecciones where reserva_id=p_reserva_id)
      then raise exception 'Solo puedes editar reservas activas antes de entregar el vehículo.'; end if;
  end if;
  select * into vehicle from public.rental_autos where id=p_auto_id;
  if not found then raise exception 'El vehículo no existe.'; end if;
  if p_inicio is null or p_fin is null or p_fin<=p_inicio then raise exception 'La devolución debe ser posterior al recojo.'; end if;
  if p_inicio<(now() at time zone 'America/Lima')::date and (p_reserva_id is null or p_inicio<>booking.fecha_inicio)
    then raise exception 'El recojo no puede estar en el pasado.'; end if;
  if vehicle.estado<>'disponible' then raise exception 'El vehículo no está disponible: %.',vehicle.estado; end if;
  if exists(select 1 from public.rental_reservas where auto_id=p_auto_id and estado='activa'
      and (p_reserva_id is null or id<>p_reserva_id) and fecha_inicio<=p_fin and fecha_fin>=p_inicio)
    then raise exception 'El auto ya tiene una reserva en esas fechas. Elige otro período.'; end if;
  rate:=case when p_reserva_id is not null and booking.auto_id=p_auto_id then booking.tarifa_aplicada else vehicle.tarifa_diaria end;
  select coalesce(sum(case when tipo='pago' then monto else -monto end),0) into received from public.rental_pagos where reserva_id=p_reserva_id;
  if (p_fin-p_inicio)*rate<received then raise exception 'El nuevo total es menor que lo cobrado. Registra primero el reembolso de la diferencia.'; end if;
  return jsonb_build_object('dias',p_fin-p_inicio,'tarifa_diaria',rate,'total',(p_fin-p_inicio)*rate);
end $$;
create or replace function public.rental_quote(p_auto_id uuid,p_inicio date,p_fin date) returns jsonb
language sql security invoker set search_path='' as $$
  select public.rental_quote_edit(p_auto_id,p_inicio,p_fin,null);
$$;
revoke execute on function public.rental_quote_edit(uuid,date,date,uuid) from public,anon;
grant execute on function public.rental_quote_edit(uuid,date,date,uuid) to authenticated;

create function public.rental_validate_payment() returns trigger
language plpgsql security invoker set search_path='' as $$
declare booking public.rental_reservas; received numeric;
begin
  select * into booking from public.rental_reservas where id=new.reserva_id and owner_id=new.owner_id for update;
  if not found then raise exception 'La reserva no existe o no pertenece a tu oficina.'; end if;
  if new.fecha_pago>(now() at time zone 'America/Lima')::date or new.fecha_pago<booking.created_at::date
    then raise exception 'La fecha de pago debe estar entre la creación de la reserva y hoy.'; end if;
  select coalesce(sum(case when tipo='pago' then monto else -monto end),0) into received from public.rental_pagos where reserva_id=new.reserva_id;
  if new.tipo='pago' then
    if booking.estado='cancelada' then raise exception 'No puedes cobrar una reserva cancelada.'; end if;
    if received+new.monto>booking.total then raise exception 'El pago supera el saldo pendiente.'; end if;
  elsif new.tipo='reembolso' and new.monto>received then raise exception 'El reembolso supera el importe recibido.'; end if;
  new.referencia:=trim(new.referencia);
  new.created_at:=now();
  return new;
end $$;
create trigger rental_payment_guard before insert on public.rental_pagos for each row execute function public.rental_validate_payment();

create function public.rental_validate_inspection() returns trigger
language plpgsql security invoker set search_path='' as $$
declare booking public.rental_reservas; vehicle public.rental_autos; departure public.rental_inspecciones;
begin
  select * into booking from public.rental_reservas where id=new.reserva_id and owner_id=new.owner_id for update;
  if not found then raise exception 'La reserva no existe o no pertenece a tu oficina.'; end if;
  if booking.estado<>'activa' then raise exception 'La reserva ya está cerrada.'; end if;
  select * into vehicle from public.rental_autos where id=booking.auto_id for update;
  if new.tipo='salida' then
    if booking.fecha_inicio>(now() at time zone 'America/Lima')::date then raise exception 'No puedes entregar el vehículo antes del recojo.'; end if;
    if booking.fecha_fin<(now() at time zone 'America/Lima')::date then raise exception 'La reserva ya venció. Actualiza las fechas antes de entregar.'; end if;
    if vehicle.estado<>'disponible' then raise exception 'El vehículo no está disponible para entregar.'; end if;
    if exists(select 1 from public.rental_inspecciones i join public.rental_reservas r on r.id=i.reserva_id
        where r.auto_id=booking.auto_id and i.tipo='salida' and not exists(select 1 from public.rental_inspecciones d where d.reserva_id=i.reserva_id and d.tipo='devolucion'))
      then raise exception 'El vehículo todavía no ha sido devuelto de otro alquiler.'; end if;
  else
    select * into departure from public.rental_inspecciones where reserva_id=new.reserva_id and tipo='salida';
    if not found then raise exception 'Registra la entrega antes de registrar la devolución.'; end if;
    if new.kilometraje<departure.kilometraje then raise exception 'El kilometraje de devolución no puede ser menor que el de entrega.'; end if;
  end if;
  if new.kilometraje<vehicle.kilometraje then raise exception 'El kilometraje no puede ser menor que el último registrado del vehículo.'; end if;
  new.created_at:=now();
  new.observaciones:=trim(new.observaciones);
  return new;
end $$;
create trigger rental_inspection_guard before insert on public.rental_inspecciones for each row execute function public.rental_validate_inspection();
create function public.rental_apply_inspection() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  update public.rental_autos set kilometraje=new.kilometraje where id=(select auto_id from public.rental_reservas where id=new.reserva_id);
  if new.tipo='devolucion' then update public.rental_reservas set estado='finalizada' where id=new.reserva_id; end if;
  return new;
end $$;
create trigger rental_inspection_apply after insert on public.rental_inspecciones for each row execute function public.rental_apply_inspection();
revoke execute on function public.rental_validate_payment(),public.rental_validate_inspection(),public.rental_apply_inspection() from public,anon,authenticated;
