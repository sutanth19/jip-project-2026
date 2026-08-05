import Container from "@/components/common/Container";
import { CircularTestimonials } from "@/components/ui/circular-testimonials";

import digitalAccessImage from "@/assets/images/digital-access.jpg";
import modulesImage from "@/assets/images/modules.jpg";
import platformImage from "@/assets/images/platform.jpg";
import userRolesImage from "@/assets/images/user-roles.jpg";

const statistics = [
  {
    quote: "Pentadbir, guru, murid dan ibu bapa.",
    name: "4",
    designation: "Peranan Pengguna",
    src: userRolesImage,
  },
  {
    quote:
      "Perpustakaan, peminjaman, kemajuan bacaan, program literasi, laporan, pemberitahuan, pengurusan pengguna dan papan pemuka.",
    name: "8",
    designation: "Modul Utama",
    src: modulesImage,
  },
  {
    quote:
      "Semua pengurusan literasi sekolah diuruskan melalui satu sistem berpusat.",
    name: "1",
    designation: "Platform Bersepadu",
    src: platformImage,
  },
  {
    quote:
      "Pengguna yang diberi kebenaran boleh mengakses platform pada bila-bila masa mengikut keperluan.",
    name: "24/7",
    designation: "Akses Digital",
    src: digitalAccessImage,
  },
];

export default function Statistics() {
  return (
    <section className="overflow-hidden bg-muted/40">
      <Container className="py-10 md:py-14 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            Gambaran Keseluruhan Platform
          </span>

          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Satu Ekosistem Literasi Bersepadu
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            LITERASI DIGITAL menghimpunkan semua aspek penting pengurusan
            literasi sekolah dalam satu platform yang selamat, sistematik dan
            bersepadu.
          </p>
        </div>

        <div className="mt-10 flex justify-center md:mt-14">
          <CircularTestimonials
            testimonials={statistics}
            autoplay
            colors={{
              name: "#2563EB",
              designation: "#1E293B",
              testimony: "#64748B",
              arrowBackground: "#2563EB",
              arrowForeground: "#FFFFFF",
              arrowHoverBackground: "#1D4ED8",
            }}
            fontSizes={{
              name: "3rem",
              designation: "1.25rem",
              quote: "1rem",
            }}
          />
        </div>
      </Container>
    </section>
  );
}