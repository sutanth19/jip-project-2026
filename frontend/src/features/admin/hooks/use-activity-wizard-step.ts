import * as React from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import type { NavigateFunction } from "react-router-dom";

type UseActivityWizardStepOptions<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>;
  navigate: NavigateFunction;
  cancelDestination: string;
  continueDestination?: string;
  onSave: (values: TValues) => Promise<void>;
  isSaving: boolean;
  isSaved: boolean;
  isReady?: boolean;
  hasHydrated?: boolean;
};

type PendingNavigation = {
  destination: string;
};

export function useActivityWizardStep<TValues extends FieldValues>({
  form,
  navigate,
  cancelDestination,
  continueDestination,
  onSave,
  isSaving,
  isSaved,
  isReady = true,
  hasHydrated = true,
}: UseActivityWizardStepOptions<TValues>) {
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<PendingNavigation | null>(null);

  const isDirty = form.formState.isDirty;
  const canSave = isReady && isDirty && !isSaving;
  const canContinue = Boolean(continueDestination) && isSaved && !isDirty && !isSaving;
  const shouldProtectUnsavedChanges = hasHydrated && isDirty && !isSaving;

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldProtectUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldProtectUnsavedChanges]);

  const requestStepNavigation = React.useCallback((destination: string) => {
    if (shouldProtectUnsavedChanges) {
      setPendingNavigation({ destination });
      setDiscardOpen(true);
      return;
    }

    navigate(destination);
  }, [navigate, shouldProtectUnsavedChanges]);

  const requestCancel = React.useCallback(() => {
    requestStepNavigation(cancelDestination);
  }, [cancelDestination, requestStepNavigation]);

  const confirmDiscard = React.useCallback(() => {
    setDiscardOpen(false);
    navigate(pendingNavigation?.destination ?? cancelDestination);
    setPendingNavigation(null);
  }, [cancelDestination, navigate, pendingNavigation?.destination]);

  const stayOnStep = React.useCallback(() => {
    setDiscardOpen(false);
    setPendingNavigation(null);
  }, []);

  const save = React.useMemo(
    () => form.handleSubmit(async (values) => {
      if (isSaving || !isReady) {
        return;
      }

      await onSave(values);
    }),
    [form, isReady, isSaving, onSave],
  );

  const continueToNextStep = React.useCallback(() => {
    if (!canContinue || !continueDestination) {
      return;
    }

    navigate(continueDestination);
  }, [canContinue, continueDestination, navigate]);

  return {
    isDirty,
    isSaved,
    isSaving,
    canSave,
    canContinue,
    save,
    continueToNextStep,
    requestCancel,
    requestStepNavigation,
    discardDialog: {
      open: discardOpen,
      onOpenChange: setDiscardOpen,
      onConfirm: confirmDiscard,
      onCancel: stayOnStep,
    },
  };
}
