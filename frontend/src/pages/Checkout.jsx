import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock, Shield, CreditCard } from "lucide-react";

export default function Checkout() {
  const { quoteId } = useParams();
  const nav = useNavigate();
  const { format } = useCurrency();
  const [quote, setQuote] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/quotes/${quoteId}`).then(async (r) => {
      setQuote(r.data);
      const p = await api.get(`/products/${r.data.product_id}`);
      setProduct(p.data);
    });
  }, [quoteId]);

  const pay = async () => {
    setLoading(true);
    try {
      const r = await api.post("/payments/checkout", {
        quote_id: quoteId,
        origin_url: window.location.origin,
      });
      window.location.href = r.data.url;
    } catch (e) {
      toast.error("Could not start checkout");
      setLoading(false);
    }
  };

  if (!quote) return <div className="max-w-4xl mx-auto p-12">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="checkout-page">
      <h1 className="font-display text-4xl font-semibold tracking-tight mb-8">Review & checkout</h1>

      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3 bg-white rounded-3xl p-6 border border-gray-100">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary-700" />
            </div>
            <div>
              <div className="font-display text-xl font-semibold">{product?.name}</div>
              <div className="text-sm text-gray-500 capitalize">{product?.category} · {quote.coverage_tier}</div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Destination</span><span className="font-medium">{quote.input?.destination}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Start</span><span className="font-medium">{quote.input?.start_date}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">End</span><span className="font-medium">{quote.input?.end_date}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Travelers</span><span className="font-medium">{quote.input?.travelers}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Add-ons</span><span className="font-medium">{quote.input?.addons?.length ? quote.input.addons.join(", ") : "None"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Coverage limit</span><span className="font-medium">{format(product?.coverage_amount, { decimals: 0 })}</span></div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 sticky top-24">
            <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-1">
              Order summary
            </div>
            <div className="space-y-2 text-sm mt-4 mb-4">
              <div className="flex justify-between"><span className="text-gray-600">Base premium</span><span>{format(quote.base_premium)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Add-ons</span><span>{format(quote.addon_total)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Tax (8%)</span><span>{format(quote.tax)}</span></div>
            </div>
            <div className="flex justify-between font-semibold text-lg pt-4 border-t border-gray-100 mb-6">
              <span>Total</span>
              <span className="font-display">{format(quote.total)}</span>
            </div>
            <Button
              onClick={pay}
              disabled={loading}
              data-testid="stripe-pay-btn"
              className="w-full h-12 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {loading ? "Redirecting..." : "Pay securely"}
            </Button>
            <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-gray-400">
              <Lock className="w-3 h-3" /> Secured by Stripe · 256-bit encryption
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
