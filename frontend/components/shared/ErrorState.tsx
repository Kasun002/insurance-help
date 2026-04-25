import { AlertTriangle } from 'lucide-react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export default function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="mb-3 text-amber-400">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <p className="text-slate-700 font-medium mb-1">Oops</p>
      <p className="text-sm text-slate-500 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  )
}
