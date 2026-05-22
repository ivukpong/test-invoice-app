import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import styles from "./Onboarding.module.css";

export default function Onboarding({ onComplete, currentPage = "builder" }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [highlightElement, setHighlightElement] = useState(null);

  const steps = [
    {
      title: "Welcome to Free Invoice!",
      description: "Let's show you around. This quick tour takes less than 2 minutes. You'll learn how to create professional invoices effortlessly.",
      highlight: null,
      position: "center",
    },
    {
      title: "Enter Invoice Details",
      description: "Start by filling in your company information and client details. Each field has helpful hints if you need guidance.",
      highlight: ".invoice-form",
      position: "left",
    },
    {
      title: "Add Invoice Items",
      description: "List your products or services here. Add descriptions, quantities, and prices. Tax and totals calculate automatically!",
      highlight: ".invoice-table",
      position: "left",
    },
    {
      title: "Add Personal Notes",
      description: "Include payment terms, thank you messages, or any other information. This section is optional but adds a personal touch.",
      highlight: ".note-field",
      position: "left",
    },
    {
      title: "Sign Your Invoice",
      description: "Draw your signature or upload an image. This makes your invoice official and professional-looking.",
      highlight: ".signature-pad",
      position: "left",
    },
    {
      title: "Live Preview",
      description: "See exactly how your invoice looks in real-time! What you see here is what your client will receive.",
      highlight: ".invoice-preview",
      position: "right",
    },
    {
      title: "Automatic Calculations",
      description: "Watch as subtotals, taxes, and totals update automatically. No manual calculations needed!",
      highlight: ".invoice-summary",
      position: "right",
    },
    {
      title: "Save, Download or Send",
      description: "Download as PDF, send via email, export to Excel, or save as draft to finish later. Multiple options for your convenience!",
      highlight: ".export-actions",
      position: "right",
    },
    {
      title: "You're All Set!",
      description: "Congratulations! You now know how to create professional invoices. Start creating, or explore Requests and Negotiations features.",
      highlight: null,
      position: "center",
    },
  ];

  useEffect(() => {
    const step = steps[currentStep];
    if (step.highlight) {
      // Add a small delay to ensure elements are rendered
      const timeout = setTimeout(() => {
        const element = document.querySelector(step.highlight);
        if (element) {
          setHighlightElement(element.getBoundingClientRect());
          // Scroll the element into view
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return () => clearTimeout(timeout);
    } else {
      setHighlightElement(null);
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Escape") handleSkip();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentStep]);

  if (isPaused) {
    return (
      <div className={styles.overlay}>
        <div className={styles.pauseCard}>
          <div className={styles.pauseIcon}>
            <Pause size={48} strokeWidth={1.5} />
          </div>
          <h2 className={styles.pauseTitle}>Tour Paused</h2>
          <p className={styles.pauseText}>
            You can resume this tour anytime from Settings → Help & Tutorials
          </p>
          <div className={styles.pauseButtons}>
            <button className={styles.resumeButton} onClick={handlePause}>
              <Play size={18} /> Resume Tour
            </button>
            <button className={styles.endButton} onClick={handleSkip}>
              <X size={18} /> End Tour
            </button>
          </div>
        </div>
      </div>
    );
  }

  const step = steps[currentStep];

  return (
    <>
      {/* Highlight Box */}
      {highlightElement && (
        <div
          className={styles.highlightBox}
          style={{
            top: `${highlightElement.top - 8}px`,
            left: `${highlightElement.left - 8}px`,
            width: `${highlightElement.width + 16}px`,
            height: `${highlightElement.height + 16}px`,
          }}
        >
          <div className={styles.highlightPulse}></div>
        </div>
      )}

      <div className={styles.overlay}>
        <div className={`${styles.tourCard} ${styles[step.position]}`}>
          {/* Progress Bar */}
          <div className={styles.progressBar}>
            {steps.map((_, index) => (
              <div
                key={index}
                className={`${styles.progressDot} ${index <= currentStep ? styles.progressActive : ""}`}
                title={`Step ${index + 1}`}
              />
            ))}
          </div>

          {/* Content */}
          <div className={styles.tourContent}>
            <div className={styles.stepIndicator}>
              Step {currentStep + 1} of {steps.length}
            </div>
            <h2 className={styles.tourTitle}>{step.title}</h2>
            <p className={styles.tourDescription}>{step.description}</p>
          </div>

          {/* Navigation */}
          <div className={styles.tourNavigation}>
            <button
              className={styles.pauseBtn}
              onClick={handlePause}
              title="Pause tour (P)"
            >
              <Pause size={20} />
            </button>
            
            {currentStep > 0 && (
              <button className={styles.prevButton} onClick={handlePrev}>
                <ChevronLeft size={18} /> Previous
              </button>
            )}
            
            <button
              className={styles.nextButton}
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Play size={18} /> Get Started
                </>
              ) : (
                <>
                  Next <ChevronRight size={18} />
                </>
              )}
            </button>
            
            <button className={styles.skipButton} onClick={handleSkip}>
              <X size={16} /> Skip
            </button>
          </div>

          {/* Keyboard Shortcut Hint */}
          <div className={styles.keyboardHint}>
            <span>Keyboard:</span>
            <kbd>←</kbd>
            <span>Previous</span>
            <kbd>→</kbd>
            <span>Next</span>
            <kbd>Esc</kbd>
            <span>Skip</span>
          </div>
        </div>
      </div>

      {/* Highlight Box */}
      {highlightElement && (
        <div
          className={styles.highlightBox}
          style={{
            top: `${highlightElement.top - 8}px`,
            left: `${highlightElement.left - 8}px`,
            width: `${highlightElement.width + 16}px`,
            height: `${highlightElement.height + 16}px`,
          }}
        >
          <div className={styles.highlightPulse}></div>
        </div>
      )}
    </>
  );
}
