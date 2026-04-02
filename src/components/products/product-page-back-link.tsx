import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRODUTOS_HUB_PATH } from "@/lib/devflow-product-catalog";

type ProductPageBackLinkProps = {
  className?: string;
  /** Alinhamento do bloco (hero centralizado vs. conteúdo à esquerda) */
  align?: "start" | "center";
};

export function ProductPageBackLink({ className, align = "start" }: ProductPageBackLinkProps) {
  return (
    <div
      className={cn(
        align === "center" && "flex justify-center",
        className
      )}
    >
      <Link
        href={PRODUTOS_HUB_PATH}
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden />
        Todos os produtos
      </Link>
    </div>
  );
}
