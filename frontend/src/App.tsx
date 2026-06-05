import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Clienti from './pages/Clienti'
import ClienteForm from './pages/ClienteForm'
import ComingSoon from './pages/ComingSoon'
import ImportClienti from './pages/ImportClienti'

export default function App() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/clienti" replace />} />
          <Route path="/clienti" element={<Clienti />} />
          <Route path="/clienti/nuovo" element={<ClienteForm />} />
          <Route path="/clienti/:id" element={<ClienteForm />} />
          <Route path="/clienti-import" element={<ImportClienti />} />
          <Route path="/tecnici" element={<ComingSoon titolo="Tecnici" />} />
          <Route path="/pianificatore" element={<ComingSoon titolo="Pianificatore" />} />
          <Route path="/ticket" element={<ComingSoon titolo="Ticket" />} />
          <Route path="/impostazioni" element={<ComingSoon titolo="Impostazioni" />} />
        </Routes>
      </main>
    </div>
  )
}
