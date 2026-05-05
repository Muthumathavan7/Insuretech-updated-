import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Shield } from "lucide-react";

import familyImg from "./family.png";

const AUTH_IMG = familyImg;

import icon from "./icon.png";

const logo = icon;

export default function Login() {
  const { login, otpVerify } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "demo@insurtech.io", password: "Demo@123" });
  const [otp, setOtp] = useState({ phone: "", code: "", sent: false });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome back, ${u.full_name}`);
      nav(u.role === "customer" ? "/dashboard" : "/admin");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async () => {
    if (!otp.phone) return toast.error("Enter phone number");
    try {
      await api.post("/auth/otp/request", { phone: otp.phone });
      setOtp((o) => ({ ...o, sent: true }));
      toast.success("OTP sent — use 123456 (dev mode)");
    } catch (err) {
      toast.error("Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      const u = await otpVerify(otp.phone, otp.code);
      toast.success(`Welcome, ${u.full_name}`);
      nav("/dashboard");
    } catch {
      toast.error("Invalid OTP");
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
          <h1 className="font-display text-3xl font-semibold mb-2">Welcome back</h1>
          <p className="text-gray-500 mb-8">Log in to access your policies and file claims.</p>

          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-6 bg-gray-100">
              <TabsTrigger value="password" data-testid="tab-password">Password</TabsTrigger>
              <TabsTrigger value="otp" data-testid="tab-otp">Phone OTP</TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    data-testid="login-email"
                    type="email"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="rounded-xl h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    data-testid="login-password"
                    type="password"
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    className="rounded-xl h-11"
                  />
                </div>
                <Button
                  type="submit"
                  data-testid="login-submit-btn"
                  disabled={loading}
                  className="w-full h-11 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
              <div className="mt-4 text-xs text-gray-400 bg-gray-50 p-3 rounded-xl">
                {/* <span className="font-semibold text-gray-600">Demo:</span> demo@insurtech.io / Demo@123 */}
                <br />
                {/* <span className="font-semibold text-gray-600">Admin:</span> admin@insurtech.io / Admin@123 */}
              </div>
            </TabsContent>

            <TabsContent value="otp">
              {!otp.sent ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      data-testid="otp-phone"
                      placeholder="+14155550123"
                      value={otp.phone}
                      onChange={(e) => setOtp({ ...otp, phone: e.target.value })}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <Button
                    onClick={requestOtp}
                    data-testid="otp-request-btn"
                    className="w-full h-11 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
                  >
                    Send OTP
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="code">6-digit code</Label>
                    <Input
                      id="code"
                      data-testid="otp-code"
                      placeholder="123456"
                      maxLength={6}
                      value={otp.code}
                      onChange={(e) => setOtp({ ...otp, code: e.target.value })}
                      className="rounded-xl h-11 text-center font-mono tracking-widest text-lg"
                    />
                  </div>
                  <Button
                    onClick={verifyOtp}
                    data-testid="otp-verify-btn"
                    className="w-full h-11 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
                  >
                    Verify & sign in
                  </Button>
                  <button
                    onClick={() => setOtp({ phone: "", code: "", sent: false })}
                    className="text-sm text-gray-500 hover:text-gray-700 mx-auto block"
                  >
                    Change number
                  </button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <p className="text-sm text-gray-500 mt-8 text-center">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary-700 font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden md:block relative">
        <img src={AUTH_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary-700/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-12 text-white">
          <p className="font-display text-3xl font-semibold max-w-md leading-tight">
            "I filed my travel claim on the plane — and it was approved before I landed."
          </p>
          <p className="mt-4 text-sm opacity-90">— Maya R., member since 2023</p>
        </div>
      </div>
    </div>
  );
}
