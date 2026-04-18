import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Expenses from './screens/Expenses'
import Invoices from './screens/Invoices'
import AVAgent from './screens/AVAgent'
import FileDistribution from './screens/FileDistribution'
import ContentStudio from './screens/ContentStudio'
import Settings from './screens/Settings'
import { colors } from './theme'

export default function App() {
  return (
    <HashRouter>
      <div style={{ display: 'flex', height: '100vh', backgroundColor: colors.bg, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/expenses" replace />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/av-agent" element={<AVAgent />} />
            <Route path="/file-distribution" element={<FileDistribution />} />
            <Route path="/content/:account" element={<ContentStudio />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
