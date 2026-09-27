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

  // Conocimiento: self-assessment + three checks
  await page.getByRole('radio', { name: /No sé nada de carros/ }).click()
  for (let i = 1; i <= 3; i++) {
    await expect(page.getByText(`Pregunta ${i} de 3`)).toBeVisible()
    await page.getByRole('radio', { name: 'No sé' }).click()
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
  await expect(page.getByText('Vehículo agregado').first()).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Uso: skip; Mantenimiento: oil 3–6 months ago
  await page.getByRole('button', { name: 'Prefiero no decirlo' }).click()
  await page.getByRole('radiogroup').first().getByRole('radio', { name: '3–6 meses' }).click()
  await page.getByRole('button', { name: 'Calcular mis avisos' }).click()
  // The notifications step only shows where Web Push is available.
  const notNow = page.getByRole('button', { name: 'Ahora no' })
  await Promise.race([notNow.waitFor().then(() => notNow.click()), page.waitForURL('**/home')])

  // Inicio shows the Vehicle and the oil Reminder, in plain words (level "none").
  await page.waitForURL('**/home')
  await expect(page.getByRole('heading', { name: 'Nissan Sentra' })).toBeVisible()
  await expect(page.getByText('Cambio de aceite').first()).toBeVisible()

  // Record a Service for a tire rotation.
  await page.getByRole('button', { name: 'Acciones rápidas' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Registrar Servicio/ }).click()
  await page.getByRole('button', { name: /Rotación de llantas/ }).first().click()
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
