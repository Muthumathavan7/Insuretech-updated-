import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Heart, Activity, Stethoscope, Siren, Flower2, FuelIcon, Hospital,
  Check, BadgePercent, ShieldCheck, Calendar, Users, ArrowRight,
} from "lucide-react";

const HERO_IMG =
  "https://images.pexels.com/photos/5407206/pexels-photo-5407206.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1200";

const BENEFITS = [
  {
    icon: Heart,
    title: "Death & Permanent Disablement",
    amount: "$10,000",
    body: "By accidental cause resulting in death or permanent disability.",
  },
  {
    icon: Hospital,
    title: "Hospital Income",
    amount: "$50 / day",
    body: "Up to 30 days per accident while hospitalised.",
  },
  {
    icon: Siren,
    title: "Ambulance Services",
    amount: "$200",
    body: "Reimbursement for emergency ambulance transport.",
  },
  {
    icon: Flower2,
    title: "Bereavement / Funeral Expenses",
    amount: "$1,500",
    body: "Accidental death only — eases the burden on loved ones.",
  },
  {
    icon: Stethoscope,
    title: "Dental & Clinical Accidental Treatment",
    amount: "$1,000",
    body: "Reimbursement for accidental dental and clinical care.",
  },
  {
    icon: FuelIcon,
    title: "Fuel Station Accident Benefit",
    amount: "$10,000",
    body: "Dedicated additional cover for accidents at fuel stations.",
  },
];

const HIGHLIGHTS = [
  { label: "Only $29.16/year", sub: "after 25% online discount" },
  { label: "12 months cover", sub: "annually renewable" },
  { label: "Ages 18 – 70", sub: "eligibility" },
  { label: "Instant cover", sub: "from successful payment" },
];

const FAQS = [
  {
    q: "What is Tune Protect PA Easy?",
    a: "PA Easy is a personal accident insurance product designed to protect you in the event of bodily injury arising from an accident — covering accidental death, permanent disablement, medical expenses, hospital income, bereavement allowance and more.",
  },
  {
    q: "How much does PA Easy cost?",
    a: "PA Easy is available at only $29.16 per year (gross $36 − 25% online discount + 8% SST on the discounted amount).",
  },
  {
    q: "Who can apply for this policy?",
    a: "Anyone aged 18 – 70 who is a resident or has a permanent residential address, with a valid ID. You can only hold one PA Easy policy as the Insured Person at any one time.",
  },
  {
    q: "When does my insurance coverage start?",
    a: "Your coverage starts from the date of successful payment and runs for 12 calendar months.",
  },
  {
    q: "Is there a discount for online purchase?",
    a: "Yes — a 25% discount is applied to the basic premium when you buy PA Easy online through this site.",
  },
  {
    q: "Can I cancel my policy?",
    a: "Yes. You can cancel at any time by giving written notice. Upon cancellation, you are entitled to a short-period premium refund subject to a minimum premium.",
  },
  {
    q: "How and where do I update my beneficiary information?",
    a: "During the quote flow you nominate a primary beneficiary. To change it later, contact customer support — we'll send you the nomination form.",
  },
];

export default function PAInsurance() {
  const [product, setProduct] = useState(null);

  useEffect(() => {
    api.get("/products?category=pa").then((r) => setProduct(r.data?.[0]));
  }, []);

  const quoteHref = product ? `/pa-quote/${product.id}` : "/pa-quote";

  return (
    <div data-testid="pa-insurance-page">
      {/* HERO */}
      <section className="gold-radial">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-800 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
              <Activity className="w-3.5 h-3.5" /> Personal Accident
            </div>
            <h1
              data-testid="pa-hero-title"
              className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-gray-900 leading-[1.05]"
            >
              Life is unpredictable.
              <br />
              <span className="text-primary-700">Your cover shouldn't be.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-xl leading-relaxed">
              You'll never know when an accident could happen. Protect yourself and your loved ones
              from financial strain with <strong>PA Easy</strong> — premium personal accident
              protection, from <strong>$29.16/year</strong>.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={quoteHref}>
                <Button
                  data-testid="pa-buy-now-btn"
                  className="rounded-full bg-primary hover:bg-primary-600 text-white px-8 h-12 text-base shadow-float"
                >
                  Buy Now <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href="#benefits">
                <Button
                  variant="outline"
                  className="rounded-full border-gray-200 h-12 px-6 text-base hover:bg-white"
                  data-testid="pa-learn-more-btn"
                >
                  See all benefits
                </Button>
              </a>
            </div>
            <div className="mt-8 flex items-center gap-4 text-sm">
              <div className="inline-flex items-center gap-2 bg-white rounded-full px-3.5 py-1.5 shadow-sm border border-gray-100">
                <BadgePercent className="w-4 h-4 text-primary-700" />
                <span className="font-semibold">25% online discount</span>
              </div>
              <div className="hidden md:inline-flex items-center gap-1.5 text-gray-500">
                <Calendar className="w-4 h-4" /> 12-month cover
              </div>
            </div>
          </div>

          {/* Pricing card */}
          <div className="relative">
            <div className="absolute -inset-6 bg-primary/10 blur-3xl rounded-full" />
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-float bg-white border border-primary-100">
              <img src={HERO_IMG} alt="PA Easy" className="w-full h-48 object-cover" />
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-1">
                      Online Personal Accident Insurance
                    </div>
                    <div className="font-display text-3xl font-semibold">PA Easy</div>
                  </div>
                  <span className="bg-primary text-white text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    -25%
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="font-display text-5xl font-semibold text-primary-700">
                    $29.16
                  </span>
                  <span className="text-gray-400 line-through">$36.00</span>
                  <span className="text-xs text-gray-500">/year</span>
                </div>
                <ul className="space-y-2 mb-5">
                  {[
                    "Death & Permanent Disablement up to $10,000",
                    "Hospital Income $50/day up to 30 days",
                    "Ambulance Services up to $200",
                    "Bereavement / Funeral Expenses $1,500",
                    "Dental & Clinical Treatment $1,000",
                    "Fuel Station Accident Benefit $10,000",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-primary-700 flex-shrink-0 mt-0.5" strokeWidth={3} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={quoteHref}>
                  <Button
                    data-testid="pa-price-card-cta"
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

      {/* HIGHLIGHTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {HIGHLIGHTS.map((h, i) => (
            <div
              key={i}
              data-testid={`pa-highlight-${i}`}
              className="bg-white rounded-2xl p-5 border border-gray-100 text-center"
            >
              <div className="font-display text-xl font-semibold text-primary-700">{h.label}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{h.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-2">
            Insurance Coverage
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            What PA Easy covers.
          </h2>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Enjoy 12 months of coverage for only $29.16. Purchase online for instant peace of mind.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={i}
                data-testid={`pa-benefit-${i}`}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-primary/30 hover:-translate-y-1 hover:shadow-float transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700 mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-display text-lg font-semibold mb-1">{b.title}</div>
                <div className="font-display text-3xl font-semibold text-primary-700 mb-2">
                  Up to {b.amount}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{b.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why Choose */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-2">
              Why PA Easy
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mb-4">
              Peace of mind, priced right.
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Personal accident cover that's easy to understand, easy to buy, and backed by a
              nationwide member-protection scheme. Set it up in under 3 minutes.
            </p>
            <ul className="space-y-3">
              {[
                { icon: BadgePercent, text: "25% instant online discount" },
                { icon: ShieldCheck, text: "Member of PIDM (Malaysia Deposit Insurance)" },
                { icon: Users, text: "Up to 6 persons per policy — protect the family" },
                { icon: Calendar, text: "Instant cover the moment payment clears" },
              ].map((f, i) => {
                const Icon = f.icon;
                return (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                    <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary-700" />
                    </div>
                    {f.text}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-3xl overflow-hidden aspect-[4/3] bg-gray-100">
            <img
              src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80"
              alt="Family protection"
              className="w-full h-full object-cover"
            />
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
            Your questions, answered.
          </h2>
        </div>
        <Accordion type="single" collapsible className="bg-white rounded-3xl border border-gray-100 p-2">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`f-${i}`} data-testid={`pa-faq-${i}`}>
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
              Ready when you are
            </div>
            <h3 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              Instant protection. Under 3 minutes.
            </h3>
            <p className="text-white/70 mt-2">12 months cover · $29.16/year · Secure Stripe checkout</p>
          </div>
          <Link to={quoteHref}>
            <Button
              data-testid="pa-footer-cta"
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
