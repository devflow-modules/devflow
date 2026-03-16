import { cn } from "./lib/cn";

type SectionHeaderProps = {
  title: string;
  description?: string;
  className?: string;
  id?: string;
};

export function SectionHeader({
  title,
  description,
  className,
  id,
}: SectionHeaderProps) {
  return (
    <div
      className={cn("mx-auto max-w-2xl text-center", className)}
      id={id}
    >
      <div
        className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary"
        aria-hidden
      />
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-slate-600">{description}</p>
      )}
    </div>
  );
}
