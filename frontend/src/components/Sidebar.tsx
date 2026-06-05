import { NavLink } from 'react-router-dom'
import { Users, Wrench, Calendar, FileText, Settings, Zap } from 'lucide-react'

const nav = [
  { to: '/clienti', icon: Users, label: 'Clienti' },
  { to: '/tecnici', icon: Wrench, label: 'Tecnici' },
  { to: '/pianificatore', icon: Calendar, label: 'Pianificatore' },
  { to: '/ticket', icon: FileText, label: 'Ticket' },
  { to: '/impostazioni', icon: Settings, label: 'Impostazioni' },
]

export default function Sidebar() {
  return (
    <aside className="w-60 bg-slate-900 text-white flex flex-col min-h-screen shrink-0">
      <div className="px-6 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-base tracking-tight">TechDispatch</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-slate-700/60">
        <p className="text-xs text-slate-500">v0.1.0 — beta</p>
      </div>
    </aside>
  )
}
