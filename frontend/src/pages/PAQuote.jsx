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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Activity, User, CreditCard, ArrowRight, ArrowLeft, Check, Users, Lock, Heart,
} from "lucide-react";

const STEPS = [
  { key: "plan", label: "Plan Selection", icon: Activity },
  { key: "personal", label: "Personal Details", icon: User },
  { key: "summary", label: "Summary & Payment", icon: CreditCard },
];

const OCCUPATION_CLASSES = [
  { key: "class_1", label: "Class 1 — Office / Administrative", desc: "Desk-based work. No manual labour." },
  { key: "class_2", label: "Class 2 — Light manual / Supervisory", desc: "Occasional light labour. Retail, teaching." },
  { key: "class_3", label: "Class 3 — Heavy manual / Technical", desc: "Regular manual work. Construction, drivers." },
  { key: "class_4", label: "Class 4 — Hazardous", desc: "High-risk work. Heavy machinery operators." },
];

const RELATIONSHIPS = [
  { key: "spouse", label: "Spouse" },
  { key: "parent", label: "Parent" },
  { key: "child", label: "Child" },
  { key: "sibling", label: "Sibling" },
  { key: "other", label: "Other" },
];

const fieldOn = (product, key) => {
  const entry = product?.form_config?.[key];
  return entry ? entry.enabled !== false : true;
};
const fieldReq = (product, key) => {
  const entry = product?.form_config?.[key];
  return entry ? entry.required !== false : true;
};

export default function PAQuote() {
  const { productId } = useParams();
  const { user } = useAuth();
  const { format } = useCurrency();
  const nav = useNavigate();

  const [product, setProduct] = useState(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);

  const [form, setForm] = useState({
    num_persons: 1,
    full_name: user?.full_name || "",
    id_type: "nric",
    id_number: "",
    gender: "male",
    date_of_birth: "",
    nationality: "malaysian",
    occupation_class: "class_1",
    email: user?.email || "",
    phone: "",
    address: "",
    postcode: "",
    beneficiary_name: "",
    beneficiary_relationship: "spouse",
    beneficiary_nric: "",
    privacy_accepted: false,
  });

  useEffect(() => {
    if (productId) api.get(`/products/${productId}`).then((r) => setProduct(r.data));
    else api.get("/products?category=pa").then((r) => setProduct(r.data?.[0]));
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

  const show = (k) => fieldOn(product, k);

  // Step 0 (plan) — always allow continue (num_persons defaults to 1)
  // Step 1 (personal) — validate required fields
  const canSubmitStep1 = (() => {
    if (!product) return false;
    const checks = [
      ["full_name", form.full_name.trim()],
      ["id_number", form.id_number.trim()],
      ["date_of_birth", form.date_of_birth],
      ["email", form.email.trim()],
      ["phone", form.phone.trim()],
      ["postcode", form.postcode.trim()],
      ["beneficiary_name", form.beneficiary_name.trim()],
    ];
    for (const [k, v] of checks) {
      if (fieldOn(product, k) && fieldReq(product, k) && !v) return false;
    }
    return form.privacy_accepted;
  })();

  const submitQuote = async () => {
    if (!user) { toast.error("Please sign in to continue"); return nav("/login"); }
    if (!product) return;
    setLoading(true);
    try {
      const r = await api.post("/quotes/pa", {
        product_id: product.id,
        num_persons: parseInt(form.num_persons) || 1,
        full_name: form.full_name.trim(),
        id_type: form.id_type,
        id_number: form.id_number.trim(),
        gender: form.gender,
        date_of_birth: form.date_of_birth,
        nationality: form.nationality,
        occupation_class: form.occupation_class,
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        postcode: form.postcode.trim(),
        beneficiary_name: form.beneficiary_name.trim(),
        beneficiary_relationship: form.beneficiary_relationship,
        beneficiary_nric: form.beneficiary_nric.trim(),
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="pa-quote-page">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-10">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <React.Fragment key={s.key}>
              <div data-testid={`pa-step-${i}`} className="flex items-center gap-3 flex-shrink-0">
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
        {/* STEP 0 — Plan Selection */}
        {step === 0 && (
          <div className="animate-fade-in-up">
            <div className="grid md:grid-cols-5 gap-6">
              <div className="md:col-span-3">
                <h2 className="font-display text-3xl font-semibold tracking-tight mb-2">PA Easy</h2>
                <p className="text-gray-500 mb-6">Only $29.16/year — a small price for big peace of mind.</p>

                {/* Plan card */}
                <div className="bg-gradient-to-br from-primary-50 to-white rounded-2xl p-5 border border-primary-100 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-display text-lg font-semibold">Plan Name: PA Easy</div>
                      <div className="text-xs text-gray-500">Coverage Term: 1 year (renewable) · Eligible Age: 18 – 70</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-white font-bold">-25%</span>
                  </div>
                  <ul className="space-y-2 mt-3">
                    {[
                      ["Death & Permanent Disablement", `Up to ${format(10000, { decimals: 0 })}`],
                      ["Hospital Income", `${format(50, { decimals: 0 })}/day up to 30 days`],
                      ["Ambulance Services", `Up to ${format(200, { decimals: 0 })}`],
                      ["Bereavement / Funeral Expenses", format(1500, { decimals: 0 })],
                      ["Dental & Clinical Treatment", `Up to ${format(1000, { decimals: 0 })}`],
                      ["Fuel Station Accident Benefit", format(10000, { decimals: 0 })],
                    ].map(([name, amt]) => (
                      <li key={name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-700">
                          <Check className="w-4 h-4 text-primary-700" /> {name}
                        </span>
                        <span className="font-semibold">{amt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* num persons */}
                {show("num_persons") && (
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-primary-700" /> Number of persons to insure
                    </Label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => update({ num_persons: Math.max(1, form.num_persons - 1) })}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-semibold"
                        data-testid="pa-persons-minus"
                      >
                        −
                      </button>
                      <div
                        className="w-16 text-center font-display text-2xl font-semibold"
                        data-testid="pa-persons-count"
                      >
                        {form.num_persons}
                      </div>
                      <button
                        type="button"
                        onClick={() => update({ num_persons: Math.min(6, form.num_persons + 1) })}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-semibold"
                        data-testid="pa-persons-plus"
                      >
                        +
                      </button>
                      <div className="text-sm text-gray-500 ml-3">Up to 6 persons per policy</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Price preview */}
              <div className="md:col-span-2">
                <div className="bg-white rounded-2xl p-5 border border-primary/30 shadow-float sticky top-24">
                  <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-3">
                    Estimated
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-display text-4xl font-semibold">
                      {format(29.16 * form.num_persons)}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      {format(36 * form.num_persons)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-4">per year · all in</div>
                  <div className="space-y-1.5 text-xs bg-gray-50 rounded-xl p-3">
                    <div className="flex justify-between"><span className="text-gray-500">Basic premium</span><span>{format(36 * form.num_persons)}</span></div>
                    <div className="flex justify-between text-green-700"><span>25% online discount</span><span>- {format(9 * form.num_persons)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">SST (8%)</span><span>{format(2.16 * form.num_persons)}</span></div>
                  </div>
                  <div className="mt-4 text-[10px] text-gray-400">
                    Final price may vary based on occupation class. Ages 60+ may have a light loading.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-8">
              <Button
                variant="outline"
                onClick={() => nav("/products/pa-easy")}
                className="rounded-full h-12 px-6"
                data-testid="pa-back-btn"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={next}
                data-testid="pa-step0-next"
                className="rounded-full bg-primary hover:bg-primary-600 text-white h-12 px-8 shadow-float ml-auto"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 1 — Personal Details */}
        {step === 1 && product && (
          <div className="animate-fade-in-up">
            <h2 className="font-display text-3xl font-semibold tracking-tight mb-2">
              Your details
            </h2>
            <p className="text-gray-500 mb-6">
              Tell us about yourself and nominate a beneficiary. Everything's encrypted.
            </p>

            <QuickFillBanner
              testIdPrefix="pa-quickfill"
              onApply={(p) => update({
                full_name: p.full_name || form.full_name,
                id_type: p.id_type || form.id_type,
                id_number: p.id_number || form.id_number,
                phone: p.phone || form.phone,
                email: p.email || form.email,
                address: p.address || form.address,
                postcode: p.postcode || form.postcode,
                date_of_birth: p.date_of_birth || form.date_of_birth,
                gender: p.gender || form.gender,
                nationality: p.nationality || form.nationality,
              })}
            />

            <div className="grid md:grid-cols-2 gap-5">
              {show("full_name") && (
                <div className="md:col-span-2">
                  <Label htmlFor="fname">Full Name (as per NRIC/Passport){fieldReq(product, "full_name") ? " *" : ""}</Label>
                  <Input
                    id="fname"
                    data-testid="pa-full-name"
                    placeholder="FULL NAME"
                    value={form.full_name}
                    onChange={(e) => update({ full_name: e.target.value })}
                    className="rounded-xl h-12 uppercase"
                  />
                </div>
              )}

              {show("id_type") && (
                <div>
                  <Label>ID Type</Label>
                  <div className="inline-flex bg-gray-100 rounded-full p-1 w-full mt-1">
                    {["nric", "passport"].map((t) => (
                      <button
                        key={t}
                        data-testid={`pa-id-type-${t}`}
                        onClick={() => update({ id_type: t })}
                        className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
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
                    {form.id_type === "nric" ? "NRIC" : "Passport"}{fieldReq(product, "id_number") ? " *" : ""}
                  </Label>
                  <Input
                    id="id-num"
                    data-testid="pa-id-number"
                    placeholder={form.id_type === "nric" ? "900101-14-1234" : "A12345678"}
                    value={form.id_number}
                    onChange={(e) => update({ id_number: e.target.value })}
                    className="rounded-xl h-12"
                  />
                </div>
              )}

              {show("gender") && (
                <div>
                  <Label>Gender</Label>
                  <div className="inline-flex bg-gray-100 rounded-full p-1 w-full mt-1">
                    {["male", "female"].map((g) => (
                      <button
                        key={g}
                        data-testid={`pa-gender-${g}`}
                        onClick={() => update({ gender: g })}
                        className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
                          form.gender === g ? "bg-white shadow-sm" : "text-gray-500"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {show("date_of_birth") && (
                <div>
                  <Label htmlFor="dob">Date of Birth{fieldReq(product, "date_of_birth") ? " *" : ""}</Label>
                  <Input
                    id="dob"
                    data-testid="pa-dob"
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => update({ date_of_birth: e.target.value })}
                    className="rounded-xl h-12"
                  />
                  <p className="text-xs text-gray-500 mt-1">Eligibility: 18 – 70 years old</p>
                </div>
              )}

              {show("nationality") && (
                <div>
                  <Label>Nationality</Label>
                  <div className="inline-flex bg-gray-100 rounded-full p-1 w-full mt-1">
                    {[
                      { key: "malaysian", label: "Malaysian" },
                      { key: "non_malaysian", label: "Non-Malaysian" },
                    ].map((n) => (
                      <button
                        key={n.key}
                        data-testid={`pa-nationality-${n.key}`}
                        onClick={() => update({ nationality: n.key })}
                        className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          form.nationality === n.key ? "bg-white shadow-sm" : "text-gray-500"
                        }`}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {show("occupation_class") && (
                <div className="md:col-span-2">
                  <Label>Occupation Class</Label>
                  <div className="grid md:grid-cols-2 gap-2 mt-1">
                    {OCCUPATION_CLASSES.map((oc) => (
                      <button
                        key={oc.key}
                        type="button"
                        data-testid={`pa-occupation-${oc.key}`}
                        onClick={() => update({ occupation_class: oc.key })}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${
                          form.occupation_class === oc.key
                            ? "border-primary bg-primary-50"
                            : "border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <div className="font-medium text-sm">{oc.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{oc.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {show("email") && (
                <div>
                  <Label htmlFor="email">Email{fieldReq(product, "email") ? " *" : ""}</Label>
                  <Input
                    id="email"
                    data-testid="pa-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update({ email: e.target.value })}
                    className="rounded-xl h-12"
                  />
                </div>
              )}

              {show("phone") && (
                <div>
                  <Label htmlFor="phone">Phone{fieldReq(product, "phone") ? " *" : ""}</Label>
                  <Input
                    id="phone"
                    data-testid="pa-phone"
                    placeholder="+14155550123"
                    value={form.phone}
                    onChange={(e) => update({ phone: e.target.value })}
                    className="rounded-xl h-12"
                  />
                </div>
              )}

              {show("address") && (
                <div className="md:col-span-2">
                  <Label htmlFor="addr">Residential Address{fieldReq(product, "address") ? " *" : ""}</Label>
                  <Textarea
                    id="addr"
                    data-testid="pa-address"
                    rows={2}
                    value={form.address}
                    onChange={(e) => update({ address: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              )}

              {show("postcode") && (
                <div>
                  <Label htmlFor="pc">Postcode{fieldReq(product, "postcode") ? " *" : ""}</Label>
                  <Input
                    id="pc"
                    data-testid="pa-postcode"
                    placeholder="50490"
                    value={form.postcode}
                    onChange={(e) => update({ postcode: e.target.value })}
                    className="rounded-xl h-12"
                  />
                </div>
              )}
            </div>

            {/* Beneficiary */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-4 h-4 text-primary-700" />
                <h3 className="font-display text-lg font-semibold">Beneficiary nomination</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {show("beneficiary_name") && (
                  <div className="md:col-span-2">
                    <Label htmlFor="ben-name">Beneficiary Full Name{fieldReq(product, "beneficiary_name") ? " *" : ""}</Label>
                    <Input
                      id="ben-name"
                      data-testid="pa-beneficiary-name"
                      value={form.beneficiary_name}
                      onChange={(e) => update({ beneficiary_name: e.target.value })}
                      className="rounded-xl h-12 uppercase"
                    />
                  </div>
                )}
                {show("beneficiary_relationship") && (
                  <div>
                    <Label>Relationship</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {RELATIONSHIPS.map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          data-testid={`pa-relation-${r.key}`}
                          onClick={() => update({ beneficiary_relationship: r.key })}
                          className={`px-3.5 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                            form.beneficiary_relationship === r.key
                              ? "bg-primary text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {show("beneficiary_nric") && (
                  <div>
                    <Label htmlFor="ben-nric">Beneficiary NRIC (optional)</Label>
                    <Input
                      id="ben-nric"
                      data-testid="pa-beneficiary-nric"
                      value={form.beneficiary_nric}
                      onChange={(e) => update({ beneficiary_nric: e.target.value })}
                      className="rounded-xl h-12"
                    />
                  </div>
                )}
              </div>
            </div>

            <label className="flex items-start gap-3 mt-8 cursor-pointer">
              <Checkbox
                data-testid="pa-privacy-checkbox"
                checked={form.privacy_accepted}
                onCheckedChange={(v) => update({ privacy_accepted: !!v })}
                className="mt-0.5"
              />
              <span className="text-sm text-gray-600 leading-relaxed">
                I declare that the above information is true and accurate. I have read and agreed to
                the{" "}
                <a href="#" className="text-primary-700 font-medium hover:underline">Privacy Notice</a>{" "}
                and <a href="#" className="text-primary-700 font-medium hover:underline">Product Disclosure Sheet</a>.
              </span>
            </label>

            <div className="flex gap-3 mt-8">
              <Button
                onClick={prev}
                variant="outline"
                className="flex-1 h-12 rounded-full"
                data-testid="pa-step1-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={submitQuote}
                disabled={loading || !canSubmitStep1}
                data-testid="pa-get-quote-btn"
                className="flex-1 h-12 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
              >
                {loading ? "Calculating..." : "Get my quote"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2 — Summary */}
        {step === 2 && quote && (
          <div className="animate-fade-in-up" data-testid="pa-quote-result">
            <h2 className="font-display text-3xl font-semibold tracking-tight mb-2">Your PA Easy quote</h2>
            <p className="text-gray-500 mb-6">Review and pay securely.</p>

            <div className="grid md:grid-cols-5 gap-5">
              <div className="md:col-span-3 space-y-4">
                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold">PA Easy</div>
                      <div className="text-xs text-gray-500">
                        {quote.meta?.num_persons} person(s) · Age {quote.meta?.age} · {quote.input.occupation_class.replace("_", " ")}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Field label="Insured" value={quote.input.full_name} />
                    <Field label={quote.input.id_type === "nric" ? "NRIC" : "Passport"} value={quote.input.id_number} />
                    <Field label="Email" value={quote.input.email} />
                    <Field label="Phone" value={quote.input.phone} />
                    <Field label="Postcode" value={quote.input.postcode} />
                    <Field label="Nationality" value={quote.input.nationality === "malaysian" ? "Malaysian" : "Non-Malaysian"} />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="w-4 h-4 text-primary-700" />
                    <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Beneficiary</div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">{quote.input.beneficiary_name}</div>
                    <div className="text-gray-500 capitalize">Relationship: {quote.input.beneficiary_relationship}</div>
                    {quote.input.beneficiary_nric && (
                      <div className="text-gray-500">NRIC: {quote.input.beneficiary_nric}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="bg-white rounded-2xl p-5 border border-primary/30 shadow-float sticky top-24">
                  <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-1">
                    Order summary
                  </div>
                  <div className="space-y-2 text-sm mt-3 mb-4">
                    <Row label="Gross premium" value={format(quote.meta?.gross_premium || 0)} />
                    {quote.meta?.occupation_loading_pct > 0 && (
                      <Row
                        label={`Occupation loading +${quote.meta.occupation_loading_pct}%`}
                        value=""
                        meta
                      />
                    )}
                    <Row
                      label="25% online discount"
                      value={`- ${format(quote.meta?.online_discount || 0)}`}
                      negative
                    />
                    <Row label="SST (8%)" value={format(quote.tax)} />
                  </div>
                  <div className="flex justify-between font-display text-xl font-semibold pt-4 border-t border-gray-100 mb-5">
                    <span>Total</span>
                    <span>{format(quote.total)}</span>
                  </div>
                  <Button
                    onClick={pay}
                    disabled={loading}
                    data-testid="pa-pay-btn"
                    className="w-full h-12 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
                  >
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
              <Button
                onClick={() => { setQuote(null); setStep(1); }}
                variant="outline"
                className="rounded-full h-11"
                data-testid="pa-edit-btn"
              >
                Edit details
              </Button>
            </div>
          </div>
        )}
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
function Row({ label, value, negative, meta }) {
  return (
    <div className={`flex justify-between ${meta ? "text-xs text-gray-400" : ""}`}>
      <span className={meta ? "" : "text-gray-600"}>{label}</span>
      <span className={`font-medium ${negative ? "text-green-700" : ""}`}>{value}</span>
    </div>
  );
}
