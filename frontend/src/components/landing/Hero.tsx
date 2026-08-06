import { Link } from "react-router-dom";

import heroImage from "@/assets/images/image1.svg";
import Container from "@/components/common/Container";
import HeroIconSlider from "@/components/landing/HeroIconSlider";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-8 left-[-7rem] h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-5rem] bottom-0 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
      </div>
      <Container className="relative pt-10 pb-8 md:pt-14 md:pb-10 lg:pt-16 lg:pb-12">
        <div className="grid items-center gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10 xl:gap-14">
          <div className="mr-auto max-w-xl place-self-center lg:col-span-1">
            <h1 className="mb-4 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:whitespace-nowrap lg:text-6xl xl:text-7xl">
              Digital Main-LiT
            </h1>
            <p className="mb-6 max-w-lg text-base leading-7 text-muted-foreground sm:max-w-xl sm:text-lg sm:leading-8">
              Digital Main-LiT ialah sistem pengurusan sekolah moden yang membantu murid, guru, ibu bapa dan pentadbir mengurus aktiviti bacaan,
              koleksi buku, program literasi serta memantau kemajuan pembelajaran melalui satu platform bersepadu.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                to="/#features"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:h-12 sm:w-auto sm:text-base"
              >
                Terokai Ciri-ciri
              </Link>
              <Link
                to="/login"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:h-12 sm:w-auto sm:text-base"
              >
                Log Masuk
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-center">
            <img
              src={heroImage}
              alt="Digital Main-LiT learning platform"
              className="mx-auto w-full max-w-[820px] object-contain lg:max-w-[960px] xl:max-w-[1050px] 2xl:max-w-[1120px]"
            />
          </div>
        </div>

        <HeroIconSlider />
      </Container>
    </section>
  );
}
