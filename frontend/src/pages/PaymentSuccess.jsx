import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { CheckCircle2, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import PolicyCard from "@/components/app/PolicyCard";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { format } = useCurrency();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("checking");
  const [info, setInfo] = useState(null);
  const [policy, setPolicy] = useState(null);

  useEffect(() => {
    if (!sessionId) return setStatus("error");
    let attempts = 0;
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      if (attempts >= 12) return setStatus("timeout");
      attempts += 1;
      try {
        const r = await api.get(`/payments/status/${sessionId}`);
        if (r.data.payment_status === "paid") {
          setInfo(r.data);
          setStatus("paid");
          // Pull issued policy for the card
          if (r.data.policy_id) {
            try {
              const p = await api.get(`/policies/${r.data.policy_id}`);
              setPolicy(p.data);
            } catch {
              const all = await api.get(`/policies`);
              setPolicy((all.data || [])[0] || null);
            }
          } else {
            const all = await api.get(`/policies`);
            setPolicy((all.data || [])[0] || null);
          }
          return;
        }
        if (r.data.status === "expired") return setStatus("expired");
        setTimeout(poll, 2000);
      } catch {
        setTimeout(poll, 2000);
      }
    };
    poll();
    return () => { stopped = true; };
  }, [sessionId]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 sm:py-20" data-testid="payment-success-page">
      {status === "checking" && (
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
          <h1 className="font-display text-2xl font-semibold mb-2">Confirming your payment…</h1>
          <p className="text-gray-500">Please don't close this page.</p>
        </div>
      )}

      {status === "paid" && (
        <div className="animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" strokeWidth={1.5} />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-800 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Welcome to Afinity.ai
            </div>
            <h1 className="font-display text-4xl font-semibold mb-3">You're protected.</h1>
            <p className="text-gray-600">
              Payment of <span className="font-semibold">{format(info?.amount || 0)}</span>{" "}
              confirmed. Here's your insurance card.
            </p>
          </div>

          {/* Issued policy card reveal */}
          {policy && (
            <div className="mb-8" data-testid="success-policy-card">
              <PolicyCard
                policy={{
                  id: policy.id,
                  policy_number: policy.policy_number,
                  user_name: user?.full_name || "Policy Holder",
                  product_name: policy.product_name,
                  category: policy.category,
                  start_date: policy.start_date,
                  end_date: policy.end_date,
                  status: policy.status || "Active",
                }}
              />
              <p className="text-xs text-center text-gray-400 mt-3">
                Tip: tap "View my policies" to see all your cards in one wallet.
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => nav("/policies")}
              data-testid="view-policy-btn"
              className="rounded-full bg-primary hover:bg-primary-600 text-white shadow-float h-11 px-6"
            >
              View my policies <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Link to="/dashboard">
              <Button variant="outline" className="rounded-full h-11 px-6">
                Go to dashboard
              </Button>
            </Link>
          </div>
        </div>
      )}

      {["error", "timeout", "expired"].includes(status) && (
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold mb-3">Something went wrong</h1>
          <p className="text-gray-500 mb-6">Please reach out to support or try again.</p>
          <Link to="/dashboard">
            <Button className="rounded-full bg-primary">Back to dashboard</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
