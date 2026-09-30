import { Screen } from '../app/Screen'

// DRAFT legal copy, pending review by the Seibi team (SEI-34). Set
// LEGAL_REVIEWED to true once a person responsible for Seibi has approved it.
const LEGAL_REVIEWED = false
const UPDATED = '26 de septiembre de 2026'
const CONTACT = 'hola@seibiapp.com'

type Section = { title: string; body: string[] }

const TERMS: Section[] = [
  {
    title: '1. Qué es Seibi',
    body: [
      'Seibi es una aplicación para llevar el control del mantenimiento de tus Vehículos: registrar Servicios, piezas y reparaciones, recibir avisos de mantenimiento y consultar precios estimados.',
      'Al crear una cuenta o usar Seibi aceptas estos Términos. Si no estás de acuerdo, no uses la aplicación.',
    ],
  },
  {
    title: '2. Tu cuenta',
    body: [
      'Entras con tu cuenta de Google. Eres responsable de lo que se haga desde tu cuenta y de que la información que registras sea correcta.',
      'Debes tener al menos 18 años o la mayoría de edad de tu país para usar Seibi.',
    ],
  },
  {
    title: '3. Recomendaciones de mantenimiento',
    body: [
      'Seibi busca el plan de mantenimiento publicado por el fabricante para la marca, el modelo, el año y el motor de tu Vehículo, y muestra las fuentes que usó. Cuando no encuentra una fuente confiable, lo indica y usa una recomendación general, que no es específica de tu modelo.',
      'Los avisos se calculan con los datos que registras (kilometraje, Servicios, rutinas). Si esos datos son incompletos o incorrectos, los avisos también lo serán.',
      'Seibi no reemplaza el manual del propietario ni la revisión de un mecánico calificado. Ante cualquier señal de falla, en especial en frenos, dirección, llantas o temperatura del motor, lleva tu Vehículo a revisión.',
    ],
  },
  {
    title: '4. Estimados de precios',
    body: [
      'Los Estimados son rangos de precio aproximados, en dólares de EE. UU., obtenidos de información pública en internet. No son cotizaciones ni presupuestos, y Seibi no vende piezas ni servicios.',
      'El precio real depende de la ciudad, el año y el motor del Vehículo, la calidad y el origen de la pieza, el tipo de taller, la mano de obra y la disponibilidad. Pide siempre una cotización al taller antes de hacer un trabajo.',
    ],
  },
  {
    title: '5. Inteligencia artificial',
    body: [
      'Seibi usa modelos de inteligencia artificial de terceros para buscar planes de mantenimiento, preparar Estimados, responder el chat y generar la ilustración 3D de tu Vehículo.',
      'Las respuestas generadas por IA pueden contener errores. Por eso Seibi muestra sus fuentes y te pide verificar la información importante. El modelo 3D es una ilustración y no una foto de tu Vehículo.',
    ],
  },
  {
    title: '6. Tu contenido',
    body: [
      'Lo que registras (Vehículos, Servicios, facturas, notas) sigue siendo tuyo. Nos das permiso para guardarlo y procesarlo solo para prestarte el servicio.',
      'No subas contenido ilegal ni datos de terceros sin su permiso.',
    ],
  },
  {
    title: '7. Uso aceptable',
    body: [
      'No intentes acceder a datos de otros usuarios, interferir con el servicio, automatizar consultas masivas ni usar Seibi para fines distintos al mantenimiento de Vehículos.',
      'Podemos limitar el número de consultas con IA por día para mantener el servicio disponible para todos.',
    ],
  },
  {
    title: '8. Disponibilidad y cambios',
    body: [
      'Seibi se ofrece “tal cual” y puede cambiar, interrumpirse o tener errores. Haremos lo razonable para mantenerlo funcionando y proteger tus datos.',
      'Hoy todas las funciones son gratuitas. Si en el futuro lanzamos planes de pago, te avisaremos antes y podrás decidir si los quieres.',
    ],
  },
  {
    title: '9. Responsabilidad',
    body: [
      'En la medida que lo permita la ley, Seibi no es responsable por daños a tu Vehículo, gastos o decisiones tomadas con base en los avisos, recomendaciones o Estimados de la aplicación.',
    ],
  },
  {
    title: '10. Cancelar tu cuenta',
    body: [
      'Puedes eliminar tu cuenta cuando quieras desde Perfil → Eliminar mi cuenta. Se borran tus datos de forma permanente.',
      'Podemos suspender cuentas que incumplan estos Términos.',
    ],
  },
  {
    title: '11. Contacto',
    body: [`Escríbenos a ${CONTACT}.`],
  },
]

const PRIVACY: Section[] = [
  {
    title: 'Qué datos guardamos',
    body: [
      'De tu cuenta de Google: nombre, correo y foto de perfil.',
      'Lo que nos cuentas: nombre para mostrar, país, ciudad y nivel de conocimiento.',
      'Tus Vehículos y su historial: marca, modelo, año, motor, color, placa, lecturas de kilometraje, Servicios, piezas, costos, talleres, notas, facturas, Citas, Recordatorios y rutinas.',
      'Tus consultas de Estimados y los mensajes del chat.',
      'Si activas las notificaciones, un identificador de tu navegador para enviarlas.',
      'Si ocurre un error en la app, datos técnicos del error (sin el contenido de tus registros).',
    ],
  },
  {
    title: 'Para qué los usamos',
    body: [
      'Para mostrarte tu información, calcular tus avisos de mantenimiento, estimar precios en tu zona, responder tus preguntas y enviarte notificaciones que tú activaste.',
      'No vendemos tus datos ni los usamos para publicidad.',
    ],
  },
  {
    title: 'Con quién los compartimos',
    body: [
      'Supabase: aloja la base de datos, los archivos y la autenticación.',
      'Google: inicio de sesión.',
      'OpenAI: recibe la marca, el modelo, el año, el motor, tu ciudad y tu pregunta para buscar planes de mantenimiento y precios. No le enviamos tu nombre, tu correo ni tu placa.',
      'fal: recibe la marca, el modelo, el año y el color para generar la ilustración 3D.',
      'Sentry (cuando esté activo): recibe datos técnicos de errores.',
      'Solo compartimos lo necesario para cada función. Podemos revelar datos si la ley lo exige.',
    ],
  },
  {
    title: 'Cuánto tiempo los guardamos',
    body: [
      'Mientras tengas tu cuenta. Si la eliminas, borramos tus datos y archivos de forma permanente. Los resultados de planes y precios que no te identifican pueden seguir en caché para otros usuarios.',
    ],
  },
  {
    title: 'Cómo los protegemos',
    body: [
      'Tus datos viajan cifrados y cada fila de la base de datos está protegida para que solo tu cuenta pueda leerla. Tus facturas se guardan en un espacio privado.',
    ],
  },
  {
    title: 'Tus derechos',
    body: [
      'Puedes ver y corregir tu información en la app, y eliminar tu cuenta y todos tus datos desde Perfil. Para cualquier otra solicitud escríbenos.',
    ],
  },
  {
    title: 'Menores de edad',
    body: ['Seibi no está dirigido a menores de 18 años.'],
  },
  {
    title: 'Cambios y contacto',
    body: [
      'Si cambiamos esta política te lo diremos en la app. Preguntas: ' + CONTACT + '.',
    ],
  },
]

export function LegalPage({ doc }: { doc: 'terminos' | 'privacidad' }) {
  const sections = doc === 'terminos' ? TERMS : PRIVACY
  return (
    <Screen back title={doc === 'terminos' ? 'Términos de uso' : 'Política de privacidad'} subtitle={`Actualizado el ${UPDATED}`}>
      <article className="flex flex-col gap-5 px-5">
        {!LEGAL_REVIEWED ? (
          <p className="rounded-2xl bg-soon-soft px-4 py-3 text-[0.82rem] font-medium text-soon">
            Borrador pendiente de revisión legal.
          </p>
        ) : null}
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-[1.05rem]">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-2 text-[0.92rem] leading-relaxed text-muted">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </Screen>
  )
}
