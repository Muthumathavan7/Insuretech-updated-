import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import {
  Plus, Edit3, Copy, Power, Trash2, Sliders, FlaskConical,
  Layers, ScrollText, ChevronRight, ChevronDown, Save,
} from "lucide-react";
import "./pricing.css";

const PRODUCTS = ["motor", "pa", "travel", "health", "device"];
const TABS = [
  { id: "dashboard", label: "Rules", icon: Layers },
  { id: "editor", label: "Editor", icon: Edit3 },
  { id: "simulator", label: "Simulator", icon: FlaskConical },
  { id: "formula", label: "Formula", icon: Sliders },
  { id: "audit", label: "Audit Logs", icon: ScrollText },
];

const EMPTY_RULE = {
  rule_name: "",
  products: ["motor"],
  priority: 100,
  logic_op: "AND",
  conditions: [{ field: "age", operator: "<", value: 25 }],
  action: { type: "increase_percentage", value: 10 },
  status: "active",
  description: "",
};

export default function PricingRulesEngine() {
  const [tab, setTab] = useState("dashboard");
  const [rules, setRules] = useState([]);
  const [meta, setMeta] = useState(null);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([
        api.get("/rules"),
        api.get("/rules/meta/fields"),
      ]);
      setRules(r.data);
      setMeta(m.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEditor = (rule) => {
    setEditing(rule || { ...EMPTY_RULE });
    setTab("editor");
  };

  const onSaved = async () => {
    setEditing(null);
    setTab("dashboard");
    await load();
  };

  return (
    <div data-testid="pricing-rules-engine">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">
            Engine
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-1">
            Pricing Rules
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure dynamic premium logic without code. Live across Motor, PA, Travel, Health and Device quotes.
          </p>
        </div>
        {tab === "dashboard" && (
          <button
            type="button"
            className="pre-btn-primary"
            data-testid="new-rule-btn"
            onClick={() => openEditor(null)}
          >
            <Plus className="w-4 h-4" /> New rule
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              data-testid={`tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`pre-tab ${tab === t.id ? "pre-tab--active" : ""}`}
            >
              <Icon className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && (
        <RulesDashboard
          rules={rules}
          loading={loading}
          onEdit={openEditor}
          onChanged={load}
        />
      )}
      {tab === "editor" && (
        <RuleEditor
          meta={meta}
          rule={editing}
          onCancel={() => { setEditing(null); setTab("dashboard"); }}
          onSaved={onSaved}
        />
      )}
      {tab === "simulator" && <Simulator meta={meta} rules={rules} />}
      {tab === "formula" && <FormulaConfig />}
      {tab === "audit" && <AuditLogs />}
    </div>
  );
}

// ---------------- Dashboard ----------------

function RulesDashboard({ rules, loading, onEdit, onChanged }) {
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return rules.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (productFilter !== "all" && !(r.products || []).includes(productFilter)) return false;
      return true;
    });
  }, [rules, productFilter, statusFilter]);

  const handleToggle = async (r) => {
    await api.post(`/rules/${r.id}/toggle`);
    toast.success(`Rule ${r.status === "active" ? "deactivated" : "activated"}`);
    await onChanged();
  };
  const handleClone = async (r) => {
    await api.post(`/rules/${r.id}/clone`);
    toast.success("Rule cloned");
    await onChanged();
  };
  const handleDelete = async (r) => {
    if (!window.confirm(`Delete rule "${r.rule_name}"? This cannot be undone.`)) return;
    await api.delete(`/rules/${r.id}`);
    toast.success("Rule deleted");
    await onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Filter</span>
        <select
          className="pre-input pre-select max-w-[160px]"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          data-testid="filter-product"
        >
          <option value="all">All products</option>
          {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          className="pre-input pre-select max-w-[160px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          data-testid="filter-status"
        >
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="pre-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 whitespace-nowrap">Rule</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Products</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Action</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Priority</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-12 text-center text-gray-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-gray-400">No rules found. Create your first one.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t border-gray-100" data-testid={`rule-row-${r.id}`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{r.rule_name}</div>
                    {r.description && <div className="text-xs text-gray-500 mt-0.5">{r.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(r.products || []).map((p) => (
                        <span key={p} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-50 text-primary-800">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-700">
                    {actionLabel(r.action)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.priority}</td>
                  <td className="px-4 py-3">
                    <span className={`pre-badge ${r.status === "active" ? "pre-badge--active" : "pre-badge--inactive"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {r.updated_at ? new Date(r.updated_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button onClick={() => onEdit(r)} title="Edit" data-testid={`edit-rule-${r.id}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleClone(r)} title="Clone" data-testid={`clone-rule-${r.id}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => handleToggle(r)} title="Toggle status" data-testid={`toggle-rule-${r.id}`} className={`p-2 rounded-lg hover:bg-gray-100 ${r.status === "active" ? "text-green-600" : "text-gray-400"}`}><Power className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(r)} title="Delete" data-testid={`delete-rule-${r.id}`} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function actionLabel(a) {
  if (!a) return "-";
  const v = a.value;
  switch (a.type) {
    case "increase_percentage": return `+${v}%`;
    case "decrease_percentage": return `-${v}%`;
    case "flat_fee": return `+ ${v}`;
    case "discount_fee": return `- ${v}`;
    case "override_premium": return `= ${v}`;
    default: return a.type;
  }
}

// ---------------- Editor ----------------

function RuleEditor({ rule, meta, onCancel, onSaved }) {
  const [draft, setDraft] = useState(rule);
  const [saving, setSaving] = useState(false);

  if (!rule) {
    return <div className="pre-card text-center text-gray-400">Select a rule to edit, or click <strong>New rule</strong>.</div>;
  }

  const ops = meta?.operators || [];
  const actions = meta?.actions || [];
  const fieldsByProduct = meta?.fields_by_product || {};
  // Field options derived from selected products union
  const fieldOptions = (() => {
    const out = new Map();
    for (const p of draft.products || []) {
      for (const f of fieldsByProduct[p] || []) {
        if (!out.has(f.name)) out.set(f.name, f);
      }
    }
    return [...out.values()];
  })();

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setCondition = (idx, patch) => {
    setDraft((d) => {
      const next = [...d.conditions];
      next[idx] = { ...next[idx], ...patch };
      return { ...d, conditions: next };
    });
  };

  const save = async () => {
    if (!draft.rule_name?.trim()) return toast.error("Name is required");
    if (!draft.products?.length) return toast.error("Pick at least one product");
    setSaving(true);
    try {
      const payload = {
        ...draft,
        priority: parseInt(draft.priority, 10) || 0,
        action: { ...draft.action, value: parseFloat(draft.action.value) || 0 },
        conditions: (draft.conditions || []).map((c) => ({
          ...c,
          // numeric coerce when value looks numeric
          value: /^-?\d+(\.\d+)?$/.test(String(c.value)) ? parseFloat(c.value) : c.value,
        })),
      };
      if (draft.id) await api.put(`/rules/${draft.id}`, payload);
      else await api.post("/rules", payload);
      toast.success(draft.id ? "Rule updated" : "Rule created");
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* LEFT — Rule details */}
      <div className="lg:col-span-2 space-y-4">
        <div className="pre-card">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4">1 · Rule details</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Name</label>
              <input className="pre-input" value={draft.rule_name} onChange={(e) => set({ rule_name: e.target.value })} placeholder="e.g. Young Driver Surcharge" data-testid="rule-name-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Priority (lower runs first)</label>
                <input type="number" className="pre-input" value={draft.priority} onChange={(e) => set({ priority: e.target.value })} data-testid="rule-priority-input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Status</label>
                <select className="pre-input pre-select" value={draft.status} onChange={(e) => set({ status: e.target.value })} data-testid="rule-status-select">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Products this rule applies to</label>
              <div className="flex flex-wrap gap-1.5">
                {PRODUCTS.map((p) => {
                  const on = (draft.products || []).includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      data-testid={`product-chip-${p}`}
                      onClick={() => set({ products: on ? draft.products.filter((x) => x !== p) : [...(draft.products || []), p] })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${on ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-primary"}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Description (optional)</label>
              <textarea className="pre-input" style={{ height: 70 }} value={draft.description || ""} onChange={(e) => set({ description: e.target.value })} placeholder="Why does this rule exist?" />
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="pre-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">2 · Conditions</h3>
            <select
              className="pre-input pre-select max-w-[120px] h-8 text-xs"
              value={draft.logic_op}
              onChange={(e) => set({ logic_op: e.target.value })}
              data-testid="logic-op-select"
            >
              <option value="AND">Match ALL (AND)</option>
              <option value="OR">Match ANY (OR)</option>
            </select>
          </div>
          <div className="space-y-2">
            {(draft.conditions || []).map((c, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center" data-testid={`condition-row-${idx}`}>
                <select className="pre-input pre-select col-span-4 text-sm" value={c.field} onChange={(e) => setCondition(idx, { field: e.target.value })}>
                  {fieldOptions.length === 0 ? <option value="">No fields — pick a product first</option> : fieldOptions.map((f) => (
                    <option key={f.name} value={f.name}>{f.name}</option>
                  ))}
                </select>
                <select className="pre-input pre-select col-span-3 text-sm" value={c.operator} onChange={(e) => setCondition(idx, { operator: e.target.value })}>
                  {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input className="pre-input col-span-4 text-sm" value={c.value ?? ""} onChange={(e) => setCondition(idx, { value: e.target.value })} placeholder="value" />
                <button type="button" onClick={() => set({ conditions: draft.conditions.filter((_, i) => i !== idx) })} className="col-span-1 text-red-500 hover:bg-red-50 rounded-lg p-2" title="Remove condition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="pre-btn-ghost"
              data-testid="add-condition-btn"
              onClick={() => set({ conditions: [...(draft.conditions || []), { field: fieldOptions[0]?.name || "age", operator: "==", value: "" }] })}
            >
              <Plus className="w-3.5 h-3.5" /> Add condition
            </button>
          </div>
        </div>

        {/* Action */}
        <div className="pre-card">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4">3 · Action</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Action type</label>
              <select className="pre-input pre-select" value={draft.action.type} onChange={(e) => set({ action: { ...draft.action, type: e.target.value } })} data-testid="action-type-select">
                {actions.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Value</label>
              <input
                type="number" step="0.01"
                className="pre-input"
                value={draft.action.value}
                onChange={(e) => set({ action: { ...draft.action, value: e.target.value } })}
                data-testid="action-value-input"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="pre-btn-primary" onClick={save} disabled={saving} data-testid="save-rule-btn">
            <Save className="w-4 h-4" /> {saving ? "Saving…" : draft.id ? "Update rule" : "Create rule"}
          </button>
          <button type="button" className="pre-btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>

      {/* RIGHT — Live preview JSON */}
      <div className="space-y-4">
        <div className="pre-card sticky top-4">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">Live preview</h3>
          <pre className="text-[11px] font-mono bg-gray-900 text-green-200 rounded-xl p-3 overflow-auto max-h-[440px] whitespace-pre-wrap break-all">{JSON.stringify(draft, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

// ---------------- Simulator ----------------

function Simulator({ meta }) {
  const { format } = useCurrency();
  const [product, setProduct] = useState("motor");
  const [base, setBase] = useState(10000);
  const [inputs, setInputs] = useState({ age: 22, vehicle_type: "car" });
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  const fields = meta?.fields_by_product?.[product] || [];

  const run = async () => {
    setRunning(true);
    try {
      const r = await api.post("/rules/simulate", {
        product,
        base_premium: parseFloat(base) || 0,
        inputs,
      });
      setResult(r.data);
    } catch (e) {
      toast.error("Simulation failed");
    } finally {
      setRunning(false);
    }
  };

  // Live re-run on field change (debounced via small delay)
  useEffect(() => {
    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, base, JSON.stringify(inputs)]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* LEFT — input form */}
      <div className="pre-card">
        <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4">Input</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Product</label>
            <select className="pre-input pre-select" value={product} onChange={(e) => { setProduct(e.target.value); setInputs({}); }} data-testid="sim-product">
              {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Base premium</label>
            <input type="number" step="0.01" className="pre-input" value={base} onChange={(e) => setBase(e.target.value)} data-testid="sim-base" />
          </div>
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Quote inputs</div>
            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.name}>
                  <label className="text-xs text-gray-500 block mb-1">{f.name}</label>
                  {f.options ? (
                    <select className="pre-input pre-select" value={inputs[f.name] ?? ""} onChange={(e) => setInputs((p) => ({ ...p, [f.name]: e.target.value }))} data-testid={`sim-input-${f.name}`}>
                      <option value="">—</option>
                      {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      className="pre-input"
                      type={f.type === "number" ? "number" : "text"}
                      value={inputs[f.name] ?? ""}
                      onChange={(e) => setInputs((p) => ({ ...p, [f.name]: f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
                      data-testid={`sim-input-${f.name}`}
                      placeholder={String(f.example ?? "")}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <button type="button" className="pre-btn-ghost" onClick={run} disabled={running}>
            <FlaskConical className="w-4 h-4" /> {running ? "Running…" : "Re-run"}
          </button>
        </div>
      </div>

      {/* RIGHT — result */}
      <div className="pre-card">
        <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4">Result</h3>
        {!result ? (
          <div className="text-gray-400 text-sm">Adjust inputs to see the calculation.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Base" value={format(result.base_premium)} />
              <Stat label="Final" value={format(result.final_premium)} accent />
            </div>
            <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold pt-2">
              {result.applied_rules.length} rule(s) applied · {result.skipped_rules.length} skipped
            </div>
            <div className="space-y-2">
              {result.applied_rules.map((a) => (
                <div key={a.rule_id} className="flex items-center justify-between rounded-xl bg-green-50 border border-green-100 p-3 text-sm" data-testid={`applied-rule-${a.rule_id}`}>
                  <div>
                    <div className="font-semibold text-gray-900">{a.name}</div>
                    <div className="text-xs text-gray-500">priority {a.priority} · {actionLabel(a.action)}</div>
                  </div>
                  <div className="text-right text-xs font-mono">
                    <div className="text-gray-500">{format(a.before)} → {format(a.after)}</div>
                    <div className={a.delta >= 0 ? "text-green-700" : "text-red-600"}>
                      {a.delta >= 0 ? "+" : ""}{format(a.delta)}
                    </div>
                  </div>
                </div>
              ))}
              {result.skipped_rules.length > 0 && (
                <details className="text-xs text-gray-500">
                  <summary className="cursor-pointer">Show skipped ({result.skipped_rules.length})</summary>
                  <ul className="mt-2 space-y-1 font-mono">
                    {result.skipped_rules.map((s, i) => <li key={i}>{s.rule_id}: {s.reason}</li>)}
                  </ul>
                </details>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`rounded-xl p-3 ${accent ? "bg-primary text-white" : "bg-gray-50"}`}>
      <div className={`text-[10px] uppercase tracking-wider font-semibold ${accent ? "text-white/80" : "text-gray-500"}`}>{label}</div>
      <div className={`font-display text-2xl font-semibold mt-1 ${accent ? "text-white" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}

// ---------------- Formula Config ----------------

function FormulaConfig() {
  const [cfg, setCfg] = useState(null);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [c, h] = await Promise.all([
      api.get("/rules/formula/config"),
      api.get("/rules/formula/history"),
    ]);
    setCfg(c.data);
    setHistory(h.data);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/rules/formula/config", {
        risk_score_weight: parseFloat(cfg.risk_score_weight) || 0,
        coverage_multiplier: parseFloat(cfg.coverage_multiplier) || 0,
        tax_percent: parseFloat(cfg.tax_percent) || 0,
        online_discount_percent: parseFloat(cfg.online_discount_percent) || 0,
        description: cfg.description || "",
      });
      toast.success("Formula saved (new version)");
      await load();
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) return <div className="pre-card text-gray-400">Loading…</div>;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 pre-card">
        <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4">
          Global Formula · v{cfg.version}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["risk_score_weight", "Risk score weight", 0.01],
            ["coverage_multiplier", "Coverage multiplier", 0.01],
            ["tax_percent", "Tax %", 0.1],
            ["online_discount_percent", "Online discount %", 0.1],
          ].map(([key, label, step]) => (
            <div key={key}>
              <label className="text-xs text-gray-500 block mb-1">{label}</label>
              <input
                type="number" step={step}
                className="pre-input"
                value={cfg[key] ?? 0}
                onChange={(e) => setCfg((c) => ({ ...c, [key]: e.target.value }))}
                data-testid={`formula-${key}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <label className="text-xs text-gray-500 block mb-1">Notes</label>
          <textarea className="pre-input" style={{ height: 60 }} value={cfg.description || ""} onChange={(e) => setCfg((c) => ({ ...c, description: e.target.value }))} />
        </div>
        <div className="mt-4">
          <button type="button" className="pre-btn-primary" onClick={save} disabled={saving} data-testid="save-formula-btn">
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save & version"}
          </button>
        </div>
      </div>

      <div className="pre-card">
        <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4">Version history</h3>
        {history.length === 0 ? (
          <div className="text-gray-400 text-sm">No previous versions yet.</div>
        ) : (
          <ul className="space-y-2 max-h-[440px] overflow-auto">
            {history.map((h) => (
              <li key={h.snapshot_id} className="text-xs border border-gray-100 rounded-lg p-2.5">
                <div className="flex justify-between font-mono text-[11px] text-gray-500">
                  <span>v{h.version}</span>
                  <span>{new Date(h.snapshot_at).toLocaleString("en-GB")}</span>
                </div>
                <div className="mt-1 text-gray-700">
                  tax {h.tax_percent}% · disc {h.online_discount_percent}%
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------- Audit Logs ----------------

function AuditLogs() {
  const { format } = useCurrency();
  const [logs, setLogs] = useState([]);
  const [productFilter, setProductFilter] = useState("all");
  const [open, setOpen] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = productFilter === "all" ? "" : `?product=${productFilter}`;
      const r = await api.get(`/rules/audit/logs${params}`);
      setLogs(r.data);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [productFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Filter</span>
        <select className="pre-input pre-select max-w-[160px]" value={productFilter} onChange={(e) => setProductFilter(e.target.value)} data-testid="audit-filter-product">
          <option value="all">All products</option>
          {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button type="button" className="pre-btn-ghost" onClick={load}>Refresh</button>
      </div>

      <div className="pre-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 whitespace-nowrap">Timestamp</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Product</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Base</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Final</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Δ</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Rules</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-12 text-center text-gray-400">Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-gray-400">No audit entries yet. Generate a quote to populate this view.</td></tr>
              ) : logs.map((l) => {
                const isOpen = !!open[l.id];
                return (
                  <React.Fragment key={l.id}>
                    <tr className="border-t border-gray-100" data-testid={`audit-row-${l.id}`}>
                      <td className="px-4 py-3 text-xs whitespace-nowrap font-mono">{new Date(l.created_at).toLocaleString("en-GB")}</td>
                      <td className="px-4 py-3 text-xs uppercase">{l.product}</td>
                      <td className="px-4 py-3 font-mono text-xs">{format(l.base_premium)}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{format(l.final_premium)}</td>
                      <td className={`px-4 py-3 font-mono text-xs ${l.delta >= 0 ? "text-green-700" : "text-red-600"}`}>{l.delta >= 0 ? "+" : ""}{format(l.delta)}</td>
                      <td className="px-4 py-3 text-xs">{l.applied_rules?.length || 0}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setOpen((o) => ({ ...o, [l.id]: !o[l.id] }))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-gray-50 border-t border-gray-100">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="grid md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="font-semibold mb-1 text-gray-700">Inputs</div>
                              <pre className="font-mono text-[11px] bg-white border border-gray-100 rounded-lg p-2 overflow-auto max-h-40">{JSON.stringify(l.inputs, null, 2)}</pre>
                            </div>
                            <div>
                              <div className="font-semibold mb-1 text-gray-700">Applied rules</div>
                              <ul className="space-y-1.5">
                                {(l.applied_rules || []).map((a) => (
                                  <li key={a.rule_id} className="bg-white rounded-lg p-2 border border-gray-100">
                                    <div className="font-semibold text-gray-900">{a.name}</div>
                                    <div className="text-[11px] text-gray-500 font-mono">
                                      {format(a.before)} → {format(a.after)} · {actionLabel(a.action)}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
