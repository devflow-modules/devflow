import { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  rounded?: string;
};

export function Skeleton({ className, rounded = "rounded-2xl", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-muted ${rounded} ${className ?? ""}`.trim()}
      {...props}
    />
  );
}
