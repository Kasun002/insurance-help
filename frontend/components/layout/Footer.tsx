export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} InsureHelp &mdash; Content adapted from publicly accessible
        Great Eastern self-service guides for demonstration purposes only. Not affiliated with Great
        Eastern.
      </div>
    </footer>
  )
}
