import { NavLink } from 'react-router-dom'
import { Users, Wrench, Calendar, ClipboardList, Settings, Zap, ChevronLeft, ChevronRight, ShieldAlert, FileText } from 'lucide-react'

const nav = [
  { to: '/clienti', icon: Users, label: 'Clienti' },
  { to: '/tecnici', icon: Wrench, label: 'Tecnici' },
  { to: '/interventi', icon: ClipboardList, label: 'Interventi' },
  { to: '/pianificatore', icon: Calendar, label: 'Pianificatore' },
  { to: '/vincoli', icon: ShieldAlert, label: 'Vincoli' },
  { to: '/ticket', icon: FileText, label: 'Ticket' },
  { to: '/impostazioni', icon: Settings, label: 'Impostazioni' },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  return (
    <aside className={`${collapsed ? 'w-14' : 'w-52'} bg-slate-900 text-white flex flex-col h-full shrink-0 transition-all duration-200`}>
      <div className={`px-3 py-4 border-b border-slate-700/60 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center shrink-0"><Zap size={14} className="text-white" /></div>
            <span className="font-semibold text-sm tracking-tight">TechDispatch</span>
          </div>
        )}
        {collapsed && <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center"><Zap size={14} className="text-white" /></div>}
        <button onClick={onToggle} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition" title={collapsed ? 'Espandi menu' : 'Comprimi menu'}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end title={collapsed ? label : undefined}
            className={({ isActive }) => `flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Icon size={17} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {!collapsed && <div className="px-4 py-3 border-t border-slate-700/60"><p className="text-xs text-slate-500">v0.1.0 - beta</p></div>}
    </aside>
  )
}
