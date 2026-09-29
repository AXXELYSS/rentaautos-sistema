<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auto_id')->constrained('autos');
            $table->string('cliente_nombre', 100);
            $table->string('cliente_dni', 8);
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->decimal('total', 10, 2);
            $table->enum('estado', ['activa', 'finalizada', 'cancelada'])->default('activa');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservas');
    }
};
