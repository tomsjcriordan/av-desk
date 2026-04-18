import { useState, useEffect, useCallback } from 'react'
import ScreenShell from '../components/ScreenShell'
import GuideSteps from './filedist/GuideSteps'
import RoomTracker from './filedist/RoomTracker'
import { colors } from '../theme'

const inputStyle = {
  backgroundColor: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: '7px',
  padding: '9px 12px',
  color: colors.text,
  fontSize: '13px',
  outline: 'none',
}

export default function FileDistribution() {
  const [venues, setVenues] = useState([])
  const [selectedVenueId, setSelectedVenueId] = useState(null)
  const [rooms, setRooms] = useState([])
  const [showAddVenue, setShowAddVenue] = useState(false)
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [venueName, setVenueName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [roomIp, setRoomIp] = useState('')

  const loadVenues = useCallback(async () => {
    const list = await window.electronAPI.venues.list()
    setVenues(list)
    if (list.length > 0 && !selectedVenueId) {
      setSelectedVenueId(list[0].id)
    }
  }, [selectedVenueId])

  const loadRooms = useCallback(async () => {
    if (!selectedVenueId) return
    const list = await window.electronAPI.rooms.list(selectedVenueId)
    setRooms(list)
  }, [selectedVenueId])

  useEffect(() => { loadVenues() }, [loadVenues])
  useEffect(() => { loadRooms() }, [loadRooms])

  const handleAddVenue = async () => {
    if (!venueName.trim()) return
    const v = await window.electronAPI.venues.add({ name: venueName.trim(), notes: '' })
    setVenueName('')
    setShowAddVenue(false)
    await loadVenues()
    setSelectedVenueId(v.id)
  }

  const handleDeleteVenue = async () => {
    if (!selectedVenueId) return
    await window.electronAPI.venues.delete(selectedVenueId)
    setSelectedVenueId(null)
    setRooms([])
    await loadVenues()
  }

  const handleAddRoom = async () => {
    if (!roomName.trim() || !selectedVenueId) return
    await window.electronAPI.rooms.add({
      venue_id: selectedVenueId,
      name: roomName.trim(),
      ip_address: roomIp.trim(),
      share_path: '',
    })
    setRoomName('')
    setRoomIp('')
    setShowAddRoom(false)
    await loadRooms()
  }

  const handleToggle = async (id, status) => {
    await window.electronAPI.rooms.updateStatus(id, status)
    await loadRooms()
  }

  const handleDeleteRoom = async (id) => {
    await window.electronAPI.rooms.delete(id)
    await loadRooms()
  }

  const handleReset = async () => {
    await window.electronAPI.rooms.reset(selectedVenueId)
    await loadRooms()
  }

  return (
    <ScreenShell title="File Distribution" subtitle="Network setup and file distribution guide">
      <GuideSteps />

      {/* Venue selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: `1px solid ${colors.borderLight}`,
      }}>
        <span style={{ color: colors.textSecondary, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Venue
        </span>
        {venues.length > 0 ? (
          <select
            value={selectedVenueId || ''}
            onChange={(e) => setSelectedVenueId(Number(e.target.value))}
            style={{ ...inputStyle, minWidth: '180px' }}
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        ) : (
          <span style={{ color: colors.textMuted, fontSize: '12px' }}>No venues saved</span>
        )}
        <button
          onClick={() => setShowAddVenue(!showAddVenue)}
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
          + New Venue
        </button>
        {selectedVenueId && (
          <button
            onClick={handleDeleteVenue}
            style={{
              background: 'none',
              border: `1px solid ${colors.red}`,
              borderRadius: '5px',
              color: colors.red,
              fontSize: '11px',
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            Delete Venue
          </button>
        )}
      </div>

      {/* Add venue inline form */}
      {showAddVenue && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="Venue name (e.g. Marriott Downtown)"
            style={{ ...inputStyle, flex: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddVenue()}
          />
          <button onClick={handleAddVenue} style={{ ...inputStyle, cursor: 'pointer', fontWeight: '500' }}>Save</button>
          <button onClick={() => setShowAddVenue(false)} style={{ background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
        </div>
      )}

      {/* Room tracker */}
      <RoomTracker
        rooms={rooms}
        onToggle={handleToggle}
        onDelete={handleDeleteRoom}
        onAdd={() => setShowAddRoom(!showAddRoom)}
        onReset={handleReset}
      />

      {/* Add room inline form */}
      {showAddRoom && selectedVenueId && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Room name (e.g. Room 101)"
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            type="text"
            value={roomIp}
            onChange={(e) => setRoomIp(e.target.value)}
            placeholder="IP address (e.g. 10.0.0.1)"
            style={{ ...inputStyle, width: '160px' }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddRoom()}
          />
          <button onClick={handleAddRoom} style={{ ...inputStyle, cursor: 'pointer', fontWeight: '500' }}>Add</button>
          <button onClick={() => setShowAddRoom(false)} style={{ background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
        </div>
      )}
    </ScreenShell>
  )
}
