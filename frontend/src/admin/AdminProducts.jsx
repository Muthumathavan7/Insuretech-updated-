import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plane, HeartPulse, Car, Smartphone } from "lucide-react";

const ICONS = { travel: Plane, health: HeartPulse, motor: Car, device: Smartphone };

export default function AdminProducts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/products").then((r) => setItems(r.data));
  }, []);

  return (
    <div className="p-8" data-testid="admin-products">
      <div className="mb-8">
        <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">Catalog</div>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Products</h1>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((p) => {
          const Icon = ICONS[p.category] || Plane;
          return (
            <div
              key={p.id}
              data-testid={`admin-product-${p.category}`}
              className="bg-white rounded-2xl p-5 border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display text-lg font-semibold">{p.name}</div>
                  <div className="text-xs text-gray-500 uppercase">{p.category}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-xs text-gray-500">from</div>
                  <div className="font-semibold">${p.base_premium}</div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">{p.description}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Coverage <strong className="text-gray-800">${p.coverage_amount.toLocaleString()}</strong></span>
                <span>Features <strong className="text-gray-800">{p.features?.length}</strong></span>
                <span>Add-ons <strong className="text-gray-800">{p.addons?.length}</strong></span>
                <span
                  className={`ml-auto px-2 py-0.5 rounded-full ${
                    p.active ? "bg-green-50 text-green-700" : "bg-gray-100"
                  }`}
                >
                  {p.active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
