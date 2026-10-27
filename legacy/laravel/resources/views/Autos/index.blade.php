<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>RENTAAUTOS - Demo</title>
    <style>
        body { font-family: Arial, sans-serif; background: #1e293b; color: #e2e8f0; padding: 30px; }
        h1 { color: #60a5fa; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #334155; }
        th, td { padding: 12px; border: 1px solid #475569; text-align: left; }
        th { background: #1e40af; color: white; }
        .disponible { color: #4ade80; font-weight: bold; }
        .alquilado { color: #fbbf24; font-weight: bold; }
        .mantenimiento { color: #f87171; font-weight: bold; }
        form { background: #334155; padding: 20px; border-radius: 8px; margin-top: 30px; }
        select, input, button { padding: 10px; margin: 5px; font-size: 14px; border-radius: 4px; border: 1px solid #475569; background: #1e293b; color: #e2e8f0; }
        button { background: #2563eb; cursor: pointer; font-weight: bold; }
        button:hover { background: #1d4ed8; }
        .success { background: #065f46; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .error { background: #7f1d1d; padding: 15px; border-radius: 8px; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>🚗 RENTAAUTOS — Sistema de Alquiler</h1>

    <h2>Listado de Autos</h2>
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Placa</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Año</th>
                <th>Tarifa Diaria</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            @foreach($autos as $auto)
            <tr>
                <td>{{ $auto->id }}</td>
                <td>{{ $auto->placa }}</td>
                <td>{{ $auto->marca }}</td>
                <td>{{ $auto->modelo }}</td>
                <td>{{ $auto->anio }}</td>
                <td>S/ {{ number_format($auto->tarifa_diaria, 2) }}</td>
                <td class="{{ $auto->estado }}">{{ strtoupper($auto->estado) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <form action="/probar-reserva" method="POST">
        @csrf
        <h3>Probar Reserva</h3>

        <label>Auto:</label>
        <select name="auto_id" required>
            @foreach($autos as $auto)
                <option value="{{ $auto->id }}">{{ $auto->placa }} — {{ $auto->marca }} {{ $auto->modelo }} ({{ $auto->estado }})</option>
            @endforeach
        </select>

        <label>Fecha Inicio:</label>
        <input type="date" name="fecha_inicio" required>

        <label>Fecha Fin:</label>
        <input type="date" name="fecha_fin" required>

        <button type="submit">Probar Reserva</button>
    </form>

    @if($resultado)
        <div class="{{ $tipo }}">
            <strong>{{ $resultado }}</strong>
        </div>
    @endif
</body>
</html>
