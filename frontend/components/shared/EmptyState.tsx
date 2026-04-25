import { SearchX } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="mb-4 text-slate-300">
        {icon ?? <SearchX className="h-12 w-12" />}
      </div>
      <h3 className="text-slate-700 font-medium mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 mb-5">{description}</p>}
      {action}
    </div>
  )
}
