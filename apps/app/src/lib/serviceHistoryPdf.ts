import type { ServiceItem } from './services'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** Opens a print-ready historial page so the user can save/share as PDF. */
export function openServiceHistoryPdf(
  services: ServiceItem[],
  vehicleLabel: string | null,
) {
  const generatedAt = new Date().toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const title = vehicleLabel
    ? `Historial de servicios · ${vehicleLabel}`
    : 'Historial de servicios'
  const rows =
    services.length > 0
      ? services
          .map(
            (item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.meta)}</td>
        <td class="cost">${escapeHtml(item.cost)}</td>
      </tr>`,
          )
          .join('')
      : `<tr><td colspan="3">Sin servicios registrados.</td></tr>`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 28px;
      font-family: "Segoe UI", system-ui, sans-serif;
      color: #111;
      background: #fff;
    }
    h1 {
      margin: 0;
      font-size: 22px;
      letter-spacing: -0.02em;
    }
    .meta {
      margin: 8px 0 22px;
      color: #666;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      padding: 10px 8px;
      border-bottom: 1px solid #e8e8e8;
      text-align: left;
      vertical-align: top;
    }
    th {
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #888;
    }
    .cost {
      font-weight: 700;
      color: #c40000;
      white-space: nowrap;
    }
    .brand {
      margin-top: 28px;
      font-size: 12px;
      color: #999;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">${services.length} servicios · Generado ${escapeHtml(generatedAt)}</p>
  <table>
    <thead>
      <tr>
        <th>Servicio</th>
        <th>Fecha</th>
        <th>Costo</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="brand">Seibi · Mantenimiento con total claridad</p>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.focus(); window.print(); }, 120);
    });
  </script>
</body>
</html>`

  const popup = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900')
  if (!popup) {
    // Popup blocked: fall back to same-tab blob download of printable HTML.
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `seibi-historial-${Date.now()}.html`
    link.click()
    URL.revokeObjectURL(url)
    return
  }

  popup.document.open()
  popup.document.write(html)
  popup.document.close()
}
