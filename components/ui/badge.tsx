import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary border-primary/20",
        secondary: "bg-secondary/10 text-secondary border-secondary/20",
        success: "bg-green-100 text-green-700 border-green-200",
        warning: "bg-amber-100 text-amber-700 border-amber-200",
        destructive: "bg-red-100 text-red-700 border-red-200",
        outline: "border-border text-muted-foreground bg-transparent",
        waiting: "bg-blue-100 text-blue-700 border-blue-200",
        called: "bg-amber-100 text-amber-700 border-amber-200",
        "in-progress": "bg-purple-100 text-purple-700 border-purple-200",
        completed: "bg-green-100 text-green-700 border-green-200",
        skipped: "bg-gray-100 text-gray-600 border-gray-200",
        cancelled: "bg-red-100 text-red-600 border-red-200",
        "no-show": "bg-orange-100 text-orange-600 border-orange-200",
        active: "bg-green-100 text-green-700 border-green-200",
        scheduled: "bg-blue-100 text-blue-700 border-blue-200",
        paused: "bg-amber-100 text-amber-700 border-amber-200",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            variant === "success" || variant === "completed" || variant === "active" ? "bg-green-500" :
            variant === "warning" || variant === "called" || variant === "paused" ? "bg-amber-500" :
            variant === "destructive" || variant === "cancelled" ? "bg-red-500" :
            variant === "in-progress" ? "bg-purple-500" :
            variant === "waiting" || variant === "scheduled" ? "bg-blue-500" :
            "bg-gray-400"
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
