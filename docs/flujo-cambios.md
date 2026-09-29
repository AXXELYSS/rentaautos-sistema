# Flujo de Control de Cambios - RENTAAUTOS

## Proceso (8 pasos)
1. Detectar necesidad
2. Registrar issue en GitHub
3. Analizar impacto
4. Asignar responsable
5. Implementar en rama
6. Revisar (Code Review)
7. Aprobar e integrar
8. Actualizar documentación

## Convenciones

### Ramas
- `main` → Producción estable
- `develop` → Integración
- `feature/HU-XXX-nombre` → Nueva funcionalidad
- `fix/BUG-XXX-nombre` → Corrección

### Commits (Conventional Commits)
- `feat:` Nueva funcionalidad
- `fix:` Corrección
- `docs:` Documentación
- `test:` Pruebas
- `chore:` Mantenimiento

### Issues
- `HU-XXX` → Historia de Usuario
- `BUG-XXX` → Bug

## Roles
| Rol | Responsabilidad |
|-----|-----------------|
| Coordinador config | Inventario y consistencia |
| Responsable técnico | Ejecuta en herramienta |
| Revisor de cambios | Valida commits/PRs |
| Documentador | Registra decisiones |
