import { useState, useEffect, useCallback } from 'react'
import ScreenShell from '../components/ScreenShell'
import InvoiceList from './invoices/InvoiceList'
import InvoiceForm from './invoices/InvoiceForm'
import { buildInvoicePdf } from './invoices/invoicePdf'
import { colors } from '../theme'

export default function Invoices() {
  const [view, setView] = useState('list')
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [editTarget, setEditTarget] = useState(null)
  const [nextNumber, setNextNumber] = useState('INV-001')
  const [defaultRates, setDefaultRates] = useState({})

  const load = useCallback(async () => {
    const [invs, cls, settings, num] = await Promise.all([
      window.electronAPI.invoices.list(),
      window.electronAPI.clients.list(),
      window.electronAPI.settings.getAll(),
      window.electronAPI.invoices.nextNumber(),
    ])
    setInvoices(invs); setClients(cls); setNextNumber(num)
    setDefaultRates({ show_day: Number(settings?.showDayRate) || 0, travel_day: Number(settings?.travelDayRate) || 0, hourly: Number(settings?.hourlyRate) || 0 })
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async (data) => { await window.electronAPI.invoices.add(data); await load(); setView('list') }
  const handleEdit = (inv) => { setEditTarget(inv); setView('edit') }
  const handleUpdate = async (data) => { await window.electronAPI.invoices.update(editTarget.id, data); await load(); setEditTarget(null); setView('list') }
  const handleDelete = async (id) => { await window.electronAPI.invoices.delete(id); await load() }
  const handleExportPdf = async (invoice) => {
    const settings = await window.electronAPI.settings.getAll()
    buildInvoicePdf({ invoice, businessName: settings?.businessName || '', yourName: settings?.yourName || '' }).save(`${invoice.invoice_number}.pdf`)
  }

  const titles = { list: 'Invoices', add: 'New Invoice', edit: 'Edit Invoice' }
  const headerRight = view === 'list' && (
    <button onClick={() => setView('add')} style={{ backgroundColor: colors.card, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '7px', padding: '7px 16px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>New Invoice</button>
  )

  return (
    <ScreenShell title={titles[view]} subtitle={view === 'list' ? 'Proforma 1099 invoices for freelance AV work' : undefined} headerRight={headerRight}>
      {view === 'list' && <InvoiceList invoices={invoices} onEdit={handleEdit} onDelete={handleDelete} onExportPdf={handleExportPdf} />}
      {view === 'add' && <InvoiceForm invoiceNumber={nextNumber} onSave={handleAdd} onCancel={() => setView('list')} clients={clients} defaultRates={defaultRates} />}
      {view === 'edit' && <InvoiceForm invoice={editTarget} onSave={handleUpdate} onCancel={() => { setEditTarget(null); setView('list') }} clients={clients} defaultRates={defaultRates} />}
    </ScreenShell>
  )
}
