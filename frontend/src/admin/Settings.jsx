import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  CreditCard, KeyRound, ShieldCheck, Eye, EyeOff, Zap, AlertCircle, CheckCircle2, Info,
  Phone, Mic, Mail, DollarSign,
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
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_phone_number: "",
    twilio_whatsapp_from: "",
    elevenlabs_api_key: "",
    elevenlabs_default_agent_id: "",
    elevenlabs_phone_number_id: "",
    gmail_smtp_user: "",
    gmail_smtp_app_password: "",
    gmail_sender_name: "",
    google_oauth_client_id: "",
    google_oauth_client_secret: "",
    default_currency: "MYR",
  });
  const [currencies, setCurrencies] = useState([]);

  const load = async () => {
    const r = await api.get("/admin/settings");
    setData(r.data);
    setForm({
      stripe_publishable_key: r.data.stripe_publishable_key || "",
      stripe_secret_key: "",
      stripe_webhook_secret: "",
      stripe_enabled: r.data.stripe_enabled,
      twilio_account_sid: r.data.twilio_account_sid || "",
      twilio_auth_token: "",
      twilio_phone_number: r.data.twilio_phone_number || "",
      twilio_whatsapp_from: r.data.twilio_whatsapp_from || "",
      elevenlabs_api_key: "",
      elevenlabs_default_agent_id: r.data.elevenlabs_default_agent_id || "",
      elevenlabs_phone_number_id: r.data.elevenlabs_phone_number_id || "",
      gmail_smtp_user: r.data.gmail_smtp_user || "",
      gmail_smtp_app_password: "",
      gmail_sender_name: r.data.gmail_sender_name || "",
      google_oauth_client_id: r.data.google_oauth_client_id || "",
      google_oauth_client_secret: "",
      default_currency: r.data.default_currency || "MYR",
    });
    setCurrencies(r.data.supported_currencies || []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setLoading(true);
    try {
      const payload = {
        stripe_publishable_key: form.stripe_publishable_key.trim(),
        stripe_enabled: form.stripe_enabled,
        twilio_account_sid: form.twilio_account_sid.trim(),
        twilio_phone_number: form.twilio_phone_number.trim(),
        twilio_whatsapp_from: form.twilio_whatsapp_from.trim(),
        elevenlabs_default_agent_id: form.elevenlabs_default_agent_id.trim(),
        elevenlabs_phone_number_id: form.elevenlabs_phone_number_id.trim(),
        gmail_smtp_user: form.gmail_smtp_user.trim(),
        gmail_sender_name: form.gmail_sender_name.trim(),
        google_oauth_client_id: form.google_oauth_client_id.trim(),
        default_currency: form.default_currency,
        supported_currencies: currencies,
      };
      // Only send secrets if user typed new values
      if (form.stripe_secret_key.trim()) payload.stripe_secret_key = form.stripe_secret_key.trim();
      if (form.stripe_webhook_secret.trim()) payload.stripe_webhook_secret = form.stripe_webhook_secret.trim();
      if (form.twilio_auth_token.trim()) payload.twilio_auth_token = form.twilio_auth_token.trim();
      if (form.elevenlabs_api_key.trim()) payload.elevenlabs_api_key = form.elevenlabs_api_key.trim();
      if (form.gmail_smtp_app_password.trim()) payload.gmail_smtp_app_password = form.gmail_smtp_app_password.trim();
      if (form.google_oauth_client_secret.trim()) payload.google_oauth_client_secret = form.google_oauth_client_secret.trim();
      await api.patch("/admin/settings", payload);
      toast.success("Settings saved");
      setForm((f) => ({
        ...f, stripe_secret_key: "", stripe_webhook_secret: "",
        twilio_auth_token: "", elevenlabs_api_key: "",
        gmail_smtp_app_password: "", google_oauth_client_secret: "",
      }));
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
    <div className="max-w-4xl" data-testid="admin-settings">
      <div className="mb-6 sm:mb-8">
        <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">
          Platform configuration
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-1">Settings</h1>
        <p className="text-gray-500 mt-1 text-sm sm:text-base">
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
              <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[10px] break-all">
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

      {/* Twilio configuration */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 mb-6" data-testid="twilio-settings">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <Phone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-semibold">Twilio (Voice + WhatsApp)</h2>
            <p className="text-xs text-gray-500">
              Used for AI Voice calls (via ElevenLabs) and WhatsApp messaging from leads page.
            </p>
          </div>
          <a href="https://console.twilio.com/" target="_blank" rel="noreferrer" className="text-xs text-primary-700 hover:underline">Twilio Console →</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="twsid">Account SID</Label>
            <Input id="twsid" data-testid="twilio-sid-input"
              value={form.twilio_account_sid}
              onChange={(e) => setForm({ ...form, twilio_account_sid: e.target.value })}
              placeholder="ACxxxxxxxxxxxx" className="rounded-xl h-12 font-mono text-sm" />
          </div>
          <div>
            <Label htmlFor="twtok">Auth Token</Label>
            <Input id="twtok" type="password" data-testid="twilio-token-input"
              value={form.twilio_auth_token}
              onChange={(e) => setForm({ ...form, twilio_auth_token: e.target.value })}
              placeholder={data.twilio_auth_token_set ? `Currently: ${data.twilio_auth_token_masked}` : "Auth token"}
              className="rounded-xl h-12 font-mono text-sm" />
          </div>
          <div>
            <Label htmlFor="twph">Twilio Phone Number</Label>
            <Input id="twph" data-testid="twilio-phone-input"
              value={form.twilio_phone_number}
              onChange={(e) => setForm({ ...form, twilio_phone_number: e.target.value })}
              placeholder="+15555555555" className="rounded-xl h-12 font-mono text-sm" />
          </div>
          <div>
            <Label htmlFor="twwa">WhatsApp Sender</Label>
            <Input id="twwa" data-testid="twilio-whatsapp-input"
              value={form.twilio_whatsapp_from}
              onChange={(e) => setForm({ ...form, twilio_whatsapp_from: e.target.value })}
              placeholder="+14155238886 (sandbox)" className="rounded-xl h-12 font-mono text-sm" />
          </div>
        </div>
      </div>

      {/* ElevenLabs configuration */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 mb-6" data-testid="elevenlabs-settings">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Mic className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-semibold">ElevenLabs Conversational AI</h2>
            <p className="text-xs text-gray-500">
              Powers outbound AI voice calls via Twilio. Get keys at elevenlabs.io.
            </p>
          </div>
          <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noreferrer" className="text-xs text-primary-700 hover:underline">Get keys →</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="elkey">API Key</Label>
            <Input id="elkey" type="password" data-testid="elevenlabs-key-input"
              value={form.elevenlabs_api_key}
              onChange={(e) => setForm({ ...form, elevenlabs_api_key: e.target.value })}
              placeholder={data.elevenlabs_api_key_set ? `Currently: ${data.elevenlabs_api_key_masked}` : "sk_..."}
              className="rounded-xl h-12 font-mono text-sm" />
          </div>
          <div>
            <Label htmlFor="elag">Default Agent ID</Label>
            <Input id="elag" data-testid="elevenlabs-agent-input"
              value={form.elevenlabs_default_agent_id}
              onChange={(e) => setForm({ ...form, elevenlabs_default_agent_id: e.target.value })}
              placeholder="agent_..." className="rounded-xl h-12 font-mono text-sm" />
          </div>
          <div>
            <Label htmlFor="elphid">Phone Number ID</Label>
            <Input id="elphid" data-testid="elevenlabs-phoneid-input"
              value={form.elevenlabs_phone_number_id}
              onChange={(e) => setForm({ ...form, elevenlabs_phone_number_id: e.target.value })}
              placeholder="phnum_..." className="rounded-xl h-12 font-mono text-sm" />
          </div>
        </div>
      </div>

      {/* Gmail SMTP / Google */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 mb-6" data-testid="google-settings">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-semibold">Google / Gmail (Meeting Invites)</h2>
            <p className="text-xs text-gray-500">
              Sends meeting invites with .ics calendar attachment via Gmail SMTP.
              Use a Gmail App Password (not your account password).
            </p>
          </div>
          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-xs text-primary-700 hover:underline">Get App Password →</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gmuser">Gmail Address</Label>
            <Input id="gmuser" data-testid="gmail-user-input"
              value={form.gmail_smtp_user}
              onChange={(e) => setForm({ ...form, gmail_smtp_user: e.target.value })}
              placeholder="you@gmail.com" className="rounded-xl h-12 font-mono text-sm" />
          </div>
          <div>
            <Label htmlFor="gmpw">App Password</Label>
            <Input id="gmpw" type="password" data-testid="gmail-pass-input"
              value={form.gmail_smtp_app_password}
              onChange={(e) => setForm({ ...form, gmail_smtp_app_password: e.target.value })}
              placeholder={data.gmail_smtp_app_password_set ? `Currently: ${data.gmail_smtp_app_password_masked}` : "16-char app password"}
              className="rounded-xl h-12 font-mono text-sm" />
          </div>
          <div>
            <Label htmlFor="gmname">Sender Name</Label>
            <Input id="gmname" data-testid="gmail-name-input"
              value={form.gmail_sender_name}
              onChange={(e) => setForm({ ...form, gmail_sender_name: e.target.value })}
              placeholder="Insurance CRM" className="rounded-xl h-12 text-sm" />
          </div>
          <div className="sm:col-span-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2 font-medium">Optional: Google OAuth (Calendar API — coming soon)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                value={form.google_oauth_client_id}
                onChange={(e) => setForm({ ...form, google_oauth_client_id: e.target.value })}
                placeholder="Google OAuth Client ID"
                className="rounded-xl h-11 font-mono text-xs"
                data-testid="google-client-id-input"
              />
              <Input
                type="password"
                value={form.google_oauth_client_secret}
                onChange={(e) => setForm({ ...form, google_oauth_client_secret: e.target.value })}
                placeholder={data.google_oauth_client_secret_set ? `Currently: ${data.google_oauth_client_secret_masked}` : "Google OAuth Client Secret"}
                className="rounded-xl h-11 font-mono text-xs"
                data-testid="google-client-secret-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Currency */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 mb-6" data-testid="currency-settings">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-semibold">Multi-currency</h2>
            <p className="text-xs text-gray-500">
              Set your store's base currency and the list of currencies customers can switch to from the navbar.
              Prices in DB stay in the base currency; the website converts on the fly using the rates below.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <Label htmlFor="defcur">Base / Default Currency</Label>
            <select
              id="defcur"
              value={form.default_currency}
              onChange={(e) => setForm({ ...form, default_currency: e.target.value })}
              className="rounded-xl h-12 w-full border border-gray-200 bg-white px-3 text-sm font-mono"
              data-testid="default-currency-select"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex items-end">
            <p className="text-xs text-gray-500">
              Tip: the rates are <span className="font-medium">multipliers from the base currency</span>.
              Example: if base is MYR and USD rate is 0.21, RM 100 → $21.
            </p>
          </div>
        </div>
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Code</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Symbol</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Name</th>
                  <th className="text-right px-4 py-3 whitespace-nowrap">Rate (× base)</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {currencies.map((c, idx) => (
                  <tr key={c.code} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-mono whitespace-nowrap">{c.code}</td>
                    <td className="px-4 py-2">
                      <Input value={c.symbol} className="h-9 rounded-lg"
                        onChange={(e) => {
                          const next = [...currencies]; next[idx] = { ...c, symbol: e.target.value };
                          setCurrencies(next);
                        }} />
                    </td>
                    <td className="px-4 py-2">
                      <Input value={c.name} className="h-9 rounded-lg"
                        onChange={(e) => {
                          const next = [...currencies]; next[idx] = { ...c, name: e.target.value };
                          setCurrencies(next);
                        }} />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number" step="0.0001" value={c.rate}
                        className="h-9 rounded-lg text-right font-mono"
                        onChange={(e) => {
                          const next = [...currencies]; next[idx] = { ...c, rate: parseFloat(e.target.value) || 0 };
                          setCurrencies(next);
                        }}
                        disabled={c.code === form.default_currency}
                        data-testid={`currency-rate-${c.code}`}
                      />
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {c.code !== form.default_currency && (
                        <button
                          onClick={async () => {
                            const next = currencies.filter((x) => x.code !== c.code);
                            setCurrencies(next);
                            try {
                              await api.patch("/admin/settings", { supported_currencies: next });
                              toast.success(`${c.code} removed`);
                            } catch (e) {
                              toast.error("Could not remove. Reverted.");
                              setCurrencies(currencies);
                            }
                          }}
                          data-testid={`remove-currency-${c.code}`}
                          className="text-xs text-red-500 hover:underline"
                        >Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Input
            placeholder="ADD CODE (e.g. CAD)"
            className="h-9 w-32 rounded-lg uppercase font-mono"
            id="newcur-code"
            data-testid="new-currency-code"
          />
          <Input placeholder="Symbol (e.g. C$)" className="h-9 w-28 rounded-lg" id="newcur-sym" />
          <Input placeholder="Name" className="h-9 flex-1 min-w-[140px] rounded-lg" id="newcur-name" />
          <Input type="number" step="0.0001" placeholder="Rate" className="h-9 w-28 rounded-lg text-right font-mono" id="newcur-rate" />
          <Button
            type="button" variant="outline" className="h-9 rounded-lg"
            onClick={async () => {
              const code = document.getElementById('newcur-code').value.trim().toUpperCase();
              const symbol = document.getElementById('newcur-sym').value.trim();
              const name = document.getElementById('newcur-name').value.trim();
              const rate = parseFloat(document.getElementById('newcur-rate').value);
              if (!code || !symbol || !name || !rate) { toast.error('Fill all fields'); return; }
              if (currencies.some((c) => c.code === code)) { toast.error('Code already exists'); return; }
              const next = [...currencies, { code, symbol, name, rate }];
              setCurrencies(next);
              try {
                await api.patch("/admin/settings", { supported_currencies: next });
                toast.success(`${code} added & saved`);
                document.getElementById('newcur-code').value = '';
                document.getElementById('newcur-sym').value = '';
                document.getElementById('newcur-name').value = '';
                document.getElementById('newcur-rate').value = '';
              } catch (e) {
                toast.error('Could not persist currency. Reverted.');
                setCurrencies(currencies);
              }
            }}
            data-testid="add-currency-btn"
          >+ Add</Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          New currencies are saved instantly. Edits to existing rows persist when you click <strong>Save settings</strong> below.
        </p>
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
