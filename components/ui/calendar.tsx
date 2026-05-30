"use client";

/**
 * Composant Calendar (pattern Shadcn) — wrapper de `react-day-picker` (story 7.2).
 *
 * Reprend l'esprit du composant officiel Shadcn :
 * - boutons de navigation reposant sur `Button` (variant `ghost`),
 * - classes typées par le design system (`bg-accent`, `text-primary`, etc.),
 * - taille de jour ≥ 36px (`size-9`) pour rester confortable au pouce (a11y 44px
 *   couvert par le padding cliquable et le `focus-visible`).
 *
 * @module components/ui/calendar
 */

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1 absolute right-1 top-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-accent",
          "[&:has([aria-selected].range_start)]:rounded-l-md",
          "[&:has([aria-selected].range_end)]:rounded-r-md",
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal aria-selected:opacity-100",
        ),
        range_start:
          "range_start aria-selected:bg-primary aria-selected:text-primary-foreground rounded-l-md",
        range_end:
          "range_end aria-selected:bg-primary aria-selected:text-primary-foreground rounded-r-md",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...iconProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...iconProps} />
          ) : (
            <ChevronRight className="size-4" {...iconProps} />
          ),
      }}
      {...props}
    />
  );
}
