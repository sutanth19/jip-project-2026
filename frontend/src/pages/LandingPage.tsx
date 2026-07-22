import About from "@/components/landing/About";
import Cta from "@/components/landing/Cta";
import Faq from "@/components/landing/Faq";
import Features from "@/components/landing/Features";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import Navbar from "@/components/layout/Navbar";
import Statistics from "@/components/landing/Statistics";

export default function LandingPage() {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <About />
        <Features />
        <Statistics />
        <Faq />
        <Cta />
      </main>

      <Footer />
    </>
  );
}