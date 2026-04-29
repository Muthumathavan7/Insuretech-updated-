import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Car, Wallet, Gauge, Wrench, ShieldCheck, BadgePercent,
  Droplets, Sparkles, Umbrella, Brush, Users, ScrollText, ArrowRight, Phone,
} from "lucide-react";

const HERO_IMG =
  "https://images.unsplash.com/photo-1636613112804-c5aebc1f4d8d?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80";

const BENEFITS = [
  {
    icon: BadgePercent,
    title: "10% Instant Rebate",
    body: "Get a 10% instant rebate on top of your No Claim Discount (NCD) when you buy or renew online.",
  },
  {
    icon: Wallet,
    title: "Agreed Sum or Market Value",
    body: "We pay out as per the agreed sum insured on your policy — no surprises at claim time.",
  },
  {
    icon: Phone,
    title: "24-hour Emergency Auto-assist",
    body: "Roadside assistance around the clock for accidental and non-accidental breakdowns.",
  },
  {
    icon: Wrench,
    title: "300+ Authorised Workshops",
    body: "Fast, easy repairs at our nationwide panel of authorised car workshops.",
  },
  {
    icon: ShieldCheck,
    title: "Workmanship Guarantee",
    body: "Free 6-month guarantee on workmanship and replacement parts from our panel workshops.",
  },
];

const FAQS = [
  {
    q: "What is Motor Easy insurance?",
    a: "Motor Easy is a comprehensive private-car insurance plan that covers loss or damage to your own vehicle, plus third-party liabilities. You can enhance it with optional add-ons such as windscreen cover, flood cover, and passenger PA.",
  },
  {
    q: "How is my premium calculated?",
    a: "Your premium depends on the cover type (Comprehensive or Third Party), your car's market value (sum insured), your No Claim Discount (NCD), and any add-ons you pick. Online customers receive a 10% instant rebate on top of their NCD.",
  },
  {
    q: "How fast can I buy online?",
    a: "Most customers finish checkout in under 3 minutes. Fill in your vehicle registration, personal details, and payment — we do the rest.",
  },
  {
    q: "Can I cancel my policy after purchasing?",
    a: "Yes. You can cancel in writing at any time. Provided no claim has been made, you'll receive a refund based on short-period rates (a minimum retained premium applies).",
  },
  {
    q: "How do I get help in an emergency?",
    a: "Call our 24/7 Auto-Assist hotline. For accidents, make a police report within 24 hours and photograph the damage for your claim.",
  },
];

export default function MotorInsurance() {
  const [product, setProduct] = useState(null);
  const { format } = useCurrency();

  useEffect(() => {
    api.get("/products?category=motor").then((r) => setProduct(r.data?.[0]));
  }, []);

  const quoteHref = product ? `/motor-quote/${product.id}` : "/motor-quote";

  // Money values stored in base currency (MYR) and rendered via format()
  const ADDONS = [
    { icon: Umbrella, name: "Windscreen Coverage",
      body: "A cracked windscreen can happen anytime. Repair & replacement without affecting your NCD." },
    { icon: Wallet, name: "Inconvenience Allowance",
      body: `Receive up to ${format(50, { decimals: 0 })}/day while your car is being repaired (up to 10 days).` },
    { icon: Brush, name: "Spray Paint",
      body: "Get the whole car repainted — not just the damaged area." },
    { icon: ShieldCheck, name: "Strike, Riot & Civil Commotion",
      body: "Cover damages to your vehicle caused by strikes, riots or public disturbance." },
    { icon: Users, name: "Passenger PA Coverage",
      body: "Additional personal accident coverage for your passengers." },
    { icon: ScrollText, name: "Legal Liability to Passengers",
      body: "Protect passengers in the event of an accident with compensation for injury or death." },
  ];

  const BUNDLE = [
    `All Drivers — waiver of excess up to ${format(100, { decimals: 0 })}`,
    `Convenience Cash Allowance — 10% of sum insured, up to ${format(2500, { decimals: 0 })}`,
    `Side Mirror Protection — up to ${format(250, { decimals: 0 })}`,
    `Key Replacement — up to ${format(250, { decimals: 0 })}`,
    "Legal Liability to Passengers",
    `Drivers & Passengers PA up to ${format(5000, { decimals: 0 })} per person`,
    "24-hour Emergency Towing & Roadside Assistance",
    `Compassionate Flood Cover — up to ${format(400, { decimals: 0 })}`,
  ];

  const eligibilityFAQ = `Drivers aged 18 to 99 with a valid driving licence. Private cars up to 20 years old and a sum insured up to ${format(500000, { decimals: 0 })} are eligible. High-performance and e-hailing vehicles are excluded.`;

  return (
    <div data-testid="motor-insurance-page">
      {/* HERO */}
      <section className="gold-radial">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-800 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
              <Car className="w-3.5 h-3.5" /> Motor Easy
            </div>
            <h1
              data-testid="motor-hero-title"
              className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-gray-900 leading-[1.05]"
            >
              Move seamlessly.
              <br />
              <span className="text-primary-700">Protect deeply.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-xl leading-relaxed">
              Get the best value for money with our comprehensive car insurance.
              Receive <strong>instant savings</strong> when you buy online, plus custom
              add-ons at <strong>super affordable</strong> rates.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={quoteHref}>
                <Button
                  data-testid="motor-buy-now-btn"
                  className="rounded-full bg-primary hover:bg-primary-600 text-white px-8 h-12 text-base shadow-float"
                >
                  Buy Now <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href="#benefits">
                <Button
                  variant="outline"
                  className="rounded-full border-gray-200 h-12 px-6 text-base hover:bg-white"
                  data-testid="motor-learn-more-btn"
                >
                  Learn more
                </Button>
              </a>
            </div>
            <div className="mt-8 flex items-center gap-4 text-sm">
              <div className="inline-flex items-center gap-2 bg-white rounded-full px-3.5 py-1.5 shadow-sm border border-gray-100">
                <BadgePercent className="w-4 h-4 text-primary-700" />
                <span className="font-semibold">Instant 10% online discount</span>
              </div>
              <div className="hidden md:inline-flex items-center gap-1.5 text-gray-500">
                <Gauge className="w-4 h-4" /> Renew in 3 minutes
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-primary/10 blur-3xl rounded-full" />
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-float aspect-[4/3] bg-white">
              <img src={HERO_IMG} alt="Motor Easy" className="w-full h-full object-cover" />
              <div className="absolute left-4 right-4 bottom-4 bg-white/90 backdrop-blur-xl rounded-2xl p-4 border border-white/60 shadow-softlg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-primary-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500">Now available</div>
                    <div className="font-semibold text-sm">Flood Cover · 0.2% of sum insured</div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-primary text-white px-2 py-1 rounded-full">
                    New
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Motor Bundle highlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-[2rem] bg-gradient-to-br from-primary-50 via-white to-white border border-primary-100 p-8 md:p-12 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-2">
              Motor Bundle
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mb-4">
              Enhanced benefits, <span className="text-primary-700">{format(0.24)}/day.</span>
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Greater value with our curated motor bundle — All-Driver cover, side-mirror protection,
              roadside assistance and more, all at a super-affordable daily rate.
            </p>
            <ul className="space-y-2.5">
              {BUNDLE.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-white font-bold text-xs">
                    {i + 1}
                  </div>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
            <img
              src="https://images.unsplash.com/photo-1493238792000-8113da705763?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80"
              alt="Motor bundle"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-2">
            Benefits
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Everything you need. <br className="hidden md:inline" />
            Nothing you don't.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={i}
                data-testid={`motor-benefit-${i}`}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-primary/30 hover:-translate-y-1 hover:shadow-float transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700 mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{b.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{b.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ADD-ONS */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-2">
                Optional Add-ons
              </div>
              <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
                Customise your shield.
              </h2>
            </div>
            <Link to={quoteHref}>
              <Button
                data-testid="addons-get-quote-btn"
                className="rounded-full bg-primary hover:bg-primary-600 text-white px-6 h-11 shadow-float"
              >
                Get your quote <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ADDONS.map((a, i) => {
              const Icon = a.icon;
              return (
                <div
                  key={i}
                  data-testid={`motor-addon-${i}`}
                  className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-display text-lg font-semibold">{a.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{a.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-2">
            FAQ
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
        </div>
        <Accordion type="single" collapsible className="bg-white rounded-3xl border border-gray-100 p-2">
          <AccordionItem value="elig" data-testid="motor-faq-eligibility">
            <AccordionTrigger className="px-4 text-left font-medium hover:no-underline">
              Who can apply for Motor Easy?
            </AccordionTrigger>
            <AccordionContent className="px-4 text-gray-600 leading-relaxed">
              {eligibilityFAQ}
            </AccordionContent>
          </AccordionItem>
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`f-${i}`} data-testid={`motor-faq-${i}`}>
              <AccordionTrigger className="px-4 text-left font-medium hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="px-4 text-gray-600 leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-[2rem] bg-[#0F172A] text-white p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between shadow-float">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">
              Ready to move?
            </div>
            <h3 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              Your car. Protected in 3 minutes.
            </h3>
            <p className="text-white/70 mt-2">Instant 10% online rebate · No paperwork · Claim in-app</p>
          </div>
          <Link to={quoteHref}>
            <Button
              data-testid="motor-footer-cta"
              className="rounded-full bg-primary hover:bg-primary-600 text-white px-8 h-12 shadow-float"
            >
              Start my quote <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
