import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Home, Sofa, ShieldCheck } from "lucide-react";

/**
 * Live, interactive Coverage Calculator for Home Easy.
 * Runs the same math as /api/quotes/home client-side using product.meta:
 *   building = (building_sum/100k) × base_rate × plan.building_mult × property.multiplier
 *   contents = (contents_sum/100k) × contents_rate × plan.contents_mult
 *   gross    = building + contents
 *   subtotal = gross × (1 − online_discount%) + addons
 *   total    = subtotal × (1 + tax%)
 */
export default function HomeCoverageCalculator({ product, quoteHref }) {
  const { format } = useCurrency();
  const meta = product?.meta || {};
  const plans = meta.plans || [];
  const ptypes = meta.property_types || [];
  const baseRate = Number(meta.base_rate_per_100k || 120);
  const contentsRate = Number(meta.contents_rate_per_100k || 150);
  const onlinePct = Number(meta.online_discount_pct || 10);
  const taxPct = Number(meta.tax_pct || 8);
  const bMin = Number(meta.building_min || 50000);
  const bMax = Number(meta.building_max || 2000000);
  const cMin = Number(meta.contents_min || 10000);
  const cMax = Number(meta.contents_max || 500000);

  const [planKey, setPlanKey] = useState("enhanced");
  const [propType, setPropType] = useState("landed");
  const [building, setBuilding] = useState(500000);
  const [contents, setContents] = useState(50000);

  // Resync defaults when product meta loads
  useEffect(() => {
    if (plans.length && !plans.find((p) => p.key === planKey)) setPlanKey(plans[1]?.key || plans[0].key);
    if (ptypes.length && !ptypes.find((t) => t.key === propType)) setPropType(ptypes[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const plan = useMemo(() => plans.find((p) => p.key === planKey) || plans[0], [plans, planKey]);
  const prop = useMemo(() => ptypes.find((t) => t.key === propType) || ptypes[0], [ptypes, propType]);

  const calc = useMemo(() => {
    if (!plan || !prop) return null;
    const buildingC = (building / 100000) * baseRate * plan.building_mult * prop.multiplier;
    const contentsC = (contents / 100000) * contentsRate * plan.contents_mult;
    const gross = buildingC + contentsC;
    const discount = gross * (onlinePct / 100);
    const subtotal = gross - discount;
    const tax = subtotal * (taxPct / 100);
    return {
      building: round2(buildingC),
      contents: round2(contentsC),
      gross: round2(gross),
      discount: round2(discount),
      subtotal: round2(subtotal),
      tax: round2(tax),
      total: round2(subtotal + tax),
    };
  }, [plan, prop, building, contents, baseRate, contentsRate, onlinePct, taxPct]);

  const animatedTotal = useAnimatedNumber(calc?.total ?? 0);

  if (!plans.length || !ptypes.length) return null;

  const deepLink =
    quoteHref +
    `?plan=${planKey}&property_type=${propType}` +
    `&building=${building}&contents=${contents}`;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20" data-testid="home-coverage-calculator">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-xs text-blue-700 uppercase tracking-widest font-semibold mb-2 inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Coverage calculator
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Tune your cover. Watch your price.
          </h2>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Slide through building and contents sums — your yearly premium recalculates live.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* LEFT — controls */}
        <div className="lg:col-span-3 relative rounded-[2rem] border border-blue-200/60 bg-white/70 backdrop-blur-sm p-6 sm:p-8 shadow-float overflow-hidden">
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-14 w-60 h-60 rounded-full bg-cyan-300/20 blur-3xl pointer-events-none" />

          <div className="relative space-y-7">
            {/* Plan chips */}
            <div>
              <div className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-2">Plan</div>
              <div className="flex flex-wrap gap-2">
                {plans.map((p) => {
                  const on = planKey === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPlanKey(p.key)}
                      data-testid={`home-calc-plan-${p.key}`}
                      className={`px-4 h-11 rounded-full text-sm font-medium transition-all border ${
                        on
                          ? "bg-[#0a1f3d] text-white border-[#0a1f3d] shadow-[0_6px_20px_-8px_rgba(10,31,61,0.5)]"
                          : "bg-white text-gray-700 border-gray-200 hover:border-blue-500 hover:text-blue-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Property type */}
            <div>
              <div className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-2">Property type</div>
              <div className="flex flex-wrap gap-2">
                {ptypes.map((t) => {
                  const on = propType === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setPropType(t.key)}
                      data-testid={`home-calc-ptype-${t.key}`}
                      className={`px-3.5 h-10 rounded-full text-sm font-medium transition-all border ${
                        on ? "bg-blue-50 text-blue-800 border-blue-500" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Building slider */}
            <Slider
              label="Building sum insured"
              icon={Home}
              value={building}
              min={bMin}
              max={bMax}
              step={10000}
              onChange={setBuilding}
              format={(v) => format(v, { decimals: 0 })}
              testId="home-calc-building-slider"
            />

            {/* Contents slider */}
            <Slider
              label="Contents sum insured"
              icon={Sofa}
              value={contents}
              min={cMin}
              max={cMax}
              step={5000}
              onChange={setContents}
              format={(v) => format(v, { decimals: 0 })}
              testId="home-calc-contents-slider"
            />
          </div>
        </div>

        {/* RIGHT — live price card */}
        <div className="lg:col-span-2 relative rounded-[2rem] bg-[#0a1f3d] text-white p-6 sm:p-8 shadow-float overflow-hidden">
          <div className="absolute -top-24 -right-10 w-64 h-64 rounded-full bg-blue-400/30 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-blue-300 font-semibold mb-4">
              <ShieldCheck className="w-3.5 h-3.5" /> Your estimate
            </div>

            <div className="flex items-end gap-1.5 tabular-nums">
              <div data-testid="home-calc-total" className="font-display text-[72px] leading-[0.9] font-semibold text-white">
                {format(animatedTotal, { decimals: 2 }).replace(/^[^0-9-]+/, "")}
              </div>
              <div className="pb-3 text-xs text-white/60">/ year</div>
            </div>
            <div className="mt-1 text-[11px] tracking-wider text-white/60">
              approx. {format((calc?.total || 0) / 12, { decimals: 2 })} / month
            </div>

            <div className="mt-6 h-px bg-white/10" />

            <ul className="mt-5 space-y-2 text-sm">
              <Row label="Building premium" value={format(calc?.building || 0)} />
              <Row label="Contents premium" value={format(calc?.contents || 0)} />
              <Row
                label={`Online discount (${onlinePct}%)`}
                value={`− ${format(calc?.discount || 0)}`}
                accent="green"
              />
              <Row label={`SST (${taxPct}%)`} value={format(calc?.tax || 0)} />
              <Row label="Total" value={format(calc?.total || 0)} big />
            </ul>

            <Link to={deepLink} className="mt-6 block" data-testid="home-calc-cta">
              <Button className="w-full rounded-full bg-blue-400 hover:bg-blue-300 text-[#0a1f3d] font-semibold h-12 shadow-float">
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

function Slider({ label, icon: Icon, value, min, max, step, onChange, format, testId }) {
  const pct = ((value - min) / Math.max(1, max - min)) * 100;
  return (
    <div>
      <div className="flex items-end justify-between mb-2">
        <div className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold inline-flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" /> {label}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-gray-400">Selected</div>
          <div className="font-display text-xl font-semibold text-blue-900 leading-none">{format(value)}</div>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        data-testid={testId}
        className="home-slider w-full"
        style={{ "--progress": `${pct}%` }}
        aria-label={label}
      />
      <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-400">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
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
      const ease = 1 - Math.pow(1 - t, 3);
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
