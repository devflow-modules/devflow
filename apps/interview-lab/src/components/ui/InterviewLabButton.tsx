import type { ButtonHTMLAttributes, ReactElement } from "react";

/**
 * Canonical native `<button>` for Interview Lab.
 * Feature surfaces style via Tailwind utility classes.
 */
export function InterviewLabButton(props: ButtonHTMLAttributes<HTMLButtonElement>): ReactElement {
  const { type = "button", ...rest } = props;
  return <button type={type} {...rest} />;
}
