import LandingNav        from "@/components/landing/LandingNav"
import HeroSection       from "@/components/landing/HeroSection"
import FeaturesSection   from "@/components/landing/FeaturesSection"
import HowItWorksSection from "@/components/landing/HowItWorksSection"
import ReviewsSection    from "@/components/landing/ReviewsSection"
import CTABanner         from "@/components/landing/CTABanner"
import LandingFooter     from "@/components/landing/LandingFooter"

export default function LandingPage() {
  return (
    <main style={{ background: "#0A0A0F", minHeight: "100vh" }}>
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ReviewsSection />
      <CTABanner />
      <LandingFooter />
    </main>
  )
}
