import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Plane, HeartPulse, Car, Smartphone, Plus, Trash2, Pencil, Save, Activity } from "lucide-react";
import { toast } from "sonner";

const ICONS = { travel: Plane, health: HeartPulse, motor: Car, device: Smartphone, pa: Activity };

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

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/products/${product.id}`, {
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
      });
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
        <Label>Image URL</Label>
        <Input data-testid="edit-image" value={draft.image_url || ""} onChange={(e) => updateDraft({ image_url: e.target.value })} className="rounded-xl h-11" />
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

export default function AdminProducts() {
  const [items, setItems] = useState([]);
  const [openId, setOpenId] = useState(null);

  const load = () => api.get("/products").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  return (
    <div className="p-8" data-testid="admin-products">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">Catalog</div>
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Products</h1>
          <p className="text-gray-500 mt-1">Edit pricing, features, add-ons, and which form fields appear to customers.</p>
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
                  <div className="font-semibold" data-testid={`price-${p.category}`}>${p.base_premium}</div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{p.description}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span>Coverage <strong className="text-gray-800">${p.coverage_amount.toLocaleString()}</strong></span>
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
