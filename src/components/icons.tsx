import { BookOpen } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <BookOpen className="h-6 w-6 text-primary" />
      <h1 className="text-xl font-bold">BookWise</h1>
    </div>
  );
}
