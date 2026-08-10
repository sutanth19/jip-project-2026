import { LoaderCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";

type AdminActivityWizardStepFooterProps = {
  isSaving: boolean;
  canSave: boolean;
  canContinue: boolean;
  onCancel?: () => void;
  onSave: () => void | Promise<void>;
  onContinue: () => void;
  showCancel?: boolean;
};

export function AdminActivityWizardStepFooter({
  isSaving,
  canSave,
  canContinue,
  onCancel,
  onSave,
  onContinue,
  showCancel = true,
}: AdminActivityWizardStepFooterProps) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
      {showCancel ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-xl px-5 font-semibold sm:w-auto"
          onClick={onCancel}
          disabled={isSaving}
        >
          Batal
        </Button>
      ) : null}
      <Button
        type="button"
        variant="success"
        className="h-11 w-full gap-2 rounded-xl px-5 font-semibold focus-visible:ring-primary/30 sm:w-auto"
        onClick={() => {
          void Promise.resolve(onSave()).catch(() => undefined);
        }}
        disabled={!canSave}
      >
        {isSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
        {isSaving ? "Menyimpan..." : "Simpan"}
      </Button>
      <Button
        type="button"
        className="h-11 w-full gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/30 sm:w-auto"
        onClick={onContinue}
        disabled={!canContinue}
      >
        Seterusnya
      </Button>
    </div>
  );
}
