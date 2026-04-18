import { colors } from '../../theme'

const STATUS_COLORS = {
  draft: { color: colors.orange, bg: colors.orangeBg },
  sent:  { color: colors.blue,   bg: colors.blueBg   },
  paid:  { color: colors.green,  bg: colors.greenBg  },
}
const fmt = (n) => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const thStyle = { padding: '9px 12px', color: colors.textSecondary, fontSize: '11px', fontWeight: '500', textAlign: 'left', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }
const tdStyle = { padding: '10px 12px', fontSize: '13px', color: colors.text, borderBottom: `1px solid ${colors.borderLight}`, verticalAlign: 'middle' }

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft
  return <span style={{ display: 'inline-block', backgroundColor: c.bg, color: c.color, fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '3px 8px', borderRadius: '4px' }}>{status}</span>
}

function ActionBtn({ label, onClick, danger }) {
  return <button onClick={onClick} style={{ background: 'none', border: `1px solid ${danger ? colors.red : colors.border}`, borderRadius: '5px', color: danger ? colors.red : colors.textSecondary, fontSize: '11px', padding: '4px 10px', cursor: 'pointer', marginLeft: '6px' }}>{label}</button>
}

export default function InvoiceList({ invoices, onEdit, onDelete, onExportPdf }) {
  if (invoices.length === 0) {
    return <div style={{ padding: '48px', textAlign: 'center', color: colors.textMuted, fontSize: '13px' }}>No invoices yet — click New Invoice to get started.</div>
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['Invoice #', 'Client', 'Date', 'Status', 'Total', ''].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
        <tbody>
          {invoices.map((inv) => {
            const total = inv.items.reduce((sum, i) => sum + Number(i.amount), 0)
            return (
              <tr key={inv.id}>
                <td style={{ ...tdStyle, fontWeight: '500' }}>{inv.invoice_number}</td>
                <td style={tdStyle}>{inv.client}</td>
                <td style={{ ...tdStyle, color: colors.textSecondary }}>{inv.date}</td>
                <td style={tdStyle}><StatusBadge status={inv.status} /></td>
                <td style={{ ...tdStyle, fontWeight: '500' }}>{fmt(total)}</td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                  <ActionBtn label="Edit" onClick={() => onEdit(inv)} />
                  <ActionBtn label="PDF" onClick={() => onExportPdf(inv)} />
                  <ActionBtn label="Delete" onClick={() => onDelete(inv.id)} danger />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
