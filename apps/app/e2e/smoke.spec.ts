import { expect, test } from '@playwright/test'

// Sign in → Onboarding → create Vehicle → record Service → see Reminders.
// Uses the development-only email login against local Supabase.
test('a new user sets up a Vehicle and sees its Reminders', async ({ page }) => {
  const email = `smoke${Date.now()}@seibi.test`

  await page.goto('/')
  await page.waitForURL('**/intro')
  await page.getByRole('button', { name: 'Saltar' }).click()

  await page.waitForURL('**/login')
  await page.getByText('Entrar con correo (solo desarrollo)').click()
  await page.getByLabel('Correo').fill(email)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  // Onboarding: Tú
  await page.waitForURL('**/onboarding')
  await page.getByLabel('¿Cómo te llamamos?').fill('Prueba')
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Conocimiento: self-assessment + the check questions
  await page.getByRole('radio', { name: /Estoy empezando/ }).click()
  for (const question of [/mantenimiento preventivo/, /buenas condiciones/, /esta luz en el tablero/]) {
    await expect(page.getByRole('heading', { name: question })).toBeVisible()
    await page.getByRole('radio', { name: /^No sé/ }).click()
  }
  await expect(page.getByText('Te guiaremos paso a paso')).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Ubicación
  await page.getByLabel('Ciudad').fill('Santa Ana')
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Tu Vehículo
  await page.getByRole('combobox', { name: 'Marca' }).fill('Nissan')
  await page.getByLabel('Año').selectOption('2019')
  await page.getByRole('combobox', { name: 'Modelo' }).fill('Sentra')
  await page.getByLabel('Kilometraje actual').fill('62000')
  await page.getByRole('button', { name: 'Agregar y continuar' }).click()
  await expect(page.getByText('Se guardó tu información')).toBeVisible()

  // Inicio shows the Vehicle, in plain words (level "none").
  await page.waitForURL('**/home')
  await expect(page.getByRole('heading', { name: 'Sentra' })).toBeVisible()

  // Record a Service for a tire rotation.
  await page.getByRole('button', { name: 'Acciones rápidas' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Registrar Servicio/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Rotación de llantas/ }).click()
  await page.getByLabel('Costo total').fill('30')
  await page.getByRole('button', { name: 'Guardar Servicio' }).click()
  await expect(page.getByText('Servicio registrado')).toBeVisible()

  // The Service appears in the Vehicle's history and the Reminder is now dated.
  await page.getByRole('link', { name: 'Mi flota' }).click()
  await page.getByRole('button', { name: /Nissan Sentra/ }).first().click()
  await page.getByRole('tab', { name: 'Historial' }).click()
  await expect(page.getByText('$30').first()).toBeVisible()

  await page.getByRole('link', { name: 'Avisos' }).click()
  await page.getByRole('button', { name: /Al día/ }).click()
  await expect(page.getByText('Rotación de llantas').first()).toBeVisible()
})
