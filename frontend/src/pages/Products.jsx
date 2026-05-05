import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { ArrowRight, Plane, HeartPulse, Car, Smartphone, Home, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const ICONS = { travel: Plane, health: HeartPulse, motor: Car, device: Smartphone, home: Home };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [cat, setCat] = useState("all");
  const { user } = useAuth();
  const { format, formatText } = useCurrency();
  const nav = useNavigate();

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data));
  }, []);

  const filtered = cat === "all" ? products : products.filter((p) => p.category === cat);

  const selectProduct = (p) => {
    if (!user) return nav("/login");
    if (p.category === "travel") nav(`/travel-quote/${p.id}`);
    else if (p.category === "motor") nav(`/products/motor-easy`);
    else if (p.category === "pa") nav(`/products/pa-easy`);
    else if (p.category === "health") nav(`/products/health-secure-plus`);
    else if (p.category === "home") nav(`/products/home-easy`);
    else alert(`${p.name} quote coming soon! Travel, Motor, PA, Health, and Home insurance are fully live.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="products-page">
      <div className="mb-10">
        <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">Catalog</div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mt-1">
          Find your perfect cover.
        </h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {["all", "travel", "health", "motor", "home", "device"].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            data-testid={`filter-${c}`}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
              cat === c
                ? "bg-primary text-white shadow-float"
                : "bg-white border border-gray-200 text-gray-700 hover:border-primary"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((p) => {
          const Icon = ICONS[p.category] || Plane;
          return (
            <div
              key={p.id}
              data-testid={`product-card-${p.id}`}
              className="bg-white rounded-3xl border border-gray-100 overflow-hidden hover:-translate-y-1 hover:shadow-float transition-all duration-300"
            >
              <div className="aspect-[16/9] overflow-hidden bg-gray-50">
                {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-primary-700 mb-3">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">{p.category}</span>
                </div>
                <h3 className="font-display text-2xl font-semibold">{p.name}</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">{formatText(p.description)}</p>
                <ul className="space-y-2 mb-5">
                  {p.features?.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" strokeWidth={3} />
                      {formatText(f)}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div>
                    <div className="text-xs text-gray-400">from</div>
                    <div className="font-display text-2xl font-semibold">
                      {format(p.base_premium, { decimals: 0 })}
                      <span className="text-xs text-gray-400 font-normal ml-1">/policy</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => selectProduct(p)}
                    data-testid={`get-quote-${p.category}-btn`}
                    className="rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
                  >
                    Get quote <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
