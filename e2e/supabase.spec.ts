import { test, expect } from '@playwright/test';
import { loadEnv } from 'vite';

const env = loadEnv('test', process.cwd(), 'VITE_');
test('Supabase real: Auth está disponible y las tablas rechazan acceso anónimo', async ({
  request,
}) => {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  test.skip(!url || !key, 'Configura .env.local para comprobar el proyecto remoto.');
  const auth = await request.get(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  expect(auth.ok()).toBeTruthy();
  const settings = await auth.json();
  expect(settings.external.email).toBe(true);
  for (const table of ['rental_autos', 'rental_reservas', 'rental_pagos', 'rental_inspecciones']) {
    const response = await request.get(`${url}/rest/v1/${table}?select=id&limit=1`, {
      headers: { apikey: key },
    });
    expect([401, 403]).toContain(response.status());
  }
});
