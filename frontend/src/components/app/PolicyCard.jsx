import React from "react";
import { Wifi, ShieldCheck } from "lucide-react";

/**
 * Premium credit-card-style insurance card for displaying issued policies.
 *
 * Brand: Afinity.ai (top)
 * Front face shows: brand logo, contactless symbol, chip, policy number (formatted),
 * holder name, valid from / valid thru.
 *
 * Visual design — primary brand gold (#DEB25E) on deep charcoal with
 * subtle radial-gradient shine, hairline gold border, embossed-style policy number.
 *
 * Props:
 *   policy: { policy_number, user_name, product_name, category, start_date, end_date, status }
 *   variant: "gold" | "platinum" | "obsidian"  (default: gold)
 *   className: optional extra classes for the wrapper
 */
export default function PolicyCard({ policy = {}, variant = "gold", className = "" }) {
  const number = String(policy.policy_number || "0000000000000000").replace(/[^0-9A-Z]/gi, "");
  const padded = (number + "0000000000000000").slice(0, 16);
  const grouped = padded.match(/.{1,4}/g)?.join(" ") || padded;

  const validFrom = formatMMYY(policy.start_date);
  const validThru = formatMMYY(policy.end_date);

  const palette = PALETTES[variant] || PALETTES.gold;

  return (
    <div
      data-testid={`policy-card-${policy.id || policy.policy_number || "preview"}`}
      className={`policy-card ${className}`}
      style={{
        // 1.586:1 ISO/IEC 7810 ID-1 ratio
        aspectRatio: "1.586 / 1",
        background: palette.bg,
        color: palette.fg,
        borderRadius: 22,
        padding: "26px 28px",
        position: "relative",
        overflow: "hidden",
        boxShadow:
          "0 18px 38px -10px rgba(0,0,0,0.35), 0 6px 12px -4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
        border: `1px solid ${palette.border}`,
        fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
      }}
    >
      {/* shine layers */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: palette.shine,
          mixBlendMode: "screen",
        }}
      />
      <div
        className="pointer-events-none absolute -top-20 -right-12 w-72 h-72 rounded-full"
        style={{
          background: palette.glow,
          filter: "blur(34px)",
          opacity: 0.45,
        }}
      />
      {/* subtle noise texture (CSS-only) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\' stitchTiles=\'stitch\'/></filter><rect width=\'200\' height=\'200\' filter=\'url(%23n)\'/></svg>")',
        }}
      />

      {/* Top row — Brand + status */}
      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: palette.logoBg,
                color: palette.logoFg,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              <ShieldCheck className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div className="font-bold tracking-tight text-base sm:text-[17px]" style={{ letterSpacing: "-0.01em" }}>
              Afinity<span style={{ color: palette.accent }}>.ai</span>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] mt-1.5 opacity-70">
            {policy.product_name || "Insurance Policy"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Wifi className="w-5 h-5 rotate-90 opacity-80" />
          {policy.status && (
            <span
              className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-semibold"
              style={{
                background: palette.statusBg,
                color: palette.statusFg,
                letterSpacing: "0.18em",
              }}
            >
              {policy.status}
            </span>
          )}
        </div>
      </div>

      {/* Chip */}
      <div className="relative mt-4 sm:mt-6">
        <div
          className="w-10 h-7 sm:w-12 sm:h-8 rounded-md relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${palette.chipA} 0%, ${palette.chipB} 50%, ${palette.chipA} 100%)`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.25)",
          }}
        >
          <div
            className="absolute inset-1 rounded-sm"
            style={{
              background: `repeating-linear-gradient(0deg, transparent 0 4px, ${palette.chipLine} 4px 5px), repeating-linear-gradient(90deg, transparent 0 5px, ${palette.chipLine} 5px 6px)`,
              opacity: 0.6,
            }}
          />
        </div>
      </div>

      {/* Policy number */}
      <div className="relative mt-3 sm:mt-4">
        <div
          className="font-mono tracking-[0.18em] text-[15px] sm:text-[20px] font-semibold"
          style={{
            textShadow: `0 1px 0 ${palette.embossDark}, 0 -1px 0 ${palette.embossLight}`,
          }}
        >
          {grouped}
        </div>
      </div>

      {/* Bottom row — Valid from / Valid thru / Holder */}
      <div className="relative mt-3 sm:mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] opacity-60 mb-0.5">
            Card Holder
          </div>
          <div className="font-semibold text-[12px] sm:text-sm uppercase tracking-wide truncate">
            {policy.user_name || "POLICY HOLDER"}
          </div>
        </div>
        <div className="flex gap-3 sm:gap-4 shrink-0">
          {validFrom && (
            <div>
              <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] opacity-60 mb-0.5">Valid From</div>
              <div className="font-mono text-[11px] sm:text-sm font-semibold">{validFrom}</div>
            </div>
          )}
          {validThru && (
            <div>
              <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] opacity-60 mb-0.5">Valid Thru</div>
              <div className="font-mono text-[11px] sm:text-sm font-semibold">{validThru}</div>
            </div>
          )}
        </div>
      </div>

      {/* Decorative ring (lower-right) */}
      <div
        className="pointer-events-none absolute -right-6 -bottom-12 w-40 h-40 rounded-full"
        style={{
          border: `1px solid ${palette.ring}`,
          opacity: 0.22,
        }}
      />
      <div
        className="pointer-events-none absolute -right-3 -bottom-16 w-44 h-44 rounded-full"
        style={{
          border: `1px solid ${palette.ring}`,
          opacity: 0.14,
        }}
      />
    </div>
  );
}

function formatMMYY(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
}

const PALETTES = {
  gold: {
    bg: "linear-gradient(135deg, #1a1a1a 0%, #2a2722 45%, #3a2f1f 100%)",
    fg: "#F5E9D2",
    accent: "#DEB25E",
    border: "rgba(222,178,94,0.35)",
    shine:
      "radial-gradient(ellipse at 20% 0%, rgba(255,225,170,0.25) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(222,178,94,0.18) 0%, transparent 60%)",
    glow: "radial-gradient(circle, #DEB25E 0%, transparent 70%)",
    logoBg: "linear-gradient(135deg, #DEB25E 0%, #B58836 100%)",
    logoFg: "#1a1a1a",
    chipA: "#E2C383",
    chipB: "#9A7A3C",
    chipLine: "rgba(0,0,0,0.4)",
    statusBg: "rgba(222,178,94,0.18)",
    statusFg: "#F5C77A",
    embossDark: "rgba(0,0,0,0.55)",
    embossLight: "rgba(255,255,255,0.05)",
    ring: "#DEB25E",
  },
  platinum: {
    bg: "linear-gradient(135deg, #C7CDD3 0%, #93989E 50%, #5D6068 100%)",
    fg: "#1a1a1a",
    accent: "#0f172a",
    border: "rgba(255,255,255,0.45)",
    shine:
      "radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.4) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(255,255,255,0.25) 0%, transparent 60%)",
    glow: "radial-gradient(circle, #ffffff 0%, transparent 70%)",
    logoBg: "linear-gradient(135deg, #ffffff 0%, #C8D0D8 100%)",
    logoFg: "#0f172a",
    chipA: "#E5E7EB",
    chipB: "#94A3B8",
    chipLine: "rgba(0,0,0,0.35)",
    statusBg: "rgba(15,23,42,0.12)",
    statusFg: "#0f172a",
    embossDark: "rgba(0,0,0,0.30)",
    embossLight: "rgba(255,255,255,0.45)",
    ring: "#ffffff",
  },
  obsidian: {
    bg: "linear-gradient(135deg, #050507 0%, #0f0f14 50%, #1a1a22 100%)",
    fg: "#E8EBF0",
    accent: "#DEB25E",
    border: "rgba(222,178,94,0.25)",
    shine:
      "radial-gradient(ellipse at 20% 0%, rgba(222,178,94,0.18) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(255,255,255,0.07) 0%, transparent 60%)",
    glow: "radial-gradient(circle, #DEB25E 0%, transparent 70%)",
    logoBg: "linear-gradient(135deg, #DEB25E 0%, #B58836 100%)",
    logoFg: "#050507",
    chipA: "#E2C383",
    chipB: "#9A7A3C",
    chipLine: "rgba(0,0,0,0.6)",
    statusBg: "rgba(222,178,94,0.18)",
    statusFg: "#F5C77A",
    embossDark: "rgba(0,0,0,0.55)",
    embossLight: "rgba(255,255,255,0.05)",
    ring: "#DEB25E",
  },
};
