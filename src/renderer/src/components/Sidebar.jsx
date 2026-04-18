import { NavLink } from 'react-router-dom'
import { colors } from '../theme'

const workItems = [
  { path: '/expenses',          label: 'Expenses',          icon: '💰' },
  { path: '/invoices',          label: 'Invoices',          icon: '📄' },
  { path: '/av-agent',          label: 'AV Agent',          icon: '🤖' },
  { path: '/file-distribution', label: 'File Distribution', icon: '📁' },
]

const contentItems = [
  { path: '/content/folded-steel',           label: 'Folded Steel',          icon: '🔪' },
  { path: '/content/cook-travel-dad',        label: 'Cook Travel Dad',       icon: '🍳' },
  { path: '/content/from-points-to-travel',  label: 'From Points to Travel', icon: '✈️' },
  { path: '/content/furniture-flip',         label: 'Furniture Flip',        icon: '🪑' },
  { path: '/content/propagate-iq',           label: 'Propagate IQ',          icon: '🌱' },
  { path: '/content/reconnect-deck',         label: 'Reconnect Deck',        icon: '🃏' },
]

function NavItem({ path, label, icon }) {
  return (
    <NavLink
      to={path}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        padding: '8px 10px',
        borderRadius: '7px',
        fontSize: '12px',
        textDecoration: 'none',
        marginBottom: '2px',
        backgroundColor: isActive ? colors.card : 'transparent',
        color: isActive ? colors.text : colors.textSecondary,
        fontWeight: isActive ? '500' : '400',
      })}
    >
      <span style={{ fontSize: '15px' }}>{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <div
      style={{
        width: '200px',
        minWidth: '200px',
        backgroundColor: colors.sidebar,
        borderRight: `1px solid ${colors.borderLight}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      {/* App title */}
      <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${colors.borderLight}` }}>
        <div style={{ color: colors.text, fontSize: '14px', fontWeight: '700', letterSpacing: '0.3px' }}>
          AV Desk
        </div>
        <div style={{ color: colors.textMuted, fontSize: '10px', marginTop: '2px' }}>
          Your Command Center
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '10px 8px', flex: 1, overflowY: 'auto' }}>
        <div style={{ color: colors.textMuted, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1.2px', padding: '0 6px', marginBottom: '6px', marginTop: '4px' }}>
          Work
        </div>
        {workItems.map(item => <NavItem key={item.path} {...item} />)}

        <div style={{ color: colors.textMuted, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1.2px', padding: '0 6px', marginBottom: '6px', marginTop: '14px' }}>
          Content Studio
        </div>
        {contentItems.map(item => <NavItem key={item.path} {...item} />)}
      </nav>

      {/* Settings */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${colors.borderLight}` }}>
        <NavLink
          to="/settings"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            textDecoration: 'none',
            color: isActive ? colors.text : colors.textSecondary,
          })}
        >
          <span>⚙️</span>
          <span>Settings</span>
        </NavLink>
      </div>
    </div>
  )
}
