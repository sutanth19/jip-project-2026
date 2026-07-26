import { Link } from "react-router-dom";

import { ArrowLeft, ShieldAlert } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6">
      <Card className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="items-center space-y-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <ShieldAlert className="size-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Lupa kata laluan?
          </CardTitle>
          <CardDescription className="text-sm leading-6 text-muted-foreground sm:text-base">
            Fungsi tetapan semula kata laluan akan disambungkan pada langkah
            integrasi seterusnya.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Sila hubungi pentadbir sekolah atau kembali ke halaman log masuk
            sementara aliran pengesahan disediakan.
          </p>

          <Link
            to="/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali ke log masuk
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
