import { EmptyState, PageContainer, SectionCard } from "@/components/shared";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminUnsupportedNotice } from "@/features/admin/components/AdminUnsupportedNotice";
import { unsupportedBackendCapabilities } from "@/features/admin/config";

export function AdminSettingsPage() {
  return (
    <PageContainer>
      <AdminPageHeader title="Tetapan Sistem" description="Hanya tetapan yang disokong API sebenar akan dipaparkan." />
      <SectionCard title="Belum tersedia">
        <EmptyState
          title="Tetapan sistem backend belum tersedia."
          description="Tema, notifikasi dan profil dikendalikan melalui modul sedia ada. Skrin rahsia pelayan tidak dibina."
        />
      </SectionCard>
      <AdminUnsupportedNotice items={unsupportedBackendCapabilities.filter((item) => item.feature === "System settings")} />
    </PageContainer>
  );
}

