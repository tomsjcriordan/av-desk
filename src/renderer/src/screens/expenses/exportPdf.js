import jsPDF from 'jspdf'

const TYPE_LABELS = { travel_day: 'Travel', show_day: 'Show', hourly: 'Hourly' }

function trunc(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str
}

/**
 * buildExpenseReport — builds a jsPDF document from expenses data.
 * Call doc.save('filename.pdf') or doc.output('bloburl') on the returned doc.
 *
 * @param {{ expenses: object[], businessName: string, yourName: string }} options
 * @returns {jsPDF}
 */
export function buildExpenseReport({ expenses, businessName, yourName }) {
  const doc = new jsPDF()

  // ── Header ─────────────────────────────────────────────────────────────
  doc.setFontSize(18)
  doc.setTextColor(40)
  doc.text('Expense Report', 14, 22)

  doc.setFontSize(10)
  doc.setTextColor(100)
  const nameStr = businessName || yourName || ''
  if (nameStr) doc.text(nameStr, 14, 30)

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(`Generated: ${today}`, 14, nameStr ? 38 : 30)

  // ── Column layout ───────────────────────────────────────────────────────
  const startY = nameStr ? 50 : 44
  const cols = [
    { label: 'Date',   x: 14,  w: 24 },
    { label: 'Show',   x: 38,  w: 52 },
    { label: 'Client', x: 90,  w: 38 },
    { label: 'Type',   x: 128, w: 20 },
    { label: 'Hrs',    x: 148, w: 12 },
    { label: 'Rate',   x: 160, w: 22 },
    { label: 'Amount', x: 182, w: 24 },
  ]

  // Header row
  doc.setFillColor(44, 44, 46)
  doc.rect(14, startY - 5, 192, 8, 'F')
  doc.setFontSize(8)
  doc.setTextColor(200)
  cols.forEach((col) => doc.text(col.label, col.x, startY))

  // Data rows
  let y = startY + 9
  let total = 0
  doc.setTextColor(40)

  expenses.forEach((exp, idx) => {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
    if (idx % 2 === 1) {
      doc.setFillColor(245, 245, 248)
      doc.rect(14, y - 5, 192, 7, 'F')
    }
    doc.setFontSize(8)
    doc.setTextColor(40)
    const typeLabel = TYPE_LABELS[exp.type] || exp.type
    const amt = Number(exp.amount)
    total += amt
    const row = [
      exp.date,
      trunc(exp.show_name, 28),
      trunc(exp.client, 20),
      typeLabel,
      exp.hours != null ? String(exp.hours) : '\u2014',
      `$${Number(exp.rate).toFixed(2)}`,
      `$${amt.toFixed(2)}`,
    ]
    cols.forEach((col, i) => doc.text(row[i], col.x, y))
    y += 7
  })

  // Total row
  y += 4
  doc.setFillColor(44, 44, 46)
  doc.rect(14, y - 5, 192, 9, 'F')
  doc.setTextColor(200)
  doc.setFontSize(9)
  doc.text('TOTAL', 14, y)
  doc.setFontSize(10)
  doc.text(`$${total.toFixed(2)}`, 182, y)

  return doc
}
