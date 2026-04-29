import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { User, Shield, Hammer, Clock, PhoneCall, TrendingUp, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Customer360() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [leadScore, setLeadScore] = useState(null);
  const { format } = useCurrency();

  const load = async () => {
    const r = await api.get(`/crm/customers/${id}`);
    setData(r.data);
    api.get(`/ai/lead-score/${id}`).then((s) => setLeadScore(s.data)).catch(() => {});
  };

  useEffect(() => {
    load();
  }, [id]);

  const simulateCall = async () => {
    try {
      await api.post("/voice/outbound/simulate", {
        user_id: id,
        phone: data.profile.phone,
        purpose: "lead_conversion",
      });
      toast.success("Outbound call simulated & logged");
      load();
    } catch {
      toast.error("Could not simulate call");
    }
  };

  const updateStage = async (stage) => {
    await api.patch(`/crm/customers/${id}`, { lead_stage: stage });
    toast.success(`Stage → ${stage}`);
    load();
  };

  if (!data) return <div className="p-10">Loading…</div>;
  const { profile, policies, claims, interactions, stats } = data;

  return (
    <div className="p-8" data-testid="customer-360">
      <div className="bg-white rounded-3xl p-6 border border-gray-100 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold">
            {profile.full_name?.[0] || <User className="w-8 h-8" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-3xl font-semibold">{profile.full_name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 capitalize">
                {profile.kyc_status}
              </span>
              {profile.tags?.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-800">
                  {t}
                </span>
              ))}
            </div>
            <div className="text-gray-500 text-sm mt-1">
              {profile.email} · {profile.phone}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <Stat label="Active policies" value={stats.active_policies} />
              <Stat label="Total claims" value={stats.total_claims} />
              <Stat label="LTV" value={format(stats.ltv, { decimals: 0 })} />
              <Stat label="Risk score" value={`${Math.round((profile.risk_score || 0) * 100)}%`} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={simulateCall}
              data-testid="simulate-call-btn"
              className="rounded-full bg-primary hover:bg-primary-600 text-white"
            >
              <PhoneCall className="w-4 h-4 mr-2" /> Simulate call
            </Button>
            <select
              data-testid="lead-stage-select"
              className="border border-gray-200 rounded-full px-4 py-2 text-sm"
              value={profile.lead_stage}
              onChange={(e) => updateStage(e.target.value)}
            >
              {["new", "qualified", "contacted", "quoted", "won", "lost"].map((s) => (
                <option key={s} value={s}>
                  Stage: {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {leadScore && (
        <div className="bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-3xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3 text-primary-800">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">AI Predictions</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScoreBar label="Conversion" value={leadScore.conversion_probability} />
            <ScoreBar label="Renewal likelihood" value={leadScore.renewal_likelihood} />
            <ScoreBar label="Churn risk" value={leadScore.churn_risk} danger />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                Next best action
              </div>
              <div className="font-semibold text-primary-800">{leadScore.next_best_action}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Policies" icon={Shield}>
          {policies.length === 0 ? (
            <Empty msg="No policies" />
          ) : (
            policies.map((p) => (
              <Item
                key={p.id}
                primary={p.product_name}
                meta={`${p.policy_number} · ${format(p.premium)}`}
                right={
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 capitalize">
                    {p.status}
                  </span>
                }
              />
            ))
          )}
        </Section>

        <Section title="Claims" icon={Hammer}>
          {claims.length === 0 ? (
            <Empty msg="No claims" />
          ) : (
            claims.map((c) => (
              <Item
                key={c.id}
                primary={`${c.incident_type} · ${format(c.amount_claimed)}`}
                meta={c.claim_number}
                right={
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 capitalize">
                    {c.status.replace("_", " ")}
                  </span>
                }
              />
            ))
          )}
        </Section>

        <Section title="Timeline" icon={Clock} className="md:col-span-2">
          {interactions.length === 0 ? (
            <Empty msg="No interactions" />
          ) : (
            <ul className="space-y-3">
              {interactions.slice(0, 15).map((i) => (
                <li key={i.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    {i.kind === "call" ? (
                      <PhoneCall className="w-4 h-4 text-primary-700" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-primary-700" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{i.title}</div>
                    {i.body && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{i.body}</div>}
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(i.created_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-display text-xl font-semibold">{value}</div>
    </div>
  );
}

function ScoreBar({ label, value, danger }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 uppercase tracking-wider font-semibold">{label}</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${danger ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children, className = "" }) {
  return (
    <div className={`bg-white rounded-3xl p-5 border border-gray-100 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-primary-700" />
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Item({ primary, meta, right }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
      <div className="min-w-0">
        <div className="font-medium truncate">{primary}</div>
        <div className="text-xs text-gray-500 font-mono truncate">{meta}</div>
      </div>
      {right}
    </div>
  );
}

function Empty({ msg }) {
  return <div className="text-sm text-gray-400 text-center py-4">{msg}</div>;
}
