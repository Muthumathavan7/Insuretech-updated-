import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { Hammer, Clock, CheckCircle2, XCircle, Search } from "lucide-react";

const STAGES = [
  { key: "submitted", label: "Submitted", icon: Clock },
  { key: "under_review", label: "Under review", icon: Search },
  { key: "investigating", label: "Investigating", icon: Search },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "rejected", label: "Rejected", icon: XCircle },
  { key: "paid", label: "Paid", icon: CheckCircle2 },
];

const BADGE = {
  submitted: "bg-blue-50 text-blue-700",
  under_review: "bg-yellow-50 text-yellow-700",
  investigating: "bg-orange-50 text-orange-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
  paid: "bg-primary-50 text-primary-800",
};

function Tracker({ status }) {
  const order = ["submitted", "under_review", "approved", "paid"];
  const idx = order.indexOf(status);
  return (
    <div className="flex items-center gap-1 mt-3">
      {order.map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              i <= idx ? "bg-primary" : "bg-gray-200"
            }`}
          />
          {i < order.length - 1 && (
            <div className={`flex-1 h-0.5 ${i < idx ? "bg-primary" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Claims() {
  const [claims, setClaims] = useState([]);
  const { format } = useCurrency();
  useEffect(() => {
    api.get("/claims").then((r) => setClaims(r.data));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="claims-page">
      <div className="mb-8">
        <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">Your claims</div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mt-1">
          Claims tracker
        </h1>
      </div>

      {claims.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200">
          <Hammer className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <div className="font-semibold text-lg mb-1">No claims filed yet</div>
          <div className="text-gray-500">Hopefully you never need this — but we're here if you do.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((c) => (
            <div
              key={c.id}
              data-testid={`claim-row-${c.claim_number}`}
              className="bg-white rounded-2xl p-5 border border-gray-100"
            >
              <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
                <div>
                  <div className="text-xs text-gray-500 font-mono">{c.claim_number}</div>
                  <div className="font-semibold text-lg">
                    {c.incident_type} · {format(c.amount_claimed)}
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${
                    BADGE[c.status] || "bg-gray-100"
                  }`}
                >
                  {c.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{c.description}</p>
              <Tracker status={c.status} />
              {c.auto_approved && (
                <div className="mt-3 text-xs bg-green-50 text-green-700 inline-block px-2 py-1 rounded-full font-medium">
                  ✨ Auto-approved by AI
                </div>
              )}
              {c.status === "approved" && c.amount_approved > 0 && (
                <div className="mt-2 text-sm text-gray-700">
                  Approved amount: <span className="font-semibold">{format(c.amount_approved)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
