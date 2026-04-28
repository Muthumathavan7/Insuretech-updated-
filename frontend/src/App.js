import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "sonner";

import Layout from "@/components/app/Layout";
import AdminLayout from "@/components/app/AdminLayout";
import AIChat from "@/components/app/AIChat";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import QuoteFlow from "@/pages/QuoteFlow";
import Checkout from "@/pages/Checkout";
import PaymentSuccess from "@/pages/PaymentSuccess";
import MyPolicies from "@/pages/MyPolicies";
import FileClaim from "@/pages/FileClaim";
import Claims from "@/pages/Claims";
import MotorInsurance from "@/pages/MotorInsurance";
import MotorQuote from "@/pages/MotorQuote";
import PAInsurance from "@/pages/PAInsurance";
import PAQuote from "@/pages/PAQuote";

import AdminDashboard from "@/admin/AdminDashboard";
import Customers from "@/admin/Customers";
import Customer360 from "@/admin/Customer360";
import LeadsKanban from "@/admin/LeadsKanban";
import LeadsList from "@/admin/Leads";
import LeadDetail from "@/admin/LeadDetailPage";
import Pipeline from "@/admin/Pipeline";
import WhatsAppMessages from "@/admin/WhatsAppMessages";
import Analytics from "@/admin/Analytics";
import ClaimsQueue from "@/admin/ClaimsQueue";
import AdminProducts from "@/admin/AdminProducts";
import Campaigns from "@/admin/Campaigns";
import VoiceCalls from "@/admin/VoiceCalls";
import Settings from "@/admin/Settings";

function Protected({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role === "customer") return <Navigate to="/dashboard" replace />;
  return children;
}

function CustomerShell({ children }) {
  return (
    <Layout>
      {children}
      <AIChat />
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CustomerShell><Landing /></CustomerShell>} />
      <Route path="/login" element={<CustomerShell><Login /></CustomerShell>} />
      <Route path="/signup" element={<CustomerShell><Signup /></CustomerShell>} />
      <Route path="/products" element={<CustomerShell><Products /></CustomerShell>} />
      <Route path="/products/motor-easy" element={<CustomerShell><MotorInsurance /></CustomerShell>} />
      <Route path="/motor-quote" element={<CustomerShell><MotorQuote /></CustomerShell>} />
      <Route path="/motor-quote/:productId" element={<CustomerShell><MotorQuote /></CustomerShell>} />
      <Route path="/products/pa-easy" element={<CustomerShell><PAInsurance /></CustomerShell>} />
      <Route path="/pa-quote" element={<CustomerShell><PAQuote /></CustomerShell>} />
      <Route path="/pa-quote/:productId" element={<CustomerShell><PAQuote /></CustomerShell>} />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <CustomerShell><Dashboard /></CustomerShell>
          </Protected>
        }
      />
      <Route
        path="/quote/:productId"
        element={
          <Protected>
            <CustomerShell><QuoteFlow /></CustomerShell>
          </Protected>
        }
      />
      <Route
        path="/checkout/:quoteId"
        element={
          <Protected>
            <CustomerShell><Checkout /></CustomerShell>
          </Protected>
        }
      />
      <Route
        path="/payment-success"
        element={
          <Protected>
            <CustomerShell><PaymentSuccess /></CustomerShell>
          </Protected>
        }
      />
      <Route
        path="/policies"
        element={
          <Protected>
            <CustomerShell><MyPolicies /></CustomerShell>
          </Protected>
        }
      />
      <Route
        path="/claims/new/:policyId"
        element={
          <Protected>
            <CustomerShell><FileClaim /></CustomerShell>
          </Protected>
        }
      />
      <Route
        path="/claims"
        element={
          <Protected>
            <CustomerShell><Claims /></CustomerShell>
          </Protected>
        }
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <Protected adminOnly>
            <AdminLayout><AdminDashboard /></AdminLayout>
          </Protected>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <Protected adminOnly>
            <AdminLayout><Customers /></AdminLayout>
          </Protected>
        }
      />
      <Route
        path="/admin/customers/:id"
        element={
          <Protected adminOnly>
            <AdminLayout><Customer360 /></AdminLayout>
          </Protected>
        }
      />
      <Route
        path="/admin/leads"
        element={
          <Protected adminOnly>
            <AdminLayout><LeadsList /></AdminLayout>
          </Protected>
        }
      />
      <Route
        path="/admin/leads/:id"
        element={
          <Protected adminOnly>
            <AdminLayout><LeadDetail /></AdminLayout>
          </Protected>
        }
      />
      <Route
        path="/admin/leads-kanban"
        element={
          <Protected adminOnly>
            <AdminLayout><LeadsKanban /></AdminLayout>
          </Protected>
        }
      />
      <Route
        path="/admin/pipeline"
        element={
          <Protected adminOnly>
            <AdminLayout><Pipeline /></AdminLayout>
          </Protected>
        }
      />
      <Route
        path="/admin/whatsapp"
        element={
          <Protected adminOnly>
            <AdminLayout><WhatsAppMessages /></AdminLayout>
          </Protected>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <Protected adminOnly>
            <AdminLayout><Analytics /></AdminLayout>
          </Protected>
        }
      />
      <Route
        path="/admin/claims"
        element={
          <Protected adminOnly>
            <AdminLayout><ClaimsQueue /></AdminLayout>
          </Protected>
        }
      />
      <Route
        path="/admin/products"
        element={
          <Protected adminOnly>
            <AdminLayout><AdminProducts /></AdminLayout>
          </Protected>
        }
      />
      <Route
        path="/admin/campaigns"
        element={
          <Protected adminOnly>
            <AdminLayout><Campaigns /></AdminLayout>
          </Protected>
        }
      />
      <Route
        path="/admin/voice"
        element={
          <Protected adminOnly>
            <AdminLayout><VoiceCalls /></AdminLayout>
          </Protected>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <Protected adminOnly>
            <AdminLayout><Settings /></AdminLayout>
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
