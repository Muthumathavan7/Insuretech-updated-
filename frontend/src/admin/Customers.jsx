import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { Search, User } from "lucide-react";

const STAGE_COLORS = {
  new: "bg-gray-100 text-gray-700",
  qualified: "bg-blue-50 text-blue-700",
  contacted: "bg-yellow-50 text-yellow-700",
  quoted: "bg-purple-50 text-purple-700",
  won: "bg-green-50 text-green-700",
  lost: "bg-red-50 text-red-600",
};

export default function Customers() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const { format } = useCurrency();

  const load = async () => {
    const r = await api.get("/crm/customers", { params: q ? { q } : {} });
    setItems(r.data);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);

  return (
    <div data-testid="admin-customers">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">CRM</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-1">Customers</h1>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            data-testid="customer-search"
            placeholder="Search by name, email, phone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 rounded-full h-11"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="p-4 whitespace-nowrap">Customer</th>
                <th className="p-4 whitespace-nowrap">Contact</th>
                <th className="p-4 whitespace-nowrap">Stage</th>
                <th className="p-4 whitespace-nowrap">Risk</th>
                <th className="p-4 whitespace-nowrap">LTV</th>
                <th className="p-4 whitespace-nowrap">Tags</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr
                  key={u.id}
                  data-testid={`customer-row-${u.id}`}
                  className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="p-4">
                    <Link to={`/admin/customers/${u.id}`} className="flex items-center gap-3 hover:text-primary-700">
                      <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-primary-800 font-semibold shrink-0">
                        {u.full_name?.[0] || <User className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{u.full_name}</div>
                        <div className="text-xs text-gray-500">{u.kyc_status}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="p-4 text-sm">
                    <div className="truncate max-w-[220px]">{u.email}</div>
                    <div className="text-gray-500 truncate max-w-[220px]">{u.phone}</div>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STAGE_COLORS[u.lead_stage]}`}>
                      {u.lead_stage}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-medium">{Math.round((u.risk_score || 0) * 100)}%</div>
                  </td>
                  <td className="p-4 text-sm font-medium whitespace-nowrap">{format(u.ltv || 0, { decimals: 0 })}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {u.tags?.slice(0, 2).map((t) => (
                        <span key={t} className="text-[10px] bg-primary-50 text-primary-800 px-2 py-0.5 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length === 0 && (
          <div className="text-center py-12 text-gray-400">No customers found</div>
        )}
      </div>
    </div>
  );
}
