import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      tone: {
        brass: "bg-brass text-ink hover:bg-brass-2",
        quiet: "bg-ink text-cream hover:bg-line",
        ghost: "bg-transparent text-cream hover:bg-ink",
        line: "border border-line bg-transparent text-cream hover:border-brass",
      },
    },
    defaultVariants: { tone: "quiet" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, tone, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ tone }), className)} {...props} />;
}
