import { Link } from "react-router-dom";
import { Mail, Phone, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminAccountStatusBadge } from "./AdminAccountStatusBadge";
import { AdminSetupStatusBadge } from "./AdminSetupStatusBadge";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A";
}

export function AdminAccountMobileCard({
  id,
  path,
  fullName,
  email,
  avatar,
  phone,
  accountStatus,
  setupStatus,
}: {
  id: string;
  path: string;
  fullName: string;
  email: string;
  avatar?: string | null;
  phone?: string | null;
  accountStatus?: string;
  setupStatus?: string;
}) {
  return (
    <article className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="h-14 w-14 rounded-2xl">
          <AvatarImage src={avatar ?? undefined} alt={fullName} />
          <AvatarFallback className="rounded-2xl">{initials(fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{fullName}</h3>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Mail className="size-3.5" />
            <span className="truncate">{email}</span>
          </div>
          {phone ? (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="size-3.5" />
              <span>{phone}</span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <AdminAccountStatusBadge status={accountStatus} />
        <AdminSetupStatusBadge status={setupStatus} />
      </div>
      <div className="mt-4">
        <Button asChild className="w-full" variant="outline">
          <Link to={`${path}/${id}`}>
            <Eye className="size-4" />
            Lihat
          </Link>
        </Button>
      </div>
    </article>
  );
}
