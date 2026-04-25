import { FileText, Download } from 'lucide-react'
import type { Attachment } from '@/types/api'

interface ArticleAttachmentsProps {
  attachments: Attachment[]
}

export default function ArticleAttachments({ attachments }: ArticleAttachmentsProps) {
  if (attachments.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-slate-800 mb-3">Downloads</h2>
      <div className="space-y-2">
        {attachments.map((att, i) => (
          <a
            key={i}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 leading-snug">{att.label}</p>
                {att.size_kb && (
                  <p className="text-xs text-slate-400">{att.size_kb} KB</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 ml-3">
              <Download className="h-3.5 w-3.5" />
              Download
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
