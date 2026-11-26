# Chat de Seibi

Inside the Estimados tab, the «Estimar precio / Chat de Seibi» switch under
the Vehicle line opens the chat: follow-up questions to Seibi about the
person's Vehicle. A line says «Pregunta sobre tu <marca> <modelo>…»; an
empty thread offers three questions to start (everyday ones, or specific
ones for Knowledge level intermediate or advanced), a tap sending one. The
thread lists the person's questions on the right and Seibi's answers on the
left, each answer with up to three sources that open in the in-app
browser. The question field is pinned at the bottom, beside the floating
[+]; with the keyboard up it rides just above the keyboard at full width
and the thread lifts with it. «Enviar» takes two characters or more. While
Seibi answers, the question shows with three pulsing dots, «Seibi está
escribiendo», announced to VoiceOver and TalkBack, and the answer is
announced when it arrives. A failure shows its message under the thread
(«Llegaste al límite de consultas de hoy. Vuelve mañana.» at the daily AI
limit, shared with Estimados) and puts the question back in the field.
«Cómo usamos la IA» opens the Terms. The result card's «Preguntar» in
«Estimar precio» switches to the chat.

## Sub-features

- `switch` `id: estimates-mode` with `id: estimates-mode-estimate` and
  `id: estimates-mode-chat`; «Estimar precio» when Estimados opens.
- `thread` `id: chat-thread`: the empty thread's `id: chat-starters` with
  `id: chat-starter-<0|1|2>`; the newest question `id: chat-latest-user`
  and answer `id: chat-latest-assistant` (on their words, spoken «Tú: …»
  and «Seibi: …»); a load failure `id: chat-error` («Reintentar»).
- `sending` the question being sent `id: chat-pending`, the dots `id:
  chat-typing` (busy), a failure `id: chat-send-error`.
- `composer` `id: chat-composer`: the field `id: chat-input` (up to 1,000
  characters, Return writes a new line) and `id: chat-send` («Enviar»,
  disabled under two characters or while a question is out).
- `ai-use` `id: chat-ai-use` opens the Terms in the in-app browser.
- `ask` the Estimate card's `id: estimates-result-ask` («Preguntar»)
  switches to the chat.
- `location` with no country in the profile, the location card
  (`id: estimates-location`) takes the thread's place and there is no field.

## How to get to it (user POV)

- The Estimados tab (`id: tab-estimates`) → «Chat de Seibi» (`id:
  estimates-mode-chat`).
- An Estimate's result in «Estimar precio» → «Preguntar» (`id:
  estimates-result-ask`).

## Driving it with verify.sh

Preconditions: the baseline; the test account's profile has a country and
city and its Toyota Yaris; the account has AI calls left today (each run
spends one).

- **The thread and the field.** `scripts/verify.sh drive ios chat`: the
  Estimados tab, then «Chat de Seibi»: the thread (or the three starters on
  an empty one), the field and «Enviar» beside the [+] (`chat-01-thread`).
- **The keyboard.** A tap on the field brings the keyboard up; the field
  and «Enviar» ride just above it and stay visible while the question is
  typed (`chat-02-keyboard`).
- **One question.** «Enviar» shows the question at once (`id:
  chat-pending`) and, while Seibi answers, `id: chat-typing`
  (`chat-03-typing`); then the question and the answer join the thread as
  `id: chat-latest-user` (holding the words typed) and `id:
  chat-latest-assistant`, with no error (`chat-04-answer`).
- **At rest.** With the keyboard put away the field goes back beside the
  [+] and the answer stays in view (`chat-05-rest`).
- **Saved data.** After the run, a read-only seibi-dev `SELECT` shows the
  question and the answer the `chat` function saved:

  ```sql
  select m.created_at, m.role, left(m.content, 120) as content, jsonb_array_length(m.sources) as sources, m.vehicle_id
  from chat_messages m
  join auth.users u on u.id = m.user_id
  where u.email = 'e2e@seibi.test'
  order by m.created_at desc
  limit 2;
  ```

## Gotchas

- **One question per run.** Every question spends one of the account's AI
  calls for the day (`AI_DAILY_LIMIT`, 20 by default, counted in
  `ai_usage` and shared with Estimados); answers are never cached. The flow
  sends exactly one; don't add a second, don't loop it, and don't tap a
  starter while proving the thread. At the limit the flow fails on `id:
  chat-send-error`.
- An answer runs a web search and can take a minute or two; the flow waits
  up to three. The dots can be gone before the flow looks, so `id:
  chat-typing` is optional.
- Each run adds two `chat_messages` rows to the test account and nothing
  removes them, so the thread keeps growing (the latest 100 show). The
  starters show only on an empty thread: after the first run the flow never
  sees them.
- The question is typed without accents: Maestro's `inputText` is
  unreliable with them on iOS.
- The newest question's spoken label starts with «Tú:», so the flow
  matches the words inside the copied text rather than the whole of it.
- Where the field rests differs by platform: on iOS the screen runs under
  the tab bar and the field keeps clear of it; on Android the screen ends
  at the Material bar. A change to the field's place or the keyboard is
  proven on iOS and Android; check that it lines up with the [+] and that
  nothing is under the keyboard.
