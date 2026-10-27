<?php

namespace Tests\Unit;

use App\Models\Auto;
use App\Services\ReservaService;
use PHPUnit\Framework\TestCase;

class ReservaCalculoTest extends TestCase
{
    public function test_calcula_importe_sin_base_de_datos(): void
    {
        // Preparación: objeto en memoria, sin persistencia.
        $auto = new Auto();
        $auto->tarifa_diaria = 120.00;
        $service = new ReservaService();

        // Acción: cuatro días de alquiler.
        $total = $service->calcularTotal($auto, '2026-11-01', '2026-11-05');

        // Verificación: cuatro días por una tarifa de 120.
        $this->assertSame(480.00, $total);
    }
}
