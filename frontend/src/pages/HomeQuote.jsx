import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Check, Shield, User, CreditCard, ChevronLeft, ArrowRight, Home,
} from "lucide-react";

const STEPS = [
  { key: "plan",     label: "Plan & property",   icon: Shield },
  { key: "personal", label: "Owner details",     icon: User },
  { key: "pay",      label: "Summary & payment", icon: CreditCard },
];

export default function HomeQuote() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { format } = useCurrency();
  const nav = useNavigate();

  const [product, setProduct] = useState(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);

  const [form, setForm] = useState({
    plan_key: searchParams.get("plan") || "enhanced",
    property_type: searchParams.get("property_type") || "landed",
    building_sum_insured: parseFloat(searchParams.get("building")) || 500000,
    contents_sum_insured: parseFloat(searchParams.get("contents")) || 50000,
    addons: [],
    full_name: user?.full_name || "",
    id_type: "nric",
    id_number: "",
    email: user?.email || "",
    phone: user?.phone || "",
    property_address: "",
    postcode: "",
    accept_privacy: false,
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleAddon = (name) =>
    set({ addons: form.addons.includes(name) ? form.addons.filter((a) => a !== name) : [...form.addons, name] });

  useEffect(() => {
    api.get(`/products/${productId}`).then((r) => setProduct(r.data)).catch(() => {
      api.get("/products?category=home").then((r) => setProduct(r.data?.[0]));
    });
  }, [productId]);

  // If calculator deep-linked with plan+property already chosen, skip to step 2
  useEffect(() => {
    if (searchParams.get("plan") && searchParams.get("property_type") && step === 0) setStep(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill from profile
  useEffect(() => {
    api.get("/profile/me").then((r) => {
      const p = r.data || {};
      setForm((f) => ({
        ...f,
        full_name: f.full_name || p.full_name || "",
        email: f.email || p.email || "",
        phone: f.phone || p.phone || "",
        id_number: f.id_number || p.kyc_data?.id_number || "",
        postcode: f.postcode || p.kyc_data?.postcode || "",
        property_address: f.property_address || p.kyc_data?.property_address || "",
      }));
    }).catch(() => {});
  }, []);

  const meta = product?.meta || {};
  const plans = meta.plans || [];
  const ptypes = meta.property_types || [];
  const addons = product?.addons || [];
  const bMin = Number(meta.building_min || 50000);
  const bMax = Number(meta.building_max || 2000000);
  const cMin = Number(meta.contents_min || 10000);
  const cMax = Number(meta.contents_max || 500000);

  const canContinueStep0 =
    form.plan_key && form.property_type &&
    form.building_sum_insured >= bMin && form.building_sum_insured <= bMax &&
    (form.contents_sum_insured === 0 || (form.contents_sum_insured >= cMin && form.contents_sum_insured <= cMax));

  const canContinueStep1 =
    form.full_name && form.id_number && form.email && form.phone &&
    form.property_address && form.postcode && form.accept_privacy;

  const generateQuote = async () => {
    if (!canContinueStep1) return toast.error("Please fill all required fields and accept the privacy notice");
    setLoading(true);
    try {
      const r = await api.post("/quotes/home", { product_id: product.id, ...form });
      setQuote(r.data);
      setStep(2);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not generate quote");
    } finally {
      setLoading(false);
    }
  };

  const pay = async () => {
    if (!quote) return;
    setLoading(true);
    try {
      const r = await api.post("/payments/checkout", {
        quote_id: quote.id, origin_url: window.location.origin,
      });
      window.location.href = r.data.url;
    } catch {
      toast.error("Could not start checkout");
      setLoading(false);
    }
  };

  const skipPayment = async () => {
    setLoading(true);
    try {
      const r = await api.post(`/policies/issue-from-quote/${quote.id}`);
      toast.success(`Policy issued: ${r.data.policy.policy_number}`);
      nav("/policies");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to issue policy");
    } finally {
      setLoading(false);
    }
  };

  if (!product) return <div className="max-w-5xl mx-auto p-10 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="home-quote-page">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-10 overflow-x-auto">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <React.Fragment key={s.key}>
              <div data-testid={`home-step-${i}`} className="flex items-center gap-3 flex-shrink-0">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
                  active ? "bg-blue-700 text-white shadow-float"
                    : done ? "bg-blue-50 text-blue-700 border border-blue-400/40"
                    : "bg-gray-100 text-gray-400"
                }`}>
                  {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <div className={`text-sm font-medium ${active ? "text-gray-900" : "text-gray-500"}`}>
                  {s.label}
                </div>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-3" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* STEP 0 — Plan + property */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
            <div className="text-xs text-blue-700 uppercase tracking-widest font-semibold mb-1">Step 1</div>
            <h2 className="font-display text-3xl font-semibold mb-1">Choose your cover</h2>
            <p className="text-gray-500 text-sm mb-6">Pick a plan, property type, and sum insured.</p>

            {/* Plans */}
            <div className="grid md:grid-cols-3 gap-3 mb-6">
              {plans.map((p) => {
                const on = form.plan_key === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    data-testid={`home-plan-pick-${p.key}`}
                    onClick={() => set({ plan_key: p.key })}
                    className={`rounded-2xl border p-5 text-left transition-all ${
                      on ? "border-blue-700 ring-2 ring-blue-400/30 bg-blue-50/40"
                        : "border-gray-200 bg-white hover:border-blue-400"
                    }`}
                  >
                    <div className="text-[10px] text-blue-700 font-semibold uppercase tracking-wider">Plan</div>
                    <div className="font-display text-lg font-semibold mt-1">{p.label}</div>
                    <ul className="mt-2 space-y-1 text-[13px] text-gray-600">
                      {(p.benefits || []).slice(0, 4).map((b) => (
                        <li key={b} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-700 mt-0.5 flex-shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {/* Property type */}
            <div className="mb-6">
              <Label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block">Property type</Label>
              <div className="flex flex-wrap gap-2">
                {ptypes.map((t) => {
                  const on = form.property_type === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => set({ property_type: t.key })}
                      data-testid={`home-prop-${t.key}`}
                      className={`px-4 h-10 rounded-full text-sm font-medium transition-all border ${
                        on ? "bg-blue-50 text-blue-800 border-blue-700" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sums */}
            <div className="grid sm:grid-cols-2 gap-5 mb-6">
              <SumField
                label="Building sum insured"
                value={form.building_sum_insured}
                min={bMin}
                max={bMax}
                step={10000}
                onChange={(v) => set({ building_sum_insured: v })}
                format={format}
                testId="home-building-slider"
              />
              <SumField
                label="Contents sum insured"
                value={form.contents_sum_insured}
                min={cMin}
                max={cMax}
                step={5000}
                onChange={(v) => set({ contents_sum_insured: v })}
                format={format}
                testId="home-contents-slider"
              />
            </div>

            {/* Add-ons */}
            <div>
              <Label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block">Optional add-ons</Label>
              <div className="grid sm:grid-cols-3 gap-2">
                {addons.map((a) => {
                  const on = form.addons.includes(a.name);
                  return (
                    <button
                      key={a.name}
                      type="button"
                      onClick={() => toggleAddon(a.name)}
                      data-testid={`home-addon-${slug(a.name)}`}
                      className={`text-left rounded-xl border p-3 transition-all ${
                        on ? "border-blue-700 bg-blue-50/50" : "border-gray-200 hover:border-blue-400"
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-800">{a.name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-1">+ {format(a.price, { decimals: 0 })}/yr</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end">
              <Button
                data-testid="home-step0-next"
                onClick={() => setStep(1)}
                disabled={!canContinueStep0}
                className="rounded-full bg-blue-700 hover:bg-blue-800 text-white px-6 h-11"
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1 — Owner details */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
            <div className="text-xs text-blue-700 uppercase tracking-widest font-semibold mb-1">Step 2</div>
            <h2 className="font-display text-3xl font-semibold mb-1">Owner & property details</h2>
            <p className="text-gray-500 text-sm mb-6">We'll pre-fill from your profile. Used to issue your policy.</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name *">
                <Input className="rounded-xl" value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} data-testid="home-full-name" />
              </Field>
              <Field label="ID type">
                <select className="w-full h-10 rounded-xl border border-input bg-white px-3 text-sm" value={form.id_type} onChange={(e) => set({ id_type: e.target.value })} data-testid="home-id-type">
                  <option value="nric">NRIC</option>
                  <option value="passport">Passport</option>
                </select>
              </Field>
              <Field label={form.id_type === "nric" ? "NRIC *" : "Passport number *"}>
                <Input className="rounded-xl" value={form.id_number} onChange={(e) => set({ id_number: e.target.value })} data-testid="home-id-number" placeholder="e.g. 960101-08-1234" />
              </Field>
              <Field label="Email *">
                <Input type="email" className="rounded-xl" value={form.email} onChange={(e) => set({ email: e.target.value })} data-testid="home-email" />
              </Field>
              <Field label="Mobile *">
                <Input className="rounded-xl" value={form.phone} onChange={(e) => set({ phone: e.target.value })} data-testid="home-phone" placeholder="012-3456789" />
              </Field>
              <Field label="Postcode *">
                <Input className="rounded-xl" value={form.postcode} onChange={(e) => set({ postcode: e.target.value })} data-testid="home-postcode" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Property address *">
                  <Input className="rounded-xl" value={form.property_address} onChange={(e) => set({ property_address: e.target.value })} data-testid="home-property-address" placeholder="Full address of the insured property" />
                </Field>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input type="checkbox" checked={form.accept_privacy} onChange={(e) => set({ accept_privacy: e.target.checked })} className="mt-0.5" data-testid="home-privacy-check" />
                <span>I have read and agree to the <a href="#" className="text-blue-700 underline">Privacy Notice</a>.</span>
              </label>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(0)} className="rounded-full">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={generateQuote} disabled={!canContinueStep1 || loading} data-testid="home-step1-next" className="rounded-full bg-blue-700 hover:bg-blue-800 text-white px-6 h-11">
                {loading ? "Calculating…" : "Get quote"} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 — Summary & payment */}
      {step === 2 && quote && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
            <div className="text-xs text-blue-700 uppercase tracking-widest font-semibold mb-1">Step 3</div>
            <h2 className="font-display text-3xl font-semibold mb-1">Ready to checkout</h2>
            <p className="text-gray-500 text-sm mb-6">Your Home Easy summary. Pay securely via Stripe.</p>

            <div className="rounded-2xl bg-blue-50/40 border border-blue-400/30 p-5 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Home className="w-5 h-5 text-blue-700" />
                <div className="font-semibold text-gray-900">Home Easy</div>
              </div>
              <div className="text-sm text-gray-600">
                <strong>{quote.meta?.plan?.label}</strong> · {quote.meta?.property_type?.label} · Building <strong>{format(quote.meta?.building_sum_insured || 0, { decimals: 0 })}</strong>
                {quote.meta?.contents_sum_insured ? <> · Contents <strong>{format(quote.meta.contents_sum_insured, { decimals: 0 })}</strong></> : null}
              </div>
              <div className="text-xs text-gray-500 mt-1">12-month policy · holder {quote.meta?.insured_name}</div>
              {quote.meta?.property_address && (
                <div className="text-xs text-gray-500 mt-0.5">Property: {quote.meta.property_address}</div>
              )}
            </div>

            <dl className="divide-y divide-gray-100 text-sm">
              <Row label="Building premium" value={format((quote.meta?.gross_premium || 0) - (quote.meta?.contents_sum_insured ? (quote.meta?.gross_premium || 0) * (quote.meta?.contents_sum_insured / (quote.meta?.building_sum_insured + quote.meta?.contents_sum_insured)) : 0))} />
              <Row label="Basic premium" value={format(quote.meta?.gross_premium || 0)} />
              <Row label={`Online discount (${quote.meta?.online_discount_pct}%)`} value={`− ${format(quote.meta?.online_discount || 0)}`} accent="green" />
              {quote.addon_total > 0 && (
                <Row label="Add-ons" value={`+ ${format(quote.addon_total)}`} />
              )}
              {quote.meta?.rules_delta ? (
                <Row label="Underwriting adjustment" value={`${quote.meta.rules_delta >= 0 ? "+ " : "− "}${format(Math.abs(quote.meta.rules_delta))}`} />
              ) : null}
              <Row label="SST 8%" value={format(quote.tax || 0)} />
              <Row label="Total" value={format(quote.total)} big />
            </dl>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
            <div className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2">Payable today</div>
            <div className="font-display text-4xl font-semibold mb-4">{format(quote.total)}</div>
            <Button onClick={pay} disabled={loading} data-testid="home-pay-btn" className="w-full rounded-full bg-blue-700 hover:bg-blue-800 text-white h-11">
              {loading ? "Redirecting…" : "Pay with Stripe"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <button
              onClick={skipPayment}
              disabled={loading}
              data-testid="home-skip-payment-btn"
              className="mt-3 w-full rounded-full border border-dashed border-gray-300 text-sm text-gray-600 h-11 hover:bg-gray-50 disabled:opacity-50"
              title="Skip payment & issue policy (demo mode)"
            >
              Skip payment (demo)
            </button>
            <div className="mt-4 text-[11px] text-gray-400 leading-relaxed">
              You'll receive your digital policy card and certificate once payment succeeds.
              A copy is also mailed to {quote.input?.email || "your email"}.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs text-gray-500 mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function SumField({ label, value, min, max, step, onChange, format, testId }) {
  const pct = ((value - min) / Math.max(1, max - min)) * 100;
  return (
    <div>
      <div className="flex items-end justify-between mb-1">
        <Label className="text-xs text-gray-500">{label}</Label>
        <span className="font-display text-base font-semibold text-blue-900">{format(value, { decimals: 0 })}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        data-testid={testId}
        className="home-slider w-full"
        style={{ "--progress": `${pct}%` }}
        aria-label={label}
      />
      <div className="flex justify-between mt-1 text-[10px] font-mono text-gray-400">
        <span>{format(min, { decimals: 0 })}</span>
        <span>{format(max, { decimals: 0 })}</span>
      </div>
    </div>
  );
}

function Row({ label, value, big, accent }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className={`${big ? "font-semibold text-gray-900" : "text-gray-500"}`}>{label}</span>
      <span className={`font-mono ${big ? "font-display text-xl font-semibold text-gray-900" : ""} ${accent === "green" ? "text-green-700" : ""}`}>{value}</span>
    </div>
  );
}

function slug(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
