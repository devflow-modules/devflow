"use client";

import { ListOrdered, Music, FileAudio } from "lucide-react";
import { FUNKLAB_DEMO_SCENARIO } from "@/modules/produto-demos/funklabDemoCopy";
import { trackTryProduct } from "@/lib/analytics";
import { DemoMicroStory } from "@/components/demo/DemoMicroStory";
import {
  demoCardClass,
  demoCtaPrimaryClass,
  demoCtaSecondaryClass,
  demoEyebrowClass,
  demoSectionMutedClass,
} from "@/components/demo/demoUi";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FunklabDemoCta } from "./FunklabDemoCta";

const DEMO_HREF =
  process.env.NEXT_PUBLIC_FUNKLAB_DEMO_URL || "https://funklab-studio.vercel.app";

export function FunklabDemoSection() {
  return (
    <section
      className={demoSectionMutedClass}
      aria-labelledby="funklab-demo-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className={cn(demoEyebrowClass, "mx-auto")}>
            <Music className="size-3.5 text-primary" aria-hidden />
            Demo guiada
          </div>
          <h2
            id="funklab-demo-heading"
            className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Entenda em 30 segundos o que o FunkLab entrega
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Mesma linguagem das outras demos DevFlow: problema, fluxo, resultado e próximo passo —
            antes de abrir a DAW.
          </p>
        </div>

        <DemoMicroStory variant="funklab" className="mx-auto mt-8 max-w-5xl sm:mt-10" />

        <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-2">
          <article className={cn(demoCardClass(), "text-left")}>
            <div className="flex items-center gap-2 text-primary">
              <ListOrdered className="size-5 shrink-0" aria-hidden />
              <span className="text-sm font-semibold">Cenário</span>
            </div>
            <h3 className="mt-3 text-base font-semibold text-foreground sm:text-lg">
              {FUNKLAB_DEMO_SCENARIO.title}
            </h3>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              {FUNKLAB_DEMO_SCENARIO.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <FunklabDemoCta
              href={DEMO_HREF}
              surface="demo_section"
              className={cn(demoCtaPrimaryClass, "mt-6 w-full sm:w-auto")}
            >
              <Music className="size-4" aria-hidden />
              Abrir demo ao vivo
            </FunklabDemoCta>
          </article>

          <article className={cn(demoCardClass(), "text-left")}>
            <div className="flex items-center gap-2 text-primary">
              <FileAudio className="size-5 shrink-0" aria-hidden />
              <span className="text-sm font-semibold">{FUNKLAB_DEMO_SCENARIO.outputTitle}</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground" role="list">
              {FUNKLAB_DEMO_SCENARIO.outputs.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-foreground" aria-hidden>
                    ·
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-4 font-mono text-xs text-foreground">
              <p className="font-sans text-xs font-medium text-muted-foreground">
                Exemplo de arquivos gerados
              </p>
              <p className="mt-2 space-y-1">
                <span className="block">mandelao_130_sketch_01_kick.mid</span>
                <span className="block">mandelao_130_sketch_01_snare.mid</span>
                <span className="block">mandelao_130_sketch_01_bass.mid</span>
              </p>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{FUNKLAB_DEMO_SCENARIO.footnote}</p>
            <Button
              type="button"
              variant="secondary"
              className={cn(demoCtaSecondaryClass, "mt-4 w-full sm:w-auto")}
              onClick={() => {
                trackTryProduct({
                  product: "funklab",
                  surface: "demo_section_secondary_open",
                  destination: DEMO_HREF,
                  cta_variant: "secondary",
                });
                window.open(DEMO_HREF, "_blank", "noopener,noreferrer");
              }}
            >
              Testar na nova aba
            </Button>
          </article>
        </div>
      </div>
    </section>
  );
}
