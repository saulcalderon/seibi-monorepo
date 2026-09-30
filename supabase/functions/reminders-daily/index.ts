// Daily: compute each user's Reminders and send one Web Push when something
// needs attention. Called by pg_cron with the cron secret (verify_jwt off).
// Uses the same engine as the app (ADR-0010).

import webpush from 'npm:web-push@3.6.7'
import {
  computeReminders,
  effectiveSchedule,
  type GeneralTask,
  type Reminder,
  type TaskInterval,
} from '../../../packages/maintenance-engine/src/reminders.ts'
import { mileagePrompt } from '../../../packages/maintenance-engine/src/mileagePrompt.ts'
import { daysBetween } from '../../../packages/maintenance-engine/src/days.ts'
import { timingSafeEqual } from '../_shared/keys.ts'
import { adminClient } from '../_shared/supabase.ts'

const TIMEZONE = { SV: 'America/El_Salvador', US: 'America/Chicago' } as const
const SOON_NUDGE_DAYS = new Set([30, 14, 7, 3, 1])

function todayIn(country: 'SV' | 'US' | null): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE[country ?? 'SV'],
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Nudge on a few days only, so a Reminder does not ping every day. */
function shouldNudge(r: Reminder, today: string): boolean {
  if (r.snoozed) return false
  if (r.status === 'overdue') {
    const since = r.expectedOn ? daysBetween(r.expectedOn, today) : 0
    return since % 3 === 0
  }
  if (r.status === 'soon') return r.remainingDays != null && SOON_NUDGE_DAYS.has(r.remainingDays)
  return false
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET') ?? ''
  const given = req.headers.get('x-cron-secret') ?? ''
  if (!secret || !timingSafeEqual(given, secret)) return new Response('forbidden', { status: 403 })

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!publicKey || !privateKey) return new Response('vapid keys missing', { status: 503 })
  webpush.setVapidDetails('mailto:hola@seibiapp.com', publicKey, privateKey)

  const db = adminClient()
  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
  if (error) throw error
  const byUser = new Map<string, typeof subs>()
  for (const s of subs ?? []) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])
  if (byUser.size === 0) return Response.json({ users: 0, sent: 0 })

  const { data: tasks } = await db
    .from('maintenance_tasks')
    .select('code, plain_name, general_distance_km, general_months')
  const general: GeneralTask[] = (tasks ?? []).map((t) => ({
    code: t.code,
    generalDistanceKm: t.general_distance_km,
    generalMonths: t.general_months,
  }))
  const taskName = new Map((tasks ?? []).map((t) => [t.code, t.plain_name as string]))

  let sent = 0
  for (const [userId, userSubs] of byUser) {
    const { data: profile } = await db
      .from('profiles')
      .select('notifications_enabled, country')
      .eq('user_id', userId)
      .maybeSingle()
    if (profile && !profile.notifications_enabled) continue
    const today = todayIn(profile?.country ?? null)

    const { data: vehicles } = await db
      .from('vehicles')
      .select(`
        id, brand, model, odometer_measure,
        schedule:maintenance_schedules(status, items:maintenance_schedule_items(*)),
        readings:mileage_readings(reading, recorded_on),
        services(performed_on, deleted_at, reading:mileage_readings(reading), items:service_items(task_code)),
        routines(round_trip_distance, days_per_week),
        states:reminder_states(task_code, last_unknown, snoozed_until, remembered_on, remembered_reading),
        reminders(title, due_on, done_at, deleted_at)
      `)
      .eq('user_id', userId)
      .is('deleted_at', null)

    const lines: Array<{ rank: number; text: string }> = []
    for (const v of vehicles ?? []) {
      const name = `${v.brand} ${v.model}`
      // deno-lint-ignore no-explicit-any
      const schedule = v.schedule as any
      const modelItems: TaskInterval[] | null = schedule?.status === 'ready'
        ? // deno-lint-ignore no-explicit-any
          schedule.items.map((i: any) => ({
            taskCode: i.task_code,
            distanceKm: i.distance_km,
            months: i.months,
            severeDistanceKm: i.severe_distance_km,
            severeMonths: i.severe_months,
          }))
        : null
      const readings = (v.readings ?? []).map((r) => ({ reading: r.reading, recordedOn: r.recorded_on }))
      const { reminders, usage } = computeReminders({
        measure: v.odometer_measure,
        schedule: effectiveSchedule(modelItems, general),
        readings,
        // deno-lint-ignore no-explicit-any
        events: (v.services ?? []).filter((s: any) => !s.deleted_at).flatMap((s: any) =>
          (s.items ?? []).filter((i: any) => i.task_code).map((i: any) => ({
            taskCode: i.task_code,
            performedOn: s.performed_on,
            reading: s.reading?.reading ?? null,
          }))
        ),
        routines: (v.routines ?? []).map((r) => ({
          roundTripDistance: Number(r.round_trip_distance),
          daysPerWeek: r.days_per_week,
        })),
        states: (v.states ?? []).map((s) => ({
          taskCode: s.task_code,
          lastUnknown: s.last_unknown,
          snoozedUntil: s.snoozed_until,
          rememberedOn: s.remembered_on,
          rememberedReading: s.remembered_reading,
        })),
        today,
      })

      for (const r of reminders) {
        if (!shouldNudge(r, today)) continue
        const task = taskName.get(r.taskCode) ?? r.taskCode
        lines.push(
          r.status === 'overdue'
            ? { rank: 0, text: `${name}: ${task} está vencido` }
            : { rank: 1, text: `${name}: ${task} en ${r.remainingDays} días` },
        )
      }
      for (const m of v.reminders ?? []) {
        if (m.done_at || m.deleted_at) continue
        const days = daysBetween(today, m.due_on)
        if (days === 0 || days === 1 || days === 7) {
          lines.push({ rank: 0, text: `${name}: ${m.title} ${days === 0 ? 'hoy' : days === 1 ? 'mañana' : 'en una semana'}` })
        }
      }
      const prompt = mileagePrompt(readings, usage, v.odometer_measure, today)
      if (prompt.due && (prompt.daysSinceLast == null || prompt.daysSinceLast % 7 === 0)) {
        lines.push({ rank: 2, text: `Actualiza el kilometraje de tu ${name}` })
      }
    }

    if (lines.length === 0) continue
    lines.sort((a, b) => a.rank - b.rank)
    const payload = JSON.stringify({
      title: lines.length === 1 ? 'Seibi' : `Seibi · ${lines.length} avisos`,
      body: lines.slice(0, 3).map((l) => l.text).join('\n'),
      url: lines[0].rank === 2 ? '/home?action=mileage' : '/avisos',
    })

    for (const s of userSubs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 12 },
        )
        sent++
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await db.from('push_subscriptions').delete().eq('id', s.id)
        } else {
          console.error('push failed', status, err)
        }
      }
    }
  }

  return Response.json({ users: byUser.size, sent })
})
