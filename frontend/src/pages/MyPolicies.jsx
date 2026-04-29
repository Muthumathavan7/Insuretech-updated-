import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FileText, Shield, Hammer, Download } from "lucide-react";
import PolicyCard from "@/components/app/PolicyCard";

const ICONS = { travel: "🧳", health: "❤️", motor: "🚗", device: "💻" };

const BADGE = {
  active: "bg-green-50 text-green-700",
  expired: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-50 text-red-600",
  pending: "bg-yellow-50 text-yellow-700",
};

export default function MyPolicies() {
  const [policies, setPolicies] = useState([]);
  const [selected, setSelected] = useState(null);
  const { user } = useAuth();
  const { format } = useCurrency();

  useEffect(() => {
    api.get("/policies").then((r) => setPolicies(r.data));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="my-policies-page">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">My cover</div>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mt-1">
            My Policies
          </h1>
        </div>
        <Link to="/products">
          <Button
            data-testid="buy-new-policy-btn"
            className="rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
          >
            + New policy
          </Button>
        </Link>
      </div>

      {policies.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200">
          <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <div className="font-semibold text-lg mb-1">No policies yet</div>
          <div className="text-gray-500 mb-6">Let's get you protected in under 60 seconds.</div>
          <Link to="/products">
            <Button className="rounded-full bg-primary hover:bg-primary-600 text-white">
              Explore plans
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-5">
          {policies.map((p) => (
            <Sheet key={p.id}>
              <SheetTrigger asChild>
                <button
                  onClick={() => setSelected(p)}
                  data-testid={`policy-card-trigger-${p.policy_number}`}
                  className="text-left rounded-2xl p-0 transition-transform hover:scale-[1.015] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <PolicyCard
                    policy={{
                      id: p.id,
                      policy_number: p.policy_number,
                      user_name: user?.full_name || "Policy Holder",
                      product_name: p.product_name,
                      category: p.category,
                      start_date: p.start_date,
                      end_date: p.end_date,
                      status: p.status,
                    }}
                  />
                  <div className="mt-3 px-1 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Coverage <span className="font-medium text-gray-800">{format(p.coverage_amount, { decimals: 0 })}</span>
                    </span>
                    <span>
                      Premium <span className="font-medium text-gray-800">{format(p.premium)}</span>
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${BADGE[p.status] || BADGE.pending}`}>
                      {p.status}
                    </span>
                  </div>
                </button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="font-display text-2xl flex items-center gap-2">
                    <span className="text-3xl">{ICONS[p.category]}</span> {p.product_name}
                  </SheetTitle>
                  <SheetDescription>
                    Policy details and downloadable documents.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <PolicyCard
                    policy={{
                      id: p.id,
                      policy_number: p.policy_number,
                      user_name: user?.full_name || "Policy Holder",
                      product_name: p.product_name,
                      category: p.category,
                      start_date: p.start_date,
                      end_date: p.end_date,
                      status: p.status,
                    }}
                  />
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Policy #</span><span className="font-mono font-medium">{p.policy_number}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="capitalize font-medium">{p.status}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Start date</span><span>{new Date(p.start_date).toLocaleDateString()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">End date</span><span>{new Date(p.end_date).toLocaleDateString()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Coverage</span><span>{format(p.coverage_amount, { decimals: 0 })}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Premium</span><span>{format(p.premium)}</span></div>
                    {p.meta?.tier && (
                      <div className="flex justify-between"><span className="text-gray-500">Tier</span><span className="capitalize">{p.meta.tier}</span></div>
                    )}
                    {p.meta?.destination && (
                      <div className="flex justify-between"><span className="text-gray-500">Destination</span><span>{p.meta.destination}</span></div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link to={`/claims/new/${p.id}`}>
                      <Button
                        data-testid={`file-claim-btn-${p.policy_number}`}
                        className="w-full rounded-full bg-primary hover:bg-primary-600 text-white"
                      >
                        <Hammer className="w-4 h-4 mr-1.5" /> File claim
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => window.print()}
                      data-testid={`download-pdf-btn-${p.policy_number}`}
                      className="rounded-full"
                    >
                      <Download className="w-4 h-4 mr-1.5" /> PDF
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          ))}
        </div>
      )}
    </div>
  );
}
