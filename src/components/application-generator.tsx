"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Loader2, 
  Sparkles, 
  Mail, 
  FileSpreadsheet,
  Copy,
  Download,
  Save,
  AlertCircle
} from 'lucide-react'
import { CVData } from '@/components/cv-builder'
import { useApplications } from '@/hooks/useApplications'

interface ApplicationGeneratorProps {
  isOpen: boolean
  onClose: () => void
  cvData: CVData
  cvId: string
  type: 'email' | 'cover-letter'
  emailCount: number
  coverLetterCount: number
}

const FORMALITY_OPTIONS = [
  { value: 'informal', label: 'Informal', description: 'Relajado y cercano' },
  { value: 'semi-formal', label: 'Semi-formal', description: 'Profesional pero accesible' },
  { value: 'formal', label: 'Formal', description: 'Muy profesional' },
  { value: 'neutral', label: 'Neutral', description: 'Equilibrado' }
]

const PERSONALITY_OPTIONS = [
  { value: 'amigable', label: 'Amigable', description: 'Cercano y personal' },
  { value: 'persuasivo', label: 'Persuasivo', description: 'Enfocado en valor agregado' },
  { value: 'inspirador', label: 'Inspirador', description: 'Motivacional y ambicioso' },
  { value: 'profesional', label: 'Profesional', description: 'Serio y competente' }
]

export function ApplicationGenerator({
  isOpen,
  onClose,
  cvData,
  cvId,
  type,
  emailCount,
  coverLetterCount
}: ApplicationGeneratorProps) {
  const [step, setStep] = useState<'configure' | 'generate' | 'edit' | 'save'>('configure')
  const [jobDescription, setJobDescription] = useState('')
  const [formality, setFormality] = useState('semi-formal')
  const [personality, setPersonality] = useState('profesional')
  const [generatedContent, setGeneratedContent] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [saveTitle, setSaveTitle] = useState('')
  const [showSaveOptions, setShowSaveOptions] = useState(false)

  const {
    generateEmail,
    generateCoverLetter,
    saveEmail,
    saveCoverLetter,
    isGenerating,
    isSaving,
    error
  } = useApplications()

  const isEmail = type === 'email'
  const title = isEmail ? 'Generar Email de Postulación' : 'Generar Carta de Presentación'
  const Icon = isEmail ? Mail : FileSpreadsheet
  const currentCount = isEmail ? emailCount : coverLetterCount
  const maxCount = 3

  if (!isOpen) return null

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return

    setStep('generate')

    const params = {
      cvData,
      jobDescription: jobDescription.trim(),
      formality,
      personality
    }

    try {
      let content = null
      if (isEmail) {
        content = await generateEmail(params)
      } else {
        content = await generateCoverLetter(params)
      }

      if (content) {
        setGeneratedContent(content)
        setEditedContent(content)
        setStep('edit')

        // Generate automatic title
        const jobLines = jobDescription.trim().split('\n')
        const firstLine = jobLines[0].substring(0, 50)
        const autoTitle = isEmail 
          ? `Email para ${firstLine}...`
          : `Carta para ${firstLine}...`
        setSaveTitle(autoTitle)
      } else {
        setStep('configure')
      }
    } catch (error) {
      console.error('Error generating content:', error)
      setStep('configure')
    }
  }

  const handleSave = async () => {
    if (!saveTitle.trim() || !editedContent.trim()) return

    try {
      const params = {
        title: saveTitle.trim(),
        content: editedContent.trim(),
        jobDescription: jobDescription.trim(),
        formality,
        personality,
        cvId
      }

      let result = null
      if (isEmail) {
        result = await saveEmail(params)
      } else {
        result = await saveCoverLetter(params)
      }

      if (result) {
        setStep('save')
        setTimeout(() => {
          handleClose()
        }, 2000)
      }
    } catch (error) {
      console.error('Error saving:', error)
    }
  }

  const handleClose = () => {
    setStep('configure')
    setJobDescription('')
    setFormality('semi-formal')
    setPersonality('profesional')
    setGeneratedContent('')
    setEditedContent('')
    setSaveTitle('')
    setShowSaveOptions(false)
    onClose()
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedContent)
      // Could add a toast notification here
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([editedContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${saveTitle || 'documento'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isEmail ? 'bg-blue-100' : 'bg-purple-100'}`}>
              <Icon className={`w-5 h-5 ${isEmail ? 'text-blue-600' : 'text-purple-600'}`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600">
                Guardados: {currentCount}/{maxCount}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {step === 'configure' && (
            <div className="space-y-6">
              {/* Job Description */}
              <div>
                <Label htmlFor="job-description" className="text-sm font-medium text-gray-700 mb-2 block">
                  Descripción del Trabajo
                </Label>
                <Textarea
                  id="job-description"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Pega aquí la descripción del trabajo, requisitos del puesto, o escribe las instrucciones específicas..."
                  className="min-h-32"
                  maxLength={2000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {jobDescription.length}/2000 caracteres
                </p>
              </div>

              {/* Tone Selection */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Formality */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Nivel de Formalidad
                  </Label>
                  <div className="space-y-2">
                    {FORMALITY_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          formality === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="formality"
                          value={option.value}
                          checked={formality === option.value}
                          onChange={(e) => setFormality(e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{option.label}</div>
                          <div className="text-sm text-gray-600">{option.description}</div>
                        </div>
                        {formality === option.value && (
                          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Personality */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Personalidad del Mensaje
                  </Label>
                  <div className="space-y-2">
                    {PERSONALITY_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          personality === option.value
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="personality"
                          value={option.value}
                          checked={personality === option.value}
                          onChange={(e) => setPersonality(e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{option.label}</div>
                          <div className="text-sm text-gray-600">{option.description}</div>
                        </div>
                        {personality === option.value && (
                          <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!jobDescription.trim() || isGenerating}
                  className="flex items-center space-x-2"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    {isGenerating 
                      ? 'Generando...' 
                      : `Generar ${isEmail ? 'Email' : 'Carta'}`
                    }
                  </span>
                </Button>
              </div>
            </div>
          )}

          {step === 'generate' && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Generando tu {isEmail ? 'email' : 'carta'}...
                  </h3>
                  <p className="text-gray-600">
                    Nuestra IA está creando contenido personalizado basado en tu CV
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'edit' && (
            <div className="space-y-6">
              {/* Tone badges */}
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {FORMALITY_OPTIONS.find(o => o.value === formality)?.label}
                </Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {PERSONALITY_OPTIONS.find(o => o.value === personality)?.label}
                </Badge>
              </div>

              {/* Content Editor */}
              <div>
                <Label htmlFor="content-editor" className="text-sm font-medium text-gray-700 mb-2 block">
                  Edita tu {isEmail ? 'email' : 'carta'} (opcional)
                </Label>
                <Textarea
                  id="content-editor"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-96 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editedContent.length} caracteres
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="flex items-center space-x-1"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="flex items-center space-x-1"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar</span>
                  </Button>
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setStep('configure')}>
                    Volver
                  </Button>
                  <Button
                    onClick={() => setShowSaveOptions(true)}
                    disabled={currentCount >= maxCount}
                    className="flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar</span>
                  </Button>
                </div>
              </div>

              {/* Save Options */}
              {showSaveOptions && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label htmlFor="save-title" className="text-sm font-medium text-gray-700 mb-2 block">
                        Nombre para guardar
                      </Label>
                      <Input
                        id="save-title"
                        value={saveTitle}
                        onChange={(e) => setSaveTitle(e.target.value)}
                        placeholder={`Nombre del ${isEmail ? 'email' : 'carta'}...`}
                        maxLength={100}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSaveOptions(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!saveTitle.trim() || isSaving}
                        className="flex items-center space-x-1"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {step === 'save' && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Save className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    ¡{isEmail ? 'Email' : 'Carta'} guardado exitosamente!
                  </h3>
                  <p className="text-gray-600">
                    Puedes encontrarlo en tu lista de {isEmail ? 'emails' : 'cartas'} guardados
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 