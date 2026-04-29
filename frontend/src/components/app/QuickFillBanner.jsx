import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Sparkles, X, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * Banner shown above quote forms. Pulls the customer's last-used personal info
 * (name/IC/passport/mobile/address) and lets them auto-fill the current form
 * with one click instead of re-typing.
 *
 * Props:
 *  - onApply(profile): called with the quick-fill object when user clicks "Use this info"
 *  - testIdPrefix: testid prefix for the buttons (default "quickfill")
 */
export default function QuickFillBanner({ onApply, testIdPrefix = "quickfill" }) {
  const [profile, setProfile] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    api
      .get("/profile/quick-fill")
      .then((r) => {
        if (r.data?.has_data) setProfile(r.data);
      })
      .catch(() => {});
  }, []);

  if (!profile || hidden) return null;

  const last = profile.last_product_category;
  const lastDescription = last?.product_name
    ? `from your ${last.product_name} purchase`
    : "from a previous quote";

  return (
    <div
      data-testid={`${testIdPrefix}-banner`}
      className="mb-6 rounded-2xl border border-primary-200 bg-primary-50/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
    >
      <div className="w-10 h-10 rounded-full bg-primary-200/40 flex items-center justify-center text-primary-700 shrink-0">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-primary-800">
          Welcome back, {profile.full_name?.split(" ")[0] || "there"}!
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          We found your saved details {lastDescription}. Auto-fill this form so you
          don't have to type them again.
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
          {profile.full_name && (
            <span className="px-2 py-0.5 rounded bg-white text-gray-600">
              {profile.full_name}
            </span>
          )}
          {profile.id_number && (
            <span className="px-2 py-0.5 rounded bg-white text-gray-600 font-mono">
              {profile.id_type === "passport" ? "Passport" : "IC"} {profile.id_number}
            </span>
          )}
          {profile.phone && (
            <span className="px-2 py-0.5 rounded bg-white text-gray-600 font-mono">
              {profile.phone}
            </span>
          )}
          {profile.email && (
            <span className="px-2 py-0.5 rounded bg-white text-gray-600">
              {profile.email}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => {
            onApply?.(profile);
            toast.success("Profile auto-filled");
            setHidden(true);
          }}
          data-testid={`${testIdPrefix}-apply-btn`}
          className="flex-1 sm:flex-none inline-flex items-center gap-2 rounded-xl bg-primary-700 text-white px-4 py-2 text-sm font-medium hover:bg-primary-800 transition"
        >
          <Check className="w-4 h-4" /> Use this info
        </button>
        <button
          type="button"
          onClick={() => setHidden(true)}
          data-testid={`${testIdPrefix}-dismiss-btn`}
          aria-label="Dismiss"
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-500 hover:bg-gray-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
