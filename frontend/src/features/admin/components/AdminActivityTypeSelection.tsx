import { ArrowLeft, Info, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState, ManagementPageLayout } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  activityTypeToneClasses,
  adminActivityTypeOptions,
  type AdminActivityTypeOption,
} from "@/features/admin/utils/admin-activity-type";
import { cn } from "@/lib/utils";

const backAction = (
  <Button
    asChild
    variant="outline"
    className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto"
  >
    <Link to="/admin/aktiviti">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Kembali ke Pengurusan Aktiviti
    </Link>
  </Button>
);

function ActivityCategoryCard({ option }: { option: AdminActivityTypeOption }) {
  const Icon = option.icon;
  const tone = activityTypeToneClasses[option.tone];
  const isAvailable = option.status === "AVAILABLE";

  return (
    <Card
      className={cn(
        "h-full rounded-2xl border-border bg-card py-0 shadow-sm transition-colors",
        isAvailable ? "hover:border-primary/25" : "hover:border-border",
      )}
    >
      <CardContent className="flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl border", tone.icon)}>
            <Icon className="size-5" aria-hidden="true" />
          </div>
          {option.status === "COMING_SOON" ? (
            <Badge
              variant="outline"
              className="border-border bg-muted text-muted-foreground"
              aria-label={`${option.title} akan datang dan belum tersedia`}
            >
              Akan Datang
            </Badge>
          ) : null}
        </div>

        <div className="mt-5 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{option.title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{option.description}</p>
        </div>

        <div className="mt-auto pt-6">
          {isAvailable && option.destination ? (
            <Button
              asChild
              className={cn("h-11 w-full rounded-xl px-5 font-semibold shadow-sm", tone.button)}
            >
              <Link to={option.destination}>{option.buttonLabel}</Link>
            </Button>
          ) : (
            <Button
              type="button"
              disabled
              variant="outline"
              className="h-11 w-full rounded-xl px-5 font-semibold"
              aria-describedby={`${option.key.toLowerCase()}-unavailable-note`}
            >
              {option.buttonLabel}
            </Button>
          )}
        </div>

        {!isAvailable ? (
          <p id={`${option.key.toLowerCase()}-unavailable-note`} className="sr-only">
            {option.title} belum tersedia dalam fasa ini.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdminActivityTypePage() {
  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Home", to: "/admin" },
        { label: "Aktiviti", to: "/admin/aktiviti" },
        { label: "Pilih Jenis Aktiviti" },
      ]}
      title="Pilih Jenis Aktiviti"
      description="Pilih kategori aktiviti yang ingin dicipta. Setiap kategori menyediakan templat pembelajaran yang berbeza."
      actions={backAction}
    >
      <div className="space-y-6">
        <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
          {adminActivityTypeOptions.map((option) => (
            <ActivityCategoryCard key={option.key} option={option} />
          ))}
        </div>

        <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
          <CardContent className="flex items-start gap-4 p-5 sm:p-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
              <Info className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Tidak pasti pilihan yang sesuai?</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Membaca memfokuskan pengecaman dan bacaan, manakala Menulis memfokuskan pembinaan serta penghasilan perkataan dan ayat.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ManagementPageLayout>
  );
}

export function AdminActivityGalleryPlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Home", to: "/admin" },
        { label: "Aktiviti", to: "/admin/aktiviti" },
        { label: "Pilih Jenis Aktiviti", to: "/admin/aktiviti/cipta" },
        { label: title },
      ]}
      title={title}
      description={description}
      actions={(
        <Button
          asChild
          variant="outline"
          className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto"
        >
          <Link to="/admin/aktiviti/cipta">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali
          </Link>
        </Button>
      )}
    >
      <EmptyState
        icon={<Icon className="size-5" aria-hidden="true" />}
        title={title}
        description={description}
        action={(
          <Button asChild variant="outline" className="h-11 rounded-xl px-5">
            <Link to="/admin/aktiviti/cipta">Kembali</Link>
          </Button>
        )}
      />
    </ManagementPageLayout>
  );
}
