import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HeartPulse, Droplets, ShieldPlus, BadgePercent, Zap,
  Check, Clock, Calendar, ArrowRight, Stethoscope,
} from "lucide-react";
import HealthCoverageCalculator from "./HealthCoverageCalculator";
import familyImg from "./WhatsApp Image 2026-05-05 at 15.24.27.jpeg";

const HERO_IMG = familyImg;

const KEY_BENEFITS = [
  { icon: Droplets,   title: "Diabetic Care",        body: "Covers Diabetic Care Disease with a separate sum insured that does not reduce your main cover." },
  { icon: ShieldPlus, title: "Three Easy Options",   body: "Pick Top 2, Top 5 or all 39 Critical Illnesses — match cover to your budget and family history." },
  { icon: Stethoscope,title: "Early-Stage Cover",    body: "50% lump-sum pay-out at early-stage diagnosis, so you can focus on treatment, not bills." },
  { icon: BadgePercent,title: "15% Online Discount", body: "Instant online discount applied to your quote — no codes, no paperwork." },
  { icon: Zap,         title: "Fast Claims",         body: "Claims paid out within 3 working days of approval. Response on queries in 3 hours." },
];

const FAQS = [
  { q: "What is Critical Safe+?", a: "Critical Safe+ is critical illness cover with 3 options and 5 plans. A lump-sum pay-out is made for any of the covered critical illnesses diagnosed at the early or advanced stage shown in your Schedule of Benefits." },
  { q: "Who is eligible to purchase?", a: "Open to Malaysian citizens, Malaysian PRs, and holders of a valid work permit / employment pass legally residing in Malaysia. Age between 15 days and 60 years old, renewable up to 70." },
  { q: "What are the pay-outs for Advanced vs Early Stage?", a: "Advanced Stage — 100% of the sum insured paid provided the insured survives 7 days after diagnosis. The policy then terminates. Early Stage — 50% of the sum insured paid, reducing the remaining cover accordingly." },
  { q: "Is there a discount for buying online?", a: "Yes — a 15% instant online discount is applied to the basic premium when you buy Critical Safe+ through this site." },
  { q: "Can I cancel?", a: "Yes. You may cancel in writing any time; provided no claim has been made you'll receive a short-period refund subject to a minimum retained premium." },
];

const COVERAGE_OPTIONS = [
  { key: "top2", title: "Top 2 Critical Illnesses",
    items: ["Heart Attack — specified severity", "Cancer — specified severity"] },
  { key: "top5", title: "Top 5 Critical Illnesses",
    items: [
      "Heart Attack", "Cancer", "Stroke",
      "Serious Coronary Artery Disease", "Kidney Failure",
    ] },
  { key: "ci39", title: "39 Critical Illnesses",
    items: [
      "All benefits under Top 5",
      "Coronary Artery By-Pass Surgery",
      "End-Stage Liver Failure",
      "Major Organ Transplant",
      "Paralysis of Limbs",
      "+ 30 more conditions covered",
    ] },
];

export default function HealthInsurance() {
  const [product, setProduct] = useState(null);
  const { format } = useCurrency();

  useEffect(() => {
    api.get("/products?category=health").then((r) => setProduct(r.data?.[0]));
  }, []);

  const quoteHref = product ? `/health-quote/${product.id}` : "/products";
  const fromPrice = format(product?.base_premium ?? 22, { decimals: 0 });

  return (
    <div data-testid="health-insurance-page">
      {/* HERO */}
      <section className="gold-radial">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-800 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
              <HeartPulse className="w-3.5 h-3.5" /> Critical Illness
            </div>
            <h1
              data-testid="health-hero-title"
              className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-gray-900 leading-[1.05]"
            >
              Big coverage.
              <br />
              <span className="text-primary-700">Small cost.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-xl leading-relaxed">
              <strong>Critical Safe+</strong> gives you a lump-sum pay-out if you're diagnosed with
              critical illnesses such as cancer, heart attack or stroke — from as low as <strong>{fromPrice}/year</strong>.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={quoteHref}>
                <Button
                  data-testid="health-buy-now-btn"
                  className="rounded-full bg-primary hover:bg-primary-600 text-white px-8 h-12 text-base shadow-float"
                >
                  Get quote <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href="#benefits">
                <Button
                  variant="outline"
                  className="rounded-full border-gray-200 h-12 px-6 text-base hover:bg-white"
                  data-testid="health-learn-more-btn"
                >
                  See coverage
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
              <div className="inline-flex items-center gap-2 bg-white rounded-full px-3.5 py-1.5 shadow-sm border border-gray-100">
                <BadgePercent className="w-4 h-4 text-primary-700" />
                <span className="font-semibold">15% online discount</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-gray-500">
                <Calendar className="w-4 h-4" /> 12-month cover
              </div>
            </div>
          </div>

          {/* Pricing card */}
          <div className="relative">
            <div className="absolute -inset-6 bg-primary/10 blur-3xl rounded-full" />
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-float bg-white border border-primary-100">
              <img src={HERO_IMG} alt="Critical Safe+" className="w-full h-48 object-cover" />
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-1">
                      Online Critical Illness Insurance
                    </div>
                    <div className="font-display text-3xl font-semibold">Critical Safe+</div>
                  </div>
                  <span className="bg-primary text-white text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    -15%
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-4 flex-wrap">
                  <span className="text-xs text-gray-500">from</span>
                  <span className="font-display text-4xl sm:text-5xl font-semibold text-primary-700">
                    {fromPrice}
                  </span>
                  <span className="text-xs text-gray-500">/year</span>
                </div>
                <ul className="space-y-2 mb-5">
                  {[
                    "Lump-sum pay-out on critical illness diagnosis",
                    "Covers up to 39 critical illnesses",
                    "50% early-stage pay-out included",
                    "Diabetic Care Disease benefit",
                    "Claims paid in 3 working days from approval",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-primary-700 flex-shrink-0 mt-0.5" strokeWidth={3} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={quoteHref}>
                  <Button
                    data-testid="health-price-card-cta"
                    className="w-full rounded-full bg-primary hover:bg-primary-600 text-white h-11 shadow-float"
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COVERAGE CALCULATOR — live, interactive */}
      <HealthCoverageCalculator product={product} quoteHref={quoteHref} />

      {/* KEY BENEFITS */}
      <section id="benefits" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-2">
            Key benefits
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Why Critical Safe+.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {KEY_BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} data-testid={`health-benefit-${i}`} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-primary/30 hover:-translate-y-1 hover:shadow-float transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700 mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-display text-lg font-semibold mb-1">{b.title}</div>
                <p className="text-sm text-gray-500 leading-relaxed">{b.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3:3:3 Promise */}
      <section className="bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid md:grid-cols-3 gap-6">
          {[
            { n: "3", t: "minutes to purchase", body: "Get personalised quote and own your plan online in three minutes." },
            { n: "3", t: "hours to respond",    body: "Customer queries answered within 3 hours on business days across every channel." },
            { n: "3", t: "days to pay claims",  body: "From approval, your claim pay-out is credited within 3 working days." },
          ].map((x, i) => (
            <div key={i} className="flex items-start gap-5">
              <div className="font-display text-7xl font-semibold text-primary leading-none">{x.n}</div>
              <div>
                <div className="text-xs uppercase tracking-widest text-primary font-semibold">{x.t}</div>
                <p className="text-white/70 mt-2 text-sm leading-relaxed">{x.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* COVERAGE OPTIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-2">
            Coverage options
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Choose your level.
          </h2>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Three mandatory coverage options × five plans with sum insured between
            {" "}{format(20000, { decimals: 0 })} and {format(200000, { decimals: 0 })}.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {COVERAGE_OPTIONS.map((opt, i) => (
            <div key={opt.key} data-testid={`coverage-option-${opt.key}`} className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="text-xs text-primary-700 font-semibold uppercase tracking-wider mb-2">Option {i + 1}</div>
              <div className="font-display text-xl font-semibold mb-4">{opt.title}</div>
              <ul className="space-y-1.5">
                {opt.items.map((x) => (
                  <li key={x} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-primary-700 flex-shrink-0 mt-0.5" strokeWidth={3} />
                    {x}
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
          <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-2">FAQ</div>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">Your questions, answered.</h2>
        </div>
        <Accordion type="single" collapsible className="bg-white rounded-3xl border border-gray-100 p-2">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`f-${i}`} data-testid={`health-faq-${i}`}>
              <AccordionTrigger className="px-4 text-left font-medium hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="px-4 text-gray-600 leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-[2rem] bg-[#0F172A] text-white p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between shadow-float">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Ready when you are</div>
            <h3 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Instant protection. Under 3 minutes.</h3>
            <p className="text-white/70 mt-2">12 months cover · from {fromPrice}/year · Secure Stripe checkout</p>
          </div>
          <Link to={quoteHref}>
            <Button data-testid="health-footer-cta" className="rounded-full bg-primary hover:bg-primary-600 text-white px-8 h-12 shadow-float">
              Start my quote <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
