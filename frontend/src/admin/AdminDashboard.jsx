import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { TrendingUp, Users, Shield, Hammer, ArrowRight, Sparkles } from "lucide-react";

function KPI({ label, value, icon: Icon, tone = "primary" }) {
  const tones = {
    primary: "bg-primary-50 text-primary-700",
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div
      data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}
      className="bg-white rounded-2xl p-5 border border-gray-100"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{label}</div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="font-display text-3xl font-semibold mt-3">{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/analytics/overview").then((r) => setData(r.data));
  }, []);

  if (!data) return <div className="p-10">Loading…</div>;
  const { kpis } = data;

  return (
    <div className="p-8 max-w-7xl" data-testid="admin-dashboard">
      <div className="mb-8">
        <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">CRM Console</div>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Welcome back.</h1>
        <p className="text-gray-500 mt-1">Everything you need to run the business.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPI label="Revenue" value={`$${kpis.revenue.toLocaleString()}`} icon={TrendingUp} tone="primary" />
        <KPI label="Customers" value={kpis.total_customers} icon={Users} tone="blue" />
        <KPI label="Active policies" value={kpis.active_policies} icon={Shield} tone="green" />
        <KPI label="Claims" value={`${kpis.total_claims} (${kpis.claim_ratio}%)`} icon={Hammer} tone="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link
          to="/admin/leads"
          data-testid="quick-leads-link"
          className="bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-3xl p-6 hover:shadow-float transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-5 h-5 text-primary-700" />
            <div className="text-xs font-bold uppercase tracking-widest text-primary-800">
              Leads pipeline
            </div>
          </div>
          <h3 className="font-display text-2xl font-semibold mb-1">Move deals forward</h3>
          <p className="text-sm text-gray-500 mb-4">
            Review prospects in each stage. AI scoring ranks the hottest ones.
          </p>
          <div className="text-sm font-medium text-primary-700 flex items-center gap-1">
            Open Kanban <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          to="/admin/claims"
          data-testid="quick-claims-link"
          className="bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-float transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <Hammer className="w-5 h-5 text-primary-700" />
            <div className="text-xs font-bold uppercase tracking-widest text-gray-600">
              Claims queue
            </div>
          </div>
          <h3 className="font-display text-2xl font-semibold mb-1">Approve · Investigate</h3>
          <p className="text-sm text-gray-500 mb-4">
            {kpis.approval_rate}% approval rate. Fraud scoring flags risky claims automatically.
          </p>
          <div className="text-sm font-medium text-primary-700 flex items-center gap-1">
            Open queue <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
