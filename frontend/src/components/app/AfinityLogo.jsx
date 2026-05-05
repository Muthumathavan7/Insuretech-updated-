import React from "react";

/**
 * Afinity brand mark (red Bélo-style "A" loop) + serif wordmark.
 *
 * The icon ships as a transparent PNG at /afinity-logo.png so it keeps the
 * exact brand red regardless of the card palette behind it.
 *
 * Props:
 *   size       — pixel size of the icon (height = width)
 *   textColor  — color of the "afinity" wordmark (".ai" inherits `color`)
 *   color      — color of the ".ai" suffix (legacy prop, kept for API compat)
 *   showText   — show the wordmark next to the icon
 */
export default function AfinityLogo({
  size = 32,
  color = "#DEB25E",
  textColor = "#DEB25E",
  iconColor = "#DEB25E",
  showText = true,
}) {
  return (
    <span className="inline-flex items-center gap-2" data-testid="afinity-logo">
      <img
        src="/afinity-logo.png"
        alt="Afinity"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          // soft drop-shadow so the red mark reads on any card palette
           filter:
    iconColor === "#1a1a1a"
      ? "brightness(0) saturate(100%) invert(10%)"
      : iconColor === "#F5F5F5"
      ? "brightness(0) invert(1)"
      : "none",

    opacity: 0.95,
        }}
      />
      {showText && (
        <span
          className="font-lux"
          style={{
            color: textColor,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            lineHeight: 1,
          }}
        >
          afinity<span style={{ color }}>.ai</span>
        </span>
      )}
    </span>
  );
}
