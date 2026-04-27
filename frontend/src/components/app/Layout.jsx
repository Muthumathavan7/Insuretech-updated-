import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Shield, LayoutDashboard, FileText, Hammer, LogOut, Sparkles, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const links = [
    { to: "/", label: "Home" },
    { to: "/products", label: "Products" },
    { to: "/dashboard", label: "Dashboard", auth: true },
    { to: "/policies", label: "My Policies", auth: true },
    { to: "/claims", label: "Claims", auth: true },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header
        data-testid="site-header"
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" data-testid="logo-link" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-float">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">
              Tune<span className="text-primary">Protect</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {links
              .filter((l) => !l.auth || user)
              .map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  data-testid={`nav-${l.label.toLowerCase().replace(/\s+/g, "-")}-link`}
                  className={`text-sm font-medium transition-colors ${
                    loc.pathname === l.to ? "text-primary-700" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
          </nav>

          <div className="flex items-center gap-3">
            {!user ? (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    data-testid="header-login-btn"
                    className="rounded-full px-5 text-gray-700"
                  >
                    Log in
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button
                    data-testid="header-signup-btn"
                    className="rounded-full bg-primary hover:bg-primary-600 text-white shadow-float px-6"
                  >
                    Get Quote
                  </Button>
                </Link>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    data-testid="user-menu-trigger"
                    className="flex items-center gap-2 rounded-full bg-white border border-gray-200 pl-2 pr-4 py-1.5 hover:border-primary transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                      {user.full_name?.[0] || "U"}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">
                      {user.full_name?.split(" ")[0]}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="text-xs text-gray-500">{user.email}</div>
                    <div className="font-medium">{user.full_name}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => nav("/dashboard")} data-testid="menu-dashboard">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => nav("/policies")} data-testid="menu-policies">
                    <FileText className="w-4 h-4 mr-2" /> My Policies
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => nav("/claims")} data-testid="menu-claims">
                    <Hammer className="w-4 h-4 mr-2" /> Claims
                  </DropdownMenuItem>
                  {user.role !== "customer" && (
                    <DropdownMenuItem onClick={() => nav("/admin")} data-testid="menu-admin">
                      <Sparkles className="w-4 h-4 mr-2" /> Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      nav("/");
                    }}
                    data-testid="menu-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-20 bg-[#0F172A] text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-xl font-semibold text-white">
                Tune<span className="text-primary">Protect</span>
              </span>
            </div>
            <p className="text-sm opacity-80 max-w-xs">
              Premium, AI-powered insurance that feels effortless. Travel. Health. Motor. Device.
            </p>
          </div>
          <div>
            <h5 className="text-white font-semibold mb-3 text-sm">Products</h5>
            <ul className="space-y-2 text-sm opacity-80">
              <li>Travel</li>
              <li>Health</li>
              <li>Motor</li>
              <li>Device</li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-semibold mb-3 text-sm">Company</h5>
            <ul className="space-y-2 text-sm opacity-80">
              <li>About</li>
              <li>Partners</li>
              <li>Careers</li>
              <li>Press</li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-semibold mb-3 text-sm">Legal</h5>
            <ul className="space-y-2 text-sm opacity-80">
              <li>Privacy</li>
              <li>Terms</li>
              <li>Disclosures</li>
              <li>IRDAI</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs opacity-60">
          © {new Date().getFullYear()} Tune Protect — Built with care.
        </div>
      </footer>
    </div>
  );
}
