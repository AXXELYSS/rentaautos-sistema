# Elementos de Configuración - RENTAAUTOS

| # | Elemento | Responsable | Ubicación | Frecuencia | Criticidad |
|---|----------|-------------|-----------|------------|------------|
| 1 | Código fuente | Dev Backend | /app | Diaria | 🔴 Crítico |
| 2 | Rutas | Dev Backend | /routes/web.php | Diaria | 🔴 Crítico |
| 3 | Vistas Blade | Dev Frontend | /resources/views | Diaria | 🟡 Medio |
| 4 | Migraciones BD | DBA | /database/migrations | Sprint | 🔴 Crítico |
| 5 | Seeder BD | DBA | /database/seeders | Baja | 🟢 Bajo |
| 6 | Pruebas Unitarias | QA | /tests/Unit | Diaria | 🔴 Crítico |
| 7 | Pruebas Feature | QA | /tests/Feature | Diaria | 🔴 Crítico |
| 8 | Configuración | DevOps | .env, /config | Baja | 🔴 Crítico |
| 9 | Dependencias PHP | DevOps | composer.json | Baja | 🟡 Medio |
| 10 | Dependencias JS | DevOps | package.json | Baja | 🟡 Medio |
| 11 | Historias Usuario | Analista | /docs/requisitos | Sprint | 🔴 Crítico |
| 12 | Manuales | Documentador | /docs/manuales | Baja | 🟢 Bajo |

## Clasificación
- 🔴 **Críticos (6):** Código, rutas, migraciones, pruebas, .env, requisitos
- 🟡 **Importantes (4):** Vistas, dependencias
- 🟢 **Complementarios (2):** Seeder, manuales
