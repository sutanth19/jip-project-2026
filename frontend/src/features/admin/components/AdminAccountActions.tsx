import { ArrowLeft, Pencil, RotateCcw, ShieldAlert, ShieldCheck, ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export type AdminLifecycleTarget = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export function AdminAccountActions({
  canResendSetup,
  onLifecycle,
  onResendSetup,
  loading,
  id,
  path,
}: {
  canResendSetup: boolean;
  onLifecycle: (status: AdminLifecycleTarget) => void;
  onResendSetup: () => void;
  loading?: boolean;
  id: string;
  path: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline">
        <Link to={`${path}/${id}/edit`}>
          <Pencil className="size-4" />
          Kemas Kini
        </Link>
      </Button>
      {canResendSetup ? (
        <Button type="button" variant="outline" onClick={onResendSetup} disabled={loading}>
          <RotateCcw className="size-4" />
          Hantar Semula Setup
        </Button>
      ) : null}
      <Button type="button" variant="outline" onClick={() => onLifecycle("ACTIVE")} disabled={loading}>
        <ShieldCheck className="size-4" />
        Aktifkan
      </Button>
      <Button type="button" variant="outline" onClick={() => onLifecycle("SUSPENDED")} disabled={loading}>
        <ShieldAlert className="size-4" />
        Gantungkan
      </Button>
      <Button type="button" variant="destructive" onClick={() => onLifecycle("ARCHIVED")} disabled={loading}>
        <ShieldOff className="size-4" />
        Arkibkan
      </Button>
      <Button asChild variant="ghost">
        <Link to={path}>
          <ArrowLeft className="size-4" />
          Kembali
        </Link>
      </Button>
    </div>
  );
}
