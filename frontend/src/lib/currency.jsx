import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const CurrencyCtx = createContext({
  current: "MYR",
  symbol: "RM",
  rates: { MYR: 1 },
  supported: [],
  setCurrent: () => {},
  format: (v) => v,
  convert: (v) => v,
});

const STORAGE_KEY = "tp_currency";

export function CurrencyProvider({ children }) {
  const [supported, setSupported] = useState([
    { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", rate: 1 },
  ]);
  const [defaultCode, setDefaultCode] = useState("MYR");
  const [current, _setCurrent] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "MYR"
  );

  useEffect(() => {
    api
      .get("/settings/public")
      .then((r) => {
        const list = r.data.supported_currencies || [];
        if (list.length) setSupported(list);
        const def = r.data.default_currency || "MYR";
        setDefaultCode(def);
        // If user hasn't picked yet, follow admin default
        if (!localStorage.getItem(STORAGE_KEY)) _setCurrent(def);
      })
      .catch(() => {});
  }, []);

  const setCurrent = (code) => {
    _setCurrent(code);
    localStorage.setItem(STORAGE_KEY, code);
  };

  const active = supported.find((c) => c.code === current) || supported[0] || {
    code: "MYR",
    symbol: "RM",
    rate: 1,
  };

  // All product/business prices in DB are stored in `defaultCode` (MYR).
  // To display in current currency: amount_in_default * (target.rate / default.rate).
  const defaultMeta = supported.find((c) => c.code === defaultCode) || { rate: 1 };

  const convert = (amount) => {
    if (!Number.isFinite(amount)) return amount;
    const factor = (active.rate || 1) / (defaultMeta.rate || 1);
    return amount * factor;
  };

  const format = (amount, opts = {}) => {
    if (amount === null || amount === undefined || amount === "") return "";
    const n = Number(amount);
    if (!Number.isFinite(n)) return String(amount);
    const converted = opts.skipConvert ? n : convert(n);
    const decimals = opts.decimals ?? 2;
    const formatted = converted.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${active.symbol} ${formatted}`;
  };

  // Replaces `$X,XXX[.XX]` patterns inside a longer string with the active
  // currency (treating the underlying number as base-currency value). Used for
  // legacy product feature bullets seeded with hard-coded "$" prefixes.
  const formatText = (text) => {
    if (!text || typeof text !== "string") return text;
    return text.replace(/\$\s?([0-9][0-9,]*(?:\.[0-9]+)?)/g, (_, num) => {
      const value = parseFloat(num.replace(/,/g, ""));
      if (!Number.isFinite(value)) return _;
      // Preserve integer formatting when the original had no decimals
      const decimals = num.includes(".") ? 2 : 0;
      return format(value, { decimals });
    });
  };

  return (
    <CurrencyCtx.Provider
      value={{
        current,
        symbol: active.symbol,
        code: active.code,
        rates: Object.fromEntries(supported.map((c) => [c.code, c.rate])),
        supported,
        defaultCode,
        setCurrent,
        format,
        formatText,
        convert,
      }}
    >
      {children}
    </CurrencyCtx.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyCtx);
