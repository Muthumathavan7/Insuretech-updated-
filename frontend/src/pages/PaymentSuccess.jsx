import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("checking");
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!sessionId) return setStatus("error");
    let attempts = 0;
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      if (attempts >= 10) return setStatus("timeout");
      attempts += 1;
      try {
        const r = await api.get(`/payments/status/${sessionId}`);
        if (r.data.payment_status === "paid") {
          setInfo(r.data);
          setStatus("paid");
          return;
        }
        if (r.data.status === "expired") return setStatus("expired");
        setTimeout(poll, 2000);
      } catch {
        setTimeout(poll, 2000);
      }
    };
    poll();
    return () => {
      stopped = true;
    };
  }, [sessionId]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center" data-testid="payment-success-page">
      {status === "checking" && (
        <>
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
          <h1 className="font-display text-2xl font-semibold mb-2">Confirming your payment…</h1>
          <p className="text-gray-500">Please don't close this page.</p>
        </>
      )}
      {status === "paid" && (
        <div className="animate-fade-in-up">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-4xl font-semibold mb-3">You're protected.</h1>
          <p className="text-gray-600 mb-8">
            Payment of <span className="font-semibold">${info?.amount?.toFixed(2)}</span>{" "}
            confirmed. Your policy is now active.
          </p>
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
        <>
          <h1 className="font-display text-3xl font-semibold mb-3">Something went wrong</h1>
          <p className="text-gray-500 mb-6">Please reach out to support or try again.</p>
          <Link to="/dashboard">
            <Button className="rounded-full bg-primary">Back to dashboard</Button>
          </Link>
        </>
      )}
    </div>
  );
}
