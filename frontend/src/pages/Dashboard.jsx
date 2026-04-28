import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { Shield, FileText, Hammer, TrendingUp, ArrowRight, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const ICONS = { travel: "🧳", health: "❤️", motor: "🚗", device: "💻" };

function StatCard({ label, value, sub }) {
  return (
    <div
      data-testid={`dash-stat-${label.toLowerCase().replace(/\s/g, "-")}`}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
    >
      <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{label}</div>
      <div className="font-display text-3xl font-semibold mt-2">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
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
      user && api.get(`/crm/interactions/${user.id}`).then((r) => setInteractions(r.data)).catch(() => {}),
    ]);
  }, [user]);

  const active = policies.filter((p) => p.status === "active");

  return (
    <div data-testid="dashboard-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 animate-fade-in-up">
        <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">Dashboard</div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mt-1">
          Welcome, {user?.full_name?.split(" ")[0]}.
        </h1>
        <p className="text-gray-500 mt-2">Here's a snapshot of your coverage.</p>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active policies" value={active.length} />
        <StatCard label="Open claims" value={claims.filter((c) => !["approved", "rejected", "paid"].includes(c.status)).length} />
        <StatCard label="Risk score" value={`${Math.round((user?.risk_score || 0.5) * 100)}%`} sub="lower is better" />
        <StatCard label="Lifetime value" value={format(Math.round(user?.ltv || 0), { decimals: 0 })} />
      </div>

      {/* recommendations */}
      {recs.length > 0 && (
        <div className="mb-8 bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-primary-800">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">AI recommendations for you</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {recs.slice(0, 2).map((r) => (
              <Link
                key={r.product.id}
                to="/products"
                data-testid={`rec-card-${r.product.category}`}
                className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="text-4xl">{ICONS[r.product.category]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{r.product.name}</div>
                  <div className="text-xs text-gray-500 line-clamp-2">{r.reason}</div>
                </div>
                <ArrowRight className="w-5 h-5 text-primary-600 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* My policies */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-semibold">My Policies</h2>
            <Link
              to="/policies"
              className="text-sm text-primary-700 font-medium hover:underline"
              data-testid="dash-view-all-policies"
            >
              View all
            </Link>
          </div>
          {active.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
              <Shield className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <div className="font-medium mb-1">No active policies yet</div>
              <div className="text-sm text-gray-500 mb-4">Let's find the right protection for you.</div>
              <Link to="/products">
                <Button data-testid="dash-get-started-btn" className="rounded-full bg-primary hover:bg-primary-600 text-white">
                  Explore plans
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {active.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  data-testid={`dash-policy-${p.policy_number}`}
                  className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="text-3xl">{ICONS[p.category]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500">{p.policy_number}</div>
                    <div className="font-semibold truncate">{p.product_name}</div>
                    <div className="text-xs text-gray-500">
                      Coverage {format(p.coverage_amount, { decimals: 0 })} · Premium {format(p.premium)}
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-50 text-green-700">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity timeline */}
        <div>
          <h2 className="font-display text-2xl font-semibold mb-4">Recent activity</h2>
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            {interactions.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-6">No activity yet</div>
            ) : (
              <ul className="space-y-4">
                {interactions.slice(0, 8).map((i) => (
                  <li key={i.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                      {i.kind === "call" ? (
                        <Hammer className="w-4 h-4 text-primary-700" />
                      ) : i.kind === "action" ? (
                        <TrendingUp className="w-4 h-4 text-primary-700" />
                      ) : (
                        <FileText className="w-4 h-4 text-primary-700" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{i.title}</div>
                      {i.body && (
                        <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">{i.body}</div>
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
  );
}
