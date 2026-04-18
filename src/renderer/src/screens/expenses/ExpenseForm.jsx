import { useState, useEffect } from 'react'
import { colors } from '../../theme'

const TYPE_OPTIONS = [
  { value: 'show_day', label: 'Show Day' },
  { value: 'travel_day', label: 'Travel Day' },
  { value: 'hourly', label: 'Hourly' },
]

const inputStyle = {
  width: '100%',
  backgroundColor: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: '7px',
  padding: '9px 12px',
  color: colors.text,
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  color: colors.textSecondary,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  marginBottom: '5px',
}

function Field({ label, id, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function calcAmount(type, rate, hours) {
  if (type === 'hourly') return (Number(hours) || 0) * (Number(rate) || 0)
  return Number(rate) || 0
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function ExpenseForm({ expense, onSave, onCancel, clients, defaultRates }) {
  const [form, setForm] = useState({
    date: expense?.date ?? todayIso(),
    show_name: expense?.show_name ?? '',
    client: expense?.client ?? '',
    type: expense?.type ?? 'show_day',
    hours: expense?.hours != null ? String(expense.hours) : '',
    rate: expense?.rate != null ? String(expense.rate) : String(defaultRates?.show_day ?? ''),
    notes: expense?.notes ?? '',
  })

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  // When type changes on a new expense, auto-fill rate from defaultRates
  useEffect(() => {
    if (!expense) {
      const newRate = defaultRates?.[form.type]
      if (newRate !== undefined) setForm((prev) => ({ ...prev, rate: String(newRate) }))
    }
  }, [form.type]) // eslint-disable-line react-hooks/exhaustive-deps

  const amount = calcAmount(form.type, form.rate, form.hours)

  const handleSave = () => {
    onSave({
      date: form.date,
      show_name: form.show_name,
      client: form.client,
      type: form.type,
      hours: form.type === 'hourly' ? (Number(form.hours) || null) : null,
      rate: Number(form.rate) || 0,
      amount,
      notes: form.notes,
    })
  }

  return (
    <div style={{ maxWidth: '480px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Field label="Date" id="date">
          <input id="date" type="date" value={form.date} onChange={set('date')} style={inputStyle} />
        </Field>
        <Field label="Type" id="type">
          <select id="type" value={form.type} onChange={set('type')} style={inputStyle}>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Show Name" id="show_name">
        <input id="show_name" type="text" value={form.show_name} onChange={set('show_name')} style={inputStyle} placeholder="e.g. TED Talk 2026" />
      </Field>

      <Field label="Client" id="client">
        <input id="client" type="text" value={form.client} onChange={set('client')} style={inputStyle} placeholder="e.g. Ovation Events" list="client-list" />
        <datalist id="client-list">
          {clients.map((c) => <option key={c.id} value={c.name} />)}
        </datalist>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: form.type === 'hourly' ? '1fr 1fr' : '1fr', gap: '0 16px' }}>
        {form.type === 'hourly' && (
          <Field label="Hours" id="hours">
            <input id="hours" type="number" min="0" step="0.5" value={form.hours} onChange={set('hours')} style={inputStyle} />
          </Field>
        )}
        <Field label="Rate ($)" id="rate">
          <input id="rate" type="number" min="0" step="0.01" value={form.rate} onChange={set('rate')} style={inputStyle} />
        </Field>
      </div>

      <div style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: '7px',
        padding: '12px 14px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Total</span>
        <span style={{ color: colors.text, fontSize: '18px', fontWeight: '600' }}>
          {amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </span>
      </div>

      <Field label="Notes" id="notes">
        <textarea
          id="notes"
          value={form.notes}
          onChange={set('notes')}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Optional notes..."
        />
      </Field>

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button
          onClick={handleSave}
          style={{
            backgroundColor: colors.card,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '7px',
            padding: '9px 22px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            color: colors.textSecondary,
            border: 'none',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '9px 10px',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
