import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import QuickFillBanner from "@/components/app/QuickFillBanner";
import { toast } from "sonner";
import { Plane, MapPin, Users, Calendar, ArrowRight, ArrowLeft, Check, ShieldCheck } from "lucide-react";

const POPULAR_DESTINATIONS = [
  "Thailand", "Singapore", "Indonesia", "Vietnam", "Japan", "South Korea",
  "Taiwan", "Hong Kong", "China", "United Kingdom", "Australia", "United States",
  "Italy", "France", "Germany", "Spain", "Turkey", "United Arab Emirates",
  "India", "Maldives", "Philippines",
];

const STEPS = [
  { key: "plan", label: "Plan Selection" },
  { key: "personal", label: "Personal Details" },
  { key: "summary", label: "Summary & Payment" },
];

export default function TravelQuote() {
  const { productId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { format } = useCurrency();

  const [step, setStep] = useState(0);
  const [product, setProduct] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    region: "international",
    trip_type: "single_return",
    destinations: [],
    destination: "",
    traveler_type: "individual",
    age_category: "18_70",
    travelers: 1,
    email: user?.email || "",
    start_date: "",
    end_date: "",
    is_malaysian: true,
    accept_privacy: false,
    coverage_tier: "basic",
    addons: [],
    // step 2
    full_name: user?.full_name || "",
    id_type: "nric",
    id_number: "",
    phone: user?.phone || "",
    address: "",
    postcode: "",
    beneficiary_name: "",
    beneficiary_relationship: "spouse",
  });

  useEffect(() => {
    if (productId) {
      api.get(`/products/${productId}`).then((r) => setProduct(r.data));
    } else {
      // pick first travel product if no productId in route
      api.get("/products?category=travel").then((r) => {
        const p = (r.data || [])[0];
        if (p) {
          setProduct(p);
          window.history.replaceState({}, "", `/products/travel/${p.id}/quote`);
        }
      });
    }
  }, [productId]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleArr = (k, v) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v],
    }));

  const applyQuickFill = (p) => {
    setForm((f) => ({
      ...f,
      full_name: p.full_name || f.full_name,
      id_type: p.id_type || f.id_type,
      id_number: p.id_number || f.id_number,
      phone: p.phone || f.phone,
      email: p.email || f.email,
      address: p.address || f.address,
      postcode: p.postcode || f.postcode,
    }));
  };

  const validatePlan = () => {
    if (!form.start_date || !form.end_date) return "Please select travel dates";
    if (new Date(form.end_date) < new Date(form.start_date)) return "End date must be after start";
    if (form.region === "international" && form.destinations.length === 0)
      return "Please pick at least one destination";
    if (!form.email) return "Please enter your email";
    if (!form.is_malaysian) return "This product is for Malaysian residents only";
    if (!form.accept_privacy) return "Please accept the privacy notice";
    return null;
  };

  const submitQuote = async () => {
    const err = validatePlan();
    if (err) { toast.error(err); return; }
    if (!form.full_name || !form.id_number) {
      toast.error("Please complete your personal details");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        product_id: product.id,
        destination: form.destinations[0] || form.destination || "",
      };
      const r = await api.post("/quotes/travel", payload);
      setQuote(r.data);
      setStep(2);
      toast.success("Quote ready");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to generate quote");
    } finally {
      setLoading(false);
    }
  };

  const checkout = async () => {
    if (!quote) return;
    setLoading(true);
    try {
      const r = await api.post(`/payments/checkout`, {
        quote_id: quote.id,
        origin_url: window.location.origin,
      });
      if (r.data?.url) window.location.href = r.data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return <div className="p-12 text-center text-gray-400">Loading…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Stepper */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-8">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition ${
              i === step
                ? "bg-primary-700 text-white shadow-sm"
                : i < step
                ? "bg-primary-100 text-primary-700"
                : "bg-gray-100 text-gray-400"
            }`}
            data-testid={`travel-step-${s.key}`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
              i === step ? "bg-white/20" : i < step ? "bg-white/60" : "bg-white/40"
            }`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className="truncate">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Page header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center">
          <Plane className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold">{product.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Let’s get your travel insurance quote.</p>
        </div>
      </div>

      {/* STEP 1 — Plan Selection */}
      {step === 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-100">
          {/* Region toggle */}
          <RegionToggle value={form.region} onChange={(v) => update("region", v)} />

          {/* Trip type */}
          <Section label="Trip Type">
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "single_return", label: "Single Trip (Return)" },
                { key: "one_way", label: "One Way" },
                { key: "annual", label: "Annual" },
              ].map((t) => (
                <Pill
                  key={t.key}
                  active={form.trip_type === t.key}
                  onClick={() => update("trip_type", t.key)}
                  testId={`triptype-${t.key}`}
                >
                  {t.label}
                </Pill>
              ))}
            </div>
          </Section>

          {/* Destinations */}
          {form.region === "international" && (
            <Section label="Overseas Destination(s)">
              <DestPicker
                value={form.destinations}
                onChange={(v) => update("destinations", v)}
              />
            </Section>
          )}
          {form.region === "domestic" && (
            <Section label="Within Malaysia">
              <p className="text-xs text-gray-500">No destination selection needed for domestic trips.</p>
            </Section>
          )}

          {/* Traveller type & age */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Section label="Traveller Type">
              <select
                value={form.traveler_type}
                onChange={(e) => update("traveler_type", e.target.value)}
                className="elstar-input"
                data-testid="traveler-type-select"
              >
                <option value="individual">Individual</option>
                <option value="family">Family</option>
                <option value="group">Group</option>
              </select>
            </Section>
            <Section label="Age Category">
              <select
                value={form.age_category}
                onChange={(e) => update("age_category", e.target.value)}
                className="elstar-input"
                data-testid="age-category-select"
              >
                <option value="child">Child (under 18)</option>
                <option value="18_70">Adult (18 - 70)</option>
                <option value="70_plus">Senior (70+)</option>
              </select>
            </Section>
          </div>

          {/* Travelers */}
          <Section label="Number of Travellers">
            <input
              type="number" min={1} max={20}
              value={form.travelers}
              onChange={(e) => update("travelers", parseInt(e.target.value) || 1)}
              className="elstar-input w-32"
              data-testid="travelers-input"
            />
          </Section>

          {/* Email */}
          <Section label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@example.com"
              className="elstar-input"
              data-testid="travel-email-input"
            />
          </Section>

          {/* Travel period */}
          <Section label="Travel Period">
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} className="elstar-input" data-testid="travel-start-date" />
              <input type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} className="elstar-input" data-testid="travel-end-date" />
            </div>
          </Section>

          {/* Coverage tier */}
          <Section label="Plan">
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "basic", label: "Basic", desc: "Essential cover" },
                { key: "premium", label: "Premium", desc: "Most popular" },
                { key: "vip", label: "VIP", desc: "Top tier" },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => update("coverage_tier", t.key)}
                  data-testid={`tier-${t.key}`}
                  className={`text-left rounded-2xl border-2 p-3 transition ${
                    form.coverage_tier === t.key
                      ? "border-primary-700 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold text-sm">{t.label}</div>
                  <div className="text-xs text-gray-500">{t.desc}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* Add-ons */}
          {product.addons?.length > 0 && (
            <Section label="Add-ons (per traveller)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.addons.map((a) => (
                  <label
                    key={a.name}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-primary-300 cursor-pointer text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.addons.includes(a.name)}
                        onChange={() => toggleArr("addons", a.name)}
                        data-testid={`addon-${a.name.replace(/\s+/g, "-").toLowerCase()}`}
                      />
                      {a.name}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">+{format(a.price, { decimals: 0 })}</span>
                  </label>
                ))}
              </div>
            </Section>
          )}

          {/* Consent */}
          <div className="space-y-2 pt-3 border-t border-gray-100 mt-2">
            <label className="flex items-start gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={form.is_malaysian} onChange={(e) => update("is_malaysian", e.target.checked)} className="mt-0.5" data-testid="travel-malaysian" />
              I am / We are a Malaysian citizen / permanent resident or holder of a valid working permit, dependant pass, long-term social visit pass or student visa Malaysia.
            </label>
            <label className="flex items-start gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={form.accept_privacy} onChange={(e) => update("accept_privacy", e.target.checked)} className="mt-0.5" data-testid="travel-privacy" />
              I / We have read and agreed to the <a href="#" className="underline">Privacy Notice</a>.
            </label>
          </div>

          <div className="flex justify-between gap-3 mt-6 pt-5 border-t border-gray-100">
            <button onClick={() => nav(-1)} className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</button>
            <button
              onClick={() => {
                const e = validatePlan();
                if (e) { toast.error(e); return; }
                setStep(1);
              }}
              data-testid="travel-next-step-btn"
              className="px-5 py-2.5 rounded-xl bg-primary-700 text-white text-sm font-medium hover:bg-primary-800 inline-flex items-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Personal Details */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-100">
          <QuickFillBanner onApply={applyQuickFill} testIdPrefix="travel-quickfill" />

          <h2 className="font-display text-xl font-semibold mb-4">Primary Traveller</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name (as in NRIC/Passport)">
              <input type="text" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className="elstar-input" data-testid="travel-full-name" />
            </Field>
            <Field label="ID Type">
              <select value={form.id_type} onChange={(e) => update("id_type", e.target.value)} className="elstar-input" data-testid="travel-id-type">
                <option value="nric">NRIC (Malaysian IC)</option>
                <option value="passport">Passport</option>
              </select>
            </Field>
            <Field label={form.id_type === "nric" ? "NRIC / IC Number" : "Passport Number"}>
              <input type="text" value={form.id_number} onChange={(e) => update("id_number", e.target.value)} className="elstar-input font-mono" data-testid="travel-id-number" />
            </Field>
            <Field label="Mobile">
              <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+60123456789" className="elstar-input font-mono" data-testid="travel-phone" />
            </Field>
            <Field label="Postcode">
              <input type="text" value={form.postcode} onChange={(e) => update("postcode", e.target.value)} className="elstar-input font-mono" data-testid="travel-postcode" />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <textarea rows={2} value={form.address} onChange={(e) => update("address", e.target.value)} className="elstar-input" data-testid="travel-address" />
            </Field>
          </div>

          <h2 className="font-display text-xl font-semibold mt-7 mb-4">Beneficiary (optional)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Beneficiary Name">
              <input type="text" value={form.beneficiary_name} onChange={(e) => update("beneficiary_name", e.target.value)} className="elstar-input" data-testid="travel-beneficiary-name" />
            </Field>
            <Field label="Relationship">
              <select value={form.beneficiary_relationship} onChange={(e) => update("beneficiary_relationship", e.target.value)} className="elstar-input">
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="sibling">Sibling</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>

          <div className="flex justify-between gap-3 mt-6 pt-5 border-t border-gray-100">
            <button onClick={() => setStep(0)} className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</button>
            <button
              onClick={submitQuote}
              disabled={loading}
              data-testid="travel-get-quote-btn"
              className="px-5 py-2.5 rounded-xl bg-primary-700 text-white text-sm font-medium hover:bg-primary-800 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? "Calculating…" : "Get Quote"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Summary & Payment */}
      {step === 2 && quote && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-100">
          <div className="flex items-center justify-center text-center mb-6">
            <div>
              <div className="font-display text-5xl font-semibold">{format(quote.total)}</div>
              <div className="text-gray-500 text-sm mt-1">Total premium</div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 space-y-2 text-sm mb-6">
            <Row label="Base premium" value={format(quote.base_premium)} />
            <Row label="Add-ons" value={format(quote.addon_total)} />
            <Row label="Tax (8%)" value={format(quote.tax)} />
            <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
              <span>Total</span><span>{format(quote.total)}</span>
            </div>
          </div>
          <div className="bg-primary-50/40 border border-primary-100 rounded-2xl p-4 text-xs text-gray-700 mb-6 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary-700 shrink-0" />
            <div>
              <div className="font-semibold text-primary-800 mb-0.5">You're protected by Tune Protect Travel</div>
              24/7 worldwide assistance, emergency medical, trip cancellation & baggage cover.
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Edit</button>
            <div className="flex gap-2">
              <button
                onClick={async () => {
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
                }}
                disabled={loading}
                data-testid="travel-test-issue-btn"
                className="px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                title="Skip payment & issue policy (demo mode)"
              >
                Skip payment (demo)
              </button>
              <button
                onClick={checkout}
                disabled={loading}
                data-testid="travel-checkout-btn"
                className="px-5 py-2.5 rounded-xl bg-primary-700 text-white text-sm font-medium hover:bg-primary-800 inline-flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? "Redirecting…" : "Pay Now"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div className="mt-5">
      <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2 font-semibold">{label}</label>
      {children}
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Pill({ children, active, onClick, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition border-2 ${
        active ? "border-primary-700 bg-primary-50 text-primary-800" : "border-gray-200 hover:border-gray-300 text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function RegionToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-2xl border border-gray-200 p-1 bg-gray-50">
      <button
        type="button"
        onClick={() => onChange("international")}
        data-testid="region-international"
        className={`px-5 py-2 rounded-xl text-sm font-medium transition ${
          value === "international" ? "bg-white shadow-sm text-primary-800" : "text-gray-500"
        }`}
      >International</button>
      <button
        type="button"
        onClick={() => onChange("domestic")}
        data-testid="region-domestic"
        className={`px-5 py-2 rounded-xl text-sm font-medium transition ${
          value === "domestic" ? "bg-white shadow-sm text-primary-800" : "text-gray-500"
        }`}
      >Domestic</button>
    </div>
  );
}

function DestPicker({ value, onChange }) {
  const [query, setQuery] = useState("");
  const filtered = POPULAR_DESTINATIONS.filter((d) =>
    d.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search countries…"
        className="elstar-input mb-2"
        data-testid="destination-search"
      />
      <div className="flex flex-wrap gap-2">
        {filtered.slice(0, 12).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() =>
              onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d])
            }
            data-testid={`dest-${d.replace(/\s+/g, "-").toLowerCase()}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              value.includes(d)
                ? "border-primary-700 bg-primary-50 text-primary-800"
                : "border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            {value.includes(d) && <Check className="w-3 h-3 inline mr-1" />}
            {d}
          </button>
        ))}
      </div>
      {value.length > 0 && (
        <div className="text-xs text-gray-500 mt-2">
          Selected: {value.join(", ")}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
