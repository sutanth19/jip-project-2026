import { CheckCircle2 } from "lucide-react";

import { activityWizardSteps } from "@/features/builder/config";

export function ActivityWizard({ activeStep = "basic" }: { activeStep?: string }) {
  return (
    <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" aria-label="Activity builder wizard">
      {activityWizardSteps.map((step, index) => {
        const active = step.id === activeStep;
        return (
          <li key={step.id} className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
              {active ? <CheckCircle2 className="size-4 text-primary" aria-hidden="true" /> : null}
            </div>
            <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
          </li>
        );
      })}
    </ol>
  );
}

