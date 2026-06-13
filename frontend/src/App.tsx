import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import BreadcrumbBar from './components/BreadcrumbBar'
import Clienti from './pages/Clienti'
import ClienteForm from './pages/ClienteForm'
import ComingSoon from './pages/ComingSoon'
import Landing from './pages/Landing'
import Tecnici from './pages/Tecnici'
import TecnicoDetail from './pages/TecnicoDetail'
import ImportTecnici from './pages/ImportTecnici'
import Interventi from './pages/Interventi'
import InterventoDetail from './pages/InterventoDetail'
import ImportInterventi from './pages/ImportInterventi'
import Vincoli from './pages/Vincoli'
import Pianificatore from './pages/Pianificatore'
import ImportClienti from './pages/ImportClienti'
import { ToolbarProvider } from './context/ToolbarContext'

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()
  const isLanding = location.pathname === '/'

  if (isLanding) {
    return <Landing />
  }

  return (
    <ToolbarProvider>
      <div className="flex h-screen w-full min-w-0 bg-slate-50">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
        <div className="flex-1 w-full min-w-0 flex flex-col overflow-hidden">
          <BreadcrumbBar />
          <Toolbar />
          <main className="flex-1 w-full min-w-0 overflow-auto">
            <Routes>
              <Route path="/clienti" element={<Clienti />} />
              <Route path="/clienti/nuovo" element={<ClienteForm />} />
              <Route path="/clienti/:id" element={<ClienteForm />} />
              <Route path="/clienti-import" element={<ImportClienti />} />
              <Route path="/tecnici" element={<Tecnici />} />
              <Route path="/tecnici/nuovo" element={<TecnicoDetail />} />
              <Route path="/tecnici/:id" element={<TecnicoDetail />} />
              <Route path="/tecnici-import" element={<ImportTecnici />} />
              <Route path="/interventi" element={<Interventi />} />
              <Route path="/interventi/:id" element={<InterventoDetail />} />
              <Route path="/interventi-import" element={<ImportInterventi />} />
              <Route path="/pianificatore" element={<Pianificatore />} />
              <Route path="/vincoli" element={<Vincoli />} />
              <Route path="/ticket" element={<ComingSoon titolo="Ticket" />} />
              <Route path="/impostazioni" element={<ComingSoon titolo="Impostazioni" />} />
            </Routes>
          </main>
        </div>
      </div>
    </ToolbarProvider>
  )
}
