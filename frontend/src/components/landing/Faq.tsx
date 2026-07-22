import { useState } from "react";
import { ChevronDown } from "lucide-react";

import Container from "@/components/common/Container";

type FaqItem = {
  question: string;
  answer: string;
};

const faqItems: FaqItem[] = [
  {
    question: "Who can use Digital MoLIB?",
    answer:
      "Digital MoLIB is designed for school administrators, teachers, students, and parents, providing each user with role-based access and features.",
  },
  {
    question: "Does Digital MoLIB support both physical and digital books?",
    answer:
      "Yes. Schools can manage physical books, digital resources, and borrowing activities within a single platform.",
  },
  {
    question: "Can parents monitor their children's reading progress?",
    answer:
      "Yes. Parents can view reading activities, achievements, and literacy progress through their own dashboard.",
  },
  {
    question: "Can teachers generate reports?",
    answer:
      "Yes. Teachers and administrators can generate literacy reports, borrowing reports, and student reading summaries.",
  },
  {
    question: "Is Digital MoLIB secure?",
    answer:
      "Yes. The system uses authentication and role-based permissions to protect school data and user information.",
  },
  {
    question: "Can Digital MoLIB be accessed on mobile devices?",
    answer:
      "Yes. The platform is fully responsive and can be accessed from desktops, tablets, and smartphones.",
  },
];

export default function Faq() {
  const [openItem, setOpenItem] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-[var(--background)]">
      <Container className="py-20">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="mb-4 inline-flex rounded-full bg-[var(--primary)]/10 px-4 py-1.5 text-sm font-semibold text-[var(--primary)]">
            Frequently Asked Questions
          </span>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-[var(--text)] md:text-4xl">
            Everything You Need to Know About Digital MoLIB
          </h2>
          <p className="font-light text-[var(--text)]/70 sm:text-xl">
            Find answers to the most common questions about Digital MoLIB and
            how it supports literacy management in schools.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-4">
          {faqItems.map(({ question, answer }, index) => {
            const isOpen = openItem === index;
            const triggerId = `faq-trigger-${index}`;
            const panelId = `faq-panel-${index}`;

            return (
              <div
                key={question}
                className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
              >
                <h3>
                  <button
                    id={triggerId}
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-medium text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)]"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenItem(isOpen ? null : index)}
                  >
                    <span>{question}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[var(--primary)] transition-transform duration-300 motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  aria-hidden={!isOpen}
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <p className="border-t border-[var(--border)] px-6 py-5 font-light leading-relaxed text-[var(--text)]/70">
                      {answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
