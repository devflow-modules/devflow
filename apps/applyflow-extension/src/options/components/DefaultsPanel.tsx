export function DefaultsPanel() {
  return (
    <section className="af-card af-card-muted" style={{ marginBottom: "16px" }}>
      <h2 className="af-title" style={{ fontSize: "14px", marginBottom: "8px" }}>
        Sobre dados locais
      </h2>
      <p className="af-muted" style={{ marginBottom: "8px" }}>
        Informação orientada apenas a candidaturas Easy Apply, guardada só em <code style={{ opacity: 0.85 }}>chrome.storage.local</code> —
        não há servidor, nem OpenAI nesta sprint. As sugestões no LinkedIn reflectem uma leitura do perfil válido sempre que abre/atualiza o
        formulário (o painel reconcilia quando o modal muda ou quando altera o perfil noutro separador e o storage notifica o content script).
      </p>
      <ul className="af-muted" style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.5 }}>
        <li>Nunca enviamos ou preenchemos automaticamente candidaturas no LinkedIn.</li>
        <li>Export/import JSON apenas para cópias de segurança locais suas.</li>
      </ul>
    </section>
  );
}
