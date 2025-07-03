"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { Pricing } from "@/components/pricing"
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
      <Pricing onStartBuilder={() => setShowBuilder(true)} />
      <Footer />
    </div>
  )
}
