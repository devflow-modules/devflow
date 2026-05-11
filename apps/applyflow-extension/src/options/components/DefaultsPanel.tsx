export function DefaultsPanel() {
  return (
    <section className="af-card af-opt-privacy-card" aria-labelledby="af-opt-privacy-heading">
      <p id="af-opt-privacy-heading" className="af-opt-section-kicker">
        Privacidade e armazenamento
      </p>
      <h2 className="af-opt-section-title">Dados ficam neste navegador</h2>
      <ul className="af-opt-privacy-list">
        <li>
          <strong>Perfil</strong> guardado em <code className="af-opt-code">chrome.storage.local</code> — sem servidor
          ApplyFlow neste fluxo.
        </li>
        <li>
          <strong>Export / import JSON</strong> só para cópias de segurança <em>suas</em>, no dispositivo.
        </li>
        <li>
          <strong>IA</strong> apenas se activar nas opções (opt-in); não há OpenAI obrigatória para o núcleo de sugestões.
        </li>
        <li>
          <strong>Nenhuma candidatura</strong> é enviada ou preenchida automaticamente no LinkedIn — o painel é assistido;
          o submit é sempre manual no site oficial.
        </li>
      </ul>
      <p className="af-opt-privacy-foot">
        Informação orientada a candidaturas Easy Apply. O painel reconcilia o perfil quando o modal muda ou quando
        altera o perfil noutro separador e o storage notifica o content script.
      </p>
    </section>
  );
}
