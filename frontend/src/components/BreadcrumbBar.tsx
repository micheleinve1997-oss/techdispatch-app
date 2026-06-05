import { Link, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Home } from 'lucide-react'
import { clientiApi } from '../api/clienti'

function CrumbLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-slate-600 hover:text-blue-600 transition-colors">
      {children}
    </Link>
  )
}

export default function BreadcrumbBar() {
  const location = useLocation()
  const params = useParams()
  const clienteId = params.id
  const isClienteDetail = location.pathname.startsWith('/clienti/') && clienteId && clienteId !== 'nuovo'

  const { data: cliente } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => clientiApi.get(clienteId!),
    enabled: Boolean(isClienteDetail),
  })

  let section = 'Clienti'
  let detail: string | null = null

  if (location.pathname === '/clienti') {
    section = 'Clienti'
  } else if (location.pathname === '/clienti-import') {
    section = 'Clienti'
    detail = 'Importazione'
  } else if (location.pathname === '/clienti/nuovo') {
    section = 'Clienti'
    detail = 'Nuovo cliente'
  } else if (isClienteDetail) {
    section = 'Clienti'
    detail = cliente?.ragione_sociale ?? 'Cliente'
  } else if (location.pathname.startsWith('/tecnici')) {
    section = 'Tecnici'
  } else if (location.pathname.startsWith('/pianificatore')) {
    section = 'Pianificatore'
  } else if (location.pathname.startsWith('/ticket')) {
    section = 'Ticket'
  } else if (location.pathname.startsWith('/impostazioni')) {
    section = 'Impostazioni'
  }

  return (
    <div className="w-full h-9 shrink-0 border-b border-slate-200 bg-white px-4 flex items-center gap-2 text-xs font-medium">
      <CrumbLink to="/clienti">
        <span className="inline-flex items-center gap-1.5">
          <Home size={13} /> TechDispatch
        </span>
      </CrumbLink>
      <ChevronRight size={13} className="text-slate-300" />
      {section === 'Clienti' ? (
        <CrumbLink to="/clienti">Clienti</CrumbLink>
      ) : (
        <span className="text-slate-700">{section}</span>
      )}
      {detail && (
        <>
          <ChevronRight size={13} className="text-slate-300" />
          <span className="text-slate-900 truncate max-w-[520px]" title={detail}>{detail}</span>
        </>
      )}
    </div>
  )
}

