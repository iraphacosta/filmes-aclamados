export function ScrollTopo({ visivel }: { visivel: boolean }) {
  return (
    <button
      className={`scroll-topo ${visivel ? "scroll-topo--visivel" : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Voltar ao topo"
      aria-hidden={!visivel}
      tabIndex={visivel ? 0 : -1}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path d="M12 19V6M6 12l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
