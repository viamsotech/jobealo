"use client"

import { useState } from 'react'
import { type PlanType } from '@/lib/stripe'
import PaymentForm from './payment-form'

interface PaymentModalProps {
  isOpen: boolean
  planType?: PlanType | null
  onClose: () => void
  onSuccess: () => void
  individualPayment?: {
    amount: number
    language?: string  // For PDF downloads (english/spanish)
    actionType?: string  // For AI actions (email/cover-letter/adapt-cv)
    description: string
  }
}

export default function PaymentModal({ isOpen, planType, onClose, onSuccess, individualPayment }: PaymentModalProps) {
  if (!isOpen || (!planType && !individualPayment)) {
    return null
  }

  const handleSuccess = () => {
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop translúcido */}
      <div 
        className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <PaymentForm
          planType={planType || undefined}
          individualPayment={individualPayment}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </div>
    </div>
  )
} 