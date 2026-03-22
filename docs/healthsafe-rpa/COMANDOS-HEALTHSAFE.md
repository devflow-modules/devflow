# Gerar PDF para o gestor — no projeto HealthSafe

Execute estes passos **no repositório HealthSafe**, não no DevFlow.

---

## 1. Instalar dependência

```bash
pnpm add -D md-to-pdf
```

---

## 2. Script de geração

Crie no HealthSafe o arquivo **`scripts/generate-pdf-gestor.mjs`** com o conteúdo abaixo (ajuste o caminho do `.md` se a estrutura de pastas for diferente):

```javascript
#!/usr/bin/env node
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { mdToPdf } = require("md-to-pdf");
const { existsSync } = await import("fs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
// Ajuste o caminho se o .md estiver em outro lugar no HealthSafe
const mdPath = path.join(root, "docs/healthsafe-rpa/SITUACAO-ATUAL-GESTOR.md");
const pdfPath = path.join(path.dirname(mdPath), "SITUACAO-ATUAL-GESTOR.pdf");

const launchOptions = { args: ["--no-sandbox", "--disable-setuid-sandbox"] };
if (existsSync("/usr/bin/google-chrome")) {
  launchOptions.executablePath = "/usr/bin/google-chrome";
}

const result = await mdToPdf(
  { path: mdPath },
  {
    dest: pdfPath,
    pdf_options: { format: "A4", margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" } },
    launch_options: launchOptions,
  }
);

if (result && existsSync(pdfPath)) {
  console.log("PDF gerado: docs/healthsafe-rpa/SITUACAO-ATUAL-GESTOR.pdf");
} else {
  console.error("Falha ao gerar PDF.");
  process.exit(1);
}
```

---

## 3. Script no package.json (HealthSafe)

Adicione em **package.json** do HealthSafe:

```json
"scripts": {
  "pdf:gestor": "node scripts/generate-pdf-gestor.mjs"
}
```

---

## 4. Gerar o PDF

No repositório HealthSafe:

```bash
pnpm run pdf:gestor
```

ou:

```bash
node scripts/generate-pdf-gestor.mjs
```

O PDF será gerado em `docs/healthsafe-rpa/SITUACAO-ATUAL-GESTOR.pdf` (ou no caminho que você definiu no script). Copie o conteúdo do `SITUACAO-ATUAL-GESTOR.md` do DevFlow para o HealthSafe se ainda não estiver lá.
