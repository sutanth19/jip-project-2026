import About from "@/components/landing/About";
import Cta from "@/components/landing/Cta";
import Faq from "@/components/landing/Faq";
import Features from "@/components/landing/Features";
import Hero from "@/components/landing/Hero";
import Statistics from "@/components/landing/Statistics";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <About />
      <Features />
      <Statistics />
      <Faq />
      <Cta />
    </>
  );
}
