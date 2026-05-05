import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import {
  TrendingUp,
  Users,
  Shield,
  Hammer,
  Inbox,
} from "lucide-react";

/* ================= KPI CARD ================= */
function StatTile({ label, value, icon: Icon }) {
  return (
    <div className="bg-white rounded-2xl px-6 py-5 flex items-center justify-between shadow-sm border border-[#eceae6]">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold">
          {label}
        </div>
        <div className="text-3xl font-semibold mt-2 text-gray-900">
          {value}
        </div>
      </div>

      <div className="w-12 h-12 rounded-xl bg-[#f5f5f3] flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
    </div>
  );
}

/* ================= MAIN PAGE ================= */
export default function AdminDashboard() {
  const [data, setData] = useState(null);

  // ✅ FIX HERE
  const currency = useCurrency?.() || {};
  const format = currency.format || ((v) => `RM ${Number(v).toLocaleString()}`);

  useEffect(() => {
    api.get("/analytics/overview")
      .then((r) => setData(r.data))
      .catch(() => {});
  }, []);

  if (!data) return <div className="p-10">Loading...</div>;

  const { kpis } = data;

  return (
    <div className="min-h-screen px-6 md:px-8 py-8">

      {/* HEADER */}
      <div className="bg-white rounded-2xl px-6 md:px-10 py-6 md:py-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center border border-[#eceae6] shadow-sm gap-4">

        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gray-400 mb-2">
            OVERVIEW
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Intelligent call management at a glance.
          </p>
        </div>

      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">

        <StatTile
          label="Total Revenue"
          value={format(kpis.revenue || 0)}
          icon={TrendingUp}
        />

        <StatTile
          label="Customers"
          value={kpis.total_customers ?? 0}
          icon={Users}
        />

        <StatTile
          label="Active Policies"
          value={kpis.active_policies ?? 0}
          icon={Shield}
        />

        <StatTile
          label="Claims"
          value={kpis.total_claims ?? 0}
          icon={Hammer}
        />

      </div>

      {/* ACTIVITY */}
      <div className="bg-white rounded-2xl border border-[#eceae6] mb-10 overflow-hidden shadow-sm">

        <div className="px-6 md:px-8 py-6 flex justify-between items-center border-b border-[#eceae6]">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">
              Recent Call Activity
            </h2>
            <p className="text-xs text-gray-400 uppercase tracking-[0.2em]">
              Latest outbound engagements
            </p>
          </div>

          <Link to="/admin/leads" className="text-sm text-gray-600">
            View all →
          </Link>
        </div>

        <div className="hidden md:grid grid-cols-4 px-8 py-3 bg-[#f9f8f6] text-xs uppercase text-gray-400">
          <div>Manager</div>
          <div>Phone</div>
          <div>Date</div>
          <div className="text-right">Feedback</div>
        </div>

        <div className="px-6 md:px-8 py-12 flex flex-col items-center text-center">
          <Inbox className="w-10 h-10 text-yellow-400 mb-3" />
          <p className="text-gray-500 max-w-md text-sm">
            No recent calls yet. Your intelligent agents will populate this space once active.
          </p>
        </div>

      </div>

      {/* FOOTER */}
      <div className="bg-white border border-[#eceae6] rounded-xl px-6 py-4 flex flex-col md:flex-row justify-between gap-2 text-sm text-gray-500">
        <span>© 2026 Afinity AI · Crafted for enterprise excellence</span>
        <span className="tracking-widest text-gray-400">
          LUXURY · CORPORATE · INTELLIGENT
        </span>
      </div>

    </div>
  );
}