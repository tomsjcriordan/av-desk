// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import {
  initDb,
  listVenues, addVenue, deleteVenue,
  listRooms, addRoom, updateRoomStatus, deleteRoom, resetRooms,
} from '../../src/main/db'

let db

beforeEach(() => {
  db = new Database(':memory:')
  initDb(db)
})

const sampleVenue = { name: 'Marriott Downtown', notes: '2nd floor ballroom' }

describe('venues', () => {
  it('starts empty', () => {
    expect(listVenues(db)).toEqual([])
  })

  it('adds a venue', () => {
    const v = addVenue(db, sampleVenue)
    expect(v.id).toBeDefined()
    expect(v.name).toBe('Marriott Downtown')
    expect(v.notes).toBe('2nd floor ballroom')
  })

  it('lists venues alphabetically', () => {
    addVenue(db, { name: 'Hilton', notes: '' })
    addVenue(db, { name: 'Marriott', notes: '' })
    const list = listVenues(db)
    expect(list[0].name).toBe('Hilton')
    expect(list[1].name).toBe('Marriott')
  })

  it('deletes a venue and its rooms', () => {
    const v = addVenue(db, sampleVenue)
    addRoom(db, { venue_id: v.id, name: 'Room 101', ip_address: '10.0.0.1', share_path: '\\\\10.0.0.1\\Presentations' })
    deleteVenue(db, v.id)
    expect(listVenues(db)).toEqual([])
    expect(listRooms(db, v.id)).toEqual([])
  })
})

describe('rooms', () => {
  let venueId

  beforeEach(() => {
    venueId = addVenue(db, sampleVenue).id
  })

  it('starts empty for a venue', () => {
    expect(listRooms(db, venueId)).toEqual([])
  })

  it('adds a room', () => {
    const r = addRoom(db, { venue_id: venueId, name: 'Room 101', ip_address: '10.0.0.1', share_path: '\\\\10.0.0.1\\Presentations' })
    expect(r.id).toBeDefined()
    expect(r.name).toBe('Room 101')
    expect(r.ip_address).toBe('10.0.0.1')
    expect(r.status).toBe('pending')
  })

  it('lists rooms sorted by name', () => {
    addRoom(db, { venue_id: venueId, name: 'Room 202', ip_address: '10.0.0.2', share_path: '' })
    addRoom(db, { venue_id: venueId, name: 'Room 101', ip_address: '10.0.0.1', share_path: '' })
    const list = listRooms(db, venueId)
    expect(list[0].name).toBe('Room 101')
    expect(list[1].name).toBe('Room 202')
  })

  it('updates room status to delivered', () => {
    const r = addRoom(db, { venue_id: venueId, name: 'Room 101', ip_address: '10.0.0.1', share_path: '' })
    const updated = updateRoomStatus(db, r.id, 'delivered')
    expect(updated.status).toBe('delivered')
  })

  it('resets all rooms in a venue to pending', () => {
    addRoom(db, { venue_id: venueId, name: 'Room 101', ip_address: '10.0.0.1', share_path: '' })
    addRoom(db, { venue_id: venueId, name: 'Room 202', ip_address: '10.0.0.2', share_path: '' })
    updateRoomStatus(db, 1, 'delivered')
    updateRoomStatus(db, 2, 'delivered')
    resetRooms(db, venueId)
    const list = listRooms(db, venueId)
    expect(list.every((r) => r.status === 'pending')).toBe(true)
  })

  it('deletes a room', () => {
    const r = addRoom(db, { venue_id: venueId, name: 'Room 101', ip_address: '10.0.0.1', share_path: '' })
    deleteRoom(db, r.id)
    expect(listRooms(db, venueId)).toEqual([])
  })
})
