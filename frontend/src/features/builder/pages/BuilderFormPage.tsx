import { useNavigate, useParams } from "react-router-dom";

import { ErrorState, LoadingState, PageContainer, PageHeader, SectionCard } from "@/components/shared";
import { ActivityWizard } from "@/features/builder/components/ActivityWizard";
import { BuilderForm } from "@/features/builder/components/BuilderForm";
import { getBuilderEntity } from "@/features/builder/config";
import { useBuilderRecord, useCreateBuilderRecord, useUpdateBuilderRecord } from "@/features/builder/hooks/use-builder-records";
import type { BuilderEntityKey } from "@/features/builder/types/builder.types";
import { useToast } from "@/providers/toast-context-value";

export function BuilderFormPage({ entityKey, mode }: { entityKey: BuilderEntityKey; mode: "create" | "edit" }) {
  const config = getBuilderEntity(entityKey);
  const id = useParams().id ?? "";
  const navigate = useNavigate();
  const toast = useToast();
  const detail = useBuilderRecord(config, id);
  const createRecord = useCreateBuilderRecord(config);
  const updateRecord = useUpdateBuilderRecord(config, id);
  const isEdit = mode === "edit";
  const formConfig =
    isEdit && config.editFieldNames
      ? { ...config, fields: config.fields?.filter((field) => config.editFieldNames?.includes(field.name)) }
      : config;

  return (
    <PageContainer>
      <PageHeader title={isEdit ? `Edit ${config.singular}` : `Cipta ${config.singular}`} description="Medan borang dipadankan dengan validator backend sebenar." />
      {entityKey === "digitalActivities" ? (
        <SectionCard title="Wizard Aktiviti">
          <ActivityWizard activeStep={isEdit ? "settings" : "basic"} />
        </SectionCard>
      ) : null}
      {isEdit && detail.isLoading ? <LoadingState /> : null}
      {isEdit && detail.isError ? <ErrorState title="Rekod tidak dapat dimuatkan" /> : null}
      {!formConfig.fields?.length ? (
        <ErrorState title="Borang belum tersedia" description="Backend belum menyokong borang khusus untuk modul ini." />
      ) : !isEdit || detail.data ? (
        <SectionCard title="Maklumat">
          <BuilderForm
            config={formConfig}
            defaultValues={isEdit ? detail.data : undefined}
            submitLabel={isEdit ? "Simpan" : "Cipta"}
            onSubmit={async (values) => {
              if (isEdit) {
                await updateRecord.mutateAsync(values);
                toast.success("Rekod dikemas kini.");
                navigate(`${config.path}/${id}`, { replace: true });
                return;
              }
              await createRecord.mutateAsync(values);
              toast.success("Rekod dicipta.");
              navigate(config.path, { replace: true });
            }}
          />
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
