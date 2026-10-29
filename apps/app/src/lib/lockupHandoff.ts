const KEY = 'seibi-lockup-from'

type Box = { cx: number; cy: number; w: number }

type LockupFrom = Box & { mark?: Box; word?: Box }

function reduceMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function boxOf(el: Element): Box {
  const rect = el.getBoundingClientRect()
  return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, w: rect.width }
}

/** Strict Mode runs the layout effect twice. Keep the measurement until the next frame. */
let held: LockupFrom | null = null
let release = 0

function take(): LockupFrom | null {
  const raw = sessionStorage.getItem(KEY)
  if (raw) {
    sessionStorage.removeItem(KEY)
    try {
      held = JSON.parse(raw) as LockupFrom
    } catch {
      held = null
    }
  }
  return held
}

function releaseSoon() {
  cancelAnimationFrame(release)
  release = requestAnimationFrame(() => {
    held = null
  })
}

/** Remember where the splash lockup sits, so the next screen can fly it home. */
export function stashLockupFrom(el: HTMLElement | null) {
  if (!el || reduceMotion()) {
    sessionStorage.removeItem(KEY)
    held = null
    return
  }
  const mark = el.querySelector('.seibi-mark')
  const word = el.querySelector('.splash-word')
  const from: LockupFrom = {
    ...boxOf(el),
    mark: mark ? boxOf(mark) : undefined,
    word: word ? boxOf(word) : undefined,
  }
  held = from
  sessionStorage.setItem(KEY, JSON.stringify(from))
}

export function clearLockupFrom() {
  sessionStorage.removeItem(KEY)
  held = null
}

const FLIGHT_MS = 1000
const FLIGHT_EASE = 'cubic-bezier(0.55, 0.05, 0.2, 1)'
const FLIGHT = { duration: FLIGHT_MS, easing: FLIGHT_EASE, fill: 'both' as const }

/** Same curve as the flight, so the word can stay tucked under the S while it moves. */
function flightEase(x: number) {
  const x1 = 0.55
  const y1 = 0.05
  const x2 = 0.2
  const y2 = 1
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  let t = x
  for (let i = 0; i < 6; i++) {
    const delta = sampleX(t) - x
    const slope = sampleDX(t)
    if (Math.abs(delta) < 1e-4 || Math.abs(slope) < 1e-4) break
    t = Math.min(1, Math.max(0, t - delta / slope))
  }
  return sampleY(t)
}

function prepare(el: Element) {
  if (el instanceof HTMLElement || el instanceof SVGElement) {
    el.style.transformOrigin = 'center center'
  }
  el.getAnimations().forEach((animation) => animation.cancel())
}

function fly(el: Element | null, from: Box | undefined) {
  if (!el || !from) return
  const to = el.getBoundingClientRect()
  if (!to.width || !from.w) return
  const dx = from.cx - (to.left + to.width / 2)
  const dy = from.cy - (to.top + to.height / 2)
  const scale = from.w / to.width
  prepare(el)
  el.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      { transform: 'translate(0px, 0px) scale(1)' },
    ],
    FLIGHT,
  )
}

/** S flies home. The word stays stacked under it, then slides into the header slot. */
function flyStacked(mark: Element, word: Element, fromMark: Box, fromWord: Box) {
  const toMark = mark.getBoundingClientRect()
  const toWord = word.getBoundingClientRect()
  if (!toMark.width || !toWord.width || !fromMark.w || !fromWord.w) return

  const scaleM0 = fromMark.w / toMark.width
  const scaleW0 = fromWord.w / toWord.width
  const toMarkCx = toMark.left + toMark.width / 2
  const toMarkCy = toMark.top + toMark.height / 2
  const toWordCx = toWord.left + toWord.width / 2
  const toWordCy = toWord.top + toWord.height / 2
  const stackDx = fromWord.cx - fromMark.cx
  const stackDy = fromWord.cy - fromMark.cy
  const hold = 0.4

  prepare(mark)
  prepare(word)
  if (mark instanceof SVGElement) {
    mark.style.position = 'relative'
    mark.style.zIndex = '1'
  }

  mark.animate(
    [
      { transform: `translate(${fromMark.cx - toMarkCx}px, ${fromMark.cy - toMarkCy}px) scale(${scaleM0})` },
      { transform: 'translate(0px, 0px) scale(1)' },
    ],
    FLIGHT,
  )

  const frames: Keyframe[] = []
  const steps = 16
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const e = flightEase(t)
    const markCx = fromMark.cx + (toMarkCx - fromMark.cx) * e
    const markCy = fromMark.cy + (toMarkCy - fromMark.cy) * e
    const markScale = scaleM0 + (1 - scaleM0) * e
    const shrink = markScale / scaleM0
    const tuckedCx = markCx + stackDx * shrink
    const tuckedCy = markCy + stackDy * shrink
    const wordScale = scaleW0 + (1 - scaleW0) * e
    let wordCx = tuckedCx
    let wordCy = tuckedCy
    if (t > hold) {
      const u = (t - hold) / (1 - hold)
      const slide = u * u * (3 - 2 * u)
      wordCx = tuckedCx + (toWordCx - tuckedCx) * slide
      wordCy = tuckedCy + (toWordCy - tuckedCy) * slide
    }
    frames.push({
      offset: t,
      transform: `translate(${wordCx - toWordCx}px, ${wordCy - toWordCy}px) scale(${wordScale})`,
    })
  }
  word.animate(frames, { duration: FLIGHT_MS, easing: 'linear', fill: 'both' })
}

/** Move `el` from the stashed splash lockup to its own place. */
export function playLockupHandoff(el: HTMLElement | null) {
  const from = take()
  if (!from || !el || reduceMotion()) {
    if (reduceMotion()) clearLockupFrom()
    return
  }
  fly(el, from)
  releaseSoon()
}

/** Fly the S and the word on their own, from the stacked splash into a side-by-side lockup. */
export function playLockupSplit(root: HTMLElement | null) {
  const from = take()
  if (!from || !root || reduceMotion()) {
    if (reduceMotion()) clearLockupFrom()
    return
  }
  const mark = root.querySelector('.seibi-mark')
  const word = root.querySelector('[data-lockup-word]')
  if (!from.mark || !from.word || !mark || !word) {
    fly(root, from)
  } else {
    flyStacked(mark, word, from.mark, from.word)
  }
  releaseSoon()
}
