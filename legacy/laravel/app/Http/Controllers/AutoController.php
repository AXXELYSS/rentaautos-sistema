<?php

namespace App\Http\Controllers;

use App\Models\Auto;
use App\Services\ReservaService;
use Illuminate\Http\Request;
use InvalidArgumentException;

class AutoController extends Controller
{
        public function index()
    {
        $autos = Auto::all();
        $resultado = null;
        $tipo = null;
        return view('autos.index', compact('autos', 'resultado', 'tipo'));
    }

    public function probarReserva(Request $request)
    {
        $auto = Auto::findOrFail($request->auto_id);
        $service = new ReservaService();

        $resultado = null;
        $tipo = null;

        try {
            $service->validarDisponibilidad($auto, $request->fecha_inicio, $request->fecha_fin);
            $total = $service->calcularTotal($auto, $request->fecha_inicio, $request->fecha_fin);
            $resultado = "✅ RESERVA VÁLIDA — Total: S/ " . number_format($total, 2);
            $tipo = 'success';
        } catch (InvalidArgumentException $e) {
            $resultado = "❌ ERROR: " . $e->getMessage();
            $tipo = 'error';
        }

        $autos = Auto::all();
        return view('autos.index', compact('autos', 'resultado', 'tipo'));
    }
}
