import { colors } from '../../theme'

const MODES = [
  { key: 'chat',     label: 'Chat'     },
  { key: 'analyze',  label: 'Analyze'  },
  { key: 'calendar', label: 'Calendar' },
  { key: 'caption',  label: 'Caption'  },
  { key: 'monetize', label: 'Monetize' },
]

export default function ModeSelector({ active, onChange }) {
  return (
    <div style={{
      display: 'flex',
      gap: '0',
      borderBottom: `1px solid ${colors.border}`,
      marginBottom: '12px',
    }}>
      {MODES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => key !== active && onChange(key)}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: `2px solid ${key === active ? colors.blue : 'transparent'}`,
            color: key === active ? colors.text : colors.textSecondary,
            fontSize: '12px',
            fontWeight: key === active ? '600' : '400',
            padding: '8px 16px',
            cursor: key === active ? 'default' : 'pointer',
            transition: 'color 0.15s, border-color 0.15s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
