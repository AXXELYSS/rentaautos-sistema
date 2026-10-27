-- Coherencia del odómetro, sellado de creación y fecha local de pago.
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
    new.created_at:=now();
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


create or replace function public.rental_validate_payment() returns trigger
language plpgsql security invoker set search_path='' as $$
declare booking public.rental_reservas; received numeric;
begin
  select * into booking from public.rental_reservas where id=new.reserva_id and owner_id=new.owner_id for update;
  if not found then raise exception 'La reserva no existe o no pertenece a tu oficina.'; end if;
  if new.fecha_pago>(now() at time zone 'America/Lima')::date or new.fecha_pago<(booking.created_at at time zone 'America/Lima')::date
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

create or replace function public.rental_validate_car() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.id<>old.id or new.owner_id<>old.owner_id then raise exception 'No se puede cambiar el propietario del vehículo.'; end if;
  if new.kilometraje<old.kilometraje then raise exception 'El kilometraje no puede ser menor que el último registrado.'; end if;
  if new.estado<>'disponible' and new.estado<>old.estado and exists (
    select 1 from public.rental_reservas r where r.auto_id=old.id and r.estado='activa' and (
      r.fecha_fin>=(now() at time zone 'America/Lima')::date or
      exists(select 1 from public.rental_inspecciones i where i.reserva_id=r.id and i.tipo='salida' and not exists(select 1 from public.rental_inspecciones d where d.reserva_id=r.id and d.tipo='devolucion'))
    )
  ) then raise exception 'El auto tiene reservas activas. Ciérralas antes de cambiar su disponibilidad.'; end if;
  return new;
end $$;
