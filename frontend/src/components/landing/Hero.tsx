import { Link } from "react-router-dom";

import heroImage from "@/assets/images/hero.png";
import Container from "@/components/common/Container";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="bg-[var(--background)]">
      <Container className="grid pt-20 pb-8 lg:grid-cols-12 lg:gap-8 lg:py-16 lg:pt-28 xl:gap-0">
        <div className="mr-auto place-self-center lg:col-span-7">
          <h1 className="mb-4 max-w-2xl text-4xl leading-none font-extrabold tracking-tight text-[var(--text)] md:text-5xl xl:text-6xl">
            Digital MoLIB
          </h1>
          <p className="mb-6 max-w-2xl font-light text-[var(--text)]/70 md:text-lg lg:mb-8 lg:text-xl">
            A modern School Literacy Management System that empowers students,
            teachers, parents, and administrators to manage reading activities,
            books, literacy programs, and progress through one integrated
            platform.
          </p>
          <div className="space-y-4 sm:flex sm:space-y-0 sm:space-x-4">
            <Button
              asChild
              className="h-auto w-full px-5 py-3 sm:w-auto"
            >
              <Link to="/#features">Explore Features</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-auto w-full px-5 py-3 sm:w-auto"
            >
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </div>
        <div className="hidden lg:col-span-5 lg:mt-0 lg:flex">
          <img src={heroImage} alt="Digital MoLIB literacy platform" />
        </div>
      </Container>
    </section>
  );
}
