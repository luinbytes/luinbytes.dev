export function Footer() {
  return (
    <footer
      data-site-footer
      className="registration-plate print-dither border-t-2 border-paper bg-dark-brown px-4 py-6 text-nd-text-secondary"
    >
      <div className="mx-auto flex max-w-[92rem] flex-col gap-2 pl-5 pr-5 font-mono text-[10px] uppercase tracking-[0.12em] sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} luinbytes.dev</span>
        <span className="text-nd-text-disabled">Ink / paper / shipped work</span>
      </div>
    </footer>
  );
}
