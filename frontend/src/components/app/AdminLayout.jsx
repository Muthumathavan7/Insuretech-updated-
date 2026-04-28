import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  Shield, LayoutDashboard, Users, KanbanSquare, TrendingUp, Hammer,
  Package, Megaphone, Phone, LogOut, Settings as SettingsIcon,
} from "lucide-react";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/customers", label: "Customers (CRM)", icon: Users },
  { to: "/admin/leads", label: "Leads", icon: Users },
  { to: "/admin/leads-kanban", label: "Leads Kanban", icon: KanbanSquare },
  { to: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  { to: "/admin/claims", label: "Claims Queue", icon: Hammer },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/admin/voice", label: "Voice AI Calls", icon: Phone },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export default function AdminLayout({ children }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (item) =>
    item.end ? loc.pathname === item.to : loc.pathname.startsWith(item.to);

  return (
    <div className="min-h-screen flex bg-[#F8F9FA]">
      <aside
        data-testid="admin-sidebar"
        className="w-64 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen"
      >
        <Link to="/admin" className="px-5 py-5 flex items-center gap-2 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-float">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">TuneProtect</div>
            <div className="text-[11px] uppercase tracking-wider text-primary-700 font-semibold">CRM Console</div>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                data-testid={`admin-nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-primary-50 text-primary-800 border-r-2 border-primary font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
              {user?.full_name?.[0] || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.full_name}</div>
              <div className="text-xs text-gray-500 truncate">{user?.role}</div>
            </div>
            <button
              onClick={() => {
                logout();
                nav("/");
              }}
              data-testid="admin-logout-btn"
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
