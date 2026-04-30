import Link from "next/link";
import { cn } from "@/lib/utils";

type SecondaryButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
};

export function SecondaryButton({
  href,
  children,
  className,
  icon,
}: SecondaryButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] px-4 py-2.5 text-sm font-semibold",
        "bg-card text-foreground transition-colors hover:bg-[#f1f5f9]",
        className
      )}
    >
      {children}
      {icon}
    </Link>
  );
}
