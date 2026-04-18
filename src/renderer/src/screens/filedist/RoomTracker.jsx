import { colors } from '../../theme'

const STATUS_COLORS = {
  pending:   { color: colors.orange, bg: colors.orangeBg },
  delivered: { color: colors.green,  bg: colors.greenBg  },
}

function StatusBadge({ status, onClick }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-block',
        backgroundColor: c.bg,
        color: c.color,
        fontSize: '10px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        padding: '3px 8px',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {status}
    </button>
  )
}

export default function RoomTracker({ rooms, onToggle, onDelete, onAdd, onReset }) {
  const delivered = rooms.filter((r) => r.status === 'delivered').length

  return (
    <div>
      {/* Header with progress */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: colors.textSecondary, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Room Tracker
          </span>
          {rooms.length > 0 && (
            <span style={{ color: colors.textSecondary, fontSize: '12px' }}>
              {delivered} / {rooms.length} delivered
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {rooms.length > 0 && (
            <button
              onClick={onReset}
              style={{
                background: 'none',
                border: `1px solid ${colors.border}`,
                borderRadius: '5px',
                color: colors.textSecondary,
                fontSize: '11px',
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              Reset All
            </button>
          )}
          <button
            onClick={onAdd}
            style={{
              background: 'none',
              border: `1px dashed ${colors.border}`,
              borderRadius: '5px',
              color: colors.textSecondary,
              fontSize: '11px',
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            + Add Room
          </button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: colors.textMuted, fontSize: '13px' }}>
          No rooms yet — click + Add Room to get started.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Room', 'IP Address', 'Status', ''].map((h) => (
                <th key={h} style={{
                  padding: '9px 12px',
                  color: colors.textSecondary,
                  fontSize: '11px',
                  fontWeight: '500',
                  textAlign: 'left',
                  borderBottom: `1px solid ${colors.border}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: colors.text, borderBottom: `1px solid ${colors.borderLight}`, fontWeight: '500' }}>
                  {room.name}
                </td>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: colors.textSecondary, borderBottom: `1px solid ${colors.borderLight}`, fontFamily: 'monospace' }}>
                  {room.ip_address}
                </td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>
                  <StatusBadge
                    status={room.status}
                    onClick={() => onToggle(room.id, room.status === 'pending' ? 'delivered' : 'pending')}
                  />
                </td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>
                  <button
                    onClick={() => onDelete(room.id)}
                    style={{ background: 'none', border: 'none', color: colors.red, cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
