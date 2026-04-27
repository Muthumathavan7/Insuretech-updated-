import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Ticket, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "email", segment: "all", message: "" });
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: "", percent_off: 10 });

  const load = async () => {
    const c = await api.get("/campaigns");
    setCampaigns(c.data);
    const co = await api.get("/coupons");
    setCoupons(co.data);
  };
  useEffect(() => {
    load();
  }, []);

  const createCampaign = async () => {
    await api.post("/campaigns", form);
    toast.success("Campaign created");
    setShowForm(false);
    setForm({ name: "", channel: "email", segment: "all", message: "" });
    load();
  };

  const createCoupon = async () => {
    await api.post("/coupons", couponForm);
    toast.success("Coupon created");
    setShowCouponForm(false);
    setCouponForm({ code: "", percent_off: 10 });
    load();
  };

  const send = async (id) => {
    await api.post(`/campaigns/${id}/send`);
    toast.success("Campaign sent");
    load();
  };

  return (
    <div className="p-8" data-testid="campaigns-page">
      <div className="mb-8">
        <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">
          Marketing
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">
          Campaigns & Coupons
        </h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Campaigns */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary-700" />
              <h2 className="font-display text-xl font-semibold">Campaigns</h2>
            </div>
            <Button
              onClick={() => setShowForm((v) => !v)}
              data-testid="new-campaign-btn"
              className="rounded-full bg-primary hover:bg-primary-600 text-white h-9 px-4 text-sm"
            >
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </div>

          {showForm && (
            <div className="space-y-3 bg-gray-50 rounded-2xl p-4 mb-4">
              <div>
                <Label>Name</Label>
                <Input
                  data-testid="campaign-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Channel</Label>
                  <select
                    data-testid="campaign-channel"
                    value={form.channel}
                    onChange={(e) => setForm({ ...form, channel: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="push">Push</option>
                    <option value="voice">Voice</option>
                  </select>
                </div>
                <div>
                  <Label>Segment</Label>
                  <Input
                    value={form.segment}
                    onChange={(e) => setForm({ ...form, segment: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  data-testid="campaign-message"
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <Button
                onClick={createCampaign}
                data-testid="campaign-create-btn"
                disabled={!form.name || !form.message}
                className="w-full rounded-full bg-primary hover:bg-primary-600 text-white"
              >
                Create campaign
              </Button>
            </div>
          )}

          <ul className="space-y-2">
            {campaigns.map((c) => (
              <li
                key={c.id}
                data-testid={`campaign-${c.id}`}
                className="bg-gray-50 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">
                    {c.channel} · {c.segment} · <span className="capitalize">{c.status}</span>
                  </div>
                </div>
                {c.status !== "sent" && (
                  <Button
                    size="sm"
                    onClick={() => send(c.id)}
                    className="rounded-full bg-primary hover:bg-primary-600 text-white h-8 text-xs"
                  >
                    Send
                  </Button>
                )}
              </li>
            ))}
            {campaigns.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-4">No campaigns</div>
            )}
          </ul>
        </div>

        {/* Coupons */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary-700" />
              <h2 className="font-display text-xl font-semibold">Coupons</h2>
            </div>
            <Button
              onClick={() => setShowCouponForm((v) => !v)}
              data-testid="new-coupon-btn"
              className="rounded-full bg-primary hover:bg-primary-600 text-white h-9 px-4 text-sm"
            >
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </div>

          {showCouponForm && (
            <div className="space-y-3 bg-gray-50 rounded-2xl p-4 mb-4">
              <div>
                <Label>Code</Label>
                <Input
                  data-testid="coupon-code"
                  value={couponForm.code}
                  onChange={(e) =>
                    setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })
                  }
                  className="rounded-xl uppercase font-mono"
                />
              </div>
              <div>
                <Label>% off</Label>
                <Input
                  type="number"
                  data-testid="coupon-percent"
                  value={couponForm.percent_off}
                  onChange={(e) =>
                    setCouponForm({ ...couponForm, percent_off: parseFloat(e.target.value) })
                  }
                  className="rounded-xl"
                />
              </div>
              <Button
                onClick={createCoupon}
                data-testid="coupon-create-btn"
                disabled={!couponForm.code}
                className="w-full rounded-full bg-primary hover:bg-primary-600 text-white"
              >
                Create coupon
              </Button>
            </div>
          )}

          <ul className="space-y-2">
            {coupons.map((c) => (
              <li
                key={c.id}
                data-testid={`coupon-${c.code}`}
                className="bg-gray-50 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="font-mono font-bold text-primary-800">{c.code}</div>
                <div className="text-sm">{c.percent_off}% off</div>
                <span className="ml-auto text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                  {c.active ? "Active" : "Inactive"}
                </span>
              </li>
            ))}
            {coupons.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-4">No coupons</div>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
