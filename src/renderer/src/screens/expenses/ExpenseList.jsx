import { colors } from '../../theme'

const TYPE_LABELS = {
  travel_day: 'Travel Day',
  show_day: 'Show Day',
  hourly: 'Hourly',
}

const fmt = (n) =>
  Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

const thStyle = {
  padding: '9px 12px',
  color: colors.textSecondary,
  fontSize: '11px',
  fontWeight: '500',
  textAlign: 'left',
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '10px 12px',
  fontSize: '13px',
  color: colors.text,
  borderBottom: `1px solid ${colors.borderLight}`,
  verticalAlign: 'middle',
}

function ActionBtn({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: `1px solid ${danger ? colors.red : colors.border}`,
        borderRadius: '5px',
        color: danger ? colors.red : colors.textSecondary,
        fontSize: '11px',
        padding: '4px 10px',
        cursor: 'pointer',
        marginLeft: '6px',
      }}
    >
      {label}
    </button>
  )
}

export default function ExpenseList({ expenses, onEdit, onDelete }) {
  if (expenses.length === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: colors.textMuted, fontSize: '13px' }}>
        No expenses yet — click Add Expense to get started.
      </div>
    )
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Date', 'Show', 'Client', 'Type', 'Hrs', 'Rate', 'Amount', ''].map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr key={exp.id}>
              <td style={tdStyle}>{exp.date}</td>
              <td style={tdStyle}>{exp.show_name}</td>
              <td style={{ ...tdStyle, color: colors.textSecondary }}>{exp.client}</td>
              <td style={tdStyle}>{TYPE_LABELS[exp.type] || exp.type}</td>
              <td style={{ ...tdStyle, color: colors.textSecondary }}>{exp.hours ?? '—'}</td>
              <td style={{ ...tdStyle, color: colors.textSecondary }}>{fmt(exp.rate)}</td>
              <td style={{ ...tdStyle, fontWeight: '500' }}>{fmt(exp.amount)}</td>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                <ActionBtn label="Edit" onClick={() => onEdit(exp)} />
                <ActionBtn label="Delete" onClick={() => onDelete(exp.id)} danger />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={6} style={{ ...tdStyle, color: colors.textSecondary, fontSize: '11px', paddingTop: '14px' }}>
              {expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}
            </td>
            <td style={{ ...tdStyle, fontWeight: '600', fontSize: '15px', paddingTop: '14px' }}>
              {fmt(total)}
            </td>
            <td style={tdStyle} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
