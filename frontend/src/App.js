import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "sonner";
import "@/App.css";

import { CartProvider } from "./context/CartContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { AuthProvider } from "./context/AuthContext";
import { ContentProvider } from "./context/ContentContext";
import { registerServiceWorker } from "./lib/push";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import ScrollToTopButton from "./components/ScrollToTopButton";

import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import ProductPage from "./pages/ProductPage";
import BundlePage from "./pages/BundlePage";
import AboutPage from "./pages/AboutPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import CustomerAccountPage from "./pages/CustomerAccountPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import GalleryPage from "./pages/GalleryPage";
import PromoBanner from "./components/PromoBanner";
import Analytics from "./components/Analytics";
import { LocalBusinessSchema } from "./components/Seo";
import InstallAppBanner from "./components/InstallAppBanner";
import TermsPage from "./pages/TermsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import NotFoundPage from "./pages/NotFoundPage";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [pathname]);
  return null;
}

if (typeof window !== "undefined") {
  registerServiceWorker();
}

function RevealOnScroll() {
  const { pathname } = useLocation();
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll(".reveal"));
    if (!elements.length) return;
    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }); },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}

function PublicLayout({ children }) {
  return (
    <>
      <PromoBanner />
      <Navbar />
      <main className="page-soft-enter">{children}</main>
      <CartDrawer />
      <Footer />
      <ScrollToTopButton />
      <Analytics />
      <LocalBusinessSchema />
      <InstallAppBanner />
    </>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <ContentProvider>
          <FavoritesProvider>
            <CartProvider>
              <BrowserRouter>
                <ScrollToTop />
                <RevealOnScroll />
                <Toaster position="top-center" richColors theme="light" />
                <Routes>
                  <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
                  <Route path="/loja" element={<PublicLayout><ShopPage /></PublicLayout>} />
                  <Route path="/produto/:id" element={<PublicLayout><ProductPage /></PublicLayout>} />
                  <Route path="/cabaz/:id" element={<PublicLayout><BundlePage /></PublicLayout>} />
                  <Route path="/sobre" element={<PublicLayout><AboutPage /></PublicLayout>} />
                  <Route path="/galeria" element={<PublicLayout><GalleryPage /></PublicLayout>} />
                  <Route path="/checkout" element={<PublicLayout><CheckoutPage /></PublicLayout>} />
                  <Route path="/encomenda/:id" element={<PublicLayout><OrderConfirmationPage /></PublicLayout>} />
                  <Route path="/conta" element={<PublicLayout><CustomerAccountPage /></PublicLayout>} />
                  <Route path="/recuperar-password" element={<PublicLayout><ForgotPasswordPage /></PublicLayout>} />
                  <Route path="/reset-password" element={<PublicLayout><ResetPasswordPage /></PublicLayout>} />
                  <Route path="/termos" element={<PublicLayout><TermsPage /></PublicLayout>} />
                  <Route path="/privacidade" element={<PublicLayout><PrivacyPolicyPage /></PublicLayout>} />
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
                </Routes>
              </BrowserRouter>
            </CartProvider>
          </FavoritesProvider>
        </ContentProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
