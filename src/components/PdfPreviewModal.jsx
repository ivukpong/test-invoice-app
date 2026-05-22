import React, { useState } from 'react';
import styles from './PdfPreviewModal.module.css';

export default function PdfPreviewModal({ isOpen, pdfDataUrl, onClose, onDownload }) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Invoice Preview</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close preview">✕</button>
        </div>
        <div className={styles.body}>
          {pdfDataUrl ? (
            <iframe
              src={pdfDataUrl}
              className={styles.iframe}
              title="Invoice PDF Preview"
            />
          ) : (
            <div className={styles.loading}>Generating preview…</div>
          )}
        </div>
        <div className={styles.privacy}>
          <label className={styles.privacyLabel}>
            <input
              type="checkbox"
              className={styles.privacyCheckbox}
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              I confirm that the information in this invoice is accurate and I agree to the{' '}
              <a href="https://freeinvoice.app/privacy" target="_blank" rel="noopener noreferrer" className={styles.privacyLink}>
                Privacy Policy
              </a>{' '}and{' '}
              <a href="https://freeinvoice.app/terms" target="_blank" rel="noopener noreferrer" className={styles.privacyLink}>
                Terms of Use
              </a>.
            </span>
          </label>
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.downloadBtn}
            onClick={() => onDownload({ privacyPolicyAccepted: agreed })}
            disabled={!agreed}
            title={!agreed ? 'Please accept the privacy policy to download' : ''}
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
