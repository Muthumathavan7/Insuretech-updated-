import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BADGE = {
  submitted: "bg-blue-50 text-blue-700",
  under_review: "bg-yellow-50 text-yellow-700",
  investigating: "bg-orange-50 text-orange-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
  paid: "bg-primary-50 text-primary-800",
};

export default function ClaimsQueue() {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState("all");
  const { format } = useCurrency();

  const load = async () => {
    const r = await api.get("/claims/admin/queue");
    setClaims(r.data);
  };
  useEffect(() => {
    load();
  }, []);

  const act = async (id, action) => {
    const notes = action === "reject" ? window.prompt("Rejection reason?") || "Rejected by reviewer" : "Reviewed";
    await api.post(`/claims/${id}/action`, { action, notes });
    toast.success(`Claim ${action}d`);
    load();
  };

  const filtered = filter === "all" ? claims : claims.filter((c) => c.status === filter);

  return (
    <div data-testid="claims-queue">
      <div className="mb-6 sm:mb-8">
        <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">Queue</div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-1">Claims Queue</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {["all", "submitted", "under_review", "investigating", "approved", "rejected"].map((s) => (
          <button
            key={s}
            data-testid={`claim-filter-${s}`}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === s
                ? "bg-primary text-white"
                : "bg-white border border-gray-200 text-gray-700 hover:border-primary"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr className="text-left">
                <th className="p-4 whitespace-nowrap">Claim #</th>
                <th className="p-4 whitespace-nowrap">Type</th>
                <th className="p-4 whitespace-nowrap">Amount</th>
                <th className="p-4 whitespace-nowrap">Fraud score</th>
                <th className="p-4 whitespace-nowrap">Status</th>
                <th className="p-4 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} data-testid={`admin-claim-${c.claim_number}`} className="border-t border-gray-100">
                  <td className="p-4 font-mono text-xs whitespace-nowrap">{c.claim_number}</td>
                  <td className="p-4 whitespace-nowrap">{c.incident_type}</td>
                  <td className="p-4 font-medium whitespace-nowrap">{format(c.amount_claimed)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${c.fraud_score * 100}%`,
                            background: c.fraud_score > 0.6 ? "#EF4444" : c.fraud_score > 0.3 ? "#F59E0B" : "#10B981",
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium">{Math.round(c.fraud_score * 100)}%</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize whitespace-nowrap ${BADGE[c.status]}`}>
                      {c.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => act(c.id, "approve")}
                        data-testid={`approve-${c.claim_number}`}
                        className="rounded-full bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs"
                        disabled={["approved", "paid"].includes(c.status)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(c.id, "investigate")}
                        data-testid={`investigate-${c.claim_number}`}
                        className="rounded-full h-8 px-3 text-xs"
                        disabled={["approved", "rejected", "paid"].includes(c.status)}
                      >
                        Investigate
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => act(c.id, "reject")}
                        data-testid={`reject-${c.claim_number}`}
                        className="rounded-full bg-red-500 hover:bg-red-600 text-white h-8 px-3 text-xs"
                        disabled={["approved", "rejected", "paid"].includes(c.status)}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-10">No claims</div>
        )}
      </div>
    </div>
  );
}
