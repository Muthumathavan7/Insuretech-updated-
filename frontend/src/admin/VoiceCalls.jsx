import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PhoneCall, PhoneIncoming, PhoneOutgoing, Sparkles } from "lucide-react";

export default function VoiceCalls() {
  const [calls, setCalls] = useState([]);
  useEffect(() => {
    api.get("/voice/calls").then((r) => setCalls(r.data));
  }, []);

  return (
    <div className="p-8" data-testid="voice-calls-page">
      <div className="mb-8">
        <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">Voice AI</div>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Call logs</h1>
        <div className="mt-4 inline-flex items-center gap-2 text-xs bg-amber-50 text-amber-800 px-3 py-1.5 rounded-full font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Twilio integration scaffold — add credentials in backend .env to enable live calls
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-gray-100">
        {calls.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <PhoneCall className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            No calls yet. Visit a customer's 360 page and simulate an outbound call.
          </div>
        ) : (
          <ul className="space-y-3">
            {calls.map((c) => (
              <li
                key={c.id}
                data-testid={`voice-call-${c.id}`}
                className="bg-gray-50 rounded-2xl p-4 flex gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                  {c.direction === "outbound" ? (
                    <PhoneOutgoing className="w-5 h-5 text-primary-700" />
                  ) : (
                    <PhoneIncoming className="w-5 h-5 text-primary-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold capitalize">
                      {c.direction} · {c.purpose.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-500">{c.phone}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                    {c.duration_sec > 0 && (
                      <span className="text-xs bg-primary-50 text-primary-800 px-2 py-0.5 rounded-full">
                        {c.duration_sec}s
                      </span>
                    )}
                  </div>
                  {c.transcript && (
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans mt-2 bg-white rounded-xl p-3 border border-gray-100">
                      {c.transcript}
                    </pre>
                  )}
                  {c.outcome && (
                    <div className="text-xs text-primary-800 mt-2 font-medium">Outcome: {c.outcome}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
