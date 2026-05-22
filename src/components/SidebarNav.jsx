import { Home, FileText, Inbox, MessageSquare, User, Settings, LogOut, HelpCircle, Sparkles, Send, Download, Edit, Trash2, Plus, Check, X, ChevronRight, ChevronLeft, Pause, Play, MoreVertical, Bell, Search, Filter, Calendar, DollarSign, Building, Mail, Phone, MapPin, Globe, CreditCard, Clock, AlertCircle, Info, CheckCircle, XCircle, Menu, ArrowLeft, Upload, Image, PenTool, Eye, Save, Share2, Printer, FileSpreadsheet, MessageCircle, ThumbsUp, ThumbsDown, RotateCcw, Zap, Star, Heart, Shield, Lock, Unlock, Eye as EyeIcon, EyeOff, Moon, Sun, Monitor, Smartphone, Tablet, CheckCircle2, AlertTriangle, XOctagon } from "lucide-react";
import styles from "./SidebarNav.module.css";

export default function SidebarNav({
  currentPage,
  onNavigate,
  onLogout,
  profile,
  invoiceCount,
}) {
  const navItems = [
    { id: "main", label: "Create Invoice", icon: Plus, badge: null },
    { id: "invoices", label: "My Invoices", icon: FileText, badge: invoiceCount },
    { id: "requests", label: "Requests", icon: Inbox, badge: null },
    { id: "negotiations", label: "Negotiations", icon: MessageSquare, badge: null },
  ];

  const bottomItems = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <FileText className={styles.logoIconSvg} />
        </div>
        <div className={styles.logoText}>
          <span className={styles.logoName}>Free Invoice</span>
          <span className={styles.logoTagline}>Create & Manage</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navSection}>
          <span className={styles.navSectionLabel}>Main</span>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${currentPage === item.id ? styles.navItemActive : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              <item.icon className={styles.navIcon} />
              <span className={styles.navLabel}>{item.label}</span>
              {item.badge > 0 && (
                <span className={styles.navBadge}>{item.badge}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Help Section */}
      <div className={styles.helpSection}>
        <div className={styles.helpCard}>
          <HelpCircle className={styles.helpIcon} />
          <div className={styles.helpContent}>
            <strong>Need Help?</strong>
            <span>Guides & tutorials</span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className={styles.bottomNav}>
        <div className={styles.navSection}>
          <span className={styles.navSectionLabel}>Account</span>
          {bottomItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${currentPage === item.id ? styles.navItemActive : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              <item.icon className={styles.navIcon} />
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Profile Info */}
        {profile && (
          <div className={styles.profileSection}>
            <div className={styles.profileAvatar}>
              {profile.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{profile.name || profile.email}</span>
              <span className={styles.profileEmail}>{profile.email}</span>
            </div>
            <button className={styles.logoutBtn} onClick={onLogout} title="Logout">
              <LogOut className={styles.logoutIcon} />
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
}
