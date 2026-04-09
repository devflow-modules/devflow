import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
};

const surface = { sm: "df-card-sm", md: "df-card", lg: "df-card-lg" };

export function Card({ children, className = "", padding = "md" }: Props) {
  return (
    <div className={`${surface[padding]} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="df-text-section-title">{title}</h2>
      {description ? <p className="df-text-muted mt-2">{description}</p> : null}
    </div>
  );
}
