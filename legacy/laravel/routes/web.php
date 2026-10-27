<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

use App\Http\Controllers\AutoController;

Route::get('/autos', [AutoController::class, 'index'])->name('autos.index');
Route::post('/probar-reserva', [AutoController::class, 'probarReserva'])->name('autos.probar');
