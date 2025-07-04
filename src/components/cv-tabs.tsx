"use client"

import { cn } from "@/lib/utils"
import type { CVData } from "@/components/cv-builder"

interface CVTabsProps {
  steps: string[]
  currentStep: number
  onStepClick: (stepIndex: number) => void
  cvData: CVData
  validateSectionCompletion: (cvData: CVData) => {
    personalInfo: boolean
    titles: boolean
    contactInfo: boolean
    summary: boolean
    skills: boolean
    tools: boolean
    experience: boolean
    education: boolean
    certifications: boolean
    languages: boolean
    references: boolean
  }
}

export function CVTabs({ steps, currentStep, onStepClick, cvData, validateSectionCompletion }: CVTabsProps) {
  // Get validation results
  const validations = validateSectionCompletion(cvData)
  const validationKeys = Object.keys(validations) as (keyof typeof validations)[]

  return (
    <div className="flex space-x-1 overflow-x-auto pb-2">
      {steps.map((step, index) => {
        // Determine if this step is completed based on actual data validation
        const validationKey = validationKeys[index]
        const isCompleted = validationKey ? validations[validationKey] : false
        const isCurrent = index === currentStep

        return (
          <button
            key={index}
            onClick={() => onStepClick(index)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              isCurrent
                ? "bg-[#0052CC] text-white"
                : isCompleted
                  ? "bg-[#00C47A] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            {index + 1}. {step}
          </button>
        )
      })}
    </div>
  )
}
