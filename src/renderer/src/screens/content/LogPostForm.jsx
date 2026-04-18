import { useState } from 'react'
import { colors } from '../../theme'

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
    <div style={{ marginBottom: '14px' }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function LogPostForm({ onSave, onCancel, suggestions }) {
  const [form, setForm] = useState({
    platform: 'instagram',
    post_type: 'reel',
    title: '',
    caption: '',
    posted_date: todayIso(),
    views: 0,
    likes: 0,
    saves: 0,
    shares: 0,
    comments: 0,
    watch_time_sec: 0,
    revenue: 0,
    suggestion_id: '',
    notes: '',
  })

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const setNum = (key) => (e) => setForm((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))

  const handleSave = () => {
    onSave({
      ...form,
      views: Number(form.views),
      likes: Number(form.likes),
      saves: Number(form.saves),
      shares: Number(form.shares),
      comments: Number(form.comments),
      watch_time_sec: Number(form.watch_time_sec),
      revenue: Number(form.revenue),
      suggestion_id: form.suggestion_id ? Number(form.suggestion_id) : null,
    })
  }

  return (
    <div style={{
      backgroundColor: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: '10px',
      padding: '18px',
      marginBottom: '16px',
    }}>
      <div style={{ ...labelStyle, fontSize: '12px', marginBottom: '14px', color: colors.text, fontWeight: '600' }}>Log a Post</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 14px' }}>
        <Field label="Platform" id="platform">
          <select id="platform" value={form.platform} onChange={setField('platform')} style={inputStyle}>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
          </select>
        </Field>
        <Field label="Post Type" id="post_type">
          <select id="post_type" value={form.post_type} onChange={setField('post_type')} style={inputStyle}>
            <option value="reel">Reel</option>
            <option value="post">Post</option>
            <option value="story">Story</option>
            <option value="carousel">Carousel</option>
          </select>
        </Field>
        <Field label="Posted Date" id="posted_date">
          <input id="posted_date" type="date" value={form.posted_date} onChange={setField('posted_date')} style={inputStyle} />
        </Field>
      </div>

      <Field label="Title" id="title">
        <input id="title" type="text" value={form.title} onChange={setField('title')} placeholder="Brief description of the post" style={inputStyle} />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '0 14px' }}>
        <Field label="Views" id="views">
          <input id="views" type="number" min="0" value={form.views} onChange={setNum('views')} style={inputStyle} />
        </Field>
        <Field label="Likes" id="likes">
          <input id="likes" type="number" min="0" value={form.likes} onChange={setNum('likes')} style={inputStyle} />
        </Field>
        <Field label="Saves" id="saves">
          <input id="saves" type="number" min="0" value={form.saves} onChange={setNum('saves')} style={inputStyle} />
        </Field>
        <Field label="Shares" id="shares">
          <input id="shares" type="number" min="0" value={form.shares} onChange={setNum('shares')} style={inputStyle} />
        </Field>
        <Field label="Comments" id="comments">
          <input id="comments" type="number" min="0" value={form.comments} onChange={setNum('comments')} style={inputStyle} />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 14px' }}>
        <Field label="Watch Time (avg sec)" id="watch_time_sec">
          <input id="watch_time_sec" type="number" min="0" step="0.1" value={form.watch_time_sec} onChange={setNum('watch_time_sec')} style={inputStyle} />
        </Field>
        <Field label="Revenue ($)" id="revenue">
          <input id="revenue" type="number" min="0" step="0.01" value={form.revenue} onChange={setNum('revenue')} style={inputStyle} />
        </Field>
        <Field label="Linked Suggestion" id="suggestion_id">
          <select id="suggestion_id" value={form.suggestion_id} onChange={setField('suggestion_id')} style={inputStyle}>
            <option value="">None</option>
            {suggestions.map((s) => (
              <option key={s.id} value={s.id}>{s.content.slice(0, 60)}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Caption" id="caption">
        <textarea id="caption" value={form.caption} onChange={setField('caption')} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="The actual caption used (optional)" />
      </Field>

      <Field label="Notes" id="notes">
        <textarea id="notes" value={form.notes} onChange={setField('notes')} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Why it performed well/poorly (optional)" />
      </Field>

      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <button onClick={handleSave} style={{ backgroundColor: colors.card, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '7px', padding: '9px 22px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          Save Post
        </button>
        <button onClick={onCancel} style={{ background: 'none', color: colors.textSecondary, border: 'none', fontSize: '13px', cursor: 'pointer', padding: '9px 10px' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
