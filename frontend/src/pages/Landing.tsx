import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ClipboardList, Route, ShieldCheck, Users, Wrench, Zap } from 'lucide-react'

const modules = [
  { icon: Users, title: 'Anagrafiche clienti', text: 'Importazione Excel, deduplica, stato dati e sedi operative sempre disponibili.' },
  { icon: Wrench, title: 'Tecnici e disponibilita', text: 'Competenze, ferie, blocchi e zone di partenza alimentano direttamente il planner.' },
  { icon: ClipboardList, title: 'Interventi', text: 'Ticket, manutenzioni e richieste manuali confluiscono in una coda unica.' },
  { icon: Route, title: 'Pianificazione intelligente', text: 'Proposta automatica con tempi lavoro, viaggio stimato, vincoli e ritocchi drag and drop.' },
]

const metrics = [
  ['6', 'moduli operativi'],
  ['Excel', 'import guidato'],
  ['Drag', 'pianificazione manuale'],
  ['Mongo', 'dati persistenti'],
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/15 bg-slate-950/45 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500"><Zap size={18} /></span>
            <span className="text-base font-semibold">TechDispatch</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-white/80 md:flex">
            <a href="#piattaforma" className="hover:text-white">Piattaforma</a>
            <a href="#planner" className="hover:text-white">Planner</a>
            <a href="#roadmap" className="hover:text-white">Roadmap</a>
          </nav>
          <Link to="/clienti" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-blue-50">
            Apri app <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <section className="relative min-h-[92vh] overflow-hidden bg-slate-950">
        <img
          src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=2200&q=80"
          alt="Team operativo che coordina interventi tecnici"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-slate-950/45" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl items-center px-5 pb-20 pt-28 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm font-medium text-white/85 backdrop-blur">
              <ShieldCheck size={15} /> Gestionale tecnico per dispatch, clienti e interventi
            </p>
            <h1 className="text-5xl font-semibold leading-tight tracking-normal md:text-7xl">TechDispatch</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85 md:text-xl">
              Una piattaforma operativa per importare clienti e tecnici, creare interventi, stimare spostamenti e costruire una pianificazione modificabile prima che diventi agenda.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/pianificatore" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500">
                Vai al pianificatore <ArrowRight size={16} />
              </Link>
              <Link to="/interventi" className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15">
                Gestisci interventi
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50" id="piattaforma">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-5 py-6 md:grid-cols-4 lg:px-8">
          {metrics.map(([value, label]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-4">
              <p className="text-2xl font-semibold text-slate-950">{value}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase text-blue-600">Sistema integrato</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">Dai dati grezzi alla pianificazione operativa</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">TechDispatch collega anagrafiche, tecnici, vincoli e interventi in un unico flusso. L?algoritmo propone, l?operatore corregge, la squadra lavora su dati coerenti.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {modules.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon size={19} /></div>
              <h3 className="text-base font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-white" id="planner">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-300">Planner</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">Algoritmo leggibile, controllo umano.</h2>
            <p className="mt-4 leading-7 text-slate-300">Il pianificatore valuta disponibilita, vincoli, zone, durata e viaggio stimato. Poi lascia all?operatore la possibilita di spostare ogni intervento con drag and drop.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['Stima viaggio', 'CAP, citta e zona pesano nella scelta del tecnico.'],
              ['Tragitto giornata', 'Sequenza tappe e orari stimati per ogni tecnico.'],
              ['Creazione rapida', 'Nuovo intervento dal planner con assegnazione automatica.'],
              ['Link diretto', 'Ogni numero intervento apre la scheda operativa.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-lg border border-white/10 bg-white/5 p-5">
                <CheckCircle2 className="mb-3 text-blue-300" size={19} />
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8" id="roadmap">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-600">Roadmap</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">I prossimi passi sono gia tracciati.</h2>
          </div>
          <div className="space-y-3">
            {[
              ['Conferma pianificazione', 'Salvataggio definitivo della proposta manuale come agenda ufficiale.'],
              ['Mappe reali', 'Distanze e tempi basati su coordinate e routing.'],
              ['Fasce orarie', 'Mattina, pomeriggio e finestre cliente.'],
              ['Audit modifiche', 'Storico spostamenti, operatore e motivazione.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-lg border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-950">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-5 py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-slate-500 md:flex-row">
          <p>TechDispatch</p>
          <div className="flex gap-4">
            <Link to="/clienti" className="hover:text-slate-900">Clienti</Link>
            <Link to="/tecnici" className="hover:text-slate-900">Tecnici</Link>
            <Link to="/pianificatore" className="hover:text-slate-900">Pianificatore</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
