import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Flame, PartyPopper, ShieldCheck } from "lucide-react";

/**
 * Live, interactive "Coverage calculator" for Critical Safe+.
 *
 * Runs the underwriting formula client-side (same math as /api/quotes/health):
 *   gross = base_rate * option.multiplier * plan.multiplier * age_bucket * (1 + 30% if smoker)
 *   subtotal = gross * (1 - online_discount%)
 *   total = subtotal * (1 + tax%)
 *
 * Uses `product.meta` which already ships in the GET /products response,
 * so there's no network call per slider tick — the number counts up fluidly.
 */
export default function HealthCoverageCalculator({ product, quoteHref }) {
  const { format } = useCurrency();
  const meta = product?.meta || {};
  const options = meta.coverage_options || [];
  const plans = meta.plans || [];
  const ageLoading = meta.age_loading || {};
  const ageBuckets = Object.keys(ageLoading);
  const discountPct = Number(meta.online_discount_pct || 15);
  const taxPct = Number(meta.tax_pct || 8);
  const smokerLoadingPct = Number(meta.smoker_loading_pct || 30);
  const baseRate = Number(product?.base_premium || 22);

  // Defaults: Top 5, Plan 3, age 30-39, non-smoker
  const [optionKey, setOptionKey] = useState("top5");
  const [planIdx, setPlanIdx] = useState(2);
  const [ageBucket, setAgeBucket] = useState(ageBuckets[1] || "30-39");
  const [smoker, setSmoker] = useState(false);

  // Resync once the product meta loads
  useEffect(() => {
    if (ageBuckets.length && !ageBuckets.includes(ageBucket)) {
      setAgeBucket(ageBuckets[1] || ageBuckets[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const option = useMemo(
    () => options.find((o) => o.key === optionKey) || options[0],
    [options, optionKey],
  );
  const plan = plans[planIdx] || plans[0];

  const calc = useMemo(() => {
    if (!option || !plan) return null;
    const ageMult = Number(ageLoading[ageBucket] ?? 1);
    const smokerMult = 1 + (smoker ? smokerLoadingPct / 100 : 0);
    const gross = baseRate * option.multiplier * plan.multiplier * ageMult * smokerMult;
    const discount = gross * (discountPct / 100);
    const subtotal = gross - discount;
    const tax = subtotal * (taxPct / 100);
    const total = subtotal + tax;
    return {
      gross: round2(gross),
      discount: round2(discount),
      subtotal: round2(subtotal),
      tax: round2(tax),
      total: round2(total),
    };
  }, [option, plan, ageBucket, smoker, baseRate, discountPct, taxPct, smokerLoadingPct, ageLoading]);

  // Smooth count-up on the headline total
  const animatedTotal = useAnimatedNumber(calc?.total ?? 0);

  if (!options.length || !plans.length) return null;

  // Build the calculator's deep-link into the quote wizard so the user lands
  // on step 2 (personal details) with their slider selection already applied.
  const deepLink =
    quoteHref +
    `?option=${optionKey}&plan=${plan?.key}&age_bucket=${encodeURIComponent(ageBucket)}` +
    `&smoker=${smoker ? 1 : 0}`;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20" data-testid="health-coverage-calculator">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold mb-2 inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Coverage calculator
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Afinity.ai your cover. Watch your price.
          </h2>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Slide through sum-insured plans and toggle options — your annual premium recalculates live.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* LEFT — controls */}
        <div className="lg:col-span-3 relative rounded-[2rem] border border-primary/15 bg-white/70 backdrop-blur-sm p-6 sm:p-8 shadow-float overflow-hidden">
          {/* Decorative orbs */}
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-14 w-60 h-60 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />

          <div className="relative space-y-7">
            {/* Coverage option chips */}
            <div>
              <div className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-2">Coverage option</div>
              <div className="flex flex-wrap gap-2">
                {options.map((o, i) => {
                  const on = optionKey === o.key;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => setOptionKey(o.key)}
                      data-testid={`calc-opt-${o.key}`}
                      className={`relative px-4 h-11 rounded-full text-sm font-medium transition-all border ${
                        on
                          ? "bg-[#0F172A] text-white border-[#0F172A] shadow-[0_6px_20px_-8px_rgba(15,23,42,0.5)]"
                          : "bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary-700"
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-widest mr-2 opacity-70">Option {i + 1}</span>
                      {shortenOptionLabel(o.label)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sum-insured slider */}
            <div>
              <div className="flex items-end justify-between mb-2">
                <div className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">Sum insured</div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-gray-400">Selected</div>
                  <div className="font-display text-2xl font-semibold text-primary-800 leading-none">
                    {format(plan?.sum_insured || 0, { decimals: 0 })}
                  </div>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={plans.length - 1}
                step={1}
                value={planIdx}
                onChange={(e) => setPlanIdx(parseInt(e.target.value, 10))}
                data-testid="calc-plan-slider"
                className="health-slider w-full"
                style={{
                  "--progress": `${(planIdx / Math.max(1, plans.length - 1)) * 100}%`,
                }}
                aria-label="Sum insured"
              />
              <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-400">
                {plans.map((p, i) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPlanIdx(i)}
                    data-testid={`calc-plan-stop-${p.key}`}
                    className={`transition-colors ${i === planIdx ? "text-primary-800 font-semibold" : "hover:text-gray-700"}`}
                  >
                    {(p.sum_insured / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            {/* Age + smoker */}
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-2">Age</div>
                <div className="flex flex-wrap gap-2">
                  {ageBuckets.map((b) => {
                    const on = ageBucket === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setAgeBucket(b)}
                        data-testid={`calc-age-${b}`}
                        className={`px-3.5 h-10 rounded-full text-sm font-medium transition-all border ${
                          on ? "bg-primary-50 text-primary-800 border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-primary/60"
                        }`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-2">Smoker</div>
                <div className="inline-flex rounded-full bg-gray-100 p-1 border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setSmoker(false)}
                    data-testid="calc-smoker-no"
                    className={`px-5 h-8 rounded-full text-sm font-medium transition-all ${!smoker ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmoker(true)}
                    data-testid="calc-smoker-yes"
                    className={`px-5 h-8 rounded-full text-sm font-medium transition-all inline-flex items-center gap-1.5 ${smoker ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
                  >
                    <Flame className="w-3.5 h-3.5" /> Yes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — live price card */}
        <div className="lg:col-span-2 relative rounded-[2rem] bg-[#0F172A] text-white p-6 sm:p-8 shadow-float overflow-hidden">
          <div className="absolute -top-24 -right-10 w-64 h-64 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-4">
              <PartyPopper className="w-3.5 h-3.5" /> Your estimate
            </div>

            <div className="flex items-end gap-1.5 tabular-nums">
              <div className="font-display text-[72px] leading-[0.9] font-semibold text-white">
                {format(animatedTotal, { decimals: 2 }).replace(/^[^0-9-]+/, "")}
              </div>
              <div className="pb-3 text-xs text-white/60">/ year</div>
            </div>
            <div className="mt-1 text-[11px] tracking-wider text-white/60">
              approx. {format((calc?.total || 0) / 12, { decimals: 2 })} / month
            </div>

            <div className="mt-6 h-px bg-white/10" />

            <ul className="mt-5 space-y-2 text-sm">
              <Row label="Basic premium" value={format(calc?.gross || 0)} />
              <Row
                label={`Online discount (${discountPct}%)`}
                value={`− ${format(calc?.discount || 0)}`}
                accent="green"
              />
              <Row label={`SST (${taxPct}%)`} value={format(calc?.tax || 0)} />
              <Row label="Total" value={format(calc?.total || 0)} big />
            </ul>

            <Link to={deepLink} className="mt-6 block" data-testid="calc-cta">
              <Button className="w-full rounded-full bg-primary hover:bg-primary-600 text-[#0F172A] font-semibold h-12 shadow-float">
                Get this cover <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>

            <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-white/50">
              <ShieldCheck className="w-3.5 h-3.5" />
              Indicative quote · final price confirmed at checkout.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, big, accent }) {
  return (
    <li className="flex items-center justify-between">
      <span className={big ? "text-white text-sm font-semibold uppercase tracking-wider" : "text-white/60"}>{label}</span>
      <span
        className={`font-mono tabular-nums ${
          big ? "font-display text-xl text-white" : accent === "green" ? "text-green-300" : "text-white/85"
        }`}
      >
        {value}
      </span>
    </li>
  );
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function shortenOptionLabel(label) {
  return (label || "")
    .replace("Critical Illnesses", "CIs")
    .replace("Critical Illness", "CI")
    .trim();
}

// Animated count-up using requestAnimationFrame + ease-out
function useAnimatedNumber(target, duration = 450) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    fromRef.current = value;
    startRef.current = 0;
    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const next = fromRef.current + (target - fromRef.current) * ease;
      setValue(next);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}
