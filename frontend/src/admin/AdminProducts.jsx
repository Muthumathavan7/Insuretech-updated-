import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Plane, HeartPulse, Car, Smartphone, Plus, Trash2, Pencil, Save, Activity, Home } from "lucide-react";
import { toast } from "sonner";

const ICONS = { travel: Plane, health: HeartPulse, motor: Car, device: Smartphone, pa: Activity, home: Home };

const FIELD_LABELS_MOTOR = {
  account_type: "Personal / Business toggle",
  vehicle_reg: "Vehicle Registration No.",
  vehicle_lookup: "Vehicle Lookup button",
  id_type: "ID Type (NRIC / Passport)",
  id_number: "ID Number",
  full_name: "Full Name",
  date_of_birth: "Date of Birth",
  postcode: "Postcode",
  email: "Email",
  cover_type: "Cover Type selector",
  sum_insured: "Sum Insured",
  ncd_percent: "No Claim Discount",
  addons: "Optional Add-ons",
};

const FIELD_LABELS_PA = {
  num_persons: "Number of Persons selector",
  full_name: "Full Name",
  id_type: "ID Type (NRIC / Passport)",
  id_number: "ID Number",
  gender: "Gender",
  date_of_birth: "Date of Birth",
  nationality: "Nationality",
  occupation_class: "Occupation Class",
  email: "Email",
  phone: "Phone",
  address: "Residential Address",
  postcode: "Postcode",
  beneficiary_name: "Beneficiary Full Name",
  beneficiary_relationship: "Beneficiary Relationship",
  beneficiary_nric: "Beneficiary NRIC",
};

function ProductEditor({ product, onSaved }) {
  const [draft, setDraft] = useState(() => ({
    ...product,
    features: product.features || [],
    addons: product.addons || [],
    form_config: product.form_config || {},
    meta: product.meta || {},
  }));
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState("");
  const [newAddon, setNewAddon] = useState({ name: "", price: "" });

  const updateDraft = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const updateAddon = (i, patch) =>
    setDraft((d) => ({ ...d, addons: d.addons.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) }));
  const removeAddon = (i) => setDraft((d) => ({ ...d, addons: d.addons.filter((_, idx) => idx !== i) }));
  const removeFeature = (i) => setDraft((d) => ({ ...d, features: d.features.filter((_, idx) => idx !== i) }));

  const toggleField = (key, what, value) =>
    setDraft((d) => ({
      ...d,
      form_config: {
        ...d.form_config,
        [key]: { ...(d.form_config[key] || { enabled: true, required: true }), [what]: value },
      },
    }));

  // ---- Health Secure+ rate-table mutators ----
  const updateMeta = (patch) =>
    setDraft((d) => ({ ...d, meta: { ...(d.meta || {}), ...patch } }));
  const updateMetaList = (key, idx, patch) =>
    setDraft((d) => {
      const list = [...((d.meta || {})[key] || [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...d, meta: { ...(d.meta || {}), [key]: list } };
    });
  const updateAgeLoading = (bucket, value) =>
    setDraft((d) => ({
      ...d,
      meta: {
        ...(d.meta || {}),
        age_loading: { ...((d.meta || {}).age_loading || {}), [bucket]: parseFloat(value) || 0 },
      },
    }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: draft.name,
        description: draft.description,
        base_premium: parseFloat(draft.base_premium),
        coverage_amount: parseFloat(draft.coverage_amount),
        display_order: parseInt(draft.display_order) || 100,
        features: draft.features,
        addons: draft.addons.map((a) => ({ name: a.name, price: parseFloat(a.price) })),
        form_config: draft.form_config,
        image_url: draft.image_url,
        active: draft.active,
      };
      // Health Secure+ ships rate tables in `meta` — persist when present.
      if (product.category === "health" && draft.meta) {
        payload.meta = draft.meta;
      }
      // Home Easy ships rate tables + plans in `meta` — persist when present.
      if (product.category === "home" && draft.meta) {
        payload.meta = draft.meta;
      }
      await api.patch(`/products/${product.id}`, payload);
      toast.success("Product updated");
      onSaved?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const isMotor = product.category === "motor";
  const isPA = product.category === "pa";
  const isHealth = product.category === "health";
  const isHome = product.category === "home";
  const fieldLabels = isMotor ? FIELD_LABELS_MOTOR : isPA ? FIELD_LABELS_PA : null;

  return (
    <div className="space-y-6" data-testid={`product-editor-${product.category}`}>
      <div>
        <Label>Name</Label>
        <Input data-testid="edit-name" value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} className="rounded-xl h-11" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea rows={3} data-testid="edit-description" value={draft.description} onChange={(e) => updateDraft({ description: e.target.value })} className="rounded-xl" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Base premium (USD)</Label>
          <Input type="number" step="0.01" data-testid="edit-base-premium" value={draft.base_premium} onChange={(e) => updateDraft({ base_premium: e.target.value })} className="rounded-xl h-11" />
        </div>
        <div>
          <Label>Coverage amount (USD)</Label>
          <Input type="number" data-testid="edit-coverage" value={draft.coverage_amount} onChange={(e) => updateDraft({ coverage_amount: e.target.value })} className="rounded-xl h-11" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="flex items-center justify-between">
            <span>Display order</span>
            <span className="text-xs text-gray-400 font-normal">lower = first</span>
          </Label>
          <Input
            type="number"
            data-testid="edit-display-order"
            value={draft.display_order ?? 100}
            onChange={(e) => updateDraft({ display_order: parseInt(e.target.value) || 0 })}
            className="rounded-xl h-11"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 h-11">
            <Switch
              data-testid="edit-active"
              checked={draft.active !== false}
              onCheckedChange={(v) => updateDraft({ active: v })}
            />
            <span className="text-sm">Active (visible to customers)</span>
          </label>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Image URL</Label>
          <span className="text-[11px] text-gray-400">paste a link or upload a file ↓</span>
        </div>
        <Input data-testid="edit-image" value={draft.image_url || ""} onChange={(e) => updateDraft({ image_url: e.target.value })} className="rounded-xl h-11" placeholder="https://… or click Upload" />
        <div className="mt-2 flex items-center gap-3">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            data-testid="edit-image-file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                toast.error("Image must be under 2 MB — please resize and retry.");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => updateDraft({ image_url: String(reader.result || "") });
              reader.onerror = () => toast.error("Failed to read image");
              reader.readAsDataURL(file);
            }}
            className="text-xs file:mr-3 file:rounded-full file:border-0 file:bg-primary file:text-white file:px-3 file:py-1.5 file:cursor-pointer file:hover:bg-primary-600"
          />
          {draft.image_url && (
            <div className="ml-auto w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
              <img src={draft.image_url} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          Tip: uploads are stored inline (base64) — keep under 2 MB. For large hero images, paste a CDN URL.
        </p>
      </div>

      {/* Features */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Features</Label>
          <span className="text-xs text-gray-500">{draft.features.length} item(s)</span>
        </div>
        <ul className="space-y-1.5 mb-2">
          {draft.features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <span className="text-sm flex-1">{f}</span>
              <button onClick={() => removeFeature(i)} data-testid={`remove-feature-${i}`} className="text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input
            placeholder="Add a feature..."
            value={newFeature}
            data-testid="new-feature-input"
            onChange={(e) => setNewFeature(e.target.value)}
            className="rounded-xl h-10"
          />
          <Button
            onClick={() => { if (newFeature.trim()) { updateDraft({ features: [...draft.features, newFeature.trim()] }); setNewFeature(""); } }}
            data-testid="add-feature-btn"
            className="rounded-xl h-10 bg-primary hover:bg-primary-600 text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Add-ons with prices */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Add-ons & pricing</Label>
          <span className="text-xs text-gray-500">{draft.addons.length} add-on(s)</span>
        </div>
        <ul className="space-y-2 mb-2">
          {draft.addons.map((a, i) => (
            <li key={i} data-testid={`addon-row-${i}`} className="grid grid-cols-[1fr,120px,auto] gap-2 bg-gray-50 rounded-xl p-2">
              <Input value={a.name} onChange={(e) => updateAddon(i, { name: e.target.value })} className="rounded-lg h-9 text-sm" />
              <Input type="number" step="0.01" value={a.price} onChange={(e) => updateAddon(i, { price: e.target.value })} className="rounded-lg h-9 text-sm" placeholder="Price" />
              <button onClick={() => removeAddon(i)} data-testid={`remove-addon-${i}`} className="text-gray-400 hover:text-red-500 px-2">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-[1fr,120px,auto] gap-2">
          <Input
            placeholder="Add-on name"
            value={newAddon.name}
            data-testid="new-addon-name"
            onChange={(e) => setNewAddon({ ...newAddon, name: e.target.value })}
            className="rounded-lg h-10"
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Price"
            value={newAddon.price}
            data-testid="new-addon-price"
            onChange={(e) => setNewAddon({ ...newAddon, price: e.target.value })}
            className="rounded-lg h-10"
          />
          <Button
            onClick={() => {
              if (newAddon.name.trim() && newAddon.price) {
                updateDraft({ addons: [...draft.addons, { name: newAddon.name.trim(), price: parseFloat(newAddon.price) }] });
                setNewAddon({ name: "", price: "" });
              }
            }}
            data-testid="add-addon-btn"
            className="rounded-lg h-10 bg-primary hover:bg-primary-600 text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Field toggles (motor + pa) */}
      {fieldLabels && (
        <div>
          <Label className="mb-2 block">Form fields — admin control</Label>
          <p className="text-xs text-gray-500 mb-3">
            Toggle fields on/off on the customer-facing {isMotor ? "Motor" : "PA"} quote form. Required means the field
            must be filled; unchecked required means optional.
          </p>
          <div className="bg-gray-50 rounded-2xl p-3 space-y-1">
            {Object.keys(fieldLabels).map((key) => {
              const cfg = draft.form_config?.[key] || { enabled: true, required: true };
              return (
                <div
                  key={key}
                  data-testid={`field-toggle-${key}`}
                  className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{fieldLabels[key]}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{key}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 text-gray-600">
                      <Switch
                        data-testid={`enabled-${key}`}
                        checked={cfg.enabled}
                        onCheckedChange={(v) => toggleField(key, "enabled", v)}
                      />
                      Shown
                    </label>
                    <label className="flex items-center gap-1.5 text-gray-600">
                      <Switch
                        data-testid={`required-${key}`}
                        checked={cfg.required}
                        onCheckedChange={(v) => toggleField(key, "required", v)}
                        disabled={!cfg.enabled}
                      />
                      Required
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Health Secure+ rate tables — admin-configurable */}
      {isHealth && (
        <div className="border-t border-gray-100 pt-6 space-y-5">
          <div>
            <Label className="mb-1 block text-base">Critical Safe+ rate tables</Label>
            <p className="text-xs text-gray-500">
              All numbers below feed the customer's Coverage Calculator and the
              <code className="mx-1 px-1.5 py-0.5 rounded bg-gray-100 text-[11px]">/api/quotes/health</code>
              endpoint. Formula: <span className="font-mono text-[11px]">base × option × plan × age × (1+30% if smoker) → −online% → +SST%</span>.
            </p>
          </div>

          {/* Coverage option multipliers */}
          <div>
            <Label className="text-sm font-semibold">Coverage options</Label>
            <div className="mt-2 rounded-2xl border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                <div className="col-span-2">Key</div>
                <div className="col-span-5">Label</div>
                <div className="col-span-2 text-right">Multiplier ×</div>
                <div className="col-span-3">Illnesses (comma sep.)</div>
              </div>
              {(draft.meta?.coverage_options || []).map((o, idx) => (
                <div key={o.key} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-gray-100 items-center" data-testid={`opt-row-${o.key}`}>
                  <div className="col-span-2 font-mono text-xs text-gray-500">{o.key}</div>
                  <Input className="col-span-5 rounded-lg h-9 text-sm" value={o.label} onChange={(e) => updateMetaList("coverage_options", idx, { label: e.target.value })} />
                  <Input
                    type="number" step="0.01"
                    className="col-span-2 rounded-lg h-9 text-sm text-right font-mono"
                    value={o.multiplier}
                    data-testid={`opt-mult-${o.key}`}
                    onChange={(e) => updateMetaList("coverage_options", idx, { multiplier: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    className="col-span-3 rounded-lg h-9 text-sm"
                    value={(o.illnesses || []).join(", ")}
                    onChange={(e) => updateMetaList("coverage_options", idx, { illnesses: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Plans */}
          <div>
            <Label className="text-sm font-semibold">Plans (sum-insured tiers)</Label>
            <div className="mt-2 rounded-2xl border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                <div className="col-span-2">Key</div>
                <div className="col-span-3">Label</div>
                <div className="col-span-4 text-right">Sum insured</div>
                <div className="col-span-3 text-right">Multiplier ×</div>
              </div>
              {(draft.meta?.plans || []).map((p, idx) => (
                <div key={p.key} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-gray-100 items-center" data-testid={`plan-row-${p.key}`}>
                  <div className="col-span-2 font-mono text-xs text-gray-500">{p.key}</div>
                  <Input className="col-span-3 rounded-lg h-9 text-sm" value={p.label} onChange={(e) => updateMetaList("plans", idx, { label: e.target.value })} />
                  <Input
                    type="number" step="100"
                    className="col-span-4 rounded-lg h-9 text-sm text-right font-mono"
                    value={p.sum_insured}
                    data-testid={`plan-si-${p.key}`}
                    onChange={(e) => updateMetaList("plans", idx, { sum_insured: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    type="number" step="0.01"
                    className="col-span-3 rounded-lg h-9 text-sm text-right font-mono"
                    value={p.multiplier}
                    data-testid={`plan-mult-${p.key}`}
                    onChange={(e) => updateMetaList("plans", idx, { multiplier: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Age loadings + global knobs */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold">Age-bucket loadings</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {Object.entries(draft.meta?.age_loading || {}).map(([bucket, val]) => (
                  <div key={bucket} className="flex items-center gap-2 bg-gray-50 rounded-xl px-2.5 py-1.5">
                    <span className="text-xs font-mono text-gray-500 w-14">{bucket}</span>
                    <Input
                      type="number" step="0.01"
                      className="rounded-lg h-9 text-sm text-right font-mono flex-1"
                      value={val}
                      data-testid={`age-${bucket}`}
                      onChange={(e) => updateAgeLoading(bucket, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Global knobs</Label>
              <div className="mt-2 grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-2.5 py-1.5">
                  <span className="text-xs text-gray-500 flex-1">Smoker loading %</span>
                  <Input
                    type="number" step="1"
                    className="rounded-lg h-9 text-sm text-right font-mono w-24"
                    value={draft.meta?.smoker_loading_pct ?? 30}
                    data-testid="meta-smoker"
                    onChange={(e) => updateMeta({ smoker_loading_pct: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-2.5 py-1.5">
                  <span className="text-xs text-gray-500 flex-1">Online discount %</span>
                  <Input
                    type="number" step="0.5"
                    className="rounded-lg h-9 text-sm text-right font-mono w-24"
                    value={draft.meta?.online_discount_pct ?? 15}
                    data-testid="meta-online-discount"
                    onChange={(e) => updateMeta({ online_discount_pct: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-2.5 py-1.5">
                  <span className="text-xs text-gray-500 flex-1">SST / Tax %</span>
                  <Input
                    type="number" step="0.5"
                    className="rounded-lg h-9 text-sm text-right font-mono w-24"
                    value={draft.meta?.tax_pct ?? 8}
                    data-testid="meta-tax"
                    onChange={(e) => updateMeta({ tax_pct: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-400">
            Tip: combine these with the <strong>Pricing Rules Engine</strong> for conditional
            adjustments (e.g. +10% during a campaign, −5% loyalty). The rules apply
            <em> after</em> these tables and online discount, before tax.
          </p>
        </div>
      )}

      {/* Home Easy rate tables — admin-configurable */}
      {isHome && (
        <div className="border-t border-gray-100 pt-6 space-y-5">
          <div>
            <Label className="mb-1 block text-base">Home Easy rate tables</Label>
            <p className="text-xs text-gray-500">
              Drives the Coverage Calculator and the
              <code className="mx-1 px-1.5 py-0.5 rounded bg-gray-100 text-[11px]">/api/quotes/home</code>
              endpoint. Formula: <span className="font-mono text-[11px]">(building/100k × base × plan × prop) + (contents/100k × cRate × plan)</span>.
            </p>
          </div>

          {/* Plans */}
          <div>
            <Label className="text-sm font-semibold">Plan tiers</Label>
            <div className="mt-2 rounded-2xl border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                <div className="col-span-2">Key</div>
                <div className="col-span-3">Label</div>
                <div className="col-span-2 text-right">Building ×</div>
                <div className="col-span-2 text-right">Contents ×</div>
                <div className="col-span-3">Benefits (comma sep.)</div>
              </div>
              {(draft.meta?.plans || []).map((p, idx) => (
                <div key={p.key} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-gray-100 items-center" data-testid={`home-plan-row-${p.key}`}>
                  <div className="col-span-2 font-mono text-xs text-gray-500">{p.key}</div>
                  <Input className="col-span-3 rounded-lg h-9 text-sm" value={p.label} onChange={(e) => updateMetaList("plans", idx, { label: e.target.value })} />
                  <Input
                    type="number" step="0.01"
                    className="col-span-2 rounded-lg h-9 text-sm text-right font-mono"
                    value={p.building_mult}
                    data-testid={`home-plan-bm-${p.key}`}
                    onChange={(e) => updateMetaList("plans", idx, { building_mult: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    type="number" step="0.01"
                    className="col-span-2 rounded-lg h-9 text-sm text-right font-mono"
                    value={p.contents_mult}
                    data-testid={`home-plan-cm-${p.key}`}
                    onChange={(e) => updateMetaList("plans", idx, { contents_mult: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    className="col-span-3 rounded-lg h-9 text-sm"
                    value={(p.benefits || []).join(", ")}
                    onChange={(e) => updateMetaList("plans", idx, { benefits: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Property types */}
          <div>
            <Label className="text-sm font-semibold">Property types</Label>
            <div className="mt-2 rounded-2xl border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                <div className="col-span-3">Key</div>
                <div className="col-span-6">Label</div>
                <div className="col-span-3 text-right">Multiplier ×</div>
              </div>
              {(draft.meta?.property_types || []).map((t, idx) => (
                <div key={t.key} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-gray-100 items-center" data-testid={`home-ptype-row-${t.key}`}>
                  <div className="col-span-3 font-mono text-xs text-gray-500">{t.key}</div>
                  <Input className="col-span-6 rounded-lg h-9 text-sm" value={t.label} onChange={(e) => updateMetaList("property_types", idx, { label: e.target.value })} />
                  <Input
                    type="number" step="0.01"
                    className="col-span-3 rounded-lg h-9 text-sm text-right font-mono"
                    value={t.multiplier}
                    data-testid={`home-ptype-mult-${t.key}`}
                    onChange={(e) => updateMetaList("property_types", idx, { multiplier: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rate / sum-insured / global knobs */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold">Rates per RM 100,000</Label>
              <div className="mt-2 grid grid-cols-1 gap-2">
                <KnobInput label="Building rate /100k" testId="home-rate-building" value={draft.meta?.base_rate_per_100k ?? 120} onChange={(v) => updateMeta({ base_rate_per_100k: v })} step="1" />
                <KnobInput label="Contents rate /100k" testId="home-rate-contents" value={draft.meta?.contents_rate_per_100k ?? 150} onChange={(v) => updateMeta({ contents_rate_per_100k: v })} step="1" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Sum-insured limits</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <KnobInput label="Building min" testId="home-bmin" value={draft.meta?.building_min ?? 50000} onChange={(v) => updateMeta({ building_min: v })} step="1000" />
                <KnobInput label="Building max" testId="home-bmax" value={draft.meta?.building_max ?? 2000000} onChange={(v) => updateMeta({ building_max: v })} step="1000" />
                <KnobInput label="Contents min" testId="home-cmin" value={draft.meta?.contents_min ?? 10000} onChange={(v) => updateMeta({ contents_min: v })} step="1000" />
                <KnobInput label="Contents max" testId="home-cmax" value={draft.meta?.contents_max ?? 500000} onChange={(v) => updateMeta({ contents_max: v })} step="1000" />
              </div>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-semibold">Global knobs</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <KnobInput label="Online discount %" testId="home-online-pct" value={draft.meta?.online_discount_pct ?? 10} onChange={(v) => updateMeta({ online_discount_pct: v })} step="0.5" />
                <KnobInput label="SST / Tax %" testId="home-tax-pct" value={draft.meta?.tax_pct ?? 8} onChange={(v) => updateMeta({ tax_pct: v })} step="0.5" />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-400">
            Tip: combine these with the <strong>Pricing Rules Engine</strong> for conditional
            adjustments (e.g. +10% during a campaign, −5% loyalty).
          </p>
        </div>
      )}



      <Button
        onClick={save}
        disabled={saving}
        data-testid="product-save-btn"
        className="w-full h-12 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );
}

function KnobInput({ label, value, onChange, step = "1", testId }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-2.5 py-1.5">
      <span className="text-xs text-gray-500 flex-1">{label}</span>
      <Input
        type="number"
        step={step}
        className="rounded-lg h-9 text-sm text-right font-mono w-28"
        value={value}
        data-testid={testId}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

export default function AdminProducts() {
  const [items, setItems] = useState([]);
  const [openId, setOpenId] = useState(null);
  const { format } = useCurrency();
  const load = () => api.get("/products").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  return (
    <div data-testid="admin-products">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">Catalog</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-1">Products</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Edit pricing, features, add-ons, and which form fields appear to customers.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {items.map((p) => {
          const Icon = ICONS[p.category] || Plane;
          return (
            <div key={p.id} data-testid={`admin-product-${p.category}`} className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display text-lg font-semibold">{p.name}</div>
                  <div className="text-xs text-gray-500 uppercase">{p.category}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-xs text-gray-500">from</div>
                  <div className="font-semibold" data-testid={`price-${p.category}`}>{format(p.base_premium)}</div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{p.description}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span>Coverage <strong className="text-gray-800">{format(p.coverage_amount, { decimals: 0 })}</strong></span>
                <span>Features <strong className="text-gray-800">{p.features?.length}</strong></span>
                <span>Add-ons <strong className="text-gray-800">{p.addons?.length}</strong></span>
                <span className={`ml-auto px-2 py-0.5 rounded-full ${p.active ? "bg-green-50 text-green-700" : "bg-gray-100"}`}>
                  {p.active ? "Active" : "Inactive"}
                </span>
              </div>
              <Sheet open={openId === p.id} onOpenChange={(v) => setOpenId(v ? p.id : null)}>
                <SheetTrigger asChild>
                  <Button
                    data-testid={`edit-product-${p.category}`}
                    variant="outline"
                    className="rounded-full w-full"
                  >
                    <Pencil className="w-4 h-4 mr-2" /> Edit product
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="font-display text-2xl">
                      Edit · {p.name}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <ProductEditor
                      product={p}
                      onSaved={() => { setOpenId(null); load(); }}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          );
        })}
      </div>
    </div>
  );
}
