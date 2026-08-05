import { useState } from "react";
import { ChevronDown } from "lucide-react";

import Container from "@/components/common/Container";
import { Card } from "@/components/ui/card";

type FaqItem = {
  question: string;
  answer: string;
};

const faqItems: FaqItem[] = [
  {
    question: "Siapakah yang boleh menggunakan LITERASI DIGITAL?",
    answer:
      "LITERASI DIGITAL direka untuk digunakan oleh pentadbir sekolah, guru, murid dan ibu bapa. Setiap pengguna mempunyai akses serta ciri-ciri yang disesuaikan mengikut peranan masing-masing.",
  },
  {
    question: "Adakah LITERASI DIGITAL menyokong buku fizikal dan buku digital?",
    answer:
      "Ya. LITERASI DIGITAL membolehkan sekolah mengurus buku fizikal, buku digital, sumber pembelajaran digital serta aktiviti peminjaman melalui satu platform bersepadu.",
  },
  {
    question: "Adakah ibu bapa boleh memantau kemajuan bacaan anak-anak mereka?",
    answer:
      "Ya. Ibu bapa boleh memantau aktiviti bacaan, pencapaian serta perkembangan literasi anak-anak melalui papan pemuka (dashboard) mereka sendiri.",
  },
  {
    question: "Adakah guru boleh menjana laporan?",
    answer:
      "Ya. Guru dan pentadbir boleh menjana laporan literasi, laporan peminjaman buku serta ringkasan kemajuan bacaan murid dengan mudah melalui sistem.",
  },
  {
    question: "Adakah LITERASI DIGITAL selamat digunakan?",
    answer:
      "Ya. LITERASI DIGITAL menggunakan sistem pengesahan pengguna dan kawalan akses mengikut peranan bagi melindungi data sekolah serta maklumat pengguna daripada capaian yang tidak dibenarkan.",
  },
  {
    question: "Adakah LITERASI DIGITAL boleh diakses menggunakan peranti mudah alih?",
    answer:
      "Ya. LITERASI DIGITAL direka bentuk secara responsif dan boleh diakses melalui komputer, komputer riba, tablet serta telefon pintar pada bila-bila masa dan di mana sahaja.",
  },
];

export default function Faq() {
  const [openItem, setOpenItem] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-background">
      <Container className="py-10 md:py-14 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            Soalan Lazim (FAQ)
          </span>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Segala Yang Perlu Anda Ketahui Mengenai LITERASI DIGITAL
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Dapatkan jawapan kepada soalan-soalan yang sering ditanya mengenai LITERASI DIGITAL serta bagaimana sistem ini membantu pengurusan literasi di sekolah dengan lebih cekap.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl space-y-3 md:mt-10">
          {faqItems.map(({ question, answer }, index) => {
            const isOpen = openItem === index;
            const triggerId = `faq-trigger-${index}`;
            const panelId = `faq-panel-${index}`;

            return (
              <Card
                key={question}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <h3>
                  <button
                    id={triggerId}
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-lg"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenItem(isOpen ? null : index)}
                  >
                    <span>{question}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-primary transition-transform duration-300 motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
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
                    <p className="border-t border-border px-6 py-5 text-sm leading-6 text-muted-foreground sm:text-base">
                      {answer}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}