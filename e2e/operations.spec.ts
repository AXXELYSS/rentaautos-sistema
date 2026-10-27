import { test, expect, type Page } from '@playwright/test';
import { addDays, today } from '../client/domain';

async function book(page: Page, name = 'Cliente Segunda Revisión') {
  await page.goto('/#reservas');
  await page.getByRole('button', { name: 'Nueva reserva', exact: true }).click();
  await page.getByLabel('Vehículo', { exact: true }).selectOption('demo-2');
  await page.getByLabel('Fecha de devolución').fill(addDays(today(), 2));
  await page.getByLabel('Nombre completo').fill(name);
  await page.getByLabel('DNI', { exact: true }).fill('10293847');
  await expect(page.locator('.quote-box')).toContainText('360');
  await page.getByRole('button', { name: 'Crear reserva', exact: true }).click();
  const row = page.locator('.reservation-table tr').filter({ hasText: name });
  await row.getByRole('button', { name: 'Ver detalle' }).click();
  return row;
}

test('edita fechas y vehículo, recalcula y mantiene el cliente', async ({ page }) => {
  await page.goto('/#reservas');
  const row = page.locator('.reservation-table tr').filter({ hasText: 'Diego Salazar' });
  await row.getByRole('button', { name: 'Ver detalle' }).click();
  await page.getByRole('button', { name: 'Editar reserva', exact: true }).click();
  await expect(page.locator('.quote-box')).toContainText('450');
  await page.getByLabel('Vehículo', { exact: true }).selectOption('demo-2');
  await page.getByLabel('Fecha de devolución').fill(addDays(today(), 5));
  await expect(page.locator('.quote-box')).toContainText('720');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(row).toContainText('Honda Civic');
  await expect(row).toContainText('720');
});

test('entrega y devolución guardan inspecciones, validan km y cierran el alquiler', async ({
  page,
}) => {
  const row = await book(page);
  await page.getByRole('button', { name: 'Registrar entrega', exact: true }).click();
  await page.getByLabel('Kilometraje de entrega').fill('21010');
  await page.getByLabel('Combustible (%)').fill('80');
  await page.getByLabel('Observaciones del vehículo').fill('Sin daños, accesorios completos.');
  await page.getByRole('button', { name: 'Guardar entrega' }).click();
  await expect(page.getByRole('heading', { name: 'Entrega registrada' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar reserva', exact: true })).toHaveCount(0);
  await page.getByLabel('Kilometraje de devolución').fill('21000');
  await page.getByLabel('Combustible (%)').fill('60');
  await page.getByRole('button', { name: 'Guardar devolución' }).click();
  await expect(page.locator('#inspection-km-error')).toContainText('21,010');
  await page.getByLabel('Kilometraje de devolución').fill('21080');
  await page.getByLabel('Observaciones del vehículo').fill('Retorno sin novedades.');
  await page.getByRole('button', { name: 'Guardar devolución' }).click();
  await expect(page.getByRole('heading', { name: 'Devolución registrada' })).toBeVisible();
  await expect(row).toContainText('Finalizada');
  await page.screenshot({
    path: 'docs/verification/segunda-revision-devolucion.png',
    fullPage: true,
  });
});

test('adelantos, saldo, sobrepago y comprobante imprimible', async ({ page }) => {
  await book(page);
  await page.getByRole('button', { name: 'Pagos', exact: true }).click();
  await page.getByLabel('Importe (S/)', { exact: true }).fill('100');
  await page.getByLabel('Método', { exact: true }).selectOption('yape');
  await page.getByLabel('Referencia', { exact: true }).fill('OP-100');
  await page.getByRole('button', { name: 'Guardar pago' }).click();
  await expect(page.locator('.payment-summary>div').nth(2)).toContainText('260');
  await page.getByLabel('Importe (S/)', { exact: true }).fill('300');
  await page.getByRole('button', { name: 'Guardar pago' }).click();
  await expect(page.locator('#payment-amount-error')).toContainText('supera el saldo');
  await page.getByLabel('Importe (S/)', { exact: true }).fill('260');
  await page.getByRole('button', { name: 'Guardar pago' }).click();
  await expect(page.locator('.payment-state')).toHaveText('Pagado');
  await page.screenshot({ path: 'docs/verification/segunda-revision-pagos.png', fullPage: true });
  await page.getByRole('button', { name: 'Comprobante', exact: true }).click();
  await expect(page.locator('.receipt')).toContainText('Cliente Segunda Revisión');
  await expect(page.locator('.receipt')).toContainText('OP-100');
  await expect(page.locator('.receipt-totals')).toContainText('360');
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.workspace-main')).toBeHidden();
  await expect(page.locator('.receipt')).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/segunda-revision-comprobante.png',
    fullPage: true,
  });
});

test('cancelar con adelanto conserva el historial y permite reembolsar', async ({ page }) => {
  await book(page);
  await page.getByRole('button', { name: 'Pagos', exact: true }).click();
  await page.getByLabel('Importe (S/)', { exact: true }).fill('100');
  await page.getByRole('button', { name: 'Guardar pago' }).click();
  await page.getByRole('button', { name: 'Cancelar reserva', exact: true }).click();
  await expect(page.locator('.confirm-box')).toContainText('100');
  await page.getByRole('button', { name: 'Sí, cancelar reserva' }).click();
  await expect(page.locator('.payment-state')).toHaveText('Reembolso pendiente');
  await page.getByLabel('Importe (S/)', { exact: true }).fill('100');
  await page.getByRole('button', { name: 'Guardar reembolso' }).click();
  await expect(page.locator('.payment-state')).toHaveText('Sin saldo');
  await expect(page.locator('.payment-history>div')).toHaveCount(2);
});

test('validaciones junto al campo: DNI, fecha y placa', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nueva reserva', exact: true }).click();
  await page.getByLabel('Nombre completo').fill('Cliente Prueba');
  await page.getByLabel('DNI', { exact: true }).fill('abc12345');
  await page.getByRole('button', { name: 'Crear reserva', exact: true }).click();
  await expect(page.locator('#booking-cliente_dni-error')).toContainText('exactamente 8 dígitos');
  await expect(page.getByLabel('DNI', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Fecha de devolución').fill(today());
  await page.getByLabel('Fecha de devolución').blur();
  await expect(page.locator('#booking-fecha_fin-error')).toContainText('posterior');
  await page.getByRole('button', { name: 'Cerrar ventana' }).click();
  await page.getByRole('link', { name: 'Mi flota', exact: true }).click();
  await page.getByRole('button', { name: 'Agregar vehículo', exact: true }).click();
  await page.getByLabel('Placa', { exact: true }).fill('abc');
  await page.getByLabel('Placa', { exact: true }).blur();
  await expect(page.locator('#car-placa-error')).toContainText('ABC-123');
});

test('las devoluciones de hoy y atrasadas permanecen visibles y el auto ocupado', async ({
  page,
}) => {
  await page.goto('/');
  const day = today();
  await page.clock.install({ time: new Date(day + 'T17:00:00-05:00') });
  // La demo incluye un Nissan entregado con devolución dentro de dos días.
  await page.clock.setFixedTime(new Date(addDays(day, 2) + 'T17:00:00-05:00'));
  await page.getByRole('link', { name: 'Mi flota', exact: true }).click();
  await page.getByRole('link', { name: 'Resumen', exact: true }).click();
  await expect(page.locator('.return-alerts')).toContainText('DEF-456');
  await expect(page.locator('.return-alerts')).toContainText('Regresa hoy');
  await page.clock.setFixedTime(new Date(addDays(day, 3) + 'T17:00:00-05:00'));
  await page.getByRole('link', { name: 'Mi flota', exact: true }).click();
  await expect(page.locator('.car-table tr').filter({ hasText: 'DEF-456' })).toContainText(
    'En alquiler',
  );
  await page.getByRole('link', { name: 'Resumen', exact: true }).click();
  await expect(page.locator('.return-alerts')).toContainText('1 día(s) de atraso');
});

test('detalle de operaciones en móvil sin desbordamiento', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#reservas');
  const row = page.locator('.reservation-table tr').filter({ hasText: 'Lucía Mendoza' });
  await row.getByRole('button', { name: 'Ver detalle' }).click();
  await page.getByRole('button', { name: 'Registrar devolución', exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await expect(page.getByLabel('Kilometraje de devolución')).toBeVisible();
  await page.screenshot({ path: 'docs/verification/segunda-revision-movil.png', fullPage: true });
});
