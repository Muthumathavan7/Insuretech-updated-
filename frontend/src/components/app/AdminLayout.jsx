import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import AfinityLogo from "@/components/app/AfinityLogo";
import {
  LayoutDashboard, Users, KanbanSquare, TrendingUp, Hammer,
  Package, Megaphone, LogOut, Settings as SettingsIcon,
  GitBranch, MessageCircle, CheckSquare, Menu, X,
} from "lucide-react";

import familyImg from "./icon.png";

const logo = familyImg;
// Sectioned navigation matching the lux theme
const NAV_SECTIONS = [
  {
    title: "Workspace",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/admin/leads", label: "Leads", icon: Users },
      
    ],
  },
  {
    title: "Sales & CRM",
    items: [
      
      { to: "/admin/pipeline", label: "Pipeline", icon: GitBranch },
      // { to: "/admin/leads-kanban", label: "Leads Kanban", icon: KanbanSquare },
      { to: "/admin/tasks", label: "Tasks", icon: CheckSquare },
      { to: "/admin/customers", label: "Customers", icon: Users },
      { to: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/admin/analytics", label: "Analytics", icon: TrendingUp },
      { to: "/admin/claims", label: "Claims Queue", icon: Hammer },
      { to: "/admin/products", label: "Products", icon: Package },
      { to: "/admin/rules", label: "Rules Engine", icon: GitBranch },
      { to: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
    ],
  },
  {
    title: "Integrations",
    items: [
      { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export default function AdminLayout({ children }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (item) =>
    item.end ? loc.pathname === item.to : loc.pathname.startsWith(item.to);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [loc.pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const sidebarBody = (
    <>
      <Link to="/admin" className="px-5 py-5 flex items-center gap-2 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-float">
  <img
    src={logo}
    alt="Logo"
    className="w-full h-full object-cover"
  />
</div>
          <div>
            <div className="font-display text-lg font-semibold"><span className="text-primary">Afinity.ai</span></div>
            <div className="text-[11px] uppercase tracking-wider text-primary-700 font-semibold">InsurTech</div>
          </div>
        </Link>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-2">
            <div className="lux-sidebar-section">{section.title}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-testid={`admin-nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  className={`lux-nav-item ${active ? "active" : ""}`}
                >
                  <Icon className="w-4 h-4 opacity-90" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[rgba(222,178,94,0.12)] px-5 py-4">
        <button
          onClick={() => { logout(); nav("/"); }}
          data-testid="admin-logout-btn"
          className="flex items-center gap-2 text-[rgba(232,217,179,0.6)] hover:text-[#f5e4bd] text-xs"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex lux-bg">
      {/* Desktop sidebar (lg+) */}
      <aside
        data-testid="admin-sidebar"
        className="hidden lg:flex w-72 lux-sidebar flex-col sticky top-0 h-screen"
      >
        {sidebarBody}
      </aside>

      {/* Mobile drawer (<lg) */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
          onClick={() => setDrawerOpen(false)}
          data-testid="admin-drawer-backdrop"
        />
      )}
      <aside
        data-testid="admin-sidebar-drawer"
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[82vw] lux-sidebar flex flex-col transform transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarBody}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 px-4 sm:px-6 lg:px-10 pt-5 sm:pt-8 pb-12 lux-fade">
          {/* Top header strip */}
          <div className="mb-6 sm:mb-8 flex items-center justify-between gap-3">
            {/* Mobile hamburger + brand */}
            <div className="flex items-center gap-3 lg:hidden min-w-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                data-testid="admin-drawer-open"
                className="w-10 h-10 rounded-xl border border-[rgba(15,15,15,0.10)] bg-white text-[#0c0b09] flex items-center justify-center shadow-sm shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0 truncate">
                <div className="font-lux text-[18px] leading-none text-[#0c0b09] truncate">
                  {user?.full_name || "Admin"}
                </div>
                <div className="text-[9px] tracking-[0.22em] uppercase text-[#a07a2c] font-semibold mt-1 truncate">
                  {(user?.role || "admin").replace("_", " ")}
                </div>
              </div>
            </div>

            {/* Desktop signed-in card */}
            <div className="hidden lg:flex flex-1 justify-end">
              <div className="lux-signed-in shrink-0" data-testid="admin-signed-in">
                <div className="lux-signed-in__avatar">
                  {(user?.full_name?.[0] || "A").toUpperCase()}
                </div>
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] tracking-[0.22em] uppercase text-[rgba(15,15,15,0.55)] font-semibold">
                    Signed in
                  </div>
                  <div className="font-lux text-[22px] leading-tight text-[#0c0b09] truncate">
                    {user?.full_name || "Admin"}
                  </div>
                  <div className="text-[10px] tracking-[0.22em] uppercase text-[#a07a2c] font-semibold">
                    {(user?.role || "admin").replace("_", " ")}
                  </div>
                </div>
                <button
                  onClick={() => { logout(); nav("/"); }}
                  aria-label="Sign out"
                  className="ml-2 w-8 h-8 rounded-md border border-[rgba(15,15,15,0.08)] hover:bg-[rgba(222,178,94,0.08)] text-[rgba(15,15,15,0.55)] flex items-center justify-center"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile sign-out */}
            <button
              onClick={() => { logout(); nav("/"); }}
              aria-label="Sign out"
              data-testid="admin-mobile-logout"
              className="lg:hidden w-10 h-10 rounded-xl border border-[rgba(15,15,15,0.10)] bg-white text-[rgba(15,15,15,0.65)] flex items-center justify-center shadow-sm shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {children}
        </div>
        <footer className="lux-footer">
          <div>© {new Date().getFullYear()} Afinity AI · Crafted for enterprise excellence</div>
          <div className="tag">Luxury · Corporate · Intelligent</div>
        </footer>
      </div>
    </div>
  );
}
