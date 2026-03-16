import Link from "next/link";
import { cn } from "@/lib/utils";

type PrimaryButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
  icon?: React.ReactNode;
};

export function PrimaryButton({
  href,
  children,
  className,
  external,
  icon,
}: PrimaryButtonProps) {
  const baseClass = cn(
    "inline-flex items-center justify-center gap-2 rounded-lg border border-transparent",
    "bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
    "transition-all duration-200 hover:bg-[#16a34a]",
    className
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClass}
      >
        {children}
        {icon}
      </a>
    );
  }

  return (
    <Link href={href} className={baseClass}>
      {children}
      {icon}
    </Link>
  );
}
