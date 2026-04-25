import Link from 'next/link'

const POPULAR = [
  'Travel claim',
  'Car accident',
  'Lost luggage',
  'Change payment',
  'CareShield claim',
]

export default function PopularQuestions() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <span className="text-xs text-slate-500 self-center mr-1">Popular:</span>
      {POPULAR.map((q) => (
        <Link
          key={q}
          href={`/search?q=${encodeURIComponent(q)}`}
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors"
        >
          {q}
        </Link>
      ))}
    </div>
  )
}
