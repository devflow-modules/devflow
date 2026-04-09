"use client";

/**
 * UI mínima proposital: não importa AppShell, providers de sessão nem hooks de navegação.
 * O erro global renderiza fora da árvore normal do layout e deve permanecer isolado.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          background: "#0f172a",
          color: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 12px" }}>
            Algo deu errado
          </h1>
          <p style={{ margin: "0 0 20px", color: "#94a3b8", fontSize: "0.9375rem", lineHeight: 1.5 }}>
            Não foi possível carregar a aplicação. Pode tentar de novo ou voltar ao início.
          </p>
          {process.env.NODE_ENV === "development" && error?.message ? (
            <pre
              style={{
                textAlign: "left",
                fontSize: "0.75rem",
                color: "#cbd5e1",
                background: "#1e293b",
                padding: 12,
                borderRadius: 8,
                overflow: "auto",
                maxHeight: 160,
              }}
            >
              {error.message}
            </pre>
          ) : null}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                cursor: "pointer",
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: "#22c55e",
                color: "#052e16",
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            >
              Tentar novamente
            </button>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid #334155",
                color: "#e2e8f0",
                fontWeight: 500,
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              Ir ao início
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
