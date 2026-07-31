import React, { useState } from 'react';
import styles from './PdfPreviewModal.module.css';

/**
 * `onConfirm` is what ExportActions passes. This component previously
 * destructured `onDownload`, which no caller supplies, so the Download button's
 * handler was `undefined` and clicking it threw instead of downloading —
 * the download simply never happened. `onDownload` is still accepted as an
 * alias so any other caller keeps working.
 *
 * The caller remounts this via a `key` per preview session, which resets the
 * privacy checkbox: it is component state, so a second preview would otherwise
 * open with the box still ticked from the first, letting a download through
 * without the confirmation being made again.
 */
export default function PdfPreviewModal({
  isOpen,
  pdfDataUrl,
  onClose,
  onConfirm,
  onDownload,
  isSaving = false,
}) {
  const [agreed, setAgreed] = useState(false);
  const confirm = onConfirm ?? onDownload;

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
            onClick={() => confirm?.({ privacyPolicyAccepted: agreed })}
            disabled={!agreed || isSaving}
            title={!agreed ? 'Please accept the privacy policy to download' : ''}
          >
            {isSaving ? 'Saving…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
