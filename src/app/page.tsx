"use client"

import { useRouter } from "next/navigation"
import { Hero } from "@/components/hero"
import Features from "@/components/features"
import { AITools } from "@/components/ai-tools"
import { Testimonials } from "@/components/testimonials"
import Pricing from "@/components/pricing"
import { FAQ } from "@/components/faq"

export default function Home() {
  const router = useRouter()

  const handleStartBuilder = () => {
    router.push("/cvs")
  }

  return (
    <main className="flex min-h-screen flex-col">
      <Hero onStartBuilder={handleStartBuilder} />
      <Features />
      <AITools onStartBuilder={handleStartBuilder} />
      <Testimonials onStartBuilder={handleStartBuilder} />
      <Pricing />
      <FAQ />
    </main>
  )
} 