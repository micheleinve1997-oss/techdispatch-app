import { AlertTriangle, ExternalLink, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  cliente: { id: string; codice_cliente: string; ragione_sociale: string }
  campo: string
  onClose: () => void
}

export default function DuplicatoAlert({ cliente, campo, onClose }: Props) {
  const navigate = useNavigate()

  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mt-2">
      <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800">
          {campo} già presente nel sistema
        </p>
        <p className="text-sm text-amber-700 mt-0.5">
          Cliente esistente:{' '}
          <button
            onClick={() => navigate(`/clienti/${cliente.id}`)}
            className="font-semibold underline hover:text-amber-900 inline-flex items-center gap-1"
          >
            {cliente.ragione_sociale}
            <span className="text-xs font-normal">({cliente.codice_cliente})</span>
            <ExternalLink size={13} />
          </button>
        </p>
      </div>
      <button onClick={onClose} className="text-amber-400 hover:text-amber-600 shrink-0">
        <X size={16} />
      </button>
    </div>
  )
}
