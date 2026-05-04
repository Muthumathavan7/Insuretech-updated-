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
  Check, Shield, User, CreditCard, ChevronLeft, ArrowRight, HeartPulse,
} from "lucide-react";

const STEPS = [
  { key: "plan",     label: "Plan selection",    icon: Shield },
  { key: "personal", label: "Personal details",  icon: User },
  { key: "pay",      label: "Summary & payment", icon: CreditCard },
];

export default function HealthQuote() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { format } = useCurrency();
  const nav = useNavigate();

  const [product, setProduct] = useState(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);

  // Form state — initial values may be overridden by URL params from the
  // landing page's coverage calculator deep-link.
  const [form, setForm] = useState({
    coverage_option: searchParams.get("option") || "top5",
    plan_key: searchParams.get("plan") || "plan3",
    full_name: user?.full_name || "",
    id_type: "nric",
    id_number: "",
    date_of_birth: "",
    gender: "male",
    smoker: false,
    email: user?.email || "",
    phone: user?.phone || "",
    malaysian_resident: true,
    accept_privacy: false,
    beneficiary_name: "",
    beneficiary_relationship: "",
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    api.get(`/products/${productId}`).then((r) => setProduct(r.data)).catch(() => {
      // fallback to first health product
      api.get("/products?category=health").then((r) => setProduct(r.data?.[0]));
    });
  }, [productId]);

  // If the user came from the landing-page calculator with option+plan in the URL,
  // skip Step 0 and land directly on the personal-details step.
  useEffect(() => {
    if (searchParams.get("option") && searchParams.get("plan") && step === 0) {
      setStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick-fill from profile
  useEffect(() => {
    api.get("/profile/me").then((r) => {
      const p = r.data || {};
      setForm((f) => ({
        ...f,
        full_name: f.full_name || p.full_name || "",
        email: f.email || p.email || "",
        phone: f.phone || p.phone || "",
        id_number: f.id_number || p.kyc_data?.id_number || "",
        date_of_birth: f.date_of_birth || p.kyc_data?.date_of_birth || "",
        gender: p.kyc_data?.gender || f.gender,
      }));
    }).catch(() => {});
  }, []);

  const options = product?.meta?.coverage_options || [];
  const plans = product?.meta?.plans || [];

  const canContinueStep0 = form.coverage_option && form.plan_key;
  const canContinueStep1 =
    form.full_name && form.id_number && form.date_of_birth && form.email && form.phone &&
    form.accept_privacy && form.malaysian_resident;

  const generateQuote = async () => {
    if (!canContinueStep1) return toast.error("Please fill all required fields and accept the privacy notice");
    setLoading(true);
    try {
      const r = await api.post("/quotes/health", { product_id: product.id, ...form });
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="health-quote-page">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-10 overflow-x-auto">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <React.Fragment key={s.key}>
              <div data-testid={`health-step-${i}`} className="flex items-center gap-3 flex-shrink-0">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
                  active ? "bg-primary text-white shadow-float"
                    : done ? "bg-primary-50 text-primary-700 border border-primary/30"
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

      {/* STEP 0 — Plan selection */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
            <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-1">Step 1</div>
            <h2 className="font-display text-3xl font-semibold mb-1">Choose your coverage</h2>
            <p className="text-gray-500 text-sm mb-6">Select the critical illness category, then a sum-insured plan.</p>

            <div className="grid md:grid-cols-3 gap-3">
              {options.map((o, idx) => {
                const selected = form.coverage_option === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    data-testid={`opt-${o.key}`}
                    onClick={() => set({ coverage_option: o.key })}
                    className={`rounded-2xl border p-5 text-left transition-all ${
                      selected ? "border-primary ring-2 ring-primary/20 bg-primary-50/40"
                        : "border-gray-200 bg-white hover:border-primary/40"
                    }`}
                  >
                    <div className="text-[10px] text-primary-700 font-semibold uppercase tracking-wider">Option {idx + 1}</div>
                    <div className="font-display text-lg font-semibold mt-1">{o.label}</div>
                    <ul className="mt-2 space-y-1 text-[13px] text-gray-600">
                      {(o.illnesses || []).slice(0, 4).map((x) => (
                        <li key={x} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-primary-700 mt-0.5 flex-shrink-0" />
                          {x}
                        </li>
                      ))}
                      {(o.illnesses || []).length > 4 && (
                        <li className="text-xs text-gray-400">+ {(o.illnesses || []).length - 4} more</li>
                      )}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="mt-8">
              <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">Select a plan</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {plans.map((p) => {
                  const selected = form.plan_key === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      data-testid={`plan-${p.key}`}
                      onClick={() => set({ plan_key: p.key })}
                      className={`rounded-2xl border p-4 text-center transition-all ${
                        selected ? "border-primary ring-2 ring-primary/20 bg-primary-50/40"
                          : "border-gray-200 bg-white hover:border-primary/40"
                      }`}
                    >
                      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{p.label}</div>
                      <div className="font-display text-xl font-semibold mt-1">
                        {format(p.sum_insured, { decimals: 0 })}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">sum insured</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end">
              <Button
                data-testid="health-step0-next"
                onClick={() => setStep(1)}
                disabled={!canContinueStep0}
                className="rounded-full bg-primary hover:bg-primary-600 text-white px-6 h-11"
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1 — Personal details */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
            <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-1">Step 2</div>
            <h2 className="font-display text-3xl font-semibold mb-1">Tell us about you</h2>
            <p className="text-gray-500 text-sm mb-6">Used to underwrite and issue your policy. We'll pre-fill from your profile.</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name *">
                <Input className="rounded-xl" value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} data-testid="health-full-name" />
              </Field>
              <Field label="Date of birth *">
                <Input type="date" className="rounded-xl" value={form.date_of_birth} onChange={(e) => set({ date_of_birth: e.target.value })} data-testid="health-dob" />
              </Field>

              <Field label="ID type">
                <select className="w-full h-10 rounded-xl border border-input bg-white px-3 text-sm" value={form.id_type} onChange={(e) => set({ id_type: e.target.value })} data-testid="health-id-type">
                  <option value="nric">NRIC</option>
                  <option value="passport">Passport</option>
                </select>
              </Field>
              <Field label={form.id_type === "nric" ? "NRIC *" : "Passport number *"}>
                <Input className="rounded-xl" value={form.id_number} onChange={(e) => set({ id_number: e.target.value })} data-testid="health-id-number" placeholder="e.g. 960101-08-1234" />
              </Field>

              <Field label="Gender *">
                <select className="w-full h-10 rounded-xl border border-input bg-white px-3 text-sm" value={form.gender} onChange={(e) => set({ gender: e.target.value })} data-testid="health-gender">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>
              <Field label="Smoker?">
                <select className="w-full h-10 rounded-xl border border-input bg-white px-3 text-sm" value={form.smoker ? "yes" : "no"} onChange={(e) => set({ smoker: e.target.value === "yes" })} data-testid="health-smoker">
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>

              <Field label="Email *">
                <Input type="email" className="rounded-xl" value={form.email} onChange={(e) => set({ email: e.target.value })} data-testid="health-email" />
              </Field>
              <Field label="Mobile *">
                <Input className="rounded-xl" value={form.phone} onChange={(e) => set({ phone: e.target.value })} data-testid="health-phone" placeholder="012-3456789" />
              </Field>

              <Field label="Beneficiary (optional)">
                <Input className="rounded-xl" value={form.beneficiary_name} onChange={(e) => set({ beneficiary_name: e.target.value })} data-testid="health-beneficiary" />
              </Field>
              <Field label="Relationship (optional)">
                <Input className="rounded-xl" value={form.beneficiary_relationship} onChange={(e) => set({ beneficiary_relationship: e.target.value })} placeholder="spouse / parent / child" />
              </Field>
            </div>

            <div className="mt-6 space-y-3">
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input type="checkbox" checked={form.malaysian_resident} onChange={(e) => set({ malaysian_resident: e.target.checked })} className="mt-0.5" data-testid="health-resident-check" />
                <span>I am a Malaysian citizen, permanent resident, or a legal work permit / employment pass holder residing in Malaysia.</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input type="checkbox" checked={form.accept_privacy} onChange={(e) => set({ accept_privacy: e.target.checked })} className="mt-0.5" data-testid="health-privacy-check" />
                <span>I have read and agree to the <a href="#" className="text-primary-700 underline">Privacy Notice</a>.</span>
              </label>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(0)} className="rounded-full">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={generateQuote} disabled={!canContinueStep1 || loading} data-testid="health-step1-next" className="rounded-full bg-primary hover:bg-primary-600 text-white px-6 h-11">
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
            <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-1">Step 3</div>
            <h2 className="font-display text-3xl font-semibold mb-1">Ready to checkout</h2>
            <p className="text-gray-500 text-sm mb-6">Your Critical Safe+ summary. Pay securely via Stripe.</p>

            <div className="rounded-2xl bg-primary-50/40 border border-primary/20 p-5 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <HeartPulse className="w-5 h-5 text-primary-700" />
                <div className="font-semibold text-gray-900">Critical Safe+</div>
              </div>
              <div className="text-sm text-gray-600">
                <strong>{quote.meta?.coverage_option?.label}</strong> · {quote.meta?.plan?.label} ·
                Sum insured <strong>{format(quote.meta?.plan?.sum_insured || 0, { decimals: 0 })}</strong>
              </div>
              <div className="text-xs text-gray-500 mt-1">12-month policy · holder {quote.meta?.insured_name}</div>
            </div>

            <dl className="divide-y divide-gray-100 text-sm">
              <Row label="Basic premium" value={format(quote.meta?.gross_premium || 0)} />
              <Row label={`Online discount (${quote.meta?.online_discount_pct}%)`} value={`− ${format(quote.meta?.online_discount || 0)}`} accent="green" />
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
            <Button onClick={pay} disabled={loading} data-testid="health-pay-btn" className="w-full rounded-full bg-primary hover:bg-primary-600 text-white h-11">
              {loading ? "Redirecting…" : "Pay with Stripe"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <button
              onClick={skipPayment}
              disabled={loading}
              data-testid="health-skip-payment-btn"
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

function Row({ label, value, big, accent }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className={`${big ? "font-semibold text-gray-900" : "text-gray-500"}`}>{label}</span>
      <span className={`font-mono ${big ? "font-display text-xl font-semibold text-gray-900" : ""} ${accent === "green" ? "text-green-700" : ""}`}>{value}</span>
    </div>
  );
}
