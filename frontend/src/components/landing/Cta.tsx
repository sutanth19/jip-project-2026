import { Link } from "react-router-dom";

import Container from "@/components/common/Container";
import { Button } from "@/components/ui/button";

export default function Cta() {
  return (
    <section className="bg-[var(--background)]">
      <Container className="py-20">
        <div className="rounded-2xl bg-[var(--primary)] px-6 py-12 text-center sm:px-10 lg:py-16">
          <div className="mx-auto max-w-3xl">
            <span className="mb-4 inline-flex rounded-full bg-[var(--surface)]/15 px-4 py-1.5 text-sm font-semibold text-[var(--surface)]">
              Get Started Today
            </span>
            <h2 className="mb-4 text-3xl leading-tight font-extrabold tracking-tight text-[var(--surface)] md:text-4xl">
              Transform Your School&apos;s Literacy Management
            </h2>
            <p className="mb-8 font-light text-[var(--surface)]/85 md:text-lg">
              Empower administrators, teachers, students, and parents with one
              modern platform to manage books, literacy programmes, reading
              progress, and reports efficiently.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button
                asChild
                className="h-auto bg-[var(--surface)] px-5 py-3 text-[var(--primary)] hover:bg-[var(--surface)]/90"
              >
                <Link to="/register">Get Started</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-auto border-[var(--surface)] bg-transparent px-5 py-3 text-[var(--surface)] hover:bg-[var(--surface)]/10 hover:text-[var(--surface)]"
              >
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
