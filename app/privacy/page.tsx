import styles from "./privacy.module.css";

export default function PrivacyPage() {
  return (
    <article className={styles.page}>
      <div className={styles.shell}>
        <p className={styles.nav}>
          <a href="/">Back to luinbytes.dev</a>
        </p>

        <header className={styles.header}>
          <h1>Privacy Policy</h1>
          <p className={styles.updated}>
            Last updated <time dateTime="2026-10-26">26 Oct 2026</time>
          </p>
        </header>

        <p>
          This page covers personal software that Lu runs on luinbytes.dev.
        </p>

        <section>
          <h2>Who</h2>
          <p>
            Lu uses an OAuth client named Lumi Health. That client is personal
            software for the site owner's own tools. It is not a public product
            and it is not a multi-user service.
          </p>
        </section>

        <section>
          <h2>What may be requested</h2>
          <p>
            The OAuth client may request read-only access to a Google Health
            profile, settings, and sleep data.
          </p>
        </section>

        <section>
          <h2>How that data is used</h2>
          <p>
            Requested data is used only on the owner's own machines for personal
            use. It is not sold. It is not shared with third parties.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            <a href="mailto:0x6c75@gmail.com">0x6c75@gmail.com</a>
          </p>
        </section>
      </div>
    </article>
  );
}
