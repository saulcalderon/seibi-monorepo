import { expect, test, type Page } from '@playwright/test'

/** Signs up with the dev email login and finishes Onboarding without a Vehicle. */
async function signUpWithoutVehicle(page: Page) {
  const email = `flows${Date.now()}@seibi.test`
  await page.goto('/login')
  await page.getByText('Entrar con correo (solo desarrollo)').click()
  await page.getByLabel('Correo').fill(email)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL('**/onboarding')
  await page.getByLabel('¿Cómo te llamamos?').fill('Flujos')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('radio', { name: /Sé bastante de mecánica/ }).click()
  for (let i = 1; i <= 3; i++) {
    await expect(page.getByText(`Pregunta ${i} de 3`)).toBeVisible()
    await page.getByRole('radio').first().click()
  }
  await expect(page.getByText('Modo experto')).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByLabel('País').selectOption('US')
  await page.getByLabel('Ciudad').fill('Houston')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Lo agrego después' }).click()
  const notNow = page.getByRole('button', { name: 'Ahora no' })
  await Promise.race([notNow.waitFor().then(() => notNow.click()), page.waitForURL('**/home')])
  await page.waitForURL('**/home')
}

test('manage a Vehicle end to end', async ({ page }) => {
  page.on('dialog', (d) => void d.accept())
  await signUpWithoutVehicle(page)

  // Empty Inicio → add a Vehicle (US defaults to miles).
  await expect(page.getByText('Agrega tu primer Vehículo')).toBeVisible()
  await page.getByRole('button', { name: 'Agregar Vehículo' }).first().click()
  await page.getByRole('combobox', { name: 'Marca' }).fill('Honda')
  await page.getByLabel('Año').selectOption('2020')
  await page.getByRole('combobox', { name: 'Modelo' }).fill('Civic')
  await expect(page.getByRole('radio', { name: 'Millas' })).toHaveAttribute('aria-checked', 'true')
  await page.getByLabel('Kilometraje actual').fill('30000')
  await page.getByRole('dialog').getByRole('button', { name: 'Agregar Vehículo' }).click()

  // Lands on the Vehicle detail.
  await page.waitForURL('**/flota/**')
  await expect(page.getByRole('heading', { name: 'Honda Civic' })).toBeVisible()

  // Edit: add engine and paint.
  await page.getByRole('button', { name: 'Editar Vehículo' }).click()
  await page.getByLabel('Motor').fill('2.0L')
  await page.getByRole('radio', { name: 'Azul' }).click()
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Vehículo actualizado')).toBeVisible()

  // Update mileage: must be higher than the current odometer (ADR-0004).
  await page.getByRole('button', { name: /actualizar/ }).first().click()
  await page.getByLabel('Kilometraje de hoy').fill('29000')
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText(/Debe ser mayor que el kilometraje actual/)).toBeVisible()
  await page.getByLabel('Kilometraje de hoy').fill('30500')
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Kilometraje actualizado')).toBeVisible()

  // "¿Cuándo fue?" for an unknown task.
  const more = page.getByRole('button', { name: /^Ver \d+ más$/ })
  if (await more.isVisible()) await more.click()
  await page.getByRole('button', { name: 'Batería', exact: true }).first().click()
  await page.getByRole('button', { name: 'Hace 6 a 12 meses' }).click()
  await expect(page.getByText('Listo, ya calculamos el próximo')).toBeVisible()

  // Plan an Appointment, then complete it as a Service.
  await page.getByRole('button', { name: 'Agendar Cita' }).click()
  const future = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
  await page.getByLabel('Fecha').fill(future)
  await page.getByRole('dialog').getByRole('button', { name: /Cambio de aceite/ }).click()
  await page.getByLabel('Taller').fill('Agencia Honda')
  await page.getByRole('button', { name: 'Guardar Cita' }).click()
  await expect(page.getByText('Cita guardada')).toBeVisible()
  await page.getByRole('button', { name: 'Marcar hecho' }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Cambio de aceite de motor' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Taller')).toHaveValue('Agencia Honda')
  // Expert level shows part fields.
  await page.getByPlaceholder('Marca de la pieza').first().fill('Honda')
  await page.getByPlaceholder('Costo $').first().fill('75')
  await page.getByRole('button', { name: 'Guardar Servicio' }).click()
  await expect(page.getByText('Servicio registrado')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Marcar hecho' })).toHaveCount(0)

  // Hand-written Reminder.
  await page.getByRole('button', { name: 'Recordatorio' }).click()
  await page.getByLabel('¿Qué quieres recordar?').fill('Renovar seguro')
  await page.getByLabel('Fecha').fill(future)
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Renovar seguro')).toBeVisible()

  // Routine drives the usage estimate.
  await page.getByRole('tab', { name: 'Uso' }).click()
  await page.getByRole('button', { name: 'Agregar rutina' }).click()
  await page.getByRole('button', { name: 'Trabajo' }).click()
  await page.getByLabel(/Distancia de ida y vuelta/).fill('20')
  await page.getByRole('button', { name: 'Guardar Rutina' }).click()
  await expect(page.getByText('Rutina guardada')).toBeVisible()
  await expect(page.getByRole('button', { name: /Trabajo 20 mi ida y vuelta/ })).toBeVisible()

  // History shows the Service with its per-item cost; correct a reading.
  await page.getByRole('tab', { name: 'Historial' }).click()
  await expect(page.getByText('$75').first()).toBeVisible()
  await page.getByRole('button', { name: /^30,500 mi \d/ }).first().click()
  await page.getByLabel('Kilometraje correcto').fill('30600')
  await page.getByRole('button', { name: 'Guardar corrección' }).click()
  await expect(page.getByText('Lectura corregida')).toBeVisible()

  // Withdraw, then restore from Mi flota.
  await page.getByRole('tab', { name: 'Datos' }).click()
  await page.getByRole('button', { name: 'Retirar de mi flota' }).click()
  await page.waitForURL('**/flota')
  await page.getByRole('button', { name: /Ver Vehículos retirados/ }).click()
  await page.getByRole('button', { name: 'Restaurar' }).click()
  await expect(page.getByText('Vehículo restaurado')).toBeVisible()
  await expect(page.getByRole('button', { name: /Honda Civic/ }).first()).toBeVisible()

  // Delete the account.
  await page.goto('/perfil')
  await page.getByRole('button', { name: 'Eliminar mi cuenta' }).click()
  await page.getByLabel(/Escribe "ELIMINAR"/).fill('ELIMINAR')
  await page.getByRole('button', { name: 'Eliminar definitivamente' }).click()
  await page.waitForURL('**/login', { timeout: 20_000 })
})
