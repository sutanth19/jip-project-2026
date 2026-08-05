import { Link } from "react-router-dom";

import Container from "@/components/common/Container";
import { Card } from "@/components/ui/card";

export default function Cta() {
  return (
    <section className="bg-muted/40">
      <Container className="py-10 md:py-14 lg:py-16">
        <Card className="[--card-spacing:--spacing(8)] md:[--card-spacing:--spacing(10)] mx-auto max-w-4xl rounded-2xl border border-border bg-card text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="mx-auto max-w-3xl">
            <span className="mb-4 inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
              Mulakan Hari Ini
            </span>
            <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Transformasikan Pengurusan&apos; Literasi Sekolah Anda
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Memperkasa pentadbir, guru, murid dan ibu bapa melalui satu platform moden untuk mengurus buku, program literasi, kemajuan bacaan serta pelaporan dengan lebih cekap.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                to="/register"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:h-12 sm:text-base"
              >
                Mulakan Sekarang
              </Link>
              <Link
                to="/contact"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:h-12 sm:text-base"
              >
                Hubungi Kami
              </Link>
            </div>
          </div>
        </Card>
      </Container>
    </section>
  );
}