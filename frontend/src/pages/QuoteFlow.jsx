import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plane, Users, MapPin, Calendar as CalIcon, ArrowRight, ArrowLeft } from "lucide-react";

const TIERS = [
  { key: "basic", label: "Basic", desc: "Essential medical + trip delay", badge: "Popular" },
  { key: "premium", label: "Premium", desc: "Higher limits + adventure sports" },
  { key: "vip", label: "VIP", desc: "Highest limits + concierge" },
];

export default function QuoteFlow() {
  const { productId } = useParams();
  const nav = useNavigate();
  const { format, code } = useCurrency();
  const [product, setProduct] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    destination: "",
    start_date: "",
    end_date: "",
    travelers: 1,
    coverage_tier: "basic",
    addons: [],
  });
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/products/${productId}`).then((r) => setProduct(r.data));
  }, [productId]);

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const submit = async () => {
    setLoading(true);
    try {
      const r = await api.post("/quotes/travel", {
        product_id: productId,
        ...form,
      });
      setQuote(r.data);
      setStep(4);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not generate quote");
    } finally {
      setLoading(false);
    }
  };

  if (!product) return <div className="max-w-3xl mx-auto p-12">Loading product...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="quote-flow">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary-700 mb-2">
          <Plane className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Travel Quote</span>
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">{product.name}</h1>
        <Progress value={(step / 4) * 100} className="mt-6 h-1.5" />
      </div>

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
        {step === 1 && (
          <div className="space-y-6 animate-fade-in-up">
            <div>
              <Label htmlFor="dest" className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-primary-700" /> Destination
              </Label>
              <Input
                id="dest"
                data-testid="quote-destination"
                placeholder="e.g. Tokyo, Japan"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="rounded-xl h-12"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sd" className="flex items-center gap-2 mb-2">
                  <CalIcon className="w-4 h-4 text-primary-700" /> Start date
                </Label>
                <Input
                  id="sd"
                  type="date"
                  data-testid="quote-start-date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="rounded-xl h-12"
                />
              </div>
              <div>
                <Label htmlFor="ed" className="flex items-center gap-2 mb-2">
                  <CalIcon className="w-4 h-4 text-primary-700" /> End date
                </Label>
                <Input
                  id="ed"
                  type="date"
                  data-testid="quote-end-date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="rounded-xl h-12"
                />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary-700" /> Travelers
              </Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, travelers: Math.max(1, form.travelers - 1) })}
                  className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-semibold"
                  data-testid="travelers-minus"
                >
                  −
                </button>
                <div className="w-16 text-center font-display text-2xl font-semibold" data-testid="travelers-count">
                  {form.travelers}
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, travelers: Math.min(10, form.travelers + 1) })}
                  className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-semibold"
                  data-testid="travelers-plus"
                >
                  +
                </button>
              </div>
            </div>
            <Button
              onClick={next}
              data-testid="quote-step1-next"
              disabled={!form.destination || !form.start_date || !form.end_date}
              className="w-full h-12 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in-up">
            <div>
              <h3 className="font-display text-xl font-semibold mb-4">Pick your coverage tier</h3>
              <div className="grid gap-3">
                {TIERS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setForm({ ...form, coverage_tier: t.key })}
                    data-testid={`tier-${t.key}`}
                    className={`text-left p-5 rounded-2xl border-2 transition-all ${
                      form.coverage_tier === t.key
                        ? "border-primary bg-primary-50"
                        : "border-gray-100 hover:border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold font-display text-lg">{t.label}</div>
                      {t.badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-white">
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={prev} variant="outline" className="flex-1 h-12 rounded-full">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={next}
                data-testid="quote-step2-next"
                className="flex-1 h-12 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in-up">
            <div>
              <h3 className="font-display text-xl font-semibold mb-1">Add-ons (optional)</h3>
              <p className="text-sm text-gray-500 mb-4">Customize your protection further.</p>
              <div className="space-y-3">
                {product.addons?.map((a) => {
                  const checked = form.addons.includes(a.name);
                  return (
                    <label
                      key={a.name}
                      className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
                        checked ? "border-primary bg-primary-50" : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        data-testid={`addon-${a.name.replace(/\s+/g, "-").toLowerCase()}`}
                        onCheckedChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            addons: v ? [...f.addons, a.name] : f.addons.filter((n) => n !== a.name),
                          }))
                        }
                      />
                      <div className="flex-1">
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-gray-500">+{format(a.price)} per traveler</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={prev} variant="outline" className="flex-1 h-12 rounded-full">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={submit}
                disabled={loading}
                data-testid="quote-submit-btn"
                className="flex-1 h-12 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
              >
                {loading ? "Calculating..." : "Get my quote"}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && quote && (
          <div className="animate-fade-in-up" data-testid="quote-result">
            <div className="text-center mb-6">
              <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-1">
                Your quote
              </div>
              <div className="font-display text-6xl font-semibold">{format(quote.total)}</div>
              <div className="text-gray-500 mt-1">Total · {code}</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-5 space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Base premium</span>
                <span className="font-medium">{format(quote.base_premium)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Add-ons</span>
                <span className="font-medium">{format(quote.addon_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (8%)</span>
                <span className="font-medium">{format(quote.tax)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
                <span>Total</span>
                <span>{format(quote.total)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={prev} variant="outline" className="flex-1 h-12 rounded-full">
                Edit quote
              </Button>
              <Button
                onClick={() => nav(`/checkout/${quote.id}`)}
                data-testid="quote-checkout-btn"
                className="flex-1 h-12 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
              >
                Continue to checkout <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
