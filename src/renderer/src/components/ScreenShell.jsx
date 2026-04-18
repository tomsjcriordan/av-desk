import { colors } from '../theme'

export default function ScreenShell({ title, subtitle, children, headerRight }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '14px 22px',
        borderBottom: `1px solid ${colors.borderLight}`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: colors.text, fontSize: '16px', fontWeight: '600' }}>{title}</div>
          {subtitle && (
            <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '2px' }}>{subtitle}</div>
          )}
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
        {children}
      </div>
    </div>
  )
}
