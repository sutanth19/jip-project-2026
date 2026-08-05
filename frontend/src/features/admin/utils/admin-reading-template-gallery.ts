import { BookOpen, Layers3, MousePointer2, Puzzle, type LucideIcon } from "lucide-react";

export type ReadingTemplateSource = "SYSTEM_TEMPLATE";
export type ReadingTemplateInteraction = "DRAG_DROP";
export type ReadingTemplateStatus = "AVAILABLE" | "COMING_SOON";

export type ReadingTemplateCard = {
  key: string;
  title: string;
  description: string;
  status: ReadingTemplateStatus;
  interactionLabel: string;
  sourceLabel?: string;
  templateCode?: string;
  rendererKey?: string;
  destination?: string;
  icon: LucideIcon;
};

export type ReadingTemplateGalleryFilters = {
  search: string;
  interaction: "all" | ReadingTemplateInteraction;
  source: "all" | ReadingTemplateSource;
};

export const defaultReadingTemplateGalleryFilters: ReadingTemplateGalleryFilters = {
  search: "",
  interaction: "all",
  source: "all",
};

export const availableReadingTemplates: ReadingTemplateCard[] = [
  {
    key: "seret-suku-kata",
    title: "Seret Suku Kata",
    description: "Lengkapkan perkataan dengan menyeret suku kata yang betul ke ruang jawapan.",
    status: "AVAILABLE",
    interactionLabel: "Seret dan Lepas",
    sourceLabel: "Templat Sistem",
    templateCode: "ARRANGE_SYLLABLES",
    rendererKey: "arrange-syllables",
    destination: "/admin/aktiviti/cipta/membaca/seret-suku-kata",
    icon: MousePointer2,
  },
];

export const roadmapReadingTemplates: ReadingTemplateCard[] = [
  {
    key: "baca-perkataan",
    title: "Baca Perkataan",
    description: "Latihan bacaan perkataan berpandu akan disediakan dalam fasa seterusnya.",
    status: "COMING_SOON",
    interactionLabel: "Bacaan Berpandu",
    icon: BookOpen,
  },
  {
    key: "padankan-bunyi",
    title: "Padankan Bunyi",
    description: "Aktiviti memadankan bunyi dengan huruf atau suku kata akan datang.",
    status: "COMING_SOON",
    interactionLabel: "Padanan",
    icon: Puzzle,
  },
  {
    key: "susun-perkataan",
    title: "Susun Perkataan",
    description: "Templat membina ayat mudah daripada perkataan akan disediakan kemudian.",
    status: "COMING_SOON",
    interactionLabel: "Susunan",
    icon: Layers3,
  },
];

export function filterReadingTemplates(
  templates: ReadingTemplateCard[],
  filters: ReadingTemplateGalleryFilters,
): ReadingTemplateCard[] {
  const search = filters.search.trim().toLocaleLowerCase("ms-MY");

  return templates.filter((template) => {
    const matchesSearch = search.length === 0
      || template.title.toLocaleLowerCase("ms-MY").includes(search)
      || template.description.toLocaleLowerCase("ms-MY").includes(search)
      || template.interactionLabel.toLocaleLowerCase("ms-MY").includes(search);
    const matchesInteraction = filters.interaction === "all" || template.interactionLabel === "Seret dan Lepas";
    const matchesSource = filters.source === "all" || template.sourceLabel === "Templat Sistem";

    return matchesSearch && matchesInteraction && matchesSource;
  });
}

export function hasActiveReadingTemplateFilters(filters: ReadingTemplateGalleryFilters): boolean {
  return filters.search.trim().length > 0
    || filters.interaction !== defaultReadingTemplateGalleryFilters.interaction
    || filters.source !== defaultReadingTemplateGalleryFilters.source;
}
