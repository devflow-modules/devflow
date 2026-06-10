import { ExtensionButton } from "../../components/ExtensionButton.js";

/**
 * Preview estático para capturas de portfólio (Print 6).
 * Não lê LinkedIn, chrome.storage nem perfil real — apenas texto e dados fictícios embutidos.
 */
export function ExtensionPreview() {
  function downloadDemoJson(): void {
    const demo = {
      _applyflowDemo: true,
      _purpose: "Portfolio / Print 6 — fictitious payload only",
      company: "Acme Demo Ltda.",
      role: "Staff Engineer (exemplo)",
      status: "reviewing",
      recordedAt: "2025-01-12T10:00:00.000Z",
    };
    try {
      const blob = new Blob([JSON.stringify(demo, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "applyflow-print6-demo.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="af-opt-preview-stage">
      <p className="af-opt-preview-intro">
        Esta área simula o painel da extensão com dados <strong>100% fictícios</strong>. Use para o Print 6 — não depende
        do LinkedIn aberto e não mostra mensagens, fotos nem contactos reais.
      </p>

      <div className="af-opt-preview-panel">
        <div className="af-root af-panel-mount af-panel-outer">
          <header className="af-panel-header-bar">
            <p className="af-panel-brand">ApplyFlow</p>
            <p className="af-panel-tagline">Local-first copilot · assistido · sem auto-submit</p>
          </header>

          <div className="af-demo-strip af-demo-strip--safe" role="status">
            <strong>Modo demo</strong> — nenhum dado pessoal exibido (empresa e vaga são exemplos genéricos).
          </div>

          <div className="af-panel-scroll">
            <section className="af-card af-status-card">
              <p className="af-panel-header">Estado do Easy Apply</p>
              <p className="af-status-main">Easy Apply detectado</p>
              <p className="af-status-detail">Modo assistido — sugestões e preenchimento opcional campo a campo.</p>
              <p className="af-muted" style={{ marginTop: "8px", marginBottom: 0 }}>
                <span lang="en">No auto-submit</span> — o envio da candidatura é sempre manual no LinkedIn.
              </p>
            </section>

            <section className="af-card af-card-muted">
              <p className="af-panel-header">Safety gate</p>
              <ul className="af-muted" style={{ margin: "6px 0 0 16px", padding: 0, fontSize: "12px", lineHeight: 1.5 }}>
                <li>Confirmação antes de preencher campos sensíveis ou de baixa confiança.</li>
                <li>Nunca envia candidatura automaticamente nem clica em Submit.</li>
                <li>Sem bypass de CAPTCHA; bloqueios e falhas são mostrados com transparência.</li>
              </ul>
            </section>

            <section className="af-card">
              <p className="af-panel-header">Copiloto assistido</p>
              <h2 className="af-title" style={{ marginTop: 0, fontSize: "14px" }}>
                Sugestões para campos longos
              </h2>
              <p className="af-muted" style={{ marginTop: "4px" }}>
                IA opcional (opt-in): configure a chave nas opções «IA». Sem chave, o painel continua com sugestões
                locais do núcleo ApplyFlow.
              </p>
            </section>

            <section className="af-card af-card-muted">
              <p className="af-session-title">Autofill assistido</p>
              <p className="af-muted" style={{ marginBottom: "6px", marginTop: 0 }}>
                Campos só são alterados após ação explícita sua. Contadores de exemplo (não reflectam a sua sessão):
              </p>
              <ul className="af-muted" style={{ margin: "0 0 10px 16px", padding: 0, fontSize: "13px" }}>
                <li>Preenchidos com sucesso: 2 (demo)</li>
                <li>Falhas (DOM / modal): 0 (demo)</li>
                <li>Bloqueados (segurança): 1 (demo)</li>
              </ul>
            </section>

            <section className="af-card af-card-muted" aria-label="Histórico local (exemplo)">
              <p className="af-meta" style={{ marginBottom: "8px" }}>
                Histórico local
              </p>
              <p className="af-muted" style={{ marginTop: 0 }}>
                Registos em <code style={{ fontSize: "11px", color: "var(--af-brand)" }}>chrome.storage.local</code> —
                sem backend. Tabela abaixo é ilustrativa.
              </p>
              <div className="af-history-table-wrap" style={{ marginTop: "12px", maxHeight: "180px" }}>
                <table className="af-history-table">
                  <thead>
                    <tr>
                      <th>Empresa (demo)</th>
                      <th>Função (demo)</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Acme Demo Ltda.</td>
                      <td>Staff Engineer</td>
                      <td>A rever</td>
                    </tr>
                    <tr>
                      <td>Contoso Exemplo S.A.</td>
                      <td>Product Engineer</td>
                      <td>Rascunho</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="af-export-hint">
                Na extensão real: exporte o histórico ou o perfil em JSON a partir desta página de opções (separador
                Perfil / Histórico).
              </p>
            </section>
          </div>

          <footer className="af-panel-footer">
            <p className="af-footer-line">
              Os dados permanecem neste browser. <span lang="en">Data stays in this browser.</span>{" "}
              <span lang="en">No backend required.</span>
            </p>
            <div className="af-action-row" style={{ marginTop: "6px" }}>
              <ExtensionButton type="button" className="af-btn-secondary" style={{ width: "100%" }} onClick={downloadDemoJson}>
                Descarregar JSON de exemplo (demo)
              </ExtensionButton>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
