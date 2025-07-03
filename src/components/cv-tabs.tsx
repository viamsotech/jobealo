"use client"

import { cn } from "@/lib/utils"

interface CVTabsProps {
  steps: string[]
  currentStep: number
  onStepClick: (stepIndex: number) => void
}

export function CVTabs({ steps, currentStep, onStepClick }: CVTabsProps) {
  return (
    <div className="flex space-x-1 overflow-x-auto pb-2">
      {steps.map((step, index) => (
        <button
          key={index}
          onClick={() => onStepClick(index)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
            index === currentStep
              ? "bg-[#0052CC] text-white"
              : index < currentStep
                ? "bg-[#00C47A] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          {index + 1}. {step}
        </button>
      ))}
    </div>
  )
}
