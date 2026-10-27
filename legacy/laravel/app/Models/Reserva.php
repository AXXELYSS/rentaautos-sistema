<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reserva extends Model
{
    protected $table = 'reservas';
    protected $fillable = ['auto_id', 'cliente_nombre', 'cliente_dni', 'fecha_inicio', 'fecha_fin', 'total', 'estado'];
    protected $casts = ['fecha_inicio' => 'date', 'fecha_fin' => 'date'];

    public function auto()
    {
        return $this->belongsTo(Auto::class);
    }
}
