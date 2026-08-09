import Container from "@/components/common/Container";
import { CircularTestimonials } from "@/components/ui/circular-testimonials";

import digitalAccessImage from "@/assets/images/digital-access.jpg";
import modulesImage from "@/assets/images/modules.jpg";
import platformImage from "@/assets/images/platform.jpg";
import userRolesImage from "@/assets/images/user-roles.jpg";

const smartFeatures = [
  {
    quote:
      "Murid boleh membaca dan merakam suara mereka terus ke dalam sistem berdasarkan modul yang disediakan.",
    name: "01",
    designation: "Pentaksiran Lisan Autentik (Rakaman Suara)",
    src: userRolesImage,
    wowFactor: (
      <>
        Ia mentransformasikan pelaksanaan Pentaksiran Bilik Darjah (PBD).
        <br />
        <br />
        Guru tidak lagi terikat dengan kekangan masa di dalam kelas.
        <br />
        <br />
        Penilaian sebutan dan kelancaran bacaan boleh dibuat secara tak
        segerak (<em>asynchronous</em>) menggunakan rubrik yang tepat.
      </>
    ),
  },
  {
    quote:
      "Menjejaki kemajuan setiap murid melalui graf dan peratusan penguasaan kemahiran.",
    name: "02",
    designation: "Papan Pemuka Analitik Masa Nyata",
    src: modulesImage,
    wowFactor: (
      <>
        Bertindak sebagai sistem amaran awal (<em>early warning system</em>).
        <br />
        <br />
        Guru dan pentadbir memperoleh data empirikal untuk merancang
        intervensi yang lebih tepat.
      </>
    ),
  },
  {
    quote:
      "Cabaran interaktif dibina berdasarkan Modul Literasi BIJAK JIP.",
    name: "03",
    designation: "Ekosistem Gamifikasi Pembelajaran",
    src: platformImage,
    wowFactor: (
      <>
        Ganjaran maya seperti lencana (<em>badges</em>), piala, animasi
        interaktif meningkatkan motivasi intrinsik murid.
      </>
    ),
  },
  {
    quote:
      "Menyediakan audio sebutan baku bagi setiap huruf dan suku kata apabila ditekan.",
    name: "04",
    designation: "Modul Pengecaman Bunyi & Fonik Terbina Dalam",
    src: digitalAccessImage,
    wowFactor: (
      <>
        Menjadi guru pembantu maya di rumah.
        <br />
        <br />
        Ibu bapa dapat membimbing anak menggunakan sebutan fonik yang tepat.
      </>
    ),
  },
] as const;

export default function Features() {
  return (
    <section id="features" className="overflow-hidden bg-background">
      <Container className="py-10 md:py-14 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
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

        <div className="features-showcase mt-10 flex justify-center md:mt-14">
          <CircularTestimonials
            testimonials={smartFeatures.map((feature) => ({
              quote: feature.quote,
              name: feature.name,
              designation: feature.designation,
              src: feature.src,
            }))}
            autoplay
            showIndicator
            colors={{
              name: "#2563EB",
              designation: "#0F172A",
              testimony: "#64748B",
              arrowBackground: "#2563EB",
              arrowForeground: "#FFFFFF",
              arrowHoverBackground: "#1D4ED8",
            }}
            fontSizes={{
              name: "3rem",
              designation: "1.75rem",
              quote: "1rem",
            }}
            renderSlideContent={(_, activeIndex) => {
              const activeFeature = smartFeatures[activeIndex];

              return (
                <div className="feature-slide-layout">
                  <div className="feature-main-content space-y-5">
                    <div>
                      <h3 className="text-5xl font-bold leading-none text-primary">
                        {activeFeature.name}
                      </h3>
                      <p className="mt-4 text-2xl font-semibold leading-tight text-foreground">
                        {activeFeature.designation}
                        {activeIndex === 1 ? (
                          <>
                            <br />
                            <em className="text-xl font-medium text-slate-700 dark:text-slate-300">
                              Real-Time Dashboard
                            </em>
                          </>
                        ) : null}
                        {activeIndex === 2 ? (
                          <>
                            <br />
                            <em className="text-xl font-medium text-slate-700 dark:text-slate-300">
                              Play-to-Learn
                            </em>
                          </>
                        ) : null}
                      </p>
                    </div>

                    <div className="h-px w-full bg-border/70" aria-hidden="true" />

                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        Fungsi
                      </p>
                      <p className="text-base leading-7 text-muted-foreground">
                        {activeFeature.quote}
                      </p>
                    </div>
                  </div>

                  <div className="feature-wow-card rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4">
                    <p className="text-sm font-semibold text-primary">
                      Keunikan Aplikasi
                    </p>
                    <div className="mt-2 text-base leading-7 text-muted-foreground">
                      {activeFeature.wowFactor}
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </div>
        <style>{`
          .features-showcase .testimonial-container {
            max-width: 78rem;
            padding-inline: 0;
          }
          .features-showcase .testimonial-grid {
            gap: 1.75rem;
          }
          .features-showcase .testimonial-content {
            gap: 0;
            min-width: 0;
          }
          .features-showcase .feature-slide-layout {
            display: grid;
            gap: 1.5rem;
            min-width: 0;
          }
          .features-showcase .feature-main-content {
            min-width: 0;
          }
          .features-showcase .feature-wow-card {
            align-self: start;
            min-width: 0;
          }
          @media (min-width: 768px) {
            .features-showcase .testimonial-grid {
              grid-template-columns: minmax(0, 1fr);
              gap: 2rem;
            }
            .features-showcase .testimonial-content {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              gap: 0;
            }
            .features-showcase .indicator-row {
              padding-top: 1.5rem;
            }
            .features-showcase .arrow-buttons {
              padding-top: 1.5rem;
            }
          }
          @media (min-width: 1024px) {
            .features-showcase .testimonial-container {
              max-width: 96rem;
            }
            .features-showcase .testimonial-grid {
              grid-template-columns: minmax(420px, 45fr) minmax(652px, 55fr);
              align-items: start;
              gap: 2rem;
            }
            .features-showcase .image-container {
              width: min(100%, 28rem);
              height: 22rem;
              justify-self: center;
              align-self: center;
            }
            .features-showcase .testimonial-content {
              grid-template-columns: minmax(340px, 1fr) minmax(280px, 340px);
              column-gap: 2rem;
              align-items: start;
              min-width: 652px;
            }
            .features-showcase .feature-slide-layout {
              grid-column: 1 / span 2;
              grid-template-columns: minmax(340px, 1fr) minmax(280px, 340px);
              column-gap: 2rem;
              align-items: start;
              min-width: 652px;
            }
            .features-showcase .feature-main-content {
              min-width: 340px;
            }
            .features-showcase .feature-wow-card {
              min-width: 280px;
              max-width: 340px;
            }
            .features-showcase .indicator-row {
              grid-column: 1;
              padding-top: 1.25rem;
            }
            .features-showcase .arrow-buttons {
              grid-column: 1;
              padding-top: 1.25rem;
            }
          }
        `}</style>
      </Container>
    </section>
  );
}