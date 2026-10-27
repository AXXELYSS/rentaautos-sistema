-- Integration test against deployed PostgreSQL, no persistent test users/data.
begin;
select set_config('rental.test_owner',gen_random_uuid()::text,true);
select set_config('rental.other_owner',gen_random_uuid()::text,true);
insert into auth.users(id,email) values
  (current_setting('rental.test_owner')::uuid,'rental-test@example.invalid'),
  (current_setting('rental.other_owner')::uuid,'rental-other@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('rental.test_owner'),true);
do $$
declare c uuid; b uuid; quote jsonb; result numeric; blocked boolean; start_day date := (now() at time zone 'America/Lima')::date+10;
begin
  insert into public.rental_autos(placa,marca,modelo,anio,tarifa_diaria) values ('TST-001','Toyota','Corolla',2023,150.25) returning id into c;
  quote := public.rental_quote(c,start_day,start_day+3);
  assert (quote->>'total')::numeric=450.75,'Quote total';
  insert into public.rental_reservas(auto_id,cliente_nombre,cliente_dni,fecha_inicio,fecha_fin,total)
    values(c,'Cliente de prueba','12345678',start_day,start_day+3,1) returning id,total into b,result;
  assert result=450.75,'Server must overwrite manipulated totals';
  blocked:=false;
  begin
    insert into public.rental_reservas(auto_id,cliente_nombre,cliente_dni,fecha_inicio,fecha_fin)
      values(c,'Otro cliente','87654321',start_day+3,start_day+5);
  exception when exclusion_violation then blocked:=true; end;
  assert blocked,'Inclusive overlap must fail';
  blocked:=false;
  begin update public.rental_reservas set total=1 where id=b;
  exception when raise_exception then blocked:=true; end;
  assert blocked,'Saved totals must be immutable';
  blocked:=false;
  begin update public.rental_autos set estado='mantenimiento' where id=c;
  exception when raise_exception then blocked:=true; end;
  assert blocked,'Active bookings must protect availability';
  blocked:=false;
  begin update public.rental_reservas set estado='finalizada' where id=b;
  exception when raise_exception then blocked:=true; end;
  assert blocked,'Future bookings must not be finalized';
  update public.rental_reservas set estado='cancelada' where id=b;
  quote:=public.rental_quote(c,start_day,start_day+3);
  assert (quote->>'dias')::integer=3,'Cancellation must release interval';
  blocked:=false;
  begin
    insert into public.rental_reservas(auto_id,cliente_nombre,cliente_dni,fecha_inicio,fecha_fin)
      values(c,'Cliente','123',start_day,start_day+1);
  exception when check_violation then blocked:=true; end;
  assert blocked,'Invalid DNI must fail';
  blocked:=false;
  begin perform public.rental_quote(c,start_day,start_day-1);
  exception when raise_exception then blocked:=true; end;
  assert blocked,'Reversed dates must fail';
  perform set_config('request.jwt.claim.sub',current_setting('rental.other_owner'),true);
  assert not exists(select 1 from public.rental_autos where id=c),'RLS must isolate cars';
  assert not exists(select 1 from public.rental_reservas where id=b),'RLS must isolate bookings';
  blocked:=false;
  begin insert into public.rental_autos(owner_id,placa,marca,modelo,anio,tarifa_diaria)
    values(current_setting('rental.test_owner')::uuid,'TST-002','Kia','Rio',2023,110);
  exception when insufficient_privilege then blocked:=true; end;
  assert blocked,'Owner spoofing must fail';
end $$;
reset role;
select 'PASS: quote, server total, inclusive overlap, immutable history, maintenance, lifecycle, cancellation, DNI, dates, RLS isolation and owner spoofing' as result;
rollback;
