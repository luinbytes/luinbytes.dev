import styles from "./pip-logo.module.css";

export function PipFace({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M13 7h38a9 9 0 0 1 9 9v28a9 9 0 0 1-9 9H27L13 61V53a9 9 0 0 1-9-9V16a9 9 0 0 1 9-9Z" fill="currentColor" />
      <path d="M23 24v7m18-7v7m-17 8c4 5 12 5 16 0" stroke="#17241e" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function PipLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`${styles.logo} ${className}`} aria-hidden="true">
      <PipFace />
      <span>pip</span>
    </span>
  );
}
