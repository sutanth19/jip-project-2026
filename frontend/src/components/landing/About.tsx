import {
  BookOpen,
  ChartNoAxesCombined,
  School,
  Users,
  type LucideIcon,
} from "lucide-react";

import logoWeb from "@/assets/images/logo_web.svg";
import Container from "@/components/common/Container";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLandingCardTone } from "@/components/landing/card-tone";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const features: Feature[] = [
  {
    title: "Perpustakaan Digital",
    description:
      "Mengurus buku, kategori, peminjaman serta sumber digital secara cekap.",
    icon: BookOpen,
  },
  {
    title: "Kemajuan Bacaan",
    description:
      "Menjejak rekod bacaan, pencapaian dan prestasi literasi murid.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Pengurusan Sekolah",
    description:
      "Menyokong guru dan pentadbir dalam pengurusan buku, laporan serta pentadbiran program.",
    icon: School,
  },
  {
    title: "Penglibatan Ibu Bapa",
    description:
      "Membolehkan ibu bapa memantau aktiviti bacaan dan kemajuan pembelajaran anak-anak.",
    icon: Users,
  },
];

export default function About() {
  return (
    <section id="about" className="bg-muted/30">
      <Container className="pt-8 pb-10 md:pt-10 md:pb-12 lg:pt-12 lg:pb-14">
        <div className="mx-auto max-w-3xl text-center">
          <img
            src={logoWeb}
            alt="Digital MoLIB"
            className="mx-auto mb-4 h-20 w-20 object-contain sm:h-24 sm:w-24 lg:h-28 lg:w-28"
          />
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Mengapa Memilih LITERASI DIGITAL?
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            LITERASI DIGITAL menyediakan platform bersepadu yang membantu sekolah mengurus buku, aktiviti 
            bacaan, kemajuan murid, pertandingan literasi serta pelaporan dengan lebih sistematik, cekap dan mudah diakses.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:mt-10 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
          {features.map(({ title, description, icon: Icon }, index) => {
            const tone = getLandingCardTone(index)

            return (
              <Card
                key={title}
                size="sm"
                className={`h-full rounded-2xl bg-card shadow-sm ring-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${tone.cardClassName}`}
              >
                <CardHeader className="pb-3">
                  <div
                    className={`mb-4 flex size-12 items-center justify-center rounded-xl ${tone.iconContainerClassName}`}
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
