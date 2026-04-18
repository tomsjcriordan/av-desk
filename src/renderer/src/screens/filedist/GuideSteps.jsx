import { useState } from 'react'
import { colors } from '../../theme'

const STEPS = [
  {
    title: 'Connect to Venue Network',
    details: [
      'Plug your Mac into the venue switch or router via Ethernet (or connect to their Wi-Fi).',
      'Open System Preferences > Network and confirm you have an IP address.',
      'Open Terminal and ping a room PC to verify connectivity: ping 10.0.0.x',
    ],
  },
  {
    title: 'Enable Sharing on Windows PCs',
    details: [
      'On each Lenovo room PC, open Settings > Network & Internet > Advanced sharing settings.',
      'Turn on Network Discovery and File and Printer Sharing.',
      'Create a folder (e.g. C:\\Presentations) and right-click > Properties > Sharing > Share.',
      'Note the share name and the PC\'s IP address (ipconfig in Command Prompt).',
    ],
  },
  {
    title: 'Connect from Mac',
    details: [
      'In Finder, press Cmd+K (Go > Connect to Server).',
      'Enter: smb://[room IP]/Presentations',
      'Enter credentials if prompted (usually the Windows username and password).',
      'The share mounts on your desktop — you can now drag files to it.',
    ],
  },
  {
    title: 'Copy Files',
    details: [
      'Drag your PowerPoint or Keynote files to each room\'s mounted share.',
      'Wait for the copy to complete — verify the file size matches the original.',
      'For large files, use Terminal: cp -v ~/Desktop/presentation.pptx /Volumes/Presentations/',
    ],
  },
  {
    title: 'Verify & Mark Delivered',
    details: [
      'Walk to each room PC and open the file to confirm it plays correctly.',
      'Check the file size matches and there are no corruption issues.',
      'Mark the room as delivered in the tracker below.',
    ],
  },
]

export default function GuideSteps() {
  const [expanded, setExpanded] = useState(null)

  const toggle = (idx) => setExpanded((prev) => (prev === idx ? null : idx))

  return (
    <div style={{ marginBottom: '24px' }}>
      {STEPS.map((step, idx) => (
        <div
          key={idx}
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            marginBottom: '8px',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => toggle(idx)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '12px',
              backgroundColor: expanded === idx ? colors.blue : colors.border,
              color: expanded === idx ? '#fff' : colors.textSecondary,
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {idx + 1}
            </span>
            <span style={{ color: colors.text, fontSize: '13px', fontWeight: '500', flex: 1 }}>
              {step.title}
            </span>
            <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
              {expanded === idx ? '▾' : '▸'}
            </span>
          </button>

          {expanded === idx && (
            <div style={{ padding: '0 14px 14px 50px' }}>
              <ul style={{ margin: 0, paddingLeft: '16px', listStyleType: 'disc' }}>
                {step.details.map((d, i) => (
                  <li key={i} style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.7', marginBottom: '4px' }}>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
