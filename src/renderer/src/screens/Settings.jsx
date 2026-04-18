import { useState, useEffect } from 'react'
import ScreenShell from '../components/ScreenShell'
import { colors } from '../theme'

function Field({ label, id, type = 'text', value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          color: colors.textSecondary,
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          marginBottom: '6px',
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ''}
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: '7px',
          padding: '9px 12px',
          color: colors.text,
          fontSize: '13px',
          outline: 'none',
        }}
      />
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div
      style={{
        color: colors.textSecondary,
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '14px',
        marginTop: '28px',
        paddingBottom: '8px',
        borderBottom: `1px solid ${colors.borderLight}`,
      }}
    >
      {title}
    </div>
  )
}

const defaultSettings = {
  yourName: '',
  businessName: '',
  travelDayRate: '',
  showDayRate: '',
  hourlyRate: '',
  claudeApiKey: '',
}

export default function Settings() {
  const [form, setForm] = useState(defaultSettings)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.electronAPI.settings.getAll().then((stored) => {
      if (stored) setForm((prev) => ({ ...prev, ...stored }))
    })
  }, [])

  const updateField = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    for (const [key, value] of Object.entries(form)) {
      await window.electronAPI.settings.set(key, value)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <ScreenShell title="Settings" subtitle="Configure your profile and preferences">
      <div style={{ maxWidth: '480px' }}>

        <SectionHeader title="Profile" />
        <Field label="Your Name" id="yourName" value={form.yourName} onChange={updateField('yourName')} placeholder="Tom Riordan" />
        <Field label="Business Name" id="businessName" value={form.businessName} onChange={updateField('businessName')} placeholder="Tom Riordan AV" />

        <SectionHeader title="AV Rates" />
        <Field label="Travel Day Rate ($)" id="travelDayRate" type="number" value={form.travelDayRate} onChange={updateField('travelDayRate')} placeholder="0.00" />
        <Field label="Show Day Rate ($)" id="showDayRate" type="number" value={form.showDayRate} onChange={updateField('showDayRate')} placeholder="0.00" />
        <Field label="Hourly Rate ($)" id="hourlyRate" type="number" value={form.hourlyRate} onChange={updateField('hourlyRate')} placeholder="0.00" />

        <SectionHeader title="AI" />
        <Field label="Claude API Key" id="claudeApiKey" type="password" value={form.claudeApiKey} onChange={updateField('claudeApiKey')} placeholder="sk-ant-..." />

        <div style={{ marginTop: '28px', display: 'flex', alignItems: 'center', gap: '14px' }}>
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
            Save Settings
          </button>
          {saved && (
            <span style={{ color: colors.green, fontSize: '12px' }}>&#x2713; Saved</span>
          )}
        </div>

      </div>
    </ScreenShell>
  )
}
