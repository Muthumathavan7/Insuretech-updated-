import React from "react";
import { Wifi } from "lucide-react";
import AfinityLogo from "@/components/app/AfinityLogo";

/**
 * Premium credit-card-style insurance card.
 *
 * Auto-picks variant by policy.category:
 *   - motor  → obsidian (jet black + champagne gold accents)
 *   - health → copper  (rich orange with diagonal gloss)
 *   - pa     → sunset  (peach/cantaloupe gold)
 *   - travel/device/other → gold (default Afinity gold)
 *
 * Pass `variant` prop to override.
 */
export default function PolicyCard({ policy = {}, variant, className = "" }) {
  const number = String(policy.policy_number || "0000000000000000").replace(/[^0-9A-Z]/gi, "");
  const padded = (number + "0000000000000000").slice(0, 16);
  const grouped = padded.match(/.{1,4}/g)?.join(" ") || padded;

  const validFrom = formatValidDate(policy.start_date);
  const validThru = formatValidDate(policy.end_date);

  const resolved =
    variant ||
    {
      motor: "obsidian",
      health: "copper",
      pa: "sunset",
      travel: "gold",
      device: "platinum",
    }[policy.category] ||
    "gold";

  const palette = PALETTES[resolved] || PALETTES.gold;

  return (
    <div
      data-testid={`policy-card-${policy.id || policy.policy_number || "preview"}`}
      data-variant={resolved}
      className={`policy-card ${className}`}
      style={{
        aspectRatio: "1.586 / 1",
        background: palette.bg,
        color: palette.fg,
        borderRadius: 22,
        padding: "26px 28px",
        position: "relative",
        overflow: "hidden",
        boxShadow:
          "0 24px 50px -12px rgba(0,0,0,0.35), 0 8px 16px -8px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.10)",
        border: `1px solid ${palette.border}`,
        fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
      }}
    >
      {/* Diagonal gloss band — matches reference photos */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: palette.gloss,
          mixBlendMode: "screen",
        }}
      />

      {/* Highlight sheen */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: palette.shine, mixBlendMode: "screen" }}
      />

      {/* Soft corner glow */}
      <div
        className="pointer-events-none absolute -top-20 -right-12 w-72 h-72 rounded-full"
        style={{
          background: palette.glow,
          filter: "blur(34px)",
          opacity: 0.35,
        }}
      />

      {/* Subtle noise grain for premium feel */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\' stitchTiles=\'stitch\'/></filter><rect width=\'200\' height=\'200\' filter=\'url(%23n)\'/></svg>")',
        }}
      />

      {/* Top row — Brand + status + product */}
      <div className="relative flex items-start justify-between">
        <div>
          <AfinityLogo size={26} color={palette.brandGold} textColor={palette.brandText} />
          <div className="text-[10px] uppercase tracking-[0.22em] mt-2 opacity-80">
            {policy.product_name || "Insurance Policy"}
          </div>
        </div>
        {policy.status && (
          <span
            className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-[0.22em] font-semibold"
            style={{ background: palette.statusBg, color: palette.statusFg }}
          >
            {policy.status}
          </span>
        )}
      </div>

      {/* Middle row — Chip + contactless + world-map (matches reference) */}
      <div className="relative mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Chip palette={palette} />
          <Wifi
            className="w-5 h-5 -rotate-90"
            style={{ color: palette.contactless, opacity: 0.85 }}
            strokeWidth={2.4}
          />
        </div>
        <WorldMapStripe palette={palette} />
      </div>

      {/* Policy number */}
      <div
        className="relative mt-3 sm:mt-4 font-mono tracking-[0.18em] text-[15px] sm:text-[20px] font-semibold"
        style={{
          textShadow: `0 1px 0 ${palette.embossDark}, 0 -1px 0 ${palette.embossLight}`,
        }}
      >
        {grouped}
      </div>

      {/* Bottom — Holder + Valid From / Valid Thru */}
      <div className="relative mt-3 sm:mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.22em] opacity-65 mb-0.5">
            Card Holder
          </div>
          <div className="font-semibold text-[12px] sm:text-sm uppercase tracking-wide truncate">
            {policy.user_name || "POLICY HOLDER"}
          </div>
        </div>
        <div className="flex gap-3 sm:gap-4 shrink-0">
          {validFrom && (
            <div>
              <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.22em] opacity-65 mb-0.5">Valid From</div>
              <div className="font-mono text-[11px] sm:text-sm font-semibold">{validFrom}</div>
            </div>
          )}
          {validThru && (
            <div>
              <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.22em] opacity-65 mb-0.5">Valid Thru</div>
              <div className="font-mono text-[11px] sm:text-sm font-semibold">{validThru}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Embossed gold-style EMV chip — taller version matching the reference photos */
function Chip({ palette }) {
  return (
    <div
      className="relative"
      style={{
        width: 38,
        height: 30,
        borderRadius: 6,
        background: `linear-gradient(135deg, ${palette.chipA} 0%, ${palette.chipB} 50%, ${palette.chipA} 100%)`,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      <div
        className="absolute inset-1 rounded-[3px]"
        style={{
          background:
            `repeating-linear-gradient(0deg, transparent 0 5px, ${palette.chipLine} 5px 6px),` +
            `repeating-linear-gradient(90deg, transparent 0 6px, ${palette.chipLine} 6px 7px)`,
          opacity: 0.55,
        }}
      />
      <div
        className="absolute inset-0 rounded-[6px]"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}

/** Silver world-map stripe (mimics the EMV NFC sticker on the reference cards) */
function WorldMapStripe({ palette }) {
  return (
    <div
      className="relative"
      style={{
        width: 50,
        height: 34,
        borderRadius: 5,
        background:
          "linear-gradient(135deg, #e9ecef 0%, #c3c8cf 40%, #f3f5f8 60%, #b9bdc4 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.25)",
        overflow: "hidden",
      }}
    >
      {/* horizontal scan-lines */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 4px)",
          mixBlendMode: "overlay",
        }}
      />
      {/* tiny stylized world-map silhouette */}
      <svg
        viewBox="0 0 60 30"
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
        <g fill="rgba(70,75,82,0.78)">
          <path d="M5 14 Q8 10 12 12 Q16 14 14 18 Q10 20 6 18 Z" />
          <path d="M22 8 Q28 5 32 9 Q34 14 30 16 L26 17 Q22 14 22 8 Z" />
          <path d="M34 18 Q38 16 42 18 Q44 22 41 24 L36 22 Z" />
          <path d="M46 11 Q52 9 55 13 Q56 17 51 18 L47 17 Z" />
          <circle cx="18" cy="22" r="0.9" />
          <circle cx="42" cy="10" r="0.9" />
        </g>
      </svg>
    </div>
  );
}

function formatValidDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const PALETTES = {
  // Default Afinity gold (charcoal + champagne) — for travel, device, other
  gold: {
    bg: "linear-gradient(135deg, #1a1612 0%, #2a2722 45%, #3a2f1f 100%)",
    fg: "#F5E9D2",
    brandGold: "#DEB25E",
    brandText: "#f0deb1",
    border: "rgba(222,178,94,0.35)",
    gloss:
      "linear-gradient(110deg, transparent 28%, rgba(255,255,255,0.10) 45%, rgba(255,255,255,0.04) 60%, transparent 75%)",
    shine: "radial-gradient(ellipse at 20% 0%, rgba(255,225,170,0.18) 0%, transparent 55%)",
    glow: "radial-gradient(circle, #DEB25E 0%, transparent 70%)",
    chipA: "#E2C383",
    chipB: "#9A7A3C",
    chipLine: "rgba(0,0,0,0.42)",
    contactless: "#f0deb1",
    statusBg: "rgba(222,178,94,0.18)",
    statusFg: "#F5C77A",
    embossDark: "rgba(0,0,0,0.55)",
    embossLight: "rgba(255,255,255,0.05)",
  },

  // MOTOR — obsidian black like the reference photo
  obsidian: {
    bg: "linear-gradient(135deg, #050507 0%, #0d0d10 45%, #16171b 100%)",
    fg: "#E8EBF0",
    brandGold: "#DEB25E",
    brandText: "#f0deb1",
    border: "rgba(222,178,94,0.22)",
    gloss:
      "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.08) 47%, rgba(255,255,255,0.02) 60%, transparent 78%)",
    shine: "radial-gradient(ellipse at 18% 0%, rgba(222,178,94,0.10) 0%, transparent 55%)",
    glow: "radial-gradient(circle, #DEB25E 0%, transparent 70%)",
    chipA: "#E2C383",
    chipB: "#9A7A3C",
    chipLine: "rgba(0,0,0,0.6)",
    contactless: "#f0deb1",
    statusBg: "rgba(222,178,94,0.16)",
    statusFg: "#F5C77A",
    embossDark: "rgba(0,0,0,0.65)",
    embossLight: "rgba(255,255,255,0.06)",
  },

  // HEALTH — rich copper / burnt-orange like the reference photo
  copper: {
    bg: "linear-gradient(135deg, #b8501e 0%, #c95e1f 45%, #a23f10 100%)",
    fg: "#fff4e8",
    brandGold: "#fff1c8",
    brandText: "#ffffff",
    border: "rgba(255,233,180,0.42)",
    gloss:
      "linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.20) 45%, rgba(255,255,255,0.08) 60%, transparent 78%)",
    shine: "radial-gradient(ellipse at 22% 0%, rgba(255,225,170,0.22) 0%, transparent 60%)",
    glow: "radial-gradient(circle, #ff9d6e 0%, transparent 70%)",
    chipA: "#F2D593",
    chipB: "#A07A36",
    chipLine: "rgba(0,0,0,0.45)",
    contactless: "#fff4d6",
    statusBg: "rgba(255,255,255,0.18)",
    statusFg: "#fff4e8",
    embossDark: "rgba(80,30,5,0.55)",
    embossLight: "rgba(255,255,255,0.18)",
  },

  // PA — peach / sunset like the reference photo
  sunset: {
    bg: "linear-gradient(135deg, #f5b97a 0%, #f3a55a 45%, #e08a3c 100%)",
    fg: "#3a1f06",
    brandGold: "#7a3a09",
    brandText: "#3a1f06",
    border: "rgba(122,58,9,0.30)",
    gloss:
      "linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.34) 44%, rgba(255,255,255,0.10) 60%, transparent 78%)",
    shine: "radial-gradient(ellipse at 22% 0%, rgba(255,255,255,0.30) 0%, transparent 55%)",
    glow: "radial-gradient(circle, #ffd49b 0%, transparent 70%)",
    chipA: "#F2D593",
    chipB: "#9A7A3C",
    chipLine: "rgba(0,0,0,0.38)",
    contactless: "#3a1f06",
    statusBg: "rgba(58,31,6,0.15)",
    statusFg: "#3a1f06",
    embossDark: "rgba(80,40,8,0.40)",
    embossLight: "rgba(255,255,255,0.40)",
  },

  // Optional platinum for device etc.
  platinum: {
    bg: "linear-gradient(135deg, #C7CDD3 0%, #93989E 50%, #5D6068 100%)",
    fg: "#1a1a1a",
    brandGold: "#0f172a",
    brandText: "#0f172a",
    border: "rgba(255,255,255,0.45)",
    gloss:
      "linear-gradient(110deg, transparent 28%, rgba(255,255,255,0.30) 45%, rgba(255,255,255,0.08) 60%, transparent 78%)",
    shine: "radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.40) 0%, transparent 55%)",
    glow: "radial-gradient(circle, #ffffff 0%, transparent 70%)",
    chipA: "#E5E7EB",
    chipB: "#94A3B8",
    chipLine: "rgba(0,0,0,0.35)",
    contactless: "#0f172a",
    statusBg: "rgba(15,23,42,0.12)",
    statusFg: "#0f172a",
    embossDark: "rgba(0,0,0,0.30)",
    embossLight: "rgba(255,255,255,0.45)",
  },
};
