import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import QuickFillBanner from "@/components/app/QuickFillBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Car, ShieldCheck, CreditCard, ArrowRight, ArrowLeft, Check, User, Briefcase, Lock, Search, Sparkles,
} from "lucide-react";

const STEPS = [
  { key: "plan", label: "Plan Selection", icon: Car },
  { key: "personal", label: "Personal Details", icon: User },
  { key: "summary", label: "Summary & Payment", icon: CreditCard },
];

const fieldOn = (product, key) => {
  const entry = product?.form_config?.[key];
  return entry ? entry.enabled !== false : true;
};
const fieldReq = (product, key) => {
  const entry = product?.form_config?.[key];
  return entry ? entry.required !== false : true;
};

export default function MotorQuote() {
  const { productId } = useParams();
  const { user } = useAuth();
  const { format } = useCurrency();
  const nav = useNavigate();

  const [product, setProduct] = useState(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [vehicle, setVehicle] = useState(null);

  const [form, setForm] = useState({
    account_type: "personal",
    vehicle_reg: "",
    id_type: "nric",
    id_number: "",
    full_name: user?.full_name || "",
    date_of_birth: "",
    postcode: "",
    email: user?.email || "",
    privacy_accepted: false,
    cover_type: "comprehensive",
    sum_insured: 30000,
    ncd_percent: 25,
    addons: [],
  });

  useEffect(() => {
    if (productId) api.get(`/products/${productId}`).then((r) => setProduct(r.data));
    else api.get("/products?category=motor").then((r) => setProduct(r.data?.[0]));
  }, [productId]);

  useEffect(() => {
    if (user)
      setForm((f) => ({
        ...f,
        full_name: f.full_name || user.full_name || "",
        email: f.email || user.email || "",
      }));
  }, [user]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const lookupVehicle = async () => {
    if (!user) { toast.error("Please sign in to look up a vehicle"); return nav("/login"); }
    if (!form.vehicle_reg.trim()) return toast.error("Enter vehicle registration");
    setLookingUp(true);
    try {
      const r = await api.post("/vehicles/lookup", { vehicle_reg: form.vehicle_reg });
      setVehicle(r.data);
      update({ sum_insured: r.data.market_value, ncd_percent: r.data.ncd_eligible });
      toast.success(`Found: ${r.data.year} ${r.data.make} ${r.data.model}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Lookup failed");
    } finally {
      setLookingUp(false);
    }
  };

  const canSubmitStep0 = (() => {
    if (!product) return false;
    const checks = [
      ["vehicle_reg", form.vehicle_reg.trim()],
      ["id_number", form.id_number.trim()],
      ["full_name", form.full_name.trim()],
      ["date_of_birth", form.date_of_birth],
      ["postcode", form.postcode.trim()],
      ["email", form.email.trim()],
    ];
    for (const [k, v] of checks) {
      if (fieldOn(product, k) && fieldReq(product, k) && !v) return false;
    }
    return form.privacy_accepted;
  })();

  const canSubmitStep1 = form.sum_insured > 0 && form.cover_type;

  const submitQuote = async () => {
    if (!user) { toast.error("Please sign in to continue"); return nav("/login"); }
    if (!product) return;
    setLoading(true);
    try {
      const r = await api.post("/quotes/motor", {
        product_id: product.id,
        account_type: form.account_type,
        vehicle_reg: form.vehicle_reg.trim(),
        id_type: form.id_type,
        id_number: form.id_number.trim(),
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth,
        postcode: form.postcode.trim(),
        email: form.email.trim(),
        cover_type: form.cover_type,
        sum_insured: parseFloat(form.sum_insured),
        ncd_percent: parseFloat(form.ncd_percent || 0),
        addons: form.addons,
      });
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
        quote_id: quote.id,
        origin_url: window.location.origin,
      });
      window.location.href = r.data.url;
    } catch {
      toast.error("Could not start checkout");
      setLoading(false);
    }
  };

  const show = (k) => fieldOn(product, k);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="motor-quote-page">
      <div className="flex items-center justify-between mb-10">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <React.Fragment key={s.key}>
              <div data-testid={`motor-step-${i}`} className="flex items-center gap-3 flex-shrink-0">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
                  active ? "bg-primary text-white shadow-float"
                    : done ? "bg-primary-50 text-primary-700 border border-primary/30"
                    : "bg-gray-100 text-gray-400"
                }`}>
                  {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <div className="hidden sm:block">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Step {i + 1}</div>
                  <div className={`text-sm font-medium ${active ? "text-gray-900" : done ? "text-gray-700" : "text-gray-400"}`}>{s.label}</div>
                </div>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-4 ${done ? "bg-primary" : "bg-gray-200"}`} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
        {step === 0 && (
          <div className="animate-fade-in-up">
            <h2 className="font-display text-3xl font-semibold tracking-tight mb-2">Let's get your car insurance quote</h2>
            <p className="text-gray-500 mb-6">It takes under 3 minutes — and you get an instant 10% online rebate.</p>

            <QuickFillBanner
              testIdPrefix="motor-quickfill"
              onApply={(p) => update({
                full_name: p.full_name || form.full_name,
                id_type: p.id_type || form.id_type,
                id_number: p.id_number || form.id_number,
                email: p.email || form.email,
                postcode: p.postcode || form.postcode,
                date_of_birth: p.date_of_birth || form.date_of_birth,
              })}
            />

            {show("account_type") && (
              <div className="inline-flex bg-gray-100 rounded-full p-1 mb-6">
                {[{ key: "personal", label: "Personal", icon: User }, { key: "business", label: "Business", icon: Briefcase }].map(
                  ({ key, label, icon: Ic }) => (
                    <button
                      key={key}
                      data-testid={`account-${key}`}
                      onClick={() => update({ account_type: key })}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        form.account_type === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                      }`}
                    >
                      <Ic className="w-3.5 h-3.5" /> {label}
                    </button>
                  )
                )}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-5">
              {show("vehicle_reg") && (
                <div className="md:col-span-2">
                  <Label htmlFor="vreg">Vehicle Registration No.{fieldReq(product, "vehicle_reg") ? " *" : ""}</Label>
                  <div className="flex gap-2 items-stretch">
                    <Input
                      id="vreg"
                      data-testid="vehicle-reg-input"
                      placeholder="WXY 1234"
                      value={form.vehicle_reg}
                      onChange={(e) => { update({ vehicle_reg: e.target.value.toUpperCase() }); setVehicle(null); }}
                      className="rounded-xl h-12 uppercase font-mono flex-1"
                    />
                    {show("vehicle_lookup") && (
                      <Button
                        type="button"
                        onClick={lookupVehicle}
                        disabled={lookingUp || !form.vehicle_reg.trim()}
                        data-testid="vehicle-lookup-btn"
                        className="rounded-xl bg-primary hover:bg-primary-600 text-white h-12 px-5"
                      >
                        {lookingUp ? "Looking up…" : (<><Search className="w-4 h-4 mr-1.5" /> Look up</>)}
                      </Button>
                    )}
                  </div>
                  {vehicle && (
                    <div data-testid="vehicle-lookup-result" className="mt-3 bg-gradient-to-br from-primary-50 to-white border border-primary-200 rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs uppercase tracking-widest text-primary-800 font-semibold mb-1">Vehicle found</div>
                          <div className="font-display text-lg font-semibold">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{vehicle.engine_cc || "EV"} cc · {vehicle.body_type}</div>
                          <div className="flex flex-wrap gap-4 mt-3 text-sm">
                            <div><span className="text-gray-500">Market value:</span> <span className="font-semibold">{format(vehicle.market_value, { decimals: 0 })}</span></div>
                            <div><span className="text-gray-500">Suggested NCD:</span> <span className="font-semibold">{vehicle.ncd_eligible}%</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {show("id_type") && (
                <div>
                  <Label>ID Type</Label>
                  <div className="inline-flex bg-gray-100 rounded-full p-1 w-full mt-1">
                    {["nric", "passport"].map((t) => (
                      <button
                        key={t}
                        data-testid={`id-type-${t}`}
                        onClick={() => update({ id_type: t })}
                        className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
                          form.id_type === t ? "bg-white shadow-sm" : "text-gray-500"
                        }`}
                      >
                        {t === "nric" ? "NRIC" : "Passport"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {show("id_number") && (
                <div>
                  <Label htmlFor="id-num">
                    {form.id_type === "nric" ? "NRIC Number" : "Passport Number"}{fieldReq(product, "id_number") ? " *" : ""}
                  </Label>
                  <Input id="id-num" data-testid="id-number-input"
                    placeholder={form.id_type === "nric" ? "900101-14-1234" : "A12345678"}
                    value={form.id_number}
                    onChange={(e) => update({ id_number: e.target.value })}
                    className="rounded-xl h-12" />
                </div>
              )}

              {show("date_of_birth") && (
                <div>
                  <Label htmlFor="dob">Date of Birth{fieldReq(product, "date_of_birth") ? " *" : ""}</Label>
                  <Input id="dob" data-testid="dob-input" type="date"
                    value={form.date_of_birth}
                    onChange={(e) => update({ date_of_birth: e.target.value })}
                    className="rounded-xl h-12" />
                </div>
              )}

              {show("full_name") && (
                <div className="md:col-span-2">
                  <Label htmlFor="fname">Full Name (As Per NRIC/Passport){fieldReq(product, "full_name") ? " *" : ""}</Label>
                  <Input id="fname" data-testid="full-name-input" placeholder="FULL NAME AS PER ID"
                    value={form.full_name}
                    onChange={(e) => update({ full_name: e.target.value })}
                    className="rounded-xl h-12 uppercase" />
                </div>
              )}

              {show("postcode") && (
                <div>
                  <Label htmlFor="pc">Postcode{fieldReq(product, "postcode") ? " *" : ""}</Label>
                  <Input id="pc" data-testid="postcode-input" placeholder="50490"
                    value={form.postcode}
                    onChange={(e) => update({ postcode: e.target.value })}
                    className="rounded-xl h-12" />
                </div>
              )}

              {show("email") && (
                <div>
                  <Label htmlFor="email">Email{fieldReq(product, "email") ? " *" : ""}</Label>
                  <Input id="email" data-testid="email-input" type="email" placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => update({ email: e.target.value })}
                    className="rounded-xl h-12" />
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 mt-8 cursor-pointer">
              <Checkbox data-testid="privacy-checkbox" checked={form.privacy_accepted}
                onCheckedChange={(v) => update({ privacy_accepted: !!v })} className="mt-0.5" />
              <span className="text-sm text-gray-600 leading-relaxed">
                By clicking <strong>Get Quote</strong>, you have read and agreed to our{" "}
                <a href="#" className="text-primary-700 font-medium hover:underline">Privacy Notice</a>.
              </span>
            </label>

            <div className="flex flex-wrap gap-3 mt-8">
              <Button variant="outline" onClick={() => nav("/products/motor-easy")} className="rounded-full h-12 px-6" data-testid="motor-back-btn">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={next} disabled={!canSubmitStep0} aria-disabled={!canSubmitStep0} data-testid="motor-step0-next"
                className="rounded-full bg-primary hover:bg-primary-600 text-white h-12 px-8 shadow-float ml-auto">
                Continue to plan <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 1 && product && (
          <div className="animate-fade-in-up">
            <h2 className="font-display text-3xl font-semibold tracking-tight mb-2">Pick your cover</h2>
            <p className="text-gray-500 mb-6">Tune your sum insured, No Claim Discount and optional add-ons.</p>

            {show("cover_type") && (
              <>
                <Label className="mb-2 block">Cover type</Label>
                <div className="grid md:grid-cols-2 gap-3 mb-6">
                  {[
                    { key: "comprehensive", title: "Comprehensive", body: "Own damage, theft, fire + third-party.", badge: "Recommended" },
                    { key: "third_party", title: "Third Party", body: "Legal minimum — third-party only." },
                  ].map((c) => (
                    <button key={c.key} type="button" data-testid={`cover-${c.key}`}
                      onClick={() => update({ cover_type: c.key })}
                      className={`text-left p-5 rounded-2xl border-2 transition-all ${
                        form.cover_type === c.key ? "border-primary bg-primary-50" : "border-gray-100 hover:border-gray-200"
                      }`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-display text-lg font-semibold">{c.title}</div>
                        {c.badge && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-white font-bold">{c.badge}</span>}
                      </div>
                      <div className="text-sm text-gray-500">{c.body}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              {show("sum_insured") && (
                <div>
                  <Label htmlFor="si" className="flex items-center justify-between">
                    <span>Sum Insured (USD)</span>
                    {vehicle && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold uppercase tracking-wider">
                        Auto-filled from lookup
                      </span>
                    )}
                  </Label>
                  <Input id="si" type="number" data-testid="sum-insured-input"
                    value={form.sum_insured}
                    onChange={(e) => update({ sum_insured: e.target.value })}
                    className={`rounded-xl h-12 ${vehicle ? "bg-primary-50/40 border-primary/30" : ""}`}
                    min={1000} max={500000} />
                  <p className="text-xs text-gray-500 mt-1">
                    {vehicle ? `Market value for your ${vehicle.year} ${vehicle.make} ${vehicle.model}.` : "Based on your car's market value. Up to $500,000."}
                  </p>
                </div>
              )}
              {show("ncd_percent") && (
                <div>
                  <Label htmlFor="ncd">No Claim Discount (%)</Label>
                  <Input id="ncd" type="number" data-testid="ncd-input"
                    value={form.ncd_percent}
                    onChange={(e) => update({ ncd_percent: e.target.value })}
                    className="rounded-xl h-12" min={0} max={55} />
                  <p className="text-xs text-gray-500 mt-1">0% — 55%. You'll get a further 10% online rebate on top.</p>
                </div>
              )}
            </div>

            {show("addons") && (
              <div>
                <Label className="mb-2 block">Optional add-ons</Label>
                <div className="grid md:grid-cols-2 gap-2">
                  {product.addons?.map((a) => {
                    const checked = form.addons.includes(a.name);
                    return (
                      <label key={a.name}
                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                          checked ? "border-primary bg-primary-50" : "border-gray-100 hover:border-gray-200"
                        }`}>
                        <Checkbox checked={checked}
                          data-testid={`motor-addon-${a.name.replace(/\W+/g, "-").toLowerCase()}`}
                          onCheckedChange={(v) =>
                            setForm((f) => ({
                              ...f,
                              addons: v ? [...f.addons, a.name] : f.addons.filter((n) => n !== a.name),
                            }))
                          } />
                        <div className="flex-1">
                          <div className="font-medium">{a.name}</div>
                          <div className="text-xs text-gray-500">+{format(a.price)}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <Button onClick={prev} variant="outline" className="flex-1 h-12 rounded-full" data-testid="motor-step1-back">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={submitQuote} disabled={loading || !canSubmitStep1} data-testid="motor-get-quote-btn"
                className="flex-1 h-12 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float">
                {loading ? "Calculating..." : "Get my quote"}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && quote && (
          <div className="animate-fade-in-up" data-testid="motor-quote-result">
            <h2 className="font-display text-3xl font-semibold tracking-tight mb-2">Your Motor Easy quote</h2>
            <p className="text-gray-500 mb-6">Review the breakdown and proceed to secure checkout.</p>

            <div className="grid md:grid-cols-5 gap-5">
              <div className="md:col-span-3 space-y-4">
                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{product?.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{quote.input.cover_type.replace("_", " ")} · {form.vehicle_reg}</div>
                    </div>
                  </div>
                  {vehicle && (
                    <div className="text-sm bg-white rounded-xl p-3 border border-gray-100 mb-3">
                      <span className="text-gray-500">Vehicle: </span>
                      <span className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model} · {vehicle.body_type}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Field label="Insured Name" value={quote.input.full_name} />
                    <Field label={quote.input.id_type === "nric" ? "NRIC" : "Passport"} value={quote.input.id_number} />
                    <Field label="Postcode" value={quote.input.postcode} />
                    <Field label="Email" value={quote.input.email} />
                    <Field label="Sum Insured" value={format(parseFloat(quote.input.sum_insured), { decimals: 0 })} />
                    <Field label="NCD" value={`${quote.input.ncd_percent}%`} />
                  </div>
                </div>

                {quote.input.addons?.length > 0 && (
                  <div className="bg-gray-50 rounded-2xl p-5">
                    <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Selected add-ons</div>
                    <ul className="space-y-1.5 text-sm">
                      {quote.input.addons.map((a) => (
                        <li key={a} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary-700" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="bg-white rounded-2xl p-5 border border-primary/30 shadow-float sticky top-24">
                  <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-1">Order summary</div>
                  <div className="space-y-2 text-sm mt-3 mb-4">
                    <Row label="Gross premium" value={quote.meta?.gross_premium != null ? format(quote.meta.gross_premium) : "-"} />
                    {quote.meta?.ncd_discount > 0 && (
                      <Row label={`NCD (${quote.input.ncd_percent}%)`} value={`- ${format(quote.meta.ncd_discount)}`} negative />
                    )}
                    {quote.meta?.online_rebate > 0 && (
                      <Row label="Online rebate (10%)" value={`- ${format(quote.meta.online_rebate)}`} negative />
                    )}
                    <Row label="Add-ons" value={format(quote.addon_total)} />
                    <Row label="SST (8%)" value={format(quote.tax)} />
                  </div>
                  <div className="flex justify-between font-display text-xl font-semibold pt-4 border-t border-gray-100 mb-5">
                    <span>Total</span>
                    <span>{format(quote.total)}</span>
                  </div>
                  <Button onClick={pay} disabled={loading} data-testid="motor-pay-btn"
                    className="w-full h-12 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float">
                    <CreditCard className="w-4 h-4 mr-2" />
                    {loading ? "Redirecting..." : "Pay securely"}
                  </Button>
                  <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-gray-400">
                    <Lock className="w-3 h-3" /> Stripe · 256-bit encryption
                  </div>
                </div>
              </div>
            </div>

            <div className="flex mt-8">
              <Button onClick={() => { setQuote(null); setStep(1); }} variant="outline" className="rounded-full h-11" data-testid="motor-edit-quote-btn">
                Edit quote
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 grid md:grid-cols-3 gap-3">
        <Trust icon={ShieldCheck} title="Secure by design" body="Bank-grade encryption at every step." />
        <Trust icon={Car} title="300+ Workshops" body="Nationwide panel for fast, easy repairs." />
        <Trust icon={Lock} title="3-minute checkout" body="From quote to policy, in minutes." />
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium truncate">{value}</div>
    </div>
  );
}
function Row({ label, value, negative }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium ${negative ? "text-green-700" : ""}`}>{value}</span>
    </div>
  );
}
function Trust({ icon: Icon, title, body }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700 flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-gray-500">{body}</div>
      </div>
    </div>
  );
}
