import { BookOpen, PencilLine } from "lucide-react";

import { PageContainer } from "@/components/shared";
import { AdminActivityGalleryPlaceholder } from "@/features/admin/components/AdminActivityTypeSelection";

type AdminActivityGalleryPlaceholderPageProps = {
  category: "READING" | "WRITING";
};

const placeholderContent = {
  READING: {
    title: "Galeri Templat Membaca",
    description: "Templat aktiviti Membaca akan disediakan dalam fasa seterusnya.",
    icon: BookOpen,
  },
  WRITING: {
    title: "Galeri Templat Menulis",
    description: "Templat aktiviti Menulis akan disediakan dalam fasa seterusnya.",
    icon: PencilLine,
  },
} as const;

export function AdminActivityGalleryPlaceholderPage({ category }: AdminActivityGalleryPlaceholderPageProps) {
  const content = placeholderContent[category];

  return (
    <PageContainer className="px-0 py-0 sm:px-0 sm:py-0 lg:px-0 lg:py-0">
      <AdminActivityGalleryPlaceholder
        title={content.title}
        description={content.description}
        icon={content.icon}
      />
    </PageContainer>
  );
}
