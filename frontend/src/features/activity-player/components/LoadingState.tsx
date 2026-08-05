import { Skeleton } from "@/components/ui/skeleton"

export function ActivityLoadingState() {
  return <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6"><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-24 w-full rounded-2xl" /><Skeleton className="h-72 w-full rounded-2xl" /><div className="flex justify-between"><Skeleton className="h-11 w-28" /><Skeleton className="h-11 w-28" /></div></main>
}
