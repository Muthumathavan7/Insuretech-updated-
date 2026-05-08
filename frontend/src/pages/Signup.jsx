import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Check } from "lucide-react";

import icon from "./icon.png";

const logo = icon;

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", password: "",
  });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await signup(form);
      toast.success(`Welcome, ${u.full_name}!`);
      nav("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid md:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-float">
  <img
    src={logo}
    alt="Logo"
    className="w-full h-full object-cover"
  />
</div>
            <span className="font-display text-xl font-semibold"><span className="text-primary">Afinity.ai</span></span>
          </div>
          <h1 className="font-display text-3xl font-semibold mb-2">Create your account</h1>
          <p className="text-gray-500 mb-8">It takes under a minute. No paperwork.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                data-testid="signup-name"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-testid="signup-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                data-testid="signup-phone"
                required
                placeholder="+14155550123"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                data-testid="signup-password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <Button
              type="submit"
              data-testid="signup-submit-btn"
              disabled={loading}
              className="w-full h-11 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float mt-4"
            >
              {loading ? "Creating..." : "Create account"}
            </Button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-primary-700 font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden md:flex items-center justify-center bg-primary-50 p-12">
        <div className="max-w-sm">
          <h2 className="font-display text-3xl font-semibold mb-6">Why Afinity.ai?</h2>
          <ul className="space-y-4">
            {[
              "Get a quote in under 60 seconds",
              "AI-powered claims — often settled same day",
              "Manage Travel, Health, Motor & Device in one app",
              "24/7 voice + chat support",
              "Transparent pricing, no paper forms",
            ].map((f) => (
              <li key={f} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </div>
                <span className="text-gray-700 leading-relaxed">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
