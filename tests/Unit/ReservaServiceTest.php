<?php

namespace Tests\Unit;

use App\Models\Auto;
use App\Models\Reserva;
use App\Services\ReservaService;
use InvalidArgumentException;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ReservaServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_no_permite_reservar_auto_no_disponible(): void
    {
        $auto = Auto::create(['placa' => 'ABC-123', 'marca' => 'Toyota', 'modelo' => 'Corolla', 'anio' => 2023, 'tarifa_diaria' => 150.00]);
        Reserva::create(['auto_id' => $auto->id, 'cliente_nombre' => 'Juan', 'cliente_dni' => '12345678', 'fecha_inicio' => '2026-10-15', 'fecha_fin' => '2026-10-20', 'total' => 750.00, 'estado' => 'activa']);

        $service = new ReservaService();
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('El auto no está disponible');
        $service->validarDisponibilidad($auto, '2026-10-18', '2026-10-22');
    }

    public function test_permite_reservar_auto_disponible(): void
    {
        $auto = Auto::create(['placa' => 'XYZ-789', 'marca' => 'Honda', 'modelo' => 'Civic', 'anio' => 2024, 'tarifa_diaria' => 180.00]);
        $service = new ReservaService();
        $resultado = $service->validarDisponibilidad($auto, '2026-11-01', '2026-11-05');
        $this->assertTrue($resultado);
    }

    public function test_calcula_total_correctamente(): void
    {
        $auto = Auto::create(['placa' => 'DEF-456', 'marca' => 'Nissan', 'modelo' => 'Sentra', 'anio' => 2023, 'tarifa_diaria' => 120.00]);
        $service = new ReservaService();
        $total = $service->calcularTotal($auto, '2026-11-01', '2026-11-05');
        $this->assertEquals(480.00, $total);
    }

    public function test_no_permite_fechas_invalidas(): void
    {
        $auto = Auto::create(['placa' => 'GHI-789', 'marca' => 'Mazda', 'modelo' => '3', 'anio' => 2023, 'tarifa_diaria' => 140.00]);
        $service = new ReservaService();
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('La fecha de fin debe ser posterior');
        $service->validarDisponibilidad($auto, '2026-11-10', '2026-11-05');
    }

        public function test_no_crea_reserva_si_auto_no_esta_disponible(): void
    {
        $auto = Auto::create([
            'placa' => 'JKL-012',
            'marca' => 'Kia',
            'modelo' => 'Rio',
            'anio' => 2023,
            'tarifa_diaria' => 110.00,
            'estado' => 'mantenimiento',
        ]);

        $service = new ReservaService();

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('El auto no está disponible');

        $service->crearReserva([
            'auto_id' => $auto->id,
            'cliente_nombre' => 'María',
            'cliente_dni' => '87654321',
            'fecha_inicio' => '2026-12-01',
            'fecha_fin' => '2026-12-05',
        ]);
    }
}
