import React, { useState, useEffect } from "react"; // ✅ added useEffect
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";

import {
  LayoutDashboard,
  FileText,
  Hammer,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import logo from "./icon.png";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { current, supported, setCurrent } = useCurrency();
  const nav = useNavigate();
  const loc = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: "/", label: "Home" },
    { to: "/products", label: "Products" },
    { to: "/dashboard", label: "Dashboard", auth: true },
    { to: "/policies", label: "My Policies", auth: true },
    { to: "/claims", label: "Claims", auth: true },
  ];

  /* ================= FIX: SCROLL LOCK ================= */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">

      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">

          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="logo" className="w-8 h-8 rounded-xl" />
            <div className="leading-tight">
              <div className="font-semibold text-sm sm:text-lg text-primary">
                Afinity.ai
              </div>
              <div className="text-[10px] uppercase text-primary-700 font-semibold tracking-wider">
                InsurTech
              </div>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-6">
            {links
              .filter((l) => !l.auth || user)
              .map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`text-sm font-medium ${
                    loc.pathname === l.to
                      ? "text-primary-700"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
          </nav>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* MOBILE BUTTON */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* DESKTOP CURRENCY */}
            <div className="hidden sm:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm">
                    {current}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-56 max-h-80 overflow-y-auto"
                >
                  <DropdownMenuLabel>Display Currency</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {supported.map((c) => (
                    <DropdownMenuItem
                      key={c.code}
                      onClick={() => setCurrent(c.code)}
                    >
                      <span className="w-12">{c.code}</span>
                      <span className="mr-2">{c.symbol}</span>
                      {c.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* AUTH */}
            {!user ? (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button variant="ghost">Log in</Button>
                </Link>

                <Link to="/signup" className="hidden sm:block">
                  <Button className="bg-primary text-white rounded-full px-5">
                    Get Quote
                  </Button>
                </Link>
              </>
            ) : (
              <div className="hidden sm:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 border rounded-full px-3 py-1">
                      <div className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center text-xs">
                        {user.full_name?.[0] || "U"}
                      </div>
                      <span className="text-sm">
                        {user.full_name?.split(" ")[0]}
                      </span>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => nav("/dashboard")}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => nav("/policies")}>
                      <FileText className="w-4 h-4 mr-2" />
                      Policies
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => nav("/claims")}>
                      <Hammer className="w-4 h-4 mr-2" />
                      Claims
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => {
                        logout();
                        nav("/");
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {/* ================= MOBILE MENU ================= */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-white flex flex-col">

            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <div className="flex items-center gap-2">
                <img src={logo} className="w-8 h-8 rounded-xl" />
                <div>
                  <div className="text-sm font-semibold text-primary">
                    Afinity.ai
                  </div>
                  <div className="text-[10px] uppercase text-primary-700">
                    INSURTECH
                  </div>
                </div>
              </div>

              <button onClick={() => setMobileOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">

              {/* NAV LINKS */}
              <div className="flex flex-col">
                {links
                  .filter((l) => !l.auth || user)
                  .map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setMobileOpen(false)}
                      className="block w-full py-3 text-lg font-medium border-b border-gray-100"
                    >
                      {l.label}
                    </Link>
                  ))}
              </div>

              <hr />

              {/* CURRENCY */}
              <div className="w-full max-w-md mx-auto flex flex-col gap-3">
                <div className="text-sm font-semibold text-gray-500 text-center">
                  Display Currency
                </div>

                {supported.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCurrent(c.code);
                      setMobileOpen(false);
                    }}
                    className="w-full flex justify-between px-4 py-3 rounded-xl"
                  >
                    <span>{c.code}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ✅ MOBILE USER / AUTH FIX */}
            <div className="p-4 border-t flex flex-col gap-3 bg-white">
              {!user ? (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full">Log in</Button>
                  </Link>

                  <Link to="/signup" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full bg-primary text-white">
                      Get Quote
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  {/* <Button
                    onClick={() => {
                      setMobileOpen(false);
                      nav("/dashboard");
                    }}
                    className="w-full"
                  >
                    Dashboard
                  </Button>

                  <Button
                    onClick={() => {
                      setMobileOpen(false);
                      nav("/policies");
                    }}
                    className="w-full"
                  >
                    My Policies
                  </Button>

                  <Button
                    onClick={() => {
                      setMobileOpen(false);
                      nav("/claims");
                    }}
                    className="w-full"
                  >
                    Claims
                  </Button> */}

                  <Button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                      nav("/");
                    }}
                    className="w-full bg-red-500 text-white"
                  >
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>
    </div>
  );
}