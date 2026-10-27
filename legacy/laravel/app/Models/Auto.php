<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Auto extends Model
{
    protected $table = 'autos';
    protected $fillable = ['placa', 'marca', 'modelo', 'anio', 'tarifa_diaria', 'estado'];

    public function reservas()
    {
        return $this->hasMany(Reserva::class);
    }
}
