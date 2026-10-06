/**
 * Local-only Easy Apply–shaped fixture for extension assistance E2E.
 * No real employer submission. Do not use with production LinkedIn accounts.
 */
export default function ExtensionFixturePage() {
  return (
    <main
      style={{
        fontFamily: "Segoe UI, system-ui, sans-serif",
        maxWidth: 720,
        margin: "40px auto",
        padding: 24,
      }}
    >
      <h1>ApplyFlow — fixture local de assistência</h1>
      <p>
        Página de teste em <code>127.0.0.1</code>. Não envia candidatura. Abrir com a extensão local carregada.
      </p>
      <article className="jobs-easy-apply-modal" data-test-modal="jobs-easy-apply-modal" aria-label="Easy Apply fixture">
        <header>
          <h2>Software Engineer (fixture)</h2>
          <p>Acme Fixture Corp · Remote</p>
        </header>
        <form className="jobs-easy-apply-content" action="#">
          <div className="jobs-easy-apply-form-element">
            <label className="jobs-easy-apply-form-element__label" htmlFor="fixture-years">
              Years of experience with TypeScript
            </label>
            <input id="fixture-years" name="years" type="number" defaultValue="" />
          </div>
          <div className="jobs-easy-apply-form-element">
            <label className="jobs-easy-apply-form-element__label" htmlFor="fixture-city">
              City
            </label>
            <input id="fixture-city" name="city" type="text" defaultValue="" />
          </div>
          <div className="jobs-easy-apply-form-element">
            <label className="jobs-easy-apply-form-element__label" htmlFor="fixture-about">
              Tell us about yourself
            </label>
            <textarea id="fixture-about" name="about" rows={4} defaultValue="" />
          </div>
          <button type="button" disabled title="Submit permanece bloqueado nesta fixture">
            Submit (disabled — ApplyFlow never clicks this)
          </button>
        </form>
      </article>
    </main>
  );
}
