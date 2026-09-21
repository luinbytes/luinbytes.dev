import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Bell, Compass, Heart, Send, Search, Smile, Sparkles } from "lucide-react";
import { getPipContact } from "@/lib/pip";
import siteConfig from "@/site.config.json";
import { PipContact } from "./pip-contact";
import styles from "./pip.module.css";

const title = "Pip — Your Telegram mate";
const description = "A little help, one message away. Pip is your warm, easygoing Telegram agent for questions, web searches, reminders, and everyday life. Built on Keiki.";
const pageUrl = `${siteConfig.siteUrl}/pip`;
const shareCard = {
  url: `${siteConfig.siteUrl}/share-cards/luinbytes-dev-pond.png`,
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "Lu | Software Engineer",
};

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: pageUrl },
  openGraph: {
    title,
    description,
    url: pageUrl,
    type: "website",
    locale: "en_GB",
    siteName: "Luinbytes",
    images: [shareCard],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@x6c75",
    images: [shareCard],
  },
};

const features = [
  { icon: Search, title: "Down the rabbit hole.", text: "Quick questions or oddly specific curiosities. Pip searches the web and brings back the useful bits.", label: "WEB SEARCH" },
  { icon: Bell, title: "A nudge when you need it.", text: "The thing you’ll definitely remember? Text it to Pip. Reminders are set for you, on your schedule.", label: "PERSONAL REMINDERS" },
  { icon: Smile, title: "Sometimes, a sticker says it.", text: "Images, stickers, and a little personality. There’s room for something other than words.", label: "IMAGES & STICKERS" },
  { icon: Compass, title: "A little local knowledge.", text: "A useful link, a spot on the map, or the weather before you head out. All in the conversation.", label: "LINKS, MAPS & WEATHER" },
  { icon: Heart, title: "Less starting from scratch.", text: "Pip remembers each person, so your next chat can pick up with a little more context.", label: "REMEMBERS YOU" },
  { icon: Sparkles, title: "Talk the small stuff through.", text: "Dinner ideas, a second opinion, or a tiny everyday dilemma. Short answers. Easy conversation.", label: "EVERYDAY ADVICE" },
];

function PipFace({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M13 7h38a9 9 0 0 1 9 9v28a9 9 0 0 1-9 9H27L13 61V53a9 9 0 0 1-9-9V16a9 9 0 0 1 9-9Z" fill="currentColor" />
      <path d="M23 24v7m18-7v7m-17 8c4 5 12 5 16 0" stroke="#17241e" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function PipPage() {
  const contact = getPipContact();

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <a href="#" className={styles.wordmark} aria-label="Pip, back to top"><PipFace /><span>pip</span></a>
          <Link href="/" className={styles.homeLink}>A LITTLE SOMETHING BY LU <ArrowUpRight aria-hidden="true" /></Link>
        </header>

        <section className={styles.hero} aria-labelledby="pip-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span aria-hidden="true" /> YOUR TELEGRAM MATE</p>
            <h1 id="pip-title">A little help.<br />A little <span>banter.</span></h1>
            <p className={styles.intro}>Meet Pip, your AI mate on Telegram. For the random questions, the small favours, and the stuff on your mind.</p>
            <div className={styles.heroActions}>
              {contact ? (
                <a href={contact.telegramUrl} className={styles.primaryAction}><Send aria-hidden="true" /> Message Pip <ArrowUpRight aria-hidden="true" /></a>
              ) : (
                <button type="button" className={styles.primaryAction} disabled><Send aria-hidden="true" /> Message Pip <ArrowUpRight aria-hidden="true" /></button>
              )}
              <a href="#everyday" className={styles.exploreLink}>Get to know Pip <ArrowDown aria-hidden="true" /></a>
            </div>
            <p className={styles.heroHint}>{contact ? "One conversation. Right in Telegram." : "Chat opens soon. A new mate is on the way."}</p>
          </div>

          <figure className={styles.conversation} aria-label="Example conversation">
            <div className={styles.chatHeader}>
              <PipFace className={styles.avatar} />
              <div><span className={styles.chatName}>Pip</span><span className={styles.chatSubline}>a little help, one text away</span></div>
              <span className={styles.chatSpark} aria-hidden="true">✳</span>
            </div>
            <div className={styles.messages}>
              <span className={styles.chatTime}>A PERFECTLY ORDINARY EVENING</span>
              <p className={styles.sent}><span className="sr-only">You: </span>got eggs, rice and zero motivation</p>
              <p className={styles.received}><span className="sr-only">Pip: </span>egg fried rice. ten minutes, one pan. future you is grateful <span aria-hidden="true">🍳</span></p>
              <p className={styles.sent}><span className="sr-only">You: </span>remind me to get soy sauce tomorrow at 6pm</p>
              <p className={styles.received}><span className="sr-only">Pip: </span>you got it. tomorrow, 6pm <span aria-hidden="true">🫡</span></p>
              <span className={styles.chatNote}><Bell size={12} aria-hidden="true" /> One less thing in your head.</span>
            </div>
            <figcaption>EXAMPLE CONVERSATION <span>small talk. useful things.</span></figcaption>
          </figure>
        </section>

        <div className={styles.interlude}><span>CURIOUS BY NATURE</span><span aria-hidden="true">✳</span><span>GOOD COMPANY BY DESIGN</span></div>

        <section id="everyday" className={styles.everyday} aria-labelledby="everyday-title">
          <div className={styles.sectionHeading}>
            <span className={styles.label}>FOR THE EVERYDAY BITS</span>
            <h2 id="everyday-title">Small asks. <span>Sorted.</span></h2>
            <p>Useful enough to keep around.<br />Chill enough to just say hey.</p>
          </div>
          <div className={styles.features}>
            {features.map(({ icon: Icon, title: featureTitle, text, label }) => (
              <article key={label} className={styles.feature}>
                <Icon aria-hidden="true" className={styles.featureIcon} strokeWidth={1.5} />
                <span className={styles.label}>{label}</span>
                <h3>{featureTitle}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.personality} aria-labelledby="personality-title">
          <div className={styles.personalityArt} aria-hidden="true"><PipFace /><span>hey, you.</span></div>
          <div>
            <span className={styles.label}>A MATE, WITH SOME COMMON SENSE</span>
            <h2 id="personality-title">Easy company.<br />Clear boundaries.</h2>
            <p>Warm, short, and easygoing. Pip keeps things helpful with a gentle redirect when needed, and a firm no for clearly illegal requests.</p>
          </div>
        </section>

        <PipContact contact={contact} />

        <footer className={styles.footer}>
          <Link href="/">LU / 6C75 <ArrowUpRight aria-hidden="true" /></Link>
          <p>Built on Keiki. Made to be good company.</p>
          <span className={styles.footerPip} aria-hidden="true">pip.</span>
        </footer>
      </div>
    </div>
  );
}
