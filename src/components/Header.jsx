import React, { useState } from "react";
import { FileCheck, Menu, X } from "lucide-react";
import styles from "./Header.module.css";

export default function Header({
  invoiceCount,
  profile,
  onLogin,
  onCreateProfile,
  onNavigate,
  activePage = "main",
  hideNavLinks = false,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem("profile");
    setMobileMenuOpen(false);
    if (onNavigate) onNavigate("landing");
    else window.location.href = "/";
  }

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.navContainer}>
          <div className={styles.navLeft}>
            <div className={styles.logo}>
              <FileCheck className={styles.logoIcon} />
              <span className={styles.logoText}>Free Invoice</span>
            </div>
          </div>
          {!hideNavLinks && (
            <div className={`${styles.navCenter} ${hideNavLinks ? styles.hidden : ""}`}>
              <a href="#features" className={styles.navLink}>Features</a>
              <a href="#how-it-works" className={styles.navLink}>How It Works</a>
              <a href="#tutorials" className={styles.navLink}>Tutorials</a>
              <a href="#faqs" className={styles.navLink}>FAQs</a>
            </div>
          )}
          <div className={styles.navRight}>
            <div className={styles.invoiceCount}>
              <span className={styles.invoiceCountNumber}>{(invoiceCount || 0).toLocaleString()}</span>
              <span className={styles.invoiceCountLabel}>Invoices Created</span>
            </div>
            {profile ? (
              <>
                <span className={styles.profileName} onClick={() => onNavigate?.("profile")}>
                  {profile.name || profile.email}
                </span>
                <button className={styles.logoutButton} onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <button className={styles.navButtonSecondary} onClick={onLogin}>
                  Sign In
                </button>
                <button className={styles.navButtonPrimary} onClick={onCreateProfile}>
                  Sign Up
                </button>
              </>
            )}
          </div>
          <button 
            className={styles.mobileMenuButton}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={styles.mobileMenu}>
          <a href="#features" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#how-it-works" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>How It Works</a>
          <a href="#tutorials" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Tutorials</a>
          <a href="#faqs" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>FAQs</a>
          <div className={styles.mobileMenuDivider}></div>
          {profile ? (
            <>
              <div className={styles.mobileProfile}>
                <span>{profile.name || profile.email}</span>
              </div>
              <button className={styles.mobileLogoutButton} onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button className={styles.mobileButtonSecondary} onClick={() => { onLogin(); setMobileMenuOpen(false); }}>
                Sign In
              </button>
              <button className={styles.mobileButtonPrimary} onClick={() => { onCreateProfile(); setMobileMenuOpen(false); }}>
                Sign Up
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
