import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import BreadcrumbBar from './components/BreadcrumbBar'
import Clienti from './pages/Clienti'
import ClienteForm from './pages/ClienteForm'
import ComingSoon from './pages/ComingSoon'
import ImportClienti from './pages/ImportClienti'
import Tecnici from './pages/Tecnici'
import TecnicoDetail from './pages/TecnicoDetail'
import { ToolbarProvider } from './context/ToolbarContext'

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <ToolbarProvider>
      <div className="flex h-screen w-full min-w-0 bg-slate-50">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
        <div className="flex-1 w-full min-w-0 flex flex-col overflow-hidden">
          <BreadcrumbBar />
          <Toolbar />
          <main className="flex-1 w-full min-w-0 overflow-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/clienti" replace />} />
              <Route path="/clienti" element={<Clienti />} />
              <Route path="/clienti/nuovo" element={<ClienteForm />} />
              <Route path="/clienti/:id" element={<ClienteForm />} />
              <Route path="/clienti-import" element={<ImportClienti />} />
              <Route path="/tecnici" element={<Tecnici />} />
              <Route path="/tecnici/nuovo" element={<TecnicoDetail />} />
              <Route path="/tecnici/:id" element={<TecnicoDetail />} />
              <Route path="/pianificatore" element={<ComingSoon titolo="Pianificatore" />} />
              <Route path="/ticket" element={<ComingSoon titolo="Ticket" />} />
              <Route path="/impostazioni" element={<ComingSoon titolo="Impostazioni" />} />
            </Routes>
          </main>
        </div>
      </div>
    </ToolbarProvider>
  )
}


