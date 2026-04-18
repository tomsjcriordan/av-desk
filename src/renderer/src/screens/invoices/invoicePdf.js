import jsPDF from 'jspdf'

const TYPE_LABELS = { show_day: 'Show Day', travel_day: 'Travel Day', hourly: 'Hourly' }

export function buildInvoicePdf({ invoice, businessName, yourName }) {
  const doc = new jsPDF()
  const { invoice_number, date, client, status, items, notes } = invoice
  const total = items.reduce((sum, i) => sum + Number(i.amount), 0)

  doc.setFontSize(24); doc.setTextColor(40); doc.text('INVOICE', 14, 26)
  if (status === 'draft') { doc.setFontSize(9); doc.setTextColor(150); doc.text('DRAFT', 56, 20) }
  else if (status === 'paid') { doc.setFontSize(9); doc.setTextColor(48, 209, 88); doc.text('PAID', 56, 20) }

  const biz = businessName || yourName || ''
  doc.setFontSize(10); doc.setTextColor(80)
  if (biz) {
    doc.text(biz, 196, 18, { align: 'right' })
    if (businessName && yourName && businessName !== yourName) doc.text(yourName, 196, 25, { align: 'right' })
  }
  doc.setFontSize(9); doc.setTextColor(120)
  doc.text(`Invoice #: ${invoice_number}`, 196, 36, { align: 'right' })
  doc.text(`Date: ${date}`, 196, 43, { align: 'right' })

  doc.setDrawColor(44, 44, 46); doc.setLineWidth(0.5); doc.line(14, 52, 196, 52)
  doc.setFontSize(8); doc.setTextColor(120); doc.text('BILL TO', 14, 60)
  doc.setFontSize(13); doc.setTextColor(40); doc.text(client || '', 14, 68)

  const tableY = 82
  const cols = [{ label: 'Description', x: 14 }, { label: 'Type', x: 96 }, { label: 'Qty', x: 126 }, { label: 'Rate', x: 142 }, { label: 'Amount', x: 168 }]
  doc.setFillColor(44, 44, 46); doc.rect(14, tableY - 5, 182, 8, 'F')
  doc.setFontSize(8); doc.setTextColor(200)
  cols.forEach((col) => doc.text(col.label, col.x, tableY))

  let y = tableY + 9
  doc.setTextColor(40)
  items.forEach((item, idx) => {
    if (y > 255) { doc.addPage(); y = 20 }
    if (idx % 2 === 1) { doc.setFillColor(245, 245, 248); doc.rect(14, y - 5, 182, 7, 'F') }
    doc.setFontSize(8); doc.setTextColor(40)
    doc.text(String(item.description || '').slice(0, 38), 14, y)
    doc.text(TYPE_LABELS[item.type] || item.type, 96, y)
    doc.text(String(item.quantity), 126, y)
    doc.text(`$${Number(item.rate).toFixed(2)}`, 142, y)
    doc.text(`$${Number(item.amount).toFixed(2)}`, 168, y)
    y += 7
  })

  y += 4
  doc.setFillColor(44, 44, 46); doc.rect(14, y - 5, 182, 10, 'F')
  doc.setTextColor(200); doc.setFontSize(9); doc.text('TOTAL', 14, y + 1)
  doc.setFontSize(12); doc.text(`$${total.toFixed(2)}`, 168, y + 1)

  if (notes) {
    y += 22; doc.setFontSize(8); doc.setTextColor(120); doc.text('NOTES', 14, y)
    y += 6; doc.setFontSize(9); doc.setTextColor(60)
    doc.text(doc.splitTextToSize(String(notes), 182), 14, y)
  }
  return doc
}
