import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";

const PIE_COLORS = ["#DEB25E", "#9C7937", "#10B981", "#3B82F6", "#EF4444"];

function KPI({ label, value }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{label}</div>
      <div className="font-display text-3xl font-semibold mt-2">{value}</div>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const { format } = useCurrency();
  useEffect(() => {
    api.get("/analytics/overview").then((r) => setData(r.data));
  }, []);

  if (!data) return <div className="p-10">Loading…</div>;
  const { kpis, revenue_series, policy_mix, funnel } = data;
  const funnelArr = Object.entries(funnel).map(([k, v]) => ({ stage: k, count: v }));

  return (
    <div data-testid="analytics-page">
      <div className="mb-6 sm:mb-8">
        <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">Insights</div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-1">Analytics</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI label="Revenue" value={format(kpis.revenue, { decimals: 0 })} />
        <KPI label="Active policies" value={kpis.active_policies} />
        <KPI label="Claim ratio" value={`${kpis.claim_ratio}%`} />
        <KPI label="Approval rate" value={`${kpis.approval_rate}%`} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-3xl p-5 border border-gray-100">
          <h3 className="font-display text-xl font-semibold mb-4">Revenue · last 14 days</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue_series}>
                <defs>
                  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DEB25E" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#DEB25E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#DEB25E" strokeWidth={2} fill="url(#gold)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100">
          <h3 className="font-display text-xl font-semibold mb-4">Policy mix</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={policy_mix}
                  dataKey="count"
                  nameKey="category"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {policy_mix.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="md:col-span-3 bg-white rounded-3xl p-5 border border-gray-100">
          <h3 className="font-display text-xl font-semibold mb-4">Lead funnel</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelArr}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#DEB25E" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
