import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <h2 className="text-xl font-semibold text-slate-800">Page not found</h2>
      <p className="text-slate-500 text-sm">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700 transition-colors"
      >
        Go home
      </Link>
    </div>
  )
}
