import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type DeleteDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteDialog({
  open,
  title = "Padam rekod?",
  description = "Tindakan ini tidak boleh dibuat asal.",
  loading,
  onOpenChange,
  onConfirm,
}: DeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel={loading ? "Memadam..." : "Padam"}
      variant="destructive"
      isLoading={loading}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}
