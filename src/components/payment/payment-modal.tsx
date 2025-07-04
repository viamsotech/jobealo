"use client"

import { useState } from 'react'
import { type PlanType } from '@/lib/stripe'
import PaymentForm from './payment-form'

interface PaymentModalProps {
  isOpen: boolean
  planType: PlanType | null
  onClose: () => void
  onSuccess: () => void
}

export default function PaymentModal({ isOpen, planType, onClose, onSuccess }: PaymentModalProps) {
  if (!isOpen || !planType) {
    return null
  }

  const handleSuccess = () => {
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <PaymentForm
          planType={planType}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </div>
    </div>
  )
} 