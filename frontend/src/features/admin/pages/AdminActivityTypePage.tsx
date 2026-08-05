import { PageContainer } from "@/components/shared";
import { AdminActivityTypePage as AdminActivityTypeView } from "@/features/admin/components/AdminActivityTypeSelection";

export function AdminActivityTypePage() {
  return (
    <PageContainer className="px-0 py-0 sm:px-0 sm:py-0 lg:px-0 lg:py-0">
      <AdminActivityTypeView />
    </PageContainer>
  );
}
