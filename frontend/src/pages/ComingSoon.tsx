import { Construction } from 'lucide-react'

export default function ComingSoon({ titolo }: { titolo: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <Construction size={40} className="text-slate-300 mb-3" />
      <p className="text-slate-500 font-medium">{titolo}</p>
      <p className="text-slate-400 text-sm mt-1">In costruzione</p>
    </div>
  )
}
