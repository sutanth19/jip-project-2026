import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminAccountStatusBadge } from "./AdminAccountStatusBadge";
import { AdminSetupStatusBadge } from "./AdminSetupStatusBadge";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
}

export function AdminAccountSummary({
  fullName,
  email,
  avatar,
  accountStatus,
  setupStatus,
  isFirstLogin,
}: {
  fullName: string;
  email: string;
  avatar?: string | null;
  accountStatus?: string;
  setupStatus?: string;
  isFirstLogin?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center">
      <Avatar className="h-20 w-20 rounded-2xl">
        <AvatarImage src={avatar ?? undefined} alt={fullName} />
        <AvatarFallback className="rounded-2xl text-lg font-semibold">{initials(fullName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <h1 className="truncate text-2xl font-semibold text-foreground">{fullName}</h1>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminAccountStatusBadge status={accountStatus} />
          <AdminSetupStatusBadge status={setupStatus} />
          {isFirstLogin ? <span className="rounded-full border px-3 py-1 text-xs font-medium">Log masuk pertama</span> : null}
        </div>
      </div>
    </div>
  );
}
