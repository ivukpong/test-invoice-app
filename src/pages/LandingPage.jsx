import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Zap, Shield, Smartphone, MessageCircle, BarChart3, Star } from "lucide-react";
import ParticleBackground from "../components/ParticleBackground";
import styles from "./LandingPage.module.css";

export default function LandingPage({ onGetStarted, onLogin, invoiceCount }) {
  const [activeFaq, setActiveFaq] = useState(null);

  const handleGetStarted = () => {
    window.history.pushState({}, '', '/');
    onGetStarted();
  };

  const features = [
    {
      icon: BarChart3,
      title: "Create Invoices",
      description: "Build professional invoices in minutes with our intuitive builder. No accounting knowledge required.",
    },
    {
      icon: MessageCircle,
      title: "Track Everything",
      description: "Monitor all your invoices, requests, and negotiations from one centralized dashboard.",
    },
    {
      icon: Zap,
      title: "Negotiate Easily",
      description: "Communicate with clients directly through the platform. Negotiate terms and close deals faster.",
    },
    {
      icon: Smartphone,
      title: "Smart Notifications",
      description: "Never miss an update. Get notified about invoice status changes, requests, and messages.",
    },
    {
      icon: Shield,
      title: "Mobile Friendly",
      description: "Access your invoices anywhere. Works perfectly on desktop, tablet, and mobile devices.",
    },
    {
      icon: Star,
      title: "Secure & Private",
      description: "Your data is encrypted and secure. We prioritize your privacy and data protection.",
    },
  ];

  const faqs = [
    {
      question: "Is this really free?",
      answer: "Yes! Our core invoice creation and management features are completely free. You can create unlimited invoices without any cost.",
    },
    {
      question: "Do I need accounting knowledge?",
      answer: "Not at all! Our platform is designed for everyone. We guide you through each step with helpful tips and explanations.",
    },
    {
      question: "Can I customize my invoices?",
      answer: "Absolutely! Add your logo, customize colors, include notes, and tailor every invoice to match your brand.",
    },
    {
      question: "How do I receive invoice requests?",
      answer: "If your company uses our ERP integration, invoice requests will appear automatically in your Requests page. Review and convert them to invoices with one click.",
    },
    {
      question: "Can I negotiate invoice amounts?",
      answer: "Yes! Our Negotiation feature lets you communicate with clients, propose different amounts, and reach agreements directly in the platform.",
    },
    {
      question: "What formats can I export in?",
      answer: "Download invoices as PDF, export data to Excel, or send directly via email. Multiple formats for different needs.",
    },
  ];

  const logos = [
    "Buyops", "Urbco", "BuildOS", "Uptipro", "SImpli", "Raycast", "DooSign", "Bloom"
  ];

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContainer}>
          <div className={styles.logo}>
            <img src="/logo-full.png" alt="sabiquot" className={styles.logoImage} />
          </div>
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
            <a href="#faqs" className={styles.navLink}>FAQs</a>
          </div>
          <div className={styles.navActions}>
            <div className={styles.invoiceCount}>
              <span className={styles.invoiceCountNumber}>{(invoiceCount || 10000).toLocaleString()}+</span>
              <span className={styles.invoiceCountLabel}>Invoices Created</span>
            </div>
            <button className={styles.signInButton} onClick={onLogin}>
              Sign In
            </button>
            <button className={styles.signUpButton} onClick={handleGetStarted}>
              Create Invoice
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Particle Animation */}
      <section className={styles.hero}>
        <ParticleBackground />
        
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <Star size={14} />
            <span>Trusted by 10,000+ businesses</span>
          </div>
          <h1 className={styles.heroTitle}>
            Rebooting the<br />
            <span className={styles.heroTitleHighlight}>Invoice Experience.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            We're not building another invoicing platform. We're building a place where businesses thrive.
            Create, manage, and negotiate invoices effortlessly.
          </p>
          <div className={styles.heroButtons}>
            <button className={styles.heroPrimary} onClick={handleGetStarted}>
              Create Invoice <ArrowRight size={18} />
            </button>
            <button className={styles.heroSecondary} onClick={onLogin}>
              Sign In
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{(invoiceCount || 10000).toLocaleString()}+</span>
            <span className={styles.statLabel}>Invoices Created</span>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>100%</span>
            <span className={styles.statLabel}>Free Forever</span>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>2 min</span>
            <span className={styles.statLabel}>Average Creation Time</span>
          </div>
        </div>
      </section>

      {/* Logo Strip */}
      <section className={styles.logoStrip}>
        <div className={styles.logoStripTrack}>
          <div className={styles.logoStripContent}>
            {logos.map((logo, index) => (
              <span key={`logo1-${index}`} className={styles.logoItem}>
                {logo}
              </span>
            ))}
            {logos.map((logo, index) => (
              <span key={`logo2-${index}`} className={styles.logoItem}>
                {logo}
              </span>
            ))}
            {logos.map((logo, index) => (
              <span key={`logo3-${index}`} className={styles.logoItem}>
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <h2 className={styles.sectionTitle}>Everything You Need</h2>
        <p className={styles.sectionSubtitle}>
          Powerful features wrapped in a simple, intuitive interface
        </p>
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <feature.icon className={styles.featureIcon} />
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={styles.howItWorks}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>Enter Details</h3>
            <p>Fill in your company info, client details, and invoice items</p>
          </div>
          <div className={styles.stepConnector}></div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>Review & Customize</h3>
            <p>Preview your invoice, add logo, and customize as needed</p>
          </div>
          <div className={styles.stepConnector}></div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>Send or Download</h3>
            <p>Export as PDF, send via email, or save for later</p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section id="faqs" className={styles.faqs}>
        <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        <div className={styles.faqList}>
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`${styles.faqItem} ${activeFaq === index ? styles.faqActive : ""}`}
            >
              <button
                className={styles.faqQuestion}
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
              >
                <span className={styles.faqText}>{faq.question}</span>
                {activeFaq === index ? (
                  <ChevronUp size={20} className={styles.faqIcon} />
                ) : (
                  <ChevronDown size={20} className={styles.faqIcon} />
                )}
              </button>
              {activeFaq === index && (
                <div className={styles.faqAnswer}>{faq.answer}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready to Get Started?</h2>
        <p className={styles.ctaText}>
          Join thousands of users creating professional invoices today
        </p>
        <button className={styles.ctaButton} onClick={handleGetStarted}>
          Create Your First Invoice Free
        </button>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2026 sabiquot. Built for businesses everywhere.</p>
      </footer>
    </div>
  );
}
