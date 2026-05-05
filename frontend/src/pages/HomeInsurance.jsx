import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Home, Flame, Droplets, ShieldPlus, BadgePercent, Wrench,
  Check, Calendar, ArrowRight,
} from "lucide-react";
import HomeCoverageCalculator from "./HomeCoverageCalculator";

const HERO_IMG =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80";

const KEY_BENEFITS = [
  { icon: Flame,        title: "Fire & Lightning",     body: "Core protection against fire, lightning, and explosions — fully reinstated after a valid claim." },
  { icon: Droplets,     title: "Flood & Storm",        body: "Enhanced plans cover flood, windstorm and water damage, critical for Malaysian monsoon seasons." },
  { icon: ShieldPlus,   title: "Theft & Burglary",     body: "Cover against burglary, theft, vandalism and malicious acts up to your plan limit." },
  { icon: BadgePercent, title: "10% Online Discount",  body: "Instant online discount applied to your quote. SST 8% clearly itemised — no surprises." },
  { icon: Wrench,       title: "24/7 Home Assistance", body: "Emergency plumber, electrician and locksmith dispatched at any time. Add-on available." },
];

const FAQS = [
  { q: "What does Home Easy cover?", a: "Home Easy covers Building (structure, roof, walls, built-in fittings) and Contents (furniture, electronics, personal items) against fire, flood, storm, burglary, and public liability. The exact perils depend on your chosen plan — Basic, Enhanced, or Premier." },
  { q: "Who is eligible to buy Home Easy?", a: "Open to Malaysian citizens, Permanent Residents, and legal residents. Covers Landed houses, Apartments/Condos, Terrace houses, and Commercial properties across Malaysia." },
  { q: "How is my premium calculated?", a: "We combine your Building sum insured (per RM 100,000) × plan loading × property-type loading, plus Contents sum insured × plan loading. An instant 10% online discount applies, then SST 8% on the net premium." },
  { q: "Is there a discount for buying online?", a: "Yes — a 10% online discount is applied automatically when you purchase through this site." },
  { q: "Can I cancel or change my policy?", a: "Yes. You may cancel in writing any time; provided no claim has been made you'll receive a short-period refund subject to a minimum retained premium. Mid-term adjustments are supported." },
];

export default function HomeInsurance() {
  const [product, setProduct] = useState(null);
  const { format } = useCurrency();

  useEffect(() => {
    api.get("/products?category=home").then((r) => setProduct(r.data?.[0]));
  }, []);

  const quoteHref = product ? `/home-quote/${product.id}` : "/products";
  const fromPrice = format(product?.base_premium ?? 120, { decimals: 0 });

  const plans = product?.meta?.plans || [];

  return (
    <div data-testid="home-insurance-page">
      {/* HERO */}
      <section className="gold-radial">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
              <Home className="w-3.5 h-3.5" /> Home Insurance
            </div>
            <h1
              data-testid="home-hero-title"
              className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-gray-900 leading-[1.05]"
            >
              Sleep easy.
              <br />
              <span className="text-blue-700">Home protected.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-xl leading-relaxed">
              <strong>Home Easy</strong> covers your building, contents and liability against fire, flood, storm and theft — from <strong>{fromPrice}/year</strong>.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={quoteHref}>
                <Button
                  data-testid="home-buy-now-btn"
                  className="rounded-full bg-blue-700 hover:bg-blue-800 text-white px-8 h-12 text-base shadow-float"
                >
                  Get quote <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href="#benefits">
                <Button
                  variant="outline"
                  className="rounded-full border-gray-200 h-12 px-6 text-base hover:bg-white"
                  data-testid="home-learn-more-btn"
                >
                  See coverage
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
              <div className="inline-flex items-center gap-2 bg-white rounded-full px-3.5 py-1.5 shadow-sm border border-gray-100">
                <BadgePercent className="w-4 h-4 text-blue-700" />
                <span className="font-semibold">10% online discount</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-gray-500">
                <Calendar className="w-4 h-4" /> 12-month cover
              </div>
            </div>
          </div>

          {/* Pricing card */}
          <div className="relative">
            <div className="absolute -inset-6 bg-blue-400/15 blur-3xl rounded-full" />
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-float bg-white border border-blue-100">
              <img src={HERO_IMG} alt="Home Easy" className="w-full h-48 object-cover" />
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs text-blue-700 uppercase tracking-widest font-semibold mb-1">
                      Home Insurance
                    </div>
                    <div className="font-display text-3xl font-semibold">Home Easy</div>
                  </div>
                  <span className="bg-blue-700 text-white text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    -10%
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-4 flex-wrap">
                  <span className="text-xs text-gray-500">from</span>
                  <span className="font-display text-4xl sm:text-5xl font-semibold text-blue-700">
                    {fromPrice}
                  </span>
                  <span className="text-xs text-gray-500">/year</span>
                </div>
                <ul className="space-y-2 mb-5">
                  {[
                    "Building + Contents cover bundled",
                    "Fire, flood, storm, theft and vandalism",
                    "Public liability up to RM 1,000,000",
                    "24/7 Home Assistance add-on",
                    "Instant digital policy card",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" strokeWidth={3} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={quoteHref}>
                  <Button
                    data-testid="home-price-card-cta"
                    className="w-full rounded-full bg-blue-700 hover:bg-blue-800 text-white h-11 shadow-float"
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COVERAGE CALCULATOR */}
      <HomeCoverageCalculator product={product} quoteHref={quoteHref} />

      {/* KEY BENEFITS */}
      <section id="benefits" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <div className="text-xs text-blue-700 uppercase tracking-widest font-semibold mb-2">
            Key benefits
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Why Home Easy.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {KEY_BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} data-testid={`home-benefit-${i}`} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-400/40 hover:-translate-y-1 hover:shadow-float transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-display text-lg font-semibold mb-1">{b.title}</div>
                <p className="text-sm text-gray-500 leading-relaxed">{b.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* PLANS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <div className="text-xs text-blue-700 uppercase tracking-widest font-semibold mb-2">
            Plans
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Basic · Enhanced · Premier.
          </h2>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Three tiers of protection — pick what matches your peace of mind.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p, i) => (
            <div
              key={p.key}
              data-testid={`home-plan-${p.key}`}
              className={`relative rounded-2xl p-6 border transition-all ${
                i === 1
                  ? "bg-[#0a1f3d] text-white border-[#0a1f3d] shadow-float -translate-y-1"
                  : "bg-white border-gray-100 hover:border-blue-400/40"
              }`}
            >
              {i === 1 && (
                <span className="absolute top-4 right-4 bg-blue-400 text-[#0a1f3d] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Popular
                </span>
              )}
              <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${i === 1 ? "text-blue-300" : "text-blue-700"}`}>
                {p.label}
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className={`font-display text-3xl font-semibold ${i === 1 ? "text-white" : "text-gray-900"}`}>
                  ×{p.building_mult.toFixed(2)}
                </span>
                <span className={`text-xs ${i === 1 ? "text-white/60" : "text-gray-400"}`}>building factor</span>
              </div>
              <ul className="space-y-1.5">
                {(p.benefits || []).map((b) => (
                  <li key={b} className={`flex items-start gap-2 text-sm ${i === 1 ? "text-white/85" : "text-gray-700"}`}>
                    <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${i === 1 ? "text-blue-300" : "text-blue-700"}`} strokeWidth={3} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <div className="text-xs text-blue-700 uppercase tracking-widest font-semibold mb-2">FAQ</div>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">Your questions, answered.</h2>
        </div>
        <Accordion type="single" collapsible className="bg-white rounded-3xl border border-gray-100 p-2">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`f-${i}`} data-testid={`home-faq-${i}`}>
              <AccordionTrigger className="px-4 text-left font-medium hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="px-4 text-gray-600 leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-[2rem] bg-[#0a1f3d] text-white p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between shadow-float">
          <div>
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-2">Ready when you are</div>
            <h3 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Instant home protection. Under 3 minutes.</h3>
            <p className="text-white/70 mt-2">12 months cover · from {fromPrice}/year · Secure Stripe checkout</p>
          </div>
          <Link to={quoteHref}>
            <Button data-testid="home-footer-cta" className="rounded-full bg-blue-400 hover:bg-blue-300 text-[#0a1f3d] font-semibold px-8 h-12 shadow-float">
              Start my quote <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
