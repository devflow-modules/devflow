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
        "df-btn-secondary rounded-lg px-4 py-2.5 font-semibold",
        className
      )}
    >
      {children}
      {icon}
    </Link>
  );
}
