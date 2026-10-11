import { ArrowUpRight, Bell, Compass, Heart, Search, Send, Smile, Sparkles } from "lucide-react";
import { getPipContact } from "@/lib/pip";
import { PipFace, PipLogo } from "@/components/pip/pip-logo";
import { PipWebSearchDemo } from "@/components/pip/pip-web-search-demo";
import { Button } from "@/components/ui/button";
import { PipContact } from "./pip-contact";
import styles from "./pip.module.css";

const features = [
  {
    icon: Bell,
    title: "Reminders",
    text: "Set a reminder in chat for the time you choose.",
  },
  {
    icon: Smile,
    title: "Stickers and images",
    text: "Share images and stickers when words are not quite enough.",
  },
  {
    icon: Compass,
    title: "Maps and weather",
    text: "Find places on a map and check the weather before you head out.",
  },
  {
    icon: Heart,
    title: "Conversation memory",
    text: "Pip can remember details about each person so later chats have more context.",
  },
  {
    icon: Sparkles,
    title: "Everyday advice",
    text: "Talk through meal ideas, second opinions, and small decisions.",
  },
];

export default function PipPage() {
  const contact = getPipContact();

  return (
    <div className={styles.page} id="top">
      <div className={styles.shell}>
        <header className={styles.header}>
          <a href="#top" className={styles.wordmark} aria-label="Pip, back to top"><PipLogo /></a>
          <a href="/" className={styles.homeLink}>Back to Lu <ArrowUpRight aria-hidden="true" /></a>
        </header>

        <section className={styles.hero} aria-labelledby="pip-title">
          <div className={styles.heroCopy}>
            <h1 id="pip-title">A little help.<br />A little <span>banter.</span></h1>
            <p className={styles.intro}>Pip is your Telegram mate for quick answers, useful reminders, and the everyday things on your mind.</p>
            <div className={styles.heroActions}>
              {contact ? (
                <Button asChild className={styles.primaryAction}><a href={contact.telegramUrl}><Send aria-hidden="true" /> Message Pip <ArrowUpRight aria-hidden="true" /></a></Button>
              ) : (
                <Button type="button" className={styles.primaryAction} disabled><Send aria-hidden="true" /> Message Pip <ArrowUpRight aria-hidden="true" /></Button>
              )}
            </div>
            {!contact && <p className={styles.actionHint}>Pip is not available to message right now.</p>}
          </div>

          <div className={styles.heroVisual}>
            <img
              src="/images/portfolio/pip-everyday.webp"
              alt="Pixel art of an open notebook, a cup of tea, oranges, and a leafy plant on a desk beside a lake view."
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 960px) 50vw, 100vw"
              className={styles.heroImage}
            />
          </div>
        </section>

        <section className={styles.example} aria-labelledby="example-title">
          <div className={styles.exampleHeading}>
            <h2 id="example-title">A little help, in context.</h2>
            <p>A dinner idea, then a reminder. Both fit in the same conversation.</p>
          </div>
          <figure className={styles.conversation} aria-label="Example conversation">
            <figcaption className={styles.conversationCaption}>Example conversation</figcaption>
            <div className={styles.exchange}>
              <span className={styles.speaker}>You</span>
              <blockquote>Got eggs, rice and zero motivation.</blockquote>
            </div>
            <div className={styles.exchange}>
              <span className={styles.speaker}>Pip</span>
              <blockquote>Egg fried rice. Ten minutes, one pan. Future you will thank you.</blockquote>
            </div>
            <div className={styles.exchange}>
              <span className={styles.speaker}>You</span>
              <blockquote>Remind me to get soy sauce tomorrow at 6pm.</blockquote>
            </div>
            <div className={styles.exchange}>
              <span className={styles.speaker}>Pip</span>
              <blockquote>You got it. Tomorrow at 6pm.</blockquote>
            </div>
          </figure>
        </section>

        <section id="everyday" className={styles.everyday} aria-labelledby="everyday-title">
          <div className={styles.sectionHeading}>
            <h2 id="everyday-title">Small asks. <span>Sorted.</span></h2>
            <p>Search, remember a detail, or make a quick plan. Pip can help with the small stuff.</p>
          </div>
          <div className={styles.features}>
            <article className={styles.featureLead}>
              <Search aria-hidden="true" className={styles.featureIcon} strokeWidth={1.6} />
              <h3>Web search</h3>
              <p>Ask a quick question or follow a curiosity. Pip searches the web and brings back useful links.</p>
              <PipWebSearchDemo />
            </article>
            <ul className={styles.featureList}>
              {features.map(({ icon: Icon, title: featureTitle, text }) => (
                <li key={featureTitle} className={styles.featureRow}>
                  <Icon aria-hidden="true" className={styles.featureIcon} strokeWidth={1.6} />
                  <div>
                    <h3>{featureTitle}</h3>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.personality} aria-labelledby="personality-title">
          <div className={styles.personalityArt} aria-hidden="true"><PipFace /></div>
          <div>
            <h2 id="personality-title">Easy company.<br />Clear boundaries.</h2>
            <p>Warm, short, and easygoing. Pip keeps things helpful with a gentle redirect when needed, and a firm no for clearly illegal requests.</p>
          </div>
        </section>

        <PipContact contact={contact} />

        <footer className={styles.footer}>
          <a href="/">LU / 6C75 <ArrowUpRight aria-hidden="true" /></a>
          <p>Built on Keiki. Made to be good company.</p>
          <span className={styles.footerPip} aria-hidden="true">pip.</span>
        </footer>
      </div>
    </div>
  );
}
