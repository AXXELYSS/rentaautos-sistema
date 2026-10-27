import { test, expect } from '@playwright/test';
import { today, addDays } from '../client/domain';

test('resumen: datos coherentes, navegación y exportación', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Resumen de operaciones' })).toBeVisible();
  await expect(page.locator('.metrics>div').nth(0).locator('strong')).toContainText('2');
  await expect(page.locator('.metrics>div').nth(3).locator('strong')).toContainText('930');
  await page.getByRole('link', { name: 'Mi flota', exact: true }).click();
  await page.getByRole('textbox', { name: 'Buscar marca, modelo o placa' }).fill('Honda');
  await expect(page.locator('.car-table tbody tr')).toHaveCount(1);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  expect((await downloadPromise).suggestedFilename()).toContain('rentaautos-flota');
  await page.getByRole('button', { name: 'Limpiar búsqueda' }).click();
  await page.getByRole('button', { name: 'Mantenimiento', exact: false }).first().click();
  await expect(page.locator('.car-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.car-table')).toContainText('Kia Rio');
  expect(errors).toEqual([]);
});
test('reserva: cotiza, guarda, conserva al navegar y cancela', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nueva reserva', exact: true }).click();
  await page.getByLabel('Vehículo', { exact: true }).selectOption('demo-2');
  await page.getByLabel('Fecha de devolución').fill(addDays(today(), 3));
  await expect(page.locator('.quote-box')).toContainText('540');
  await page.getByLabel('Nombre completo').fill('María Castillo');
  await page.getByLabel('DNI', { exact: true }).fill('98765432');
  await page.getByRole('button', { name: 'Crear reserva', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Reservas', exact: true }).click();
  const row = page.locator('.reservation-table tr').filter({ hasText: 'María Castillo' });
  await expect(row).toContainText('540');
  await row.getByRole('button', { name: 'Ver detalle' }).click();
  await page.getByRole('button', { name: 'Cancelar reserva', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, cancelar reserva' }).click();
  await expect(row).toContainText('Cancelada');
  await page.reload();
  await expect(page.locator('.reservation-table')).not.toContainText('María Castillo');
});
test('impide períodos ocupados y fechas invertidas', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nueva reserva', exact: true }).click();
  await page.getByLabel('Vehículo', { exact: true }).selectOption('demo-1');
  await page.getByLabel('Fecha de recojo').fill(addDays(today(), 1));
  await page.getByLabel('Fecha de devolución').fill(addDays(today(), 2));
  await expect(page.locator('.quote-box')).toContainText('ya tiene una reserva');
  await expect(page.getByRole('button', { name: 'Crear reserva', exact: true })).toBeDisabled();
  await page.getByLabel('Fecha de devolución').fill(today());
  await expect(page.locator('.quote-box')).toContainText('posterior');
});
test('agrega y edita un vehículo; rechaza placa duplicada', async ({ page }) => {
  await page.goto('/#flota');
  await page.getByRole('button', { name: 'Agregar vehículo', exact: true }).click();
  await page.getByLabel('Marca', { exact: true }).fill('Mazda');
  await page.getByLabel('Modelo', { exact: true }).fill('3');
  await page.getByLabel('Placa', { exact: true }).fill('MAZ-303');
  await page.getByLabel('Tarifa diaria (S/)').fill('175.50');
  await page.getByRole('button', { name: 'Guardar vehículo' }).click();
  const row = page.locator('.car-table tr').filter({ hasText: 'MAZ-303' });
  await expect(row).toContainText('175.50');
  await row.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Placa', { exact: true }).fill('ABC-123');
  await page.getByRole('button', { name: 'Guardar vehículo' }).click();
  await expect(page.locator('.field-error')).toContainText('Ya existe');
});
test('Supabase: acceso visible y formulario de autenticación', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Conectar mi oficina' }).click();
  await expect(page.getByRole('heading', { name: 'Tu oficina en Supabase' })).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  await page.getByRole('button', { name: 'Crear una cuenta nueva' }).click();
  await expect(page.getByRole('button', { name: 'Crear cuenta', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
for (const width of [1440, 768, 390])
  test(`interfaz ${width}px: sin desbordamiento y con navegación accesible`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Resumen de operaciones' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: `docs/verification/resumen-${width}.png`, fullPage: true });
    if (width <= 1100) {
      await page.getByRole('button', { name: 'Abrir menú' }).click();
    }
    await page.getByRole('link', { name: 'Reservas', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Reservas', exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: `docs/verification/reservas-${width}.png`, fullPage: true });
  });
