import { useParams } from 'react-router-dom'
import ScreenShell from '../components/ScreenShell'

const accountLabels = {
  'folded-steel':            { title: 'Folded Steel',           subtitle: 'Viral knife content strategy' },
  'cook-travel-dad':         { title: 'Cook Travel Dad',        subtitle: 'Cooking & dad content strategy' },
  'from-points-to-travel':   { title: 'From Points to Travel',  subtitle: 'Luxury travel content strategy' },
  'furniture-flip':          { title: 'Furniture Flip',         subtitle: 'DIY furniture flip content strategy' },
  'propagate-iq':            { title: 'Propagate IQ',           subtitle: 'App growth content strategy' },
  'reconnect-deck':          { title: 'Reconnect Deck',         subtitle: 'Launch anticipation content strategy' },
}

export default function ContentStudio() {
  const { account } = useParams()
  const meta = accountLabels[account] || { title: 'Content Studio', subtitle: '' }

  return (
    <ScreenShell title={meta.title} subtitle={meta.subtitle}>
      <p style={{ color: '#636366', fontSize: '13px' }}>Content Studio coming in Plan 6.</p>
    </ScreenShell>
  )
}
