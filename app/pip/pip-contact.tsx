import { useState } from "react";
import { ArrowUpRight, Check, Copy, Send, QrCode } from "lucide-react";
import type { getPipContact } from "@/lib/pip";
import { Button } from "@/components/ui/button";
import styles from "./pip.module.css";

export function PipContact({ contact }: { contact: ReturnType<typeof getPipContact> }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [showQr, setShowQr] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);

  async function copyHandle() {
    if (!contact) return;
    try {
      await navigator.clipboard.writeText(contact.handle);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <section id="text-pip" className={styles.contact} aria-labelledby="contact-title">
      <div className={styles.contactIntro}>
        <h2 id="contact-title">Say hey to Pip<span>.</span></h2>
        <p>A question, a half-formed thought, or just a hello.<br />Start wherever you like.</p>
      </div>

      <div className={styles.contactActions}>
        {contact ? (
          <>
            <span className={styles.label}>PIP’S TELEGRAM HANDLE</span>
            <p className={styles.handle}>{contact.handle}</p>
            <Button asChild className={styles.primaryAction}><a href={contact.telegramUrl}>
              <Send aria-hidden="true" /> Message Pip <ArrowUpRight aria-hidden="true" />
            </a></Button>
            <p className={styles.actionHint}>Opens Pip in Telegram.</p>
          </>
        ) : (
          <>
            <span className={styles.label}>A LITTLE HELLO, SOON</span>
            <p className={styles.comingSoon}>Chat opens soon.</p>
            <p className={styles.actionHint}>Pip’s public handle is on its way. Check back here to start a chat.</p>
            <Button className={styles.primaryAction} type="button" disabled>
              <Send aria-hidden="true" /> Message Pip <ArrowUpRight aria-hidden="true" />
            </Button>
          </>
        )}
        <div className={styles.secondaryActions}>
          <Button variant="outline" type="button" className={styles.secondaryAction} onClick={copyHandle} disabled={!contact}>
            {copyStatus === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} Copy handle
          </Button>
          <Button
            variant="outline"
            type="button"
            className={styles.secondaryAction}
            disabled={!contact}
            aria-expanded={showQr}
            aria-controls="pip-qr"
            onClick={() => setShowQr(!showQr)}
          >
            <QrCode aria-hidden="true" /> {showQr ? "Hide QR code" : "Show QR code"}
          </Button>
        </div>
        <p className={styles.copyStatus} role="status">
          {copyStatus === "copied" && "Handle copied."}
          {copyStatus === "failed" && "Couldn’t copy. Select the handle above and copy it manually."}
        </p>
        <div id="pip-qr" hidden={!showQr}>
          {showQr && contact && (
            <div className={styles.qrPanel}>
              {qrFailed ? (
                <p role="status">QR code couldn’t load. Use Message Pip or copy the handle instead.</p>
              ) : (
                <>
                  <img
                    src={contact.qrUrl}
                    alt="Scan to message Pip on Telegram"
                    width={240}
                    height={240}
                    referrerPolicy="no-referrer"
                    onError={() => setQrFailed(true)}
                  />
                  <p>Point your phone’s camera here to say hello.</p>
                </>
              )}
            </div>
          )}
        </div>
        <noscript><p className={styles.actionHint}>Without JavaScript, use the handle above or Message Pip. Copy and QR controls need JavaScript.</p></noscript>
      </div>
    </section>
  );
}
