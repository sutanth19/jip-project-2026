import { File, Image, Music } from "lucide-react";

export function MediaPreviewCard({ label, mimeType }: { label: string; mimeType?: string }) {
  const Icon = mimeType?.startsWith("image/")
    ? Image
    : mimeType?.startsWith("audio/")
      ? Music
      : File;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{mimeType ?? "Media"}</p>
      </div>
    </div>
  );
}

