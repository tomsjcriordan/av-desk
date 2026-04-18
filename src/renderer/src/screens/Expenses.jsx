import { useState, useEffect, useCallback } from 'react'
import ScreenShell from '../components/ScreenShell'
import ExpenseList from './expenses/ExpenseList'
import ExpenseForm from './expenses/ExpenseForm'
import { buildExpenseReport } from './expenses/exportPdf'
import { colors } from '../theme'

// view: 'list' | 'add' | 'edit'

export default function Expenses() {
  const [view, setView] = useState('list')
  const [expenses, setExpenses] = useState([])
  const [clients, setClients] = useState([])
  const [editTarget, setEditTarget] = useState(null)
  const [defaultRates, setDefaultRates] = useState({})

  const load = useCallback(async () => {
    const [exps, cls, settings] = await Promise.all([
      window.electronAPI.expenses.list(),
      window.electronAPI.clients.list(),
      window.electronAPI.settings.getAll(),
    ])
    setExpenses(exps)
    setClients(cls)
    setDefaultRates({
      show_day: Number(settings?.showDayRate) || 0,
      travel_day: Number(settings?.travelDayRate) || 0,
      hourly: Number(settings?.hourlyRate) || 0,
    })
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async (data) => {
    await window.electronAPI.expenses.add(data)
    await load()
    setView('list')
  }

  const handleEdit = (expense) => {
    setEditTarget(expense)
    setView('edit')
  }

  const handleUpdate = async (data) => {
    await window.electronAPI.expenses.update(editTarget.id, data)
    await load()
    setEditTarget(null)
    setView('list')
  }

  const handleDelete = async (id) => {
    await window.electronAPI.expenses.delete(id)
    await load()
  }

  const handleExportPdf = async () => {
    const settings = await window.electronAPI.settings.getAll()
    const doc = buildExpenseReport({
      expenses,
      businessName: settings?.businessName || '',
      yourName: settings?.yourName || '',
    })
    doc.save('expense-report.pdf')
  }

  const headerRight = view === 'list' && (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Btn onClick={() => setView('add')}>Add Expense</Btn>
      {expenses.length > 0 && <Btn onClick={handleExportPdf} secondary>Export PDF</Btn>}
    </div>
  )

  const titles = { list: 'Expenses', add: 'Add Expense', edit: 'Edit Expense' }

  return (
    <ScreenShell
      title={titles[view]}
      subtitle={view === 'list' ? 'Track your AV gig expenses' : undefined}
      headerRight={headerRight}
    >
      {view === 'list' && (
        <ExpenseList expenses={expenses} onEdit={handleEdit} onDelete={handleDelete} />
      )}
      {view === 'add' && (
        <ExpenseForm
          onSave={handleAdd}
          onCancel={() => setView('list')}
          clients={clients}
          defaultRates={defaultRates}
        />
      )}
      {view === 'edit' && (
        <ExpenseForm
          expense={editTarget}
          onSave={handleUpdate}
          onCancel={() => { setEditTarget(null); setView('list') }}
          clients={clients}
          defaultRates={defaultRates}
        />
      )}
    </ScreenShell>
  )
}

function Btn({ children, onClick, secondary }) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: secondary ? 'transparent' : colors.card,
        color: secondary ? colors.textSecondary : colors.text,
        border: `1px solid ${colors.border}`,
        borderRadius: '7px',
        padding: '7px 16px',
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
