<?php

namespace App\Services;

use App\Models\Auto;
use App\Models\Reserva;
use InvalidArgumentException;

class ReservaService
{
    public function validarDisponibilidad(Auto $auto, string $fechaInicio, string $fechaFin): bool
    {
        if ($fechaInicio >= $fechaFin) {
            throw new InvalidArgumentException('La fecha de fin debe ser posterior a la fecha de inicio.');
        }

        $conflicto = Reserva::where('auto_id', $auto->id)
            ->where('estado', 'activa')
            ->where('fecha_inicio', '<=', $fechaFin)
            ->where('fecha_fin', '>=', $fechaInicio)
            ->exists();

        if ($conflicto) {
            throw new InvalidArgumentException('El auto no está disponible en las fechas seleccionadas.');
        }

        return true;
    }

    public function calcularTotal(Auto $auto, string $fechaInicio, string $fechaFin): float
    {
        $inicio = new \DateTime($fechaInicio);
        $fin = new \DateTime($fechaFin);
        $dias = $inicio->diff($fin)->days;
        return round($dias * $auto->tarifa_diaria, 2);
    }

    public function crearReserva(array $datos): Reserva
    {
        $auto = Auto::findOrFail($datos['auto_id']);

        if ($auto->estado !== 'disponible') {
            throw new InvalidArgumentException("El auto no está disponible (estado: {$auto->estado}).");
        }

        $this->validarDisponibilidad($auto, $datos['fecha_inicio'], $datos['fecha_fin']);
        $datos['total'] = $this->calcularTotal($auto, $datos['fecha_inicio'], $datos['fecha_fin']);
        return Reserva::create($datos);
    }
}
