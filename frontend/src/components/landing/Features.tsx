import {
  AudioLines,
  ChartNoAxesCombined,
  Gamepad2,
  MicVocal,
  type LucideIcon,
} from "lucide-react";

import Container from "@/components/common/Container";
import { getLandingCardTone } from "@/components/landing/card-tone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SmartFeature = {
  title: string;
  description: string;
  wowFactor: string;
  icon: LucideIcon;
};

const smartFeatures: SmartFeature[] = [
  {
    title: "Pentaksiran Lisan Autentik (Rakaman Suara)",
    description:
      "Murid boleh membaca dan merakam suara mereka terus ke dalam sistem berdasarkan modul yang disediakan.",
    wowFactor:
      "Ia mentransformasikan pelaksanaan Pentaksiran Bilik Darjah (PBD). Guru tidak lagi terikat dengan kekangan masa di dalam kelas; penilaian sebutan dan kelancaran bacaan murid boleh dibuat secara tak segerak (asynchronous) menggunakan rubrik yang tepat.",
    icon: MicVocal,
  },
  {
    title: "Papan Pemuka Analitik Masa Nyata (Real-Time Dashboard)",
    description:
      "Menjejaki kemajuan setiap murid melalui graf dan peratusan penguasaan kemahiran seperti Suku Kata, Perkataan KVKV dan lain-lain.",
    wowFactor:
      "Bertindak sebagai sistem amaran awal (early warning system). Guru dan pentadbir memperoleh data empirikal yang membantu merancang intervensi secara tepat.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Ekosistem Gamifikasi Pembelajaran (Play-to-Learn)",
    description:
      "Menyediakan cabaran interaktif yang dibina berdasarkan silibus Modul Literasi BIJAK JIP.",
    wowFactor:
      "Ganjaran maya seperti lencana (badges), piala dan animasi interaktif meningkatkan motivasi intrinsik murid sambil mereka dinilai secara berterusan.",
    icon: Gamepad2,
  },
  {
    title: "Modul Pengecaman Bunyi & Fonik Terbina Dalam",
    description:
      "Membekalkan audio sebutan baku bagi setiap huruf dan suku kata apabila butang ditekan.",
    wowFactor:
      "Menjadi guru pembantu maya di rumah. Ibu bapa dapat membimbing anak menggunakan sebutan fonik yang tepat dan konsisten.",
    icon: AudioLines,
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-background">
      <Container className="py-10 md:py-14 lg:py-16">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mb-4 inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            Ciri-ciri Pintar
          </span>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Terokai Ciri-Ciri Pintar
            <span className="block">Digital MAIN-LiT</span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Aplikasi Digital MAIN-LiT direka dengan mengintegrasikan elemen{" "}
            <em>didik hibur</em> dan teknologi analitik termaju bagi membentuk
            ekosistem pembelajaran literasi yang moden, interaktif, dan
            berasaskan data.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:mt-10 md:grid-cols-2 md:gap-6">
          {smartFeatures.map(({ title, description, wowFactor, icon: Icon }, index) => {
            const tone = getLandingCardTone(index);

            return (
              <Card
                key={title}
                size="sm"
                className={`group h-full rounded-2xl bg-card shadow-sm ring-0 transition duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none ${tone.cardClassName}`}
              >
                <CardHeader className="pb-4">
                  <div
                    className={`mb-5 flex size-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none ${tone.iconContainerClassName}`}
                  >
                    <Icon className={`size-7 ${tone.iconClassName}`} aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg font-bold leading-snug sm:text-xl">
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="h-px w-full bg-border/70" aria-hidden="true" />

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Fungsi</p>
                    <CardDescription className="text-sm leading-6 text-muted-foreground sm:text-base">
                      {description}
                    </CardDescription>
                  </div>

                  <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4">
                    <p className="text-sm font-semibold text-primary">Wow Factor!</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                      {wowFactor.includes("(asynchronous)") ? (
                        <>
                          Ia mentransformasikan pelaksanaan Pentaksiran Bilik Darjah (PBD). Guru tidak lagi terikat
                          dengan kekangan masa di dalam kelas; penilaian sebutan dan kelancaran bacaan murid boleh
                          dibuat secara tak segerak (<em>asynchronous</em>) menggunakan rubrik yang tepat.
                        </>
                      ) : wowFactor.includes("(early warning system)") ? (
                        <>
                          Bertindak sebagai sistem amaran awal (<em>early warning system</em>). Guru dan pentadbir
                          memperoleh data empirikal yang membantu merancang intervensi secara tepat.
                        </>
                      ) : wowFactor.includes("(badges)") ? (
                        <>
                          Ganjaran maya seperti lencana (<em>badges</em>), piala dan animasi interaktif meningkatkan
                          motivasi intrinsik murid sambil mereka dinilai secara berterusan.
                        </>
                      ) : (
                        wowFactor
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}