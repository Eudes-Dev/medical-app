import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton";

export default function CalendarLoading() {
  return (
    <div className="p-4 md:p-6">
      <CalendarSkeleton />
    </div>
  );
}
