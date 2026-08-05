import {
  BarChart3,
  Bell,
  CalendarDays,
  LayoutDashboard,
  Library,
  RefreshCw,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import Container from "@/components/common/Container";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLandingCardTone } from "@/components/landing/card-tone";

type PlatformFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const platformFeatures: PlatformFeature[] = [
  {
    title: "Katalog Buku Digital",
    description: "Mengurus koleksi buku fizikal dan buku digital dengan sistematik.",
    icon: Library,
  },
  {
    title: "Pengurusan Peminjaman",
    description: "Mengurus rekod peminjaman, pemulangan dan buku yang lewat dipulangkan dengan mudah.",
    icon: RefreshCw,
  },
  {
    title: "Kemajuan Bacaan",
    description: "Memantau pencapaian bacaan murid serta perkembangan literasi mereka.",
    icon: TrendingUp,
  },
  {
    title: "Program Literasi",
    description: "Mengurus dan menyelaras program literasi, kempen membaca serta aktiviti galakan membaca.",
    icon: CalendarDays,
  },
  {
    title: "Papan Pemuka Guru",
    description:
      "Membantu guru mengurus murid, buku dan program literasi dengan lebih cekap.",
    icon: LayoutDashboard,
  },
  {
    title: "Portal Ibu Bapa",
    description: "Membolehkan ibu bapa memantau aktiviti bacaan dan kemajuan pembelajaran anak-anak.",
    icon: Users,
  },
  {
    title: "Laporan & Analitik",
    description: "Menjana laporan literasi dan perpustakaan yang terperinci untuk pemantauan serta analisis.",
    icon: BarChart3,
  },
  {
    title: "Pemberitahuan",
    description:
      "Menghantar peringatan berkaitan peminjaman buku, program literasi dan aktiviti bacaan.",
    icon: Bell,
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-background">
      <Container className="py-10 md:py-14 lg:py-16">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mb-4 inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            Ciri-ciri Platform
          </span>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Semua Keperluan Pengurusan Literasi Sekolah dalam Satu Platform
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            LITERASI DIGITAL menggabungkan pengurusan perpustakaan, program literasi, pemantauan kemajuan murid serta pelaporan 
            dalam satu sistem bersepadu yang direka khas untuk sekolah moden.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:mt-10 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
          {platformFeatures.map(({ title, description, icon: Icon }, index) => {
            const tone = getLandingCardTone(index)

            return (
              <Card
                key={title}
                size="sm"
                className={`group h-full rounded-2xl bg-card shadow-sm ring-0 transition duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none ${tone.cardClassName}`}
              >
                <CardHeader className="pb-3">
                  <div
                    className={`mb-4 flex size-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none ${tone.iconContainerClassName}`}
                  >
                    <Icon className={`size-6 ${tone.iconClassName}`} aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg font-semibold leading-snug sm:text-xl">
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-6 text-muted-foreground sm:text-base">
                    {description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </Container>
    </section>
  );
}
