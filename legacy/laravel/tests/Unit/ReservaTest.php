<?php

namespace Tests\Unit;

use App\Models\Auto;
use App\Models\Reserva;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ReservaTest extends TestCase
{
    use RefreshDatabase;

    /**
     * PRUEBA 1: Verifica que una Reserva se pueda crear correctamente.
     */
    public function test_una_reserva_se_puede_crear(): void
    {
        $auto = Auto::create([
            'placa' => 'TEST-100',
            'marca' => 'Mazda',
            'modelo' => '3',
            'anio' => 2023,
            'tarifa_diaria' => 140.00,
            'estado' => 'disponible',
        ]);

        $reserva = Reserva::create([
            'auto_id' => $auto->id,
            'cliente_nombre' => 'Juan Pérez',
            'cliente_dni' => '12345678',
            'fecha_inicio' => '2026-11-01',
            'fecha_fin' => '2026-11-05',
            'total' => 560.00,
            'estado' => 'activa',
        ]);

        $this->assertDatabaseHas('reservas', [
            'cliente_nombre' => 'Juan Pérez',
            'cliente_dni' => '12345678',
        ]);

        $this->assertEquals(560.00, $reserva->total);
    }

    /**
     * PRUEBA 2: Verifica que los casts de fechas funcionan.
     */
    public function test_una_reserva_castea_fechas_correctamente(): void
    {
        $auto = Auto::create([
            'placa' => 'TEST-101',
            'marca' => 'Kia',
            'modelo' => 'Rio',
            'anio' => 2023,
            'tarifa_diaria' => 110.00,
            'estado' => 'disponible',
        ]);

        $reserva = Reserva::create([
            'auto_id' => $auto->id,
            'cliente_nombre' => 'María López',
            'cliente_dni' => '87654321',
            'fecha_inicio' => '2026-12-01',
            'fecha_fin' => '2026-12-05',
            'total' => 440.00,
            'estado' => 'activa',
        ]);

        $this->assertInstanceOf(\Carbon\Carbon::class, $reserva->fecha_inicio);
        $this->assertInstanceOf(\Carbon\Carbon::class, $reserva->fecha_fin);
    }

    /**
     * PRUEBA 3: Verifica la relación belongsTo con Auto.
     */
    public function test_una_reserva_pertenece_a_un_auto(): void
    {
        $auto = Auto::create([
            'placa' => 'TEST-102',
            'marca' => 'Chevrolet',
            'modelo' => 'Aveo',
            'anio' => 2022,
            'tarifa_diaria' => 100.00,
            'estado' => 'disponible',
        ]);

        $reserva = Reserva::create([
            'auto_id' => $auto->id,
            'cliente_nombre' => 'Carlos Ruiz',
            'cliente_dni' => '11223344',
            'fecha_inicio' => '2026-11-10',
            'fecha_fin' => '2026-11-15',
            'total' => 500.00,
            'estado' => 'activa',
        ]);

        $this->assertInstanceOf(Auto::class, $reserva->auto);
        $this->assertEquals('TEST-102', $reserva->auto->placa);
    }

    /**
     * PRUEBA 4: Verifica el estado por defecto "activa".
     */
    public function test_una_reserva_por_defecto_es_activa(): void
    {
        $auto = Auto::create([
            'placa' => 'TEST-103',
            'marca' => 'Hyundai',
            'modelo' => 'Accent',
            'anio' => 2023,
            'tarifa_diaria' => 130.00,
            'estado' => 'disponible',
        ]);

        $reserva = Reserva::create([
            'auto_id' => $auto->id,
            'cliente_nombre' => 'Ana Torres',
            'cliente_dni' => '55667788',
            'fecha_inicio' => '2026-12-10',
            'fecha_fin' => '2026-12-15',
            'total' => 650.00,
        ]);

        $this->assertEquals('activa', $reserva->fresh()->estado);
    }
}
