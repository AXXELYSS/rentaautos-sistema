<?php

namespace Tests\Unit;

use App\Models\Auto;
use App\Models\Reserva;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AutoTest extends TestCase
{
    use RefreshDatabase;

    /**
     * PRUEBA 1: Verifica que un Auto se pueda crear correctamente.
     */
    public function test_un_auto_se_puede_crear(): void
    {
        $auto = Auto::create([
            'placa' => 'TEST-001',
            'marca' => 'Toyota',
            'modelo' => 'Corolla',
            'anio' => 2023,
            'tarifa_diaria' => 150.00,
            'estado' => 'disponible',
        ]);

        $this->assertDatabaseHas('autos', [
            'placa' => 'TEST-001',
            'marca' => 'Toyota',
        ]);

        $this->assertEquals('TEST-001', $auto->placa);
    }

    /**
     * PRUEBA 2: Verifica que los atributos fillable funcionan.
     */
    public function test_un_auto_tiene_atributos_fillable(): void
    {
        $auto = new Auto();
        $fillable = $auto->getFillable();

        $this->assertContains('placa', $fillable);
        $this->assertContains('marca', $fillable);
        $this->assertContains('modelo', $fillable);
        $this->assertContains('anio', $fillable);
        $this->assertContains('tarifa_diaria', $fillable);
        $this->assertContains('estado', $fillable);
    }

    /**
     * PRUEBA 3: Verifica la relación hasMany con Reserva.
     */
    public function test_un_auto_tiene_muchas_reservas(): void
    {
        $auto = Auto::create([
            'placa' => 'TEST-002',
            'marca' => 'Honda',
            'modelo' => 'Civic',
            'anio' => 2024,
            'tarifa_diaria' => 180.00,
            'estado' => 'disponible',
        ]);

        Reserva::create([
            'auto_id' => $auto->id,
            'cliente_nombre' => 'Test Cliente',
            'cliente_dni' => '12345678',
            'fecha_inicio' => '2026-11-01',
            'fecha_fin' => '2026-11-05',
            'total' => 720.00,
            'estado' => 'activa',
        ]);

        $this->assertCount(1, $auto->reservas);
        $this->assertInstanceOf(Reserva::class, $auto->reservas->first());
    }

    /**
     * PRUEBA 4: Verifica que el estado por defecto sea "disponible".
     */
    public function test_un_auto_por_defecto_es_disponible(): void
    {
        $auto = Auto::create([
            'placa' => 'TEST-003',
            'marca' => 'Nissan',
            'modelo' => 'Sentra',
            'anio' => 2023,
            'tarifa_diaria' => 120.00,
        ]);

        $this->assertEquals('disponible', $auto->fresh()->estado);
    }
}
