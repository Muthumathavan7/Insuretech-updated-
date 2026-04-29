import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import {
  TrendingUp, Users, Shield, Hammer, ArrowRight, Sparkles,
  PhoneCall, PhoneOutgoing, PhoneIncoming, MessageSquare, Inbox,
} from "lucide-react";

function StatTile({ label, value, icon: Icon, tone = "gold", testId }) {
  const tones = {
    gold:    { bg: "rgba(222,178,94,0.12)",  fg: "#a07a2c", glow: "rgba(222,178,94,0.45)" },
    green:   { bg: "rgba(56,148,86,0.10)",   fg: "#2e7d4e", glow: "rgba(56,148,86,0.35)"  },
    coral:   { bg: "rgba(202,82,46,0.10)",   fg: "#bf4f23", glow: "rgba(202,82,46,0.35)"  },
    indigo:  { bg: "rgba(70,82,180,0.10)",   fg: "#3a45a5", glow: "rgba(70,82,180,0.35)"  },
  };
  const t = tones[tone] || tones.gold;
  return (
    <div
      data-testid={testId || `stat-${label.toLowerCase().replace(/\s/g,"-")}`}
      className="lux-card p-6 relative overflow-hidden"
    >
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full"
        style={{ background: t.glow, filter: "blur(50px)", opacity: 0.6 }}
      />
      <div className="flex items-start justify-between relative">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.5)] font-semibold">
            {label}
          </div>
          <div className="lux-stat-num mt-3">{value}</div>
        </div>
        <div className="lux-icon-stat" style={{ background: t.bg, color: t.fg }}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const { format } = useCurrency();

  useEffect(() => {
    api.get("/analytics/overview").then((r) => setData(r.data));
  }, []);

  if (!data) return <div className="p-10 text-[rgba(15,15,15,0.6)]">Loading…</div>;
  const { kpis } = data;

  return (
    <div className="max-w-7xl" data-testid="admin-dashboard">
      {/* Welcome panel */}
      <div className="lux-card p-7 mb-8">
        <div className="lux-eyebrow mb-3">Overview</div>
        <h1 className="lux-h1">Dashboard</h1>
        <p className="text-sm text-[rgba(15,15,15,0.55)] mt-2">
          Intelligent insurance operations at a glance.
        </p>
      </div>

      {/* Top KPIs (call-intelligence style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatTile label="Total Revenue"      value={format(kpis.revenue || 0, { decimals: 0 })} icon={TrendingUp}     tone="gold"   />
        <StatTile label="Customers"          value={kpis.total_customers ?? 0}                  icon={Users}          tone="indigo" />
        <StatTile label="Active Policies"    value={kpis.active_policies ?? 0}                  icon={Shield}         tone="green"  />
        <StatTile label="Claims"             value={`${kpis.total_claims ?? 0}`}                icon={Hammer}         tone="coral"  />
      </div>

      {/* Recent activity */}
      <div className="lux-card overflow-hidden mb-8">
        <div className="px-6 py-5 flex items-center justify-between border-b border-[rgba(15,15,15,0.06)]">
          <div>
            <div className="font-lux text-[24px] text-[#0c0b09] leading-none">Recent Activity</div>
            <div className="lux-eyebrow mt-2 text-[10px]">Latest engagements</div>
          </div>
          <Link to="/admin/leads" className="text-xs text-[#a07a2c] font-semibold tracking-wider uppercase hover:underline">
            View all →
          </Link>
        </div>
        <div className="lux-table-head grid grid-cols-12 px-6 py-3">
          <div className="col-span-3">Manager</div>
          <div className="col-span-3">Phone</div>
          <div className="col-span-3">Date</div>
          <div className="col-span-3 text-right">Status</div>
        </div>
        <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
          <Inbox className="w-10 h-10 text-[rgba(222,178,94,0.6)] mb-3" strokeWidth={1.4} />
          <p className="text-sm text-[rgba(15,15,15,0.55)] max-w-md">
            No recent calls yet. Your intelligent agents will populate this space once active.
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-2 gap-6 mb-2">
        <Link
          to="/admin/leads"
          data-testid="quick-leads-link"
          className="lux-card p-7 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#a07a2c]" />
            <div className="lux-eyebrow text-[10px]">Leads pipeline</div>
          </div>
          <h3 className="font-lux text-[28px] text-[#0c0b09] leading-tight mb-1">Move deals forward.</h3>
          <p className="text-sm text-[rgba(15,15,15,0.55)] mb-4">
            Review prospects in each stage. AI scoring ranks the hottest ones.
          </p>
          <div className="text-xs font-semibold tracking-[0.18em] uppercase text-[#a07a2c] flex items-center gap-1">
            Open kanban <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          to="/admin/claims"
          data-testid="quick-claims-link"
          className="lux-card p-7 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-2 mb-3">
            <Hammer className="w-4 h-4 text-[#a07a2c]" />
            <div className="lux-eyebrow text-[10px]">Claims queue</div>
          </div>
          <h3 className="font-lux text-[28px] text-[#0c0b09] leading-tight mb-1">Approve · Investigate.</h3>
          <p className="text-sm text-[rgba(15,15,15,0.55)] mb-4">
            {kpis.approval_rate}% approval rate. Fraud scoring flags risky claims automatically.
          </p>
          <div className="text-xs font-semibold tracking-[0.18em] uppercase text-[#a07a2c] flex items-center gap-1">
            Open queue <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
