import "../styles/globals.css";
import "./options.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OptionsApp } from "./App";

const mount = document.getElementById("root");
if (!mount) {
  throw new Error("ApplyFlow options: elemento #root em falta.");
}

createRoot(mount).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>,
);
