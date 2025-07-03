'use client'

import React, { useState } from 'react'
import jsPDF from 'jspdf'
import type { CVData } from "@/components/cv-builder"

export function usePDFDownload() {
  const [isGenerating, setIsGenerating] = useState(false)

  const downloadPDF = async (cvData: CVData) => {
    // Verificar que estamos en el cliente
    if (typeof window === 'undefined') {
      throw new Error('Esta función solo puede ejecutarse en el cliente')
    }

    setIsGenerating(true)
    
    try {
      // Crear nuevo documento PDF
      const doc = new jsPDF('p', 'pt', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 40
      const usableWidth = pageWidth - (margin * 2)
      let currentY = 60

      // Configurar fuente
      doc.setFont('helvetica')

      // Convertir hex color a RGB para jsPDF
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 }
      }

      const headerColor = hexToRgb(cvData.headerColor)

      // Función para agregar texto con wrapping
      const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = 'black', align: 'left' | 'center' | 'right' = 'left') => {
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', isBold ? 'bold' : 'normal')
        
        // Configurar color
        if (color === 'black') {
          doc.setTextColor(0, 0, 0)
        } else if (color === 'gray') {
          doc.setTextColor(85, 85, 85)
        } else if (color === 'lightgray') {
          doc.setTextColor(128, 128, 128)
        } else if (color === 'header') {
          doc.setTextColor(headerColor.r, headerColor.g, headerColor.b)
        }
        
        const lines = doc.splitTextToSize(text, usableWidth)
        
        // Verificar si necesitamos nueva página
        if (currentY + (lines.length * fontSize * 1.2) > pageHeight - margin) {
          doc.addPage()
          currentY = 60
        }
        
        let x = margin
        if (align === 'center') {
          x = pageWidth / 2
        } else if (align === 'right') {
          x = pageWidth - margin
        }
        
        doc.text(lines, x, currentY, { align: align })
        currentY += lines.length * fontSize * 1.2 + 5
      }

      // Función para agregar texto en posición específica
      const addTextAt = (text: string, x: number, y: number, fontSize: number, isBold: boolean = false, color: string = 'black', align: 'left' | 'center' | 'right' = 'left') => {
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', isBold ? 'bold' : 'normal')
        
        if (color === 'black') {
          doc.setTextColor(0, 0, 0)
        } else if (color === 'gray') {
          doc.setTextColor(85, 85, 85)
        } else if (color === 'lightgray') {
          doc.setTextColor(128, 128, 128)
        }
        
        doc.text(text, x, y, { align: align })
      }

      // Función para agregar línea horizontal con color
      const addSectionLine = () => {
        doc.setDrawColor(headerColor.r, headerColor.g, headerColor.b)
        doc.setLineWidth(1)
        doc.line(margin, currentY - 5, pageWidth - margin, currentY - 5)
        currentY += 10
      }

      // Función para agregar título de sección
      const addSectionTitle = (title: string) => {
        currentY += 10
        addText(title, 14, true, 'header')
        addSectionLine()
      }

      // ========== HEADER ==========
      let headerStartY = currentY

      // Si hay foto de perfil
      if (cvData.personalInfo.photo.enabled && cvData.personalInfo.photo.url) {
        // Nota: En PDF no podemos mostrar la imagen real, pero ajustamos el layout
        currentY += 80 // Espacio para simular la foto
      }

      // Layout del header: nombre centrado
      const fullName = `${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      const nameWidth = doc.getTextWidth(fullName)
      doc.text(fullName, (pageWidth - nameWidth) / 2, headerStartY + 30)

      // Títulos centrados
      if (cvData.personalInfo.titles.length > 0) {
        const titlesText = cvData.personalInfo.titles.join(' | ')
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(85, 85, 85)
        const titlesWidth = doc.getTextWidth(titlesText)
        doc.text(titlesText, (pageWidth - titlesWidth) / 2, headerStartY + 55)
      }

      // Información de contacto centrada - cada campo en su propia línea
      const contactLines: string[] = []
      
      // Primero obtener country y city para manejar el formato especial
      const countryData = cvData.personalInfo.contactInfo.country
      const cityData = cvData.personalInfo.contactInfo.city
      
      // Manejar país y ciudad juntos
      if (countryData.show && countryData.value) {
        let locationText = countryData.value
        if (cityData.show && cityData.value) {
          locationText += `, ${cityData.value}`
        }
        contactLines.push(locationText)
      } else if (cityData.show && cityData.value) {
        contactLines.push(cityData.value)
      }
      
      // Procesar el resto de campos
      Object.entries(cvData.personalInfo.contactInfo).forEach(([key, info]) => {
        if (info.show && info.value && key !== "country" && key !== "city") {
          switch (key) {
            case "phone": 
              contactLines.push(info.value)
              break
            case "email": 
              contactLines.push(info.value)
              break
            case "linkedin": 
              contactLines.push(info.value)
              break
            case "age": 
              contactLines.push(`${info.value} años`)
              break
            case "nationality": 
              contactLines.push(info.value)
              break
          }
        }
      })

      if (contactLines.length > 0) {
        // Crear líneas de contacto separadas por |
        const contactText = contactLines.join(' | ')
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        
        // Dividir texto si es muy largo para el ancho de la página
        const lines = doc.splitTextToSize(contactText, usableWidth)
        
        // Centrar cada línea
        lines.forEach((line: string, index: number) => {
          const lineWidth = doc.getTextWidth(line)
          const x = (pageWidth - lineWidth) / 2
          doc.text(line, x, headerStartY + 75 + (index * 12))
        })
        
        // Ajustar currentY basado en el número de líneas de contacto
        currentY = Math.max(currentY, headerStartY + 90 + (lines.length - 1) * 12)
      } else {
        currentY = Math.max(currentY, headerStartY + 90)
      }

      // ========== RESUMEN PROFESIONAL ==========
      if (cvData.summary) {
        addSectionTitle('RESUMEN PROFESIONAL')
        addText(cvData.summary, 11, false, 'gray')
        currentY += 5
      }

      // ========== COMPETENCIAS PRINCIPALES ==========
      if (cvData.skills.length > 0) {
        addSectionTitle('COMPETENCIAS PRINCIPALES')
        const skillsText = cvData.skills.map(skill => `• ${skill}`).join('  ')
        addText(skillsText, 11, false, 'gray')
        currentY += 5
      }

      // ========== HERRAMIENTAS & TECNOLOGÍAS ==========
      if (cvData.tools.length > 0) {
        addSectionTitle('HERRAMIENTAS & TECNOLOGÍAS')
        const toolsText = cvData.tools.map(tool => `• ${tool}`).join('  ')
        addText(toolsText, 11, false, 'gray')
        currentY += 5
      }

      // ========== EXPERIENCIA PROFESIONAL ==========
      if (cvData.experience.length > 0) {
        addSectionTitle('EXPERIENCIA PROFESIONAL')
        
        cvData.experience.forEach((exp, index) => {
          // Título del trabajo con período a la derecha
          const jobTitle = `${exp.position} | ${exp.company}`
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(jobTitle, margin, currentY)
          
          if (exp.period) {
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100)
            const periodWidth = doc.getTextWidth(exp.period)
            doc.text(exp.period, pageWidth - margin - periodWidth, currentY)
          }
          
          currentY += 18

          // Responsabilidades como lista
          if (exp.responsibilities.length > 0) {
            const validResponsibilities = exp.responsibilities.filter(r => r.trim())
            validResponsibilities.forEach(resp => {
              doc.setFontSize(11)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(85, 85, 85)
              
              const respText = `• ${resp}`
              const lines = doc.splitTextToSize(respText, usableWidth)
              
              if (currentY + (lines.length * 11 * 1.2) > pageHeight - margin) {
                doc.addPage()
                currentY = 60
              }
              
              doc.text(lines, margin, currentY)
              currentY += lines.length * 11 * 1.2 + 2
            })
          }
          
          if (index < cvData.experience.length - 1) {
            currentY += 10
          }
        })
        currentY += 5
      }

      // ========== EDUCACIÓN ==========
      if (cvData.education.length > 0) {
        addSectionTitle('EDUCACIÓN')
        
        cvData.education.forEach(edu => {
          const eduText = `• ${edu.level} en ${edu.degree} – ${edu.university}`
          doc.setFontSize(11)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(85, 85, 85)
          doc.text(eduText, margin, currentY)
          
          if (edu.period) {
            doc.setFontSize(10)
            doc.setTextColor(100, 100, 100)
            const periodWidth = doc.getTextWidth(edu.period)
            doc.text(edu.period, pageWidth - margin - periodWidth, currentY)
          }
          
          currentY += 16
        })
        currentY += 5
      }

      // ========== CERTIFICACIONES ==========
      if (cvData.certifications.enabled && cvData.certifications.items.length > 0) {
        addSectionTitle('CERTIFICACIONES')
        
        cvData.certifications.items.forEach(cert => {
          const certText = `• ${cert.name} – ${cert.institution}, ${cert.year}`
          addText(certText, 11, false, 'gray')
          currentY += 2
        })
        currentY += 5
      }

      // ========== IDIOMAS ==========
      if (cvData.languages.length > 0) {
        addSectionTitle('IDIOMAS')
        const languagesText = cvData.languages.map(lang => `• ${lang.language}: ${lang.level}`).join('  ')
        addText(languagesText, 11, false, 'gray')
        currentY += 5
      }

      // ========== REFERENCIAS ==========
      if (cvData.references.enabled && cvData.references.items.length > 0) {
        addSectionTitle('REFERENCIAS')
        
        cvData.references.items.forEach(ref => {
          const refText = `• ${ref.name} – ${ref.company}, ${ref.phone}`
          addText(refText, 11, false, 'gray')
          currentY += 2
        })
      }

      // Generar nombre de archivo
      const fileName = `CV_${cvData.personalInfo.firstName}_${cvData.personalInfo.lastName}.pdf`
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')

      // Descargar PDF
      doc.save(fileName)
      
      return true
    } catch (error) {
      console.error('Error generando PDF:', error)
      throw new Error('Error al generar el PDF. Por favor, intenta nuevamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    downloadPDF,
    isGenerating,
  }
} 