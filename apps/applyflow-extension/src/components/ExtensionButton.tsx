import type { ButtonHTMLAttributes, ReactElement } from "react";

/**
 * Canonical native `<button>` for the ApplyFlow Chrome extension (MV3).
 * Options/panel surfaces style via CSS classes (`af-opt-btn-*`, `af-tab`, `af-btn-*`).
 */
export function ExtensionButton(props: ButtonHTMLAttributes<HTMLButtonElement>): ReactElement {
  const { type = "button", ...rest } = props;
  return <button type={type} {...rest} />;
}
