import React from "react";

/** Afinity.ai serif lockup with leaf-like A monogram (gold). */
export default function AfinityLogo({ size = 32, color = "#DEB25E", textColor = "#f0deb1", showText = true }) {
  return (
    <span className="inline-flex items-center gap-2" data-testid="afinity-logo">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M32 6 C 21 18, 16 30, 16 42 C 16 52, 22 58, 32 58 C 42 58, 48 52, 48 42 C 48 30, 43 18, 32 6 Z"
          stroke={color}
          strokeWidth="2.4"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M22 38 L32 22 L42 38"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M26 42 L38 42"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
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
