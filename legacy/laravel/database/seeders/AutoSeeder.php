<?php

namespace Database\Seeders;

use App\Models\Auto;
use Illuminate\Database\Seeder;

class AutoSeeder extends Seeder
{
    public function run(): void
    {
        Auto::create(['placa' => 'ABC-123', 'marca' => 'Toyota', 'modelo' => 'Corolla', 'anio' => 2023, 'tarifa_diaria' => 150.00, 'estado' => 'disponible']);
        Auto::create(['placa' => 'XYZ-789', 'marca' => 'Honda', 'modelo' => 'Civic', 'anio' => 2024, 'tarifa_diaria' => 180.00, 'estado' => 'disponible']);
        Auto::create(['placa' => 'DEF-456', 'marca' => 'Nissan', 'modelo' => 'Sentra', 'anio' => 2023, 'tarifa_diaria' => 120.00, 'estado' => 'alquilado']);
        Auto::create(['placa' => 'JKL-012', 'marca' => 'Kia', 'modelo' => 'Rio', 'anio' => 2023, 'tarifa_diaria' => 110.00, 'estado' => 'mantenimiento']);
    }
}
