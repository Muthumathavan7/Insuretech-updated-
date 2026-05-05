import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { ArrowRight, Plane, HeartPulse, Car, Smartphone, Home, Shield, Sparkles, Check, Star, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

<<<<<<< Updated upstream
<<<<<<< Updated upstream
const ICONS = { travel: Plane, health: HeartPulse, motor: Car, device: Smartphone, pa: Activity, home: Home };
const HERO_IMG =
  "https://images.pexels.com/photos/7065885/pexels-photo-7065885.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1200";
=======
=======
>>>>>>> Stashed changes
const ICONS = { travel: Plane, health: HeartPulse, motor: Car, device: Smartphone, pa: Activity };
import familyImg from "./family.png";
const HERO_IMG = familyImg;

<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

export default function Landing() {
  const [products, setProducts] = useState([]);
  const { format, formatText } = useCurrency();

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="landing-page">
      {/* HERO */}
      <section className="gold-radial">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-800 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" /> AI-powered · CRM-first
            </div>
            <h1
              data-testid="hero-title"
              className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-gray-900 leading-[1.05]"
            >
              Premium protection for
              <br />
              your <span className="text-primary-700">peace of mind.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-xl leading-relaxed">
              One platform. Four lines of cover. Powered by real AI — from quote to claim in minutes,
              not weeks. Built for modern life.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/products">
                <Button
                  data-testid="hero-get-quote-btn"
                  className="rounded-full bg-primary hover:bg-primary-600 text-white px-7 h-12 text-base shadow-float"
                >
                  Explore Plans <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  variant="outline"
                  data-testid="hero-signup-btn"
                  className="rounded-full border-gray-200 h-12 px-6 text-base hover:bg-white"
                >
                  Create account
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full border-2 border-white"
                      style={{ background: `hsl(${i * 60},50%,80%)` }}
                    />
                  ))}
                </div>
                <span className="font-medium text-gray-700">120k+ protected</span>
              </div>
              <div className="flex items-center gap-1 text-primary-700 font-medium">
                <Star className="w-4 h-4 fill-primary text-primary" /> 4.9 / 5 · App Store
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full" />
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-float aspect-[4/5] bg-white">
              <img src={HERO_IMG} alt="Family" className="w-full h-full object-cover" />
              <div className="absolute left-4 bottom-4 right-4 bg-white/90 backdrop-blur-xl rounded-2xl p-4 border border-white/60 shadow-softlg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary-700" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Active cover</div>
                    <div className="font-semibold text-sm">Travel Shield Global · {format(100000, { decimals: 0 })}</div>
                  </div>
                  <div className="ml-auto bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    Active
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-2">
              Our products
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
              Four shields. Endless calm.
            </h2>
          </div>
          <Link
            to="/products"
            data-testid="see-all-products-link"
            className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            See all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map((p) => {
            const Icon = ICONS[p.category] || Shield;
            const href =
              p.category === "motor" ? "/products/motor-easy"
              : p.category === "pa" ? "/products/pa-easy"
              : p.category === "health" ? "/products/health-secure-plus"
              : p.category === "home" ? "/products/home-easy"
              : p.category === "travel" ? `/travel-quote/${p.id}`
              : "/products";
            return (
              <Link
                key={p.id}
                to={href}
                data-testid={`product-tile-${p.category}`}
                className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:border-primary/30 hover:-translate-y-1 hover:shadow-float transition-all duration-300"
              >
                <div className="aspect-[4/3] overflow-hidden bg-gray-50">
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-primary-700 mb-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {p.category}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-1">{p.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{formatText(p.description)}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-400">from</div>
                      <div className="font-semibold">{format(p.base_premium, { decimals: 0 })}</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-primary-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* STATS */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {[
            { k: "120k+", v: "Customers protected" },
            { k: "4.9 / 5", v: "App store rating" },
            { k: "< 2 min", v: "Average claim triage" },
          ].map((s) => (
            <div key={s.k}>
              <div className="font-display text-5xl sm:text-6xl font-semibold text-primary-700 mb-2">
                {s.k}
              </div>
              <div className="text-sm text-gray-500 uppercase tracking-widest">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* AI feature */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="rounded-3xl overflow-hidden aspect-[4/3] shadow-float">
            <img
              src="https://images.unsplash.com/photo-1636613112804-c5aebc1f4d8d?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80"
              alt="AI"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-2">
              Aura · your AI copilot
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mb-6">
              Claims that settle themselves.
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Our AI reviews your claim in real time, cross-checks documents, and can auto-approve
              routine cases in under a minute. High-risk claims go to human reviewers — instantly.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Auto-approval for low-risk claims",
                "Fraud score on every submission",
                "Smart recommendations for your next policy",
                "24/7 voice & chat support",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-700">
                  <div className="w-5 h-5 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-primary-700" strokeWidth={3} />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/products">
              <Button
                data-testid="ai-cta-btn"
                className="rounded-full bg-primary hover:bg-primary-600 text-white px-7 h-12 shadow-float"
              >
                Get a quote in 60 seconds
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
