/** Botão único DevFlow nesta app — mesmo contrato da lib `@devflow/ui` (`df-btn-*`). */
export {
  Button,
  buttonVariants,
  buttonClassName,
  buttonVariantClasses,
} from "@devflow/ui";

export type {
  ButtonProps,
  ButtonVariantPublic,
  ButtonClassNameVariant,
  ButtonSize,
  DevFlowButtonVariant,
  LegacyVariant,
  UiButtonVariant,
} from "@devflow/ui";

/** Alias utilizado pelo shell / inbox antes da convergência. */
export type ButtonVariant = import("@devflow/ui").ButtonClassNameVariant;
