import React, {
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
} from "react";
import ReactSignatureCanvas from "react-signature-canvas";
import styles from "./SignaturePad.module.css";

const SignaturePad = forwardRef(
  ({ onEnd, signerName, onSignerNameChange, viewOnly }, ref) => {
    const sigRef = useRef();
    const [isEmpty, setIsEmpty] = useState(true);
    const containerRef = useRef();

    useEffect(() => {
      // Initial canvas setup with delay to ensure canvas is rendered
      const timeoutId = setTimeout(() => {
        if (sigRef.current && containerRef.current) {
          const canvas = sigRef.current.getCanvas();
          if (canvas) {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            const rect = containerRef.current.getBoundingClientRect();
            canvas.width = rect.width * ratio;
            canvas.height = rect.height * ratio;
            canvas.getContext("2d").scale(ratio, ratio);
          }
        }
      }, 100);
      
      // Resize canvas on window resize (preserves existing signature)
      const handleResize = () => {
        if (sigRef.current && containerRef.current) {
          const canvas = sigRef.current.getCanvas();
          if (canvas) {
            const dataUrl = sigRef.current.toDataURL();
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            const rect = containerRef.current.getBoundingClientRect();
            canvas.width = rect.width * ratio;
            canvas.height = rect.height * ratio;
            canvas.getContext("2d").scale(ratio, ratio);
            // Restore signature after resize
            const img = new Image();
            img.onload = () => {
              sigRef.current.fromDataURL(dataUrl);
            };
            img.src = dataUrl;
          }
        }
      };
      
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        clearTimeout(timeoutId);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      clear: () => {
        sigRef.current.clear();
        setIsEmpty(true);
      },
      toDataURL: () => {
        const canvas = sigRef.current.getCanvas();
        if (!canvas) return null;
        try {
          return canvas.toDataURL("image/png");
        } catch (err) {
          console.error('Error converting signature to data URL:', err);
          return null;
        }
      },
    }));

    const handleEnd = () => {
      try {
        const isEmpty = sigRef.current.isEmpty();
        setIsEmpty(isEmpty);
        if (onEnd) onEnd();
      } catch (err) {
        console.error('Error in handleEnd:', err);
      }
    };

    const handleClear = () => {
      try {
        sigRef.current.clear();
        setIsEmpty(true);
      } catch (err) {
        console.error('Error clearing signature:', err);
      }
    };

    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div>
            <p className={styles.title}>Signature</p>
            <p className={styles.hint}>Draw your signature in the box below</p>
          </div>
          {!isEmpty && !viewOnly && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClear}
            >
              Clear
            </button>
          )}
        </div>

        <div
          className={styles.canvasWrapper}
          ref={containerRef}
          style={viewOnly ? { pointerEvents: "none", opacity: 0.75 } : {}}
        >
          <ReactSignatureCanvas
            penColor="#0f172a"
            canvasProps={{ className: styles.canvas }}
            ref={sigRef}
            onEnd={handleEnd}
          />
          {isEmpty && <p className={styles.placeholder}>Sign here ✦</p>}
        </div>

        <div className={styles.signerRow}>
          <label className={styles.signerLabel}>
            Signer Name
            <input
              className={styles.signerInput}
              value={signerName || ""}
              onChange={onSignerNameChange}
              placeholder="e.g. John Doe"
              disabled={viewOnly}
            />
          </label>
          {!isEmpty && <span className={styles.badge}>✓ Signed</span>}
        </div>
      </div>
    );
  },
);

export default SignaturePad;
