import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";

const STAGES = [
  { key: "new", label: "New", color: "bg-gray-100" },
  { key: "qualified", label: "Qualified", color: "bg-blue-50" },
  { key: "contacted", label: "Contacted", color: "bg-yellow-50" },
  { key: "quoted", label: "Quoted", color: "bg-purple-50" },
  { key: "won", label: "Won", color: "bg-green-50" },
  { key: "lost", label: "Lost", color: "bg-red-50" },
];

export default function LeadsKanban() {
  const [pipeline, setPipeline] = useState({});
  const { format } = useCurrency();
  const load = async () => {
    const r = await api.get("/crm/leads/pipeline");
    setPipeline(r.data);
  };
  useEffect(() => {
    load();
  }, []);

  const move = async (userId, stage) => {
    await api.patch(`/crm/customers/${userId}`, { lead_stage: stage });
    toast.success(`Moved → ${stage}`);
    load();
  };

  return (
    <div data-testid="leads-kanban">
      <div className="mb-6 sm:mb-8">
        <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">Pipeline</div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-1">Leads Kanban</h1>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const items = pipeline[s.key] || [];
          return (
            <div key={s.key} className="flex-shrink-0 w-72" data-testid={`kanban-col-${s.key}`}>
              <div className={`${s.color} rounded-2xl p-3`}>
                <div className="flex items-center justify-between px-2 mb-3">
                  <h3 className="font-semibold text-sm">{s.label}</h3>
                  <span className="text-xs font-semibold bg-white px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((u) => (
                    <div
                      key={u.id}
                      data-testid={`lead-card-${u.id}`}
                      className="bg-white rounded-xl p-3 border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <Link
                        to={`/admin/customers/${u.id}`}
                        className="block mb-2 hover:text-primary-700"
                      >
                        <div className="font-medium text-sm">{u.full_name}</div>
                        <div className="text-xs text-gray-500 truncate">{u.email}</div>
                      </Link>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-gray-500">
                          Risk {Math.round((u.risk_score || 0) * 100)}%
                        </span>
                        <span className="font-medium">{format(u.ltv || 0, { decimals: 0 })}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {u.tags?.slice(0, 2).map((t) => (
                          <span key={t} className="text-[10px] bg-primary-50 text-primary-800 px-2 py-0.5 rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>
                      <select
                        className="mt-2 w-full text-xs border border-gray-200 rounded-lg px-2 py-1"
                        value={u.lead_stage}
                        onChange={(e) => move(u.id, e.target.value)}
                      >
                        {STAGES.map((st) => (
                          <option key={st.key} value={st.key}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-8">Empty</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
