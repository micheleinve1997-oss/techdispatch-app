import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Home } from 'lucide-react'
import { clientiApi } from '../api/clienti'
import { tecniciApi } from '../api/tecnici'

function CrumbLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-slate-600 hover:text-blue-600 transition-colors">
      {children}
    </Link>
  )
}

export default function BreadcrumbBar() {
  const location = useLocation()

  const clienteMatch = location.pathname.match(/^\/clienti\/([^/]+)/)
  const clienteId = clienteMatch?.[1]
  const isClienteDetail = Boolean(clienteId && clienteId !== 'nuovo')

  const tecnicoMatch = location.pathname.match(/^\/tecnici\/([^/]+)/)
  const tecnicoId = tecnicoMatch?.[1]
  const isTecnicoDetail = Boolean(tecnicoId && tecnicoId !== 'nuovo' && /^[0-9a-f]{24}$/i.test(tecnicoId))

  const { data: cliente } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => clientiApi.get(clienteId!),
    enabled: isClienteDetail,
  })

  const { data: tecnico } = useQuery({
    queryKey: ['tecnico', tecnicoId],
    queryFn: () => tecniciApi.get(tecnicoId!),
    enabled: isTecnicoDetail,
  })

  let section = 'Clienti'
  let sectionTo = '/clienti'
  let detail: string | null = null

  if (location.pathname.startsWith('/tecnici')) {
    section = 'Tecnici'
    sectionTo = '/tecnici'
    if (location.pathname === '/tecnici/nuovo') detail = 'Nuovo tecnico'
    else if (isTecnicoDetail) detail = tecnico ? `${tecnico.cognome} ${tecnico.nome}` : 'Tecnico'
  } else if (location.pathname.startsWith('/pianificatore')) {
    section = 'Pianificatore'; sectionTo = '/pianificatore'
  } else if (location.pathname.startsWith('/ticket')) {
    section = 'Ticket'; sectionTo = '/ticket'
  } else if (location.pathname.startsWith('/interventi')) {
    section = 'Interventi'; sectionTo = '/interventi'
    if (location.pathname === '/interventi-import') detail = 'Importazione'
  } else if (location.pathname.startsWith('/impostazioni')) {
    section = 'Impostazioni'; sectionTo = '/impostazioni'
  } else {
    // clienti
    if (location.pathname === '/clienti-import') detail = 'Importazione'
    else if (location.pathname === '/clienti/nuovo') detail = 'Nuovo cliente'
    else if (isClienteDetail) detail = cliente?.ragione_sociale ?? 'Cliente'
  }

  return (
    <div className="w-full h-9 shrink-0 border-b border-slate-200 bg-white px-4 flex items-center gap-2 text-xs font-medium">
      <CrumbLink to="/clienti">
        <span className="inline-flex items-center gap-1.5">
          <Home size={13} /> TechDispatch
        </span>
      </CrumbLink>
      <ChevronRight size={13} className="text-slate-300" />
      <CrumbLink to={sectionTo}>{section}</CrumbLink>
      {detail && (
        <>
          <ChevronRight size={13} className="text-slate-300" />
          <span className="text-slate-900 truncate max-w-[520px]" title={detail}>{detail}</span>
        </>
      )}
    </div>
  )
}
