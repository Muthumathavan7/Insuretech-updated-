import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import PolicyCard from "@/components/app/PolicyCard";
import {
  Shield,
  FileText,
  Hammer,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ICONS = { travel: "🧳", health: "❤️", motor: "🚗", device: "💻" };

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl p-6 border h-[140px] flex flex-col justify-between">
      <div className="text-xs uppercase tracking-widest text-gray-400">
        {label}
      </div>

      <div className="text-4xl font-semibold leading-none">{value}</div>

      {sub && <div className="text-xs text-gray-400 uppercase">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { format } = useCurrency();

  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [recs, setRecs] = useState([]);
  const [interactions, setInteractions] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/policies").then((r) => setPolicies(r.data)),
      api.get("/claims").then((r) => setClaims(r.data)),
      api.get("/ai/recommendations").then((r) => setRecs(r.data)).catch(() => {}),
      user &&
        api
          .get(`/crm/interactions/${user.id}`)
          .then((r) => setInteractions(r.data))
          .catch(() => {}),
    ]);
  }, [user]);

  const active = policies.filter((p) => p.status === "active");

  return (
    <div data-testid="dashboard-page" className="lux-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lux-fade">

        {/* HEADER */}
        <div className="lux-card p-8 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="lux-eyebrow mb-3">My Cabin</div>
            <h1 className="lux-h1">
              Welcome, {user?.full_name?.split(" ")[0] || "there"}.
            </h1>
            <p className="text-sm text-[rgba(15,15,15,0.55)] mt-2">
              Here's a snapshot of your coverage.
            </p>
          </div>

          <div className="lux-signed-in shrink-0">
            <div className="lux-signed-in__avatar">
              {(user?.full_name?.[0] || "U").toUpperCase()}
            </div>
            <div className="min-w-0 pr-2">
              <div className="text-[10px] uppercase text-gray-500 font-semibold">
                Member
              </div>
              <div className="font-lux text-[20px] truncate">
                {user?.full_name}
              </div>
              <div className="text-[10px] uppercase text-yellow-700 font-semibold">
                Afinity Premium
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link to="/policies">
            <StatCard label="Active Policies" value={active.length} sub="Policies Count" />
          </Link>

          <Link to="/claims">
            <StatCard
              label="Open Claims"
              value={claims.filter((c) => !["approved", "rejected", "paid"].includes(c.status)).length}
              sub="Claims Count"
            />
          </Link>

          <StatCard
            label="Risk Score"
            value={`${Math.round((user?.risk_score || 0.5) * 100)}%`}
            sub="Lower is better"
          />

          <StatCard
            label="Lifetime Value"
            value={format(Math.round(user?.ltv || 0), { decimals: 0 })}
          />
        </div>

        {/* RECOMMENDATIONS */}
        {recs.length > 0 && (
          <div className="mb-8 bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-primary-800">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">
                AI recommendations for you
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {recs.slice(0, 2).map((r) => (
                <Link
                  key={r.product.id}
                  to="/products"
                  className="flex items-center gap-4 bg-white p-4 rounded-2xl border hover:border-primary/30"
                >
                  <div className="text-4xl">{ICONS[r.product.category]}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{r.product.name}</div>
                    <div className="text-xs text-gray-500">{r.reason}</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary-600" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* POLICIES + ACTIVITY */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* POLICIES */}
          <div className="md:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">My Policies</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {active.slice(0, 4).map((p) => (
                <Link key={p.id} to="/policies">
                  <PolicyCard policy={p} />
                </Link>
              ))}
            </div>
          </div>

          {/* ✅ ACTIVITY WITH DYNAMIC CURRENCY */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Recent activity</h2>

            <div className="bg-white rounded-2xl p-5 border">
              {interactions.length === 0 ? (
                <div className="text-center text-gray-400 py-6">
                  No activity yet
                </div>
              ) : (
                <ul className="space-y-4">
                  {interactions.slice(0, 8).map((i) => (
                    <li key={i.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                        {i.kind === "call" ? (
                          <Hammer className="w-4 h-4 text-primary-700" />
                        ) : i.kind === "action" ? (
                          <TrendingUp className="w-4 h-4 text-primary-700" />
                        ) : (
                          <FileText className="w-4 h-4 text-primary-700" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="text-sm font-medium">{i.title}</div>

                        {/* 🔥 FIXED CURRENCY */}
                        {i.body && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {i.body.replace(
                              /([$€£₹]|USD|INR|RM)?\s?(\d+(\.\d+)?)/g,
                              (_, __, num) => {
                                const value = parseFloat(num);
                                if (isNaN(value)) return num;
                                return format(value, { decimals: 2 });
                              }
                            )}
                          </div>
                        )}

                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(i.created_at).toLocaleString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}