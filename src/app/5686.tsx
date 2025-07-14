"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import Features from "@/components/features"
import { AITools } from "@/components/ai-tools"
import Pricing from "@/components/pricing"
import { Testimonials } from "@/components/testimonials"
import { FAQ } from "@/components/faq"
import { Footer } from "@/components/footer"
import { CVBuilder } from "@/components/cv-builder"

export default function HomePage() {
  const [showBuilder, setShowBuilder] = useState(false)

  if (showBuilder) {
    return <CVBuilder onBack={() => setShowBuilder(false)} />
  }

  return (
    <div className="min-h-screen bg-white">
      <Header onStartBuilder={() => setShowBuilder(true)} />
      <Hero onStartBuilder={() => setShowBuilder(true)} />
      <Features />
      <AITools onStartBuilder={() => setShowBuilder(true)} />
      <Pricing />
      <Testimonials onStartBuilder={() => setShowBuilder(true)} />
      <FAQ />
      <Footer />
    </div>
  )
}
