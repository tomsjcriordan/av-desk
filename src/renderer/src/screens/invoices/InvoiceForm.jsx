import { useState } from 'react'
import { colors } from '../../theme'

const TYPE_OPTIONS = [
  { value: 'show_day', label: 'Show Day' },
  { value: 'travel_day', label: 'Travel Day' },
  { value: 'hourly', label: 'Hourly' },
]
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
]
const inputStyle = { width: '100%', backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '7px', padding: '9px 12px', color: colors.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { display: 'block', color: colors.textSecondary, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '5px' }

function Field({ label, id, children }) {
  return <div style={{ marginBottom: '16px' }}><label htmlFor={id} style={labelStyle}>{label}</label>{children}</div>
}
function todayIso() { return new Date().toISOString().slice(0, 10) }
function defaultItem(defaultRates, type = 'show_day') {
  const rate = Number(defaultRates?.[type]) || 0
  return { description: '', type, quantity: 1, rate, amount: rate }
}
function recalc(item) {
  return { ...item, amount: (Number(item.quantity) || 0) * (Number(item.rate) || 0) }
}
const fmt = (n) => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

export default function InvoiceForm({ invoice, invoiceNumber, onSave, onCancel, clients, defaultRates }) {
  const [form, setForm] = useState({
    invoice_number: invoice?.invoice_number ?? invoiceNumber ?? '',
    date: invoice?.date ?? todayIso(),
    client: invoice?.client ?? '',
    status: invoice?.status ?? 'draft',
    notes: invoice?.notes ?? '',
  })
  const [items, setItems] = useState(invoice?.items?.length ? invoice.items : [defaultItem(defaultRates)])
  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const updateItem = (idx, key, value) => {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item
      const next = { ...item, [key]: value }
      if (key === 'type' && !invoice) next.rate = Number(defaultRates?.[value]) || next.rate
      return recalc(next)
    }))
  }
  const addItem = () => setItems((prev) => [...prev, defaultItem(defaultRates)])
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx))
  const total = items.reduce((sum, i) => sum + Number(i.amount), 0)

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        <Field label="Invoice #" id="invoice_number">
          <input id="invoice_number" type="text" value={form.invoice_number} readOnly style={{ ...inputStyle, color: colors.textSecondary }} />
        </Field>
        <Field label="Date" id="date">
          <input id="date" type="date" value={form.date} onChange={setField('date')} style={inputStyle} />
        </Field>
        <Field label="Status" id="status">
          <select id="status" value={form.status} onChange={setField('status')} style={inputStyle}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Client" id="client">
        <input id="client" type="text" value={form.client} onChange={setField('client')} style={inputStyle} placeholder="e.g. Ovation Events" list="invoice-client-list" />
        <datalist id="invoice-client-list">{clients.map((c) => <option key={c.id} value={c.name} />)}</datalist>
      </Field>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ ...labelStyle, marginBottom: '8px' }}>Line Items</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Description','Type','Qty','Rate','Amount',''].map((h) => <th key={h} style={{ ...labelStyle, padding: '0 6px 6px 0', textAlign: 'left', marginBottom: 0 }}>{h}</th>)}</tr></thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ paddingRight: '8px', paddingBottom: '8px' }}>
                  <input aria-label={`item-${idx}-description`} type="text" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} style={{ ...inputStyle, minWidth: '150px' }} placeholder="e.g. TED Talk" />
                </td>
                <td style={{ paddingRight: '8px', paddingBottom: '8px' }}>
                  <select aria-label={`item-${idx}-type`} value={item.type} onChange={(e) => updateItem(idx, 'type', e.target.value)} style={{ ...inputStyle, minWidth: '100px' }}>
                    {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td style={{ paddingRight: '8px', paddingBottom: '8px' }}>
                  <input aria-label={`item-${idx}-quantity`} type="number" min="0" step="0.5" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} style={{ ...inputStyle, width: '60px' }} />
                </td>
                <td style={{ paddingRight: '8px', paddingBottom: '8px' }}>
                  <input aria-label={`item-${idx}-rate`} type="number" min="0" step="0.01" value={item.rate} onChange={(e) => updateItem(idx, 'rate', e.target.value)} style={{ ...inputStyle, width: '80px' }} />
                </td>
                <td style={{ paddingRight: '8px', paddingBottom: '8px', color: colors.text, fontSize: '13px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{fmt(item.amount)}</td>
                <td style={{ paddingBottom: '8px', verticalAlign: 'middle' }}>
                  {items.length > 1 && <button onClick={() => removeItem(idx)} aria-label={`remove-item-${idx}`} style={{ background: 'none', border: 'none', color: colors.red, cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}>×</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addItem} style={{ background: 'none', border: `1px dashed ${colors.border}`, borderRadius: '6px', color: colors.textSecondary, fontSize: '12px', padding: '6px 14px', cursor: 'pointer', marginTop: '4px' }}>+ Add Line Item</button>
      </div>
      <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '7px', padding: '12px 14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Total</span>
        <span style={{ color: colors.text, fontSize: '20px', fontWeight: '600' }}>{fmt(total)}</span>
      </div>
      <Field label="Notes" id="notes">
        <textarea id="notes" value={form.notes} onChange={setField('notes')} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Payment terms, thank you note..." />
      </Field>
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button onClick={() => onSave({ ...form, items })} style={{ backgroundColor: colors.card, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '7px', padding: '9px 22px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Save</button>
        <button onClick={onCancel} style={{ background: 'none', color: colors.textSecondary, border: 'none', fontSize: '13px', cursor: 'pointer', padding: '9px 10px' }}>Cancel</button>
      </div>
    </div>
  )
}
