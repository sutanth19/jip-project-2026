import {
  BookOpenCheck,
  BriefcaseBusiness,
  ChartColumnBig,
  Telescope,
  type LucideIcon,
} from "lucide-react";

import logoWeb from "@/assets/images/logo_web.svg";
import Container from "@/components/common/Container";
import { getLandingCardTone } from "@/components/landing/card-tone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Phase = {
  badge: string;
  month: string;
  title: string;
  description: string[];
  icon: LucideIcon;
};

const phases: Phase[] = [
  {
    badge: "Fasa 1",
    month: "Mac - Jun",
    title: "Perancangan & Pembinaan Aplikasi",
    description: [
      "Pada fasa awal ini, sekolah-sekolah sasaran dikenal pasti seiring dengan keperluan intervensi literasi setempat.Sesi suai kenal dan kolaboratif erat antara pensyarah IPGKDA, siswa guru, dan pihak sekolah diadakan. Melalui sinergi ini, pembinaan modul Pengajaran dan Pembelajaran (PdP) serta kerangka projek inovasi mula direka bentuk oleh pensyarah IPGKDA untuk dipetakan ke dalam bentuk aplikasi digital. Pendekatan berstruktur ini bermula daripada pengenalan huruf vokal, suku kata KV, sehinggalah kepada pembinaan ayat mudah mula disepadukan sebagai nadi utama sistem",
    ],
    icon: BookOpenCheck,
  },
  {
    badge: "Fasa 2",
    month: "Julai - Ogos",
    title: "Pelaksanaan Lapangan II",
    description: [
      "Beralih ke fasa kedua, aplikasi DIGITAL MAIN-LiT mula diaplikasikan secara praktikal dalam sesi PdP di bilik darjah melalui kaedah pengajaran berpasukan (Co-teaching) antara siswa guru dan guru sekolah. Inovasi digital dan pedagogi ini diuji kebolehlaksanaannya dan disokong dengan penganjuran bengkel pedagogi kepada siswa guru dan guru pemulihan sekolah bagi memastikan kelancaran ekosistem pembelajaran ini di sekolah",
      
    ],
    icon: BriefcaseBusiness,
  },
  {
    badge: "Fasa 3",
    month: "September - Oktober",
    title: "Pemantauan & Pementoran",
    description: [
      "Dalam usaha memastikan kelestarian impak aplikasi, sesi refleksi dan pencerapan klinikal dijalankan secara berterusan oleh barisan pensyarah. Fasa ini amat kritikal dalam memfokuskan pelaksanaan Komuniti Pembelajaran Profesional (PLC) antara warga IPG dan sekolah, sekaligus membolehkan penilaian impak secara langsung dibuat terhadap pencapaian tahap literasi murid dan peningkatan kompetensi guru. ",
    ],
    icon: Telescope,
  },
  {
    badge: "Fasa 4",
    month: "Selepas Oktober",
    title: "Penilaian & Penambahbaikan",
    description: [
      "Fasa terakhir ini melibatkan pengumpulan data empirikal di lapangan bagi tujuan penyelidikan tindakan (action research). Segala maklum balas dan data prestasi murid yang direkodkan dalam sistem didokumentasikan sebagai laporan keberkesanan program. Cadangan penambahbaikan yang diperoleh kemudiannya digunakan untuk memurnikan lagi ciri-ciri aplikasi Digital MAIN-LiT bagi kitaran pelaksanaan pada masa akan datang.",
    ],
    icon: ChartColumnBig,
  },
];

export default function About() {
  return (
    <section id="about" className="bg-muted/30">
      <Container className="pt-8 pb-10 md:pt-10 md:pb-12 lg:pt-12 lg:pb-14">
        <div className="mx-auto max-w-5xl text-center">
          <img
            src={logoWeb}
            alt="DIGITAL MAIN-LiT"
            className="mx-auto mb-0 h-40 w-40 object-contain sm:h-48 sm:w-48 lg:h-56 lg:w-56"
          />
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Tentang DIGITAL MAIN-LiT:
            <span className="block">Merangka Masa Depan Literasi</span>
          </h2>
          <div className="mx-auto mt-5 max-w-4xl space-y-4 text-left text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            <p>
              Aplikasi DIGITAL MAIN-LiT bukanlah sekadar sebuah platform digital biasa, sebaliknya ia
              merupakan terjemahan inovasi pedagogi yang lahir daripada perancangan strategik Program
              Salur Sekolah Pengajar (PSSP), Jabatan Ilmu Pendidikan (JIP) di bawah inisiatif Institut Pendidikan Guru Kampus Darulaman.
              Ia dibangunkan untuk bertindak sebagai &quot;makmal pembelajaran&quot; yang
              mengintegrasikan teori pendidikan dengan amalan sebenar di bilik darjah bagi melonjakkan
              kualiti pembelajaran murid.
            </p>
            <p>
              Sejajar dengan buku panduan pengajaran dan pembelajaran Bahasa Melayu Program Pemulihan Khas, 
              pembangunan aplikasi ini dirangka secara berfasa bagi memastikan matlamat
              utama iaitu &quot;Tiada Murid Yang Tertinggal&quot; dalam penguasaan asas 4M (Membaca,
              Menulis, Mengira, dan Manusiawi) tercapai dengan cemerlang.
            </p>
            <p>
              Berikut adalah kronologi bagaimana ekosistem interaktif DIGITAL MAIN-LiT ini dibangunkan
              dan dilaksanakan.
            </p>
          </div>
        </div>

        <div className="mt-12 md:mt-14">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-border bg-background/80 px-5 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-foreground shadow-sm sm:text-sm">
              Perjalanan DIGITAL MAIN-LiT
            </span>
          </div>

          <div className="relative mx-auto mt-8 hidden max-w-6xl lg:block">
            <div className="absolute left-0 right-0 top-11 h-px border-t border-dashed border-border/80" aria-hidden="true" />
            <div className="grid grid-cols-4 gap-6">
              {phases.map(({ badge }, index) => {
                const tone = getLandingCardTone(index);
                const stepNumber = String(index + 1).padStart(2, "0");

                return (
                  <div key={`${badge}-milestone`} className="flex flex-col items-center text-center">
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-full border bg-background text-2xl font-bold shadow-sm ${tone.cardClassName}`}
                    >
                      {stepNumber}
                    </div>
                    <div className={`mt-3 h-5 w-5 rounded-full border-4 border-background shadow-sm ${tone.iconContainerClassName}`} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-4 xl:gap-7">
            {phases.map(({ badge, month, title, description, icon: Icon }, index) => {
              const tone = getLandingCardTone(index);
              const stepNumber = String(index + 1).padStart(2, "0");

              return (
                <Card
                  key={badge}
                  size="sm"
                  className={`relative h-full rounded-2xl bg-card shadow-sm ring-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${tone.cardClassName}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-col items-center text-center">
                      <div
                        className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full border bg-background text-sm font-bold shadow-sm lg:hidden ${tone.cardClassName}`}
                      >
                        {stepNumber}
                      </div>
                      <div
                        className={`flex size-12 items-center justify-center rounded-xl shadow-sm ${tone.iconContainerClassName}`}
                      >
                        <Icon className={`size-6 ${tone.iconClassName}`} aria-hidden="true" />
                      </div>
                      <div className="mt-4 flex min-w-0 flex-1 flex-col items-center">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap lg:gap-1.5 xl:gap-2">
                          <span className="inline-flex whitespace-nowrap rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                            {badge}
                          </span>
                          <Separator
                            orientation="vertical"
                            decorative
                            className="h-4 bg-border/70"
                          />
                          <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${tone.monthBadgeClassName}`}>
                            {month}
                          </span>
                        </div>
                        <CardTitle className="pt-4 text-center text-lg font-semibold leading-snug sm:text-xl">
                          {title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="space-y-3 text-sm leading-6 text-muted-foreground sm:text-base">
                      {description.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
