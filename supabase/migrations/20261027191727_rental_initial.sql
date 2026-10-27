-- Rentaautos v2. Authenticated accounts own independent rental offices.
create extension if not exists btree_gist with schema extensions;

create table public.rental_autos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  placa text not null check (placa ~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$'),
  marca text not null check (length(trim(marca)) between 1 and 50),
  modelo text not null check (length(trim(modelo)) between 1 and 50),
  anio integer not null check (anio between 1950 and 2100),
  tarifa_diaria numeric(10,2) not null check (tarifa_diaria > 0 and tarifa_diaria <= 100000),
  estado text not null default 'disponible' check (estado in ('disponible','alquilado','mantenimiento')),
  created_at timestamptz not null default now(),
  unique(owner_id,placa), unique(id,owner_id)
);
create table public.rental_reservas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  auto_id uuid not null,
  cliente_nombre text not null check (length(trim(cliente_nombre)) between 2 and 100),
  cliente_dni text not null check (cliente_dni ~ '^[0-9]{8}$'),
  fecha_inicio date not null,
  fecha_fin date not null check (fecha_fin > fecha_inicio),
  total numeric(12,2) not null default 0 check (total > 0),
  estado text not null default 'activa' check (estado in ('activa','finalizada','cancelada')),
  created_at timestamptz not null default now(),
  foreign key(auto_id,owner_id) references public.rental_autos(id,owner_id),
  constraint rental_no_overlap exclude using gist (auto_id with =, daterange(fecha_inicio,fecha_fin,'[]') with &&) where (estado='activa')
);
create index rental_reservas_owner_date on public.rental_reservas(owner_id,fecha_inicio desc);
create index rental_reservas_auto_owner on public.rental_reservas(auto_id,owner_id);

alter table public.rental_autos enable row level security;
alter table public.rental_reservas enable row level security;
create policy own_cars_select on public.rental_autos for select to authenticated using (owner_id=(select auth.uid()));
create policy own_cars_insert on public.rental_autos for insert to authenticated with check (owner_id=(select auth.uid()));
create policy own_cars_update on public.rental_autos for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy own_bookings_select on public.rental_reservas for select to authenticated using (owner_id=(select auth.uid()));
create policy own_bookings_insert on public.rental_reservas for insert to authenticated with check (owner_id=(select auth.uid()));
create policy own_bookings_update on public.rental_reservas for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
revoke all on public.rental_autos,public.rental_reservas from anon;
grant select,insert,update on public.rental_autos,public.rental_reservas to authenticated;

create function public.rental_validate_booking() returns trigger
language plpgsql security invoker set search_path='' as $$
declare vehicle public.rental_autos; local_today date := (now() at time zone 'America/Lima')::date;
begin
  if TG_OP='UPDATE' then
    if (new.owner_id,new.auto_id,new.cliente_nombre,new.cliente_dni,new.fecha_inicio,new.fecha_fin,new.total,new.created_at,new.id)
      is distinct from (old.owner_id,old.auto_id,old.cliente_nombre,old.cliente_dni,old.fecha_inicio,old.fecha_fin,old.total,old.created_at,old.id)
      then raise exception 'Los datos de una reserva guardada no se pueden modificar. Cancélala y crea otra.'; end if;
    if old.estado<>'activa' or new.estado not in ('finalizada','cancelada') then raise exception 'La reserva ya está cerrada.'; end if;
    if new.estado='finalizada' and old.fecha_inicio>local_today then raise exception 'No puedes finalizar una reserva antes del recojo.'; end if;
    return new;
  end if;
  select * into vehicle from public.rental_autos where id=new.auto_id and owner_id=new.owner_id for update;
  if not found then raise exception 'El vehículo no existe o no pertenece a tu oficina.'; end if;
  if vehicle.estado<>'disponible' then raise exception 'El vehículo no está disponible: %.',vehicle.estado; end if;
  if new.fecha_inicio<local_today then raise exception 'El recojo no puede estar en el pasado.'; end if;
  if new.fecha_fin<=new.fecha_inicio then raise exception 'La devolución debe ser posterior al recojo.'; end if;
  if new.estado<>'activa' then raise exception 'La nueva reserva debe estar activa.'; end if;
  new.total := (new.fecha_fin-new.fecha_inicio)*vehicle.tarifa_diaria;
  new.cliente_nombre := trim(new.cliente_nombre);
  return new;
end $$;
create trigger rental_booking_guard before insert or update on public.rental_reservas
for each row execute function public.rental_validate_booking();

create function public.rental_validate_car() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.id<>old.id or new.owner_id<>old.owner_id then raise exception 'No se puede cambiar el propietario del vehículo.'; end if;
  if new.estado<>'disponible' and new.estado<>old.estado and exists (
    select 1 from public.rental_reservas where auto_id=old.id and estado='activa' and fecha_fin>=(now() at time zone 'America/Lima')::date
  ) then raise exception 'El auto tiene reservas activas. Ciérralas antes de cambiar su disponibilidad.'; end if;
  return new;
end $$;
create trigger rental_car_guard before update on public.rental_autos
for each row execute function public.rental_validate_car();

create function public.rental_quote(p_auto_id uuid,p_inicio date,p_fin date) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare vehicle public.rental_autos;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para cotizar.'; end if;
  select * into vehicle from public.rental_autos where id=p_auto_id;
  if not found then raise exception 'El vehículo no existe.'; end if;
  if p_inicio is null or p_fin is null or p_fin<=p_inicio then raise exception 'La devolución debe ser posterior al recojo.'; end if;
  if p_inicio<(now() at time zone 'America/Lima')::date then raise exception 'El recojo no puede estar en el pasado.'; end if;
  if vehicle.estado<>'disponible' then raise exception 'El vehículo no está disponible: %.',vehicle.estado; end if;
  if exists(select 1 from public.rental_reservas where auto_id=p_auto_id and estado='activa' and fecha_inicio<=p_fin and fecha_fin>=p_inicio)
    then raise exception 'El auto ya tiene una reserva en esas fechas. Elige otro período.'; end if;
  return jsonb_build_object('dias',p_fin-p_inicio,'tarifa_diaria',vehicle.tarifa_diaria,'total',(p_fin-p_inicio)*vehicle.tarifa_diaria);
end $$;
revoke execute on function public.rental_quote(uuid,date,date) from public,anon;
grant execute on function public.rental_quote(uuid,date,date) to authenticated;
revoke execute on function public.rental_validate_booking(),public.rental_validate_car() from public,anon,authenticated;
