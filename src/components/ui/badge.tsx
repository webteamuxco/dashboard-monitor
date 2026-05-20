import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
  {
    variants: {
      variant: {
        fatal: "border border-level-fatal-border bg-level-fatal-bg text-level-fatal",
        error: "border border-level-error-border bg-level-error-bg text-level-error",
        warning: "border border-level-warning-border bg-level-warning-bg text-level-warning",
        info: "border border-level-info-border bg-level-info-bg text-level-info",
        debug: "border border-level-debug-border bg-level-debug-bg text-level-debug",
        new: "border-0 bg-level-error-bg text-level-fatal text-[9px]",
        muted: "border border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}

export { Badge, badgeVariants };
