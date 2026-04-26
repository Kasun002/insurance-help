"use client";

import { Sparkles } from "lucide-react";
import { useChatStore } from "@/store/chatStore";

const SUGGESTIONS = [
  "How to change my GIRO?",
  "What documents do I need to submit for a hospitalisation claim?",
  "What documents for travel?",
];

export default function EmptyChat() {
  const sendMessage = useChatStore((s) => s.sendMessage);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
        <Sparkles className="h-6 w-6 text-slate-500" />
      </div>
      <div>
        <p className="font-medium text-slate-800 mb-1">
          How can I help you today?
        </p>
        <p className="text-xs text-slate-500">
          Ask me anything about your insurance — claims, policies, payments and
          more.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full mt-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => sendMessage(s)}
            className="text-sm text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
