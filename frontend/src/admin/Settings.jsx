import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  CreditCard, KeyRound, ShieldCheck, Eye, EyeOff, Zap, AlertCircle, CheckCircle2, Info,
} from "lucide-react";

export default function Settings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);

  const [form, setForm] = useState({
    stripe_publishable_key: "",
    stripe_secret_key: "",
    stripe_webhook_secret: "",
    stripe_enabled: true,
  });

  const load = async () => {
    const r = await api.get("/admin/settings");
    setData(r.data);
    setForm({
      stripe_publishable_key: r.data.stripe_publishable_key || "",
      stripe_secret_key: "", // never populated; user must re-enter to change
      stripe_webhook_secret: "",
      stripe_enabled: r.data.stripe_enabled,
    });
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setLoading(true);
    try {
      const payload = {
        stripe_publishable_key: form.stripe_publishable_key.trim(),
        stripe_enabled: form.stripe_enabled,
      };
      if (form.stripe_secret_key.trim()) payload.stripe_secret_key = form.stripe_secret_key.trim();
      if (form.stripe_webhook_secret.trim()) payload.stripe_webhook_secret = form.stripe_webhook_secret.trim();
      await api.patch("/admin/settings", payload);
      toast.success("Settings saved");
      setForm((f) => ({ ...f, stripe_secret_key: "", stripe_webhook_secret: "" }));
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const clearSecret = async () => {
    if (!confirm("Clear the stored Stripe secret key? The app will fall back to the platform default.")) return;
    try {
      await api.patch("/admin/settings", { stripe_secret_key: "" });
      toast.success("Secret key cleared — using platform default");
      await load();
    } catch {
      toast.error("Failed to clear");
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await api.post("/admin/settings/stripe/test");
      setTestResult(r.data);
      if (r.data.ok) toast.success("Stripe connection OK");
      else toast.error("Stripe test failed");
    } catch (e) {
      setTestResult({ ok: false, error: e?.response?.data?.detail || "Network error" });
      toast.error("Test failed");
    } finally {
      setTesting(false);
    }
  };

  if (!data) return <div className="p-10">Loading…</div>;

  return (
    <div className="p-8 max-w-4xl" data-testid="admin-settings">
      <div className="mb-8">
        <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">
          Platform configuration
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage payment gateway credentials and platform toggles.
        </p>
      </div>

      {/* Status banner */}
      <div
        data-testid="stripe-status-banner"
        className={`rounded-2xl p-4 mb-6 flex items-start gap-3 border ${
          data.using_env_fallback
            ? "bg-amber-50 border-amber-200"
            : "bg-green-50 border-green-200"
        }`}
      >
        <div className="mt-0.5">
          {data.using_env_fallback ? (
            <AlertCircle className="w-5 h-5 text-amber-600" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          )}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">
            {data.using_env_fallback
              ? "Using platform default Stripe test keys"
              : "Using your custom Stripe keys"}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            {data.using_env_fallback
              ? "No admin-provided secret key found. The app is running on the pre-configured test key. Paste your own live or test keys below to take over."
              : `Secret key on file: ${data.stripe_secret_key_masked}. Webhook secret: ${data.stripe_webhook_secret_masked || "not set"}.`}
          </div>
        </div>
      </div>

      {/* Stripe configuration card */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-semibold">Stripe Payments</h2>
            <p className="text-xs text-gray-500">
              Used for insurance premium checkout. Supports live (sk_live_…) or test (sk_test_…) keys.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.stripe_enabled}
              onCheckedChange={(v) => setForm({ ...form, stripe_enabled: v })}
              data-testid="stripe-enabled-switch"
            />
            <span className="text-sm text-gray-600">Enabled</span>
          </div>
        </div>

        <div className="space-y-5">
          {/* Publishable key (not secret) */}
          <div>
            <Label htmlFor="pk" className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-gray-400" /> Publishable key
            </Label>
            <Input
              id="pk"
              data-testid="stripe-publishable-input"
              placeholder="pk_test_51Abc…"
              value={form.stripe_publishable_key}
              onChange={(e) => setForm({ ...form, stripe_publishable_key: e.target.value })}
              className="rounded-xl h-12 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Safe to share. Used on the client when mounting Stripe Elements.
            </p>
          </div>

          {/* Secret key */}
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sk" className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-gray-400" /> Secret key
              </Label>
              {data.stripe_secret_key_set && (
                <button
                  onClick={clearSecret}
                  data-testid="clear-secret-btn"
                  className="text-xs text-red-500 hover:underline"
                >
                  Clear stored secret
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="sk"
                  data-testid="stripe-secret-input"
                  type={showSecret ? "text" : "password"}
                  placeholder={
                    data.stripe_secret_key_set
                      ? `Currently: ${data.stripe_secret_key_masked} (leave empty to keep)`
                      : "sk_test_51Abc…  or  sk_live_…"
                  }
                  value={form.stripe_secret_key}
                  onChange={(e) => setForm({ ...form, stripe_secret_key: e.target.value })}
                  className="rounded-xl h-12 font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  data-testid="toggle-secret-visibility"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Never shared with customers. Stored encrypted. Leave blank to keep the existing value.
            </p>
          </div>

          {/* Webhook secret */}
          <div>
            <Label htmlFor="wh" className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-gray-400" /> Webhook signing secret
            </Label>
            <div className="relative">
              <Input
                id="wh"
                data-testid="stripe-webhook-input"
                type={showWebhook ? "text" : "password"}
                placeholder={
                  data.stripe_webhook_secret_set
                    ? `Currently: ${data.stripe_webhook_secret_masked}`
                    : "whsec_abc123…"
                }
                value={form.stripe_webhook_secret}
                onChange={(e) => setForm({ ...form, stripe_webhook_secret: e.target.value })}
                className="rounded-xl h-12 font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowWebhook((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              Add the webhook endpoint in your Stripe dashboard:{" "}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[10px]">
                {typeof window !== "undefined" ? window.location.origin : ""}
                /api/webhook/stripe
              </code>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
          <Button
            onClick={save}
            disabled={loading}
            data-testid="save-settings-btn"
            className="rounded-full bg-primary hover:bg-primary-600 text-white h-11 px-6 shadow-float"
          >
            {loading ? "Saving…" : "Save changes"}
          </Button>
          <Button
            onClick={test}
            disabled={testing}
            variant="outline"
            data-testid="test-stripe-btn"
            className="rounded-full h-11 px-6"
          >
            {testing ? "Testing…" : "Test connection"}
          </Button>
          <div className="flex-1" />
          <a
            href="https://dashboard.stripe.com/apikeys"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary-700 hover:underline self-center"
          >
            Get your Stripe API keys →
          </a>
        </div>

        {testResult && (
          <div
            data-testid="stripe-test-result"
            className={`mt-4 rounded-2xl p-4 text-sm flex items-start gap-3 ${
              testResult.ok
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <div>
              <div className="font-semibold">
                {testResult.ok ? "Stripe connection succeeded" : "Stripe connection failed"}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {testResult.ok
                  ? `Created test session ${testResult.session_id?.slice(0, 20)}… using key prefix ${testResult.key_prefix}`
                  : testResult.error}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Premium plan helper card */}
      <div className="bg-gradient-to-br from-primary-50 to-white rounded-3xl p-6 border border-primary-100">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-1">
              Ready to go live
            </div>
            <h3 className="font-display text-xl font-semibold">Buy insurance premium</h3>
            <p className="text-sm text-gray-600 mt-1 mb-4">
              Once your Stripe keys are saved & tested, the existing Travel, Motor and PA quote flows
              will charge customers through your account. No code changes needed.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/products" target="_blank" rel="noreferrer">
                <Button
                  data-testid="buy-flow-btn"
                  className="rounded-full bg-primary hover:bg-primary-600 text-white h-10 px-5"
                >
                  Open customer buy flow
                </Button>
              </a>
              <a
                href="https://stripe.com/docs/testing"
                target="_blank"
                rel="noreferrer"
                className="rounded-full h-10 px-5 border border-gray-200 bg-white inline-flex items-center text-sm font-medium hover:bg-gray-50"
              >
                Stripe test cards →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
