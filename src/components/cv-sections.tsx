"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Sparkles, ChevronRight, ChevronLeft, Upload, AlertCircle, Loader2, Lightbulb, Eye } from "lucide-react"
import type { CVData } from "@/components/cv-builder"
import { useRef, useState } from "react"
import { useAI, useAINotifications } from "@/hooks/useAI"

interface CVSectionsProps {
  currentStep: number
  cvData: CVData
  updateCVData: (section: string, data: unknown) => void
  onNext: () => void
  onPrevious: () => void
  onReview: () => void
  isFirstStep: boolean
  isLastStep: boolean
}

export function CVSections({
  currentStep,
  cvData,
  updateCVData,
  onNext,
  onPrevious,
  onReview,
  isFirstStep,
  isLastStep,
}: CVSectionsProps) {
  const { improve, isImproving } = useAI()
  const { notification, showSuccess, showError } = useAINotifications()
  
  // Estados para generador de sugerencias de títulos
  const [experienceInput, setExperienceInput] = useState('')
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set())
  
  // Estados para generador de sugerencias de competencias
  const [skillsExperienceInput, setSkillsExperienceInput] = useState('')
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([])
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false)
  const [addedSkillSuggestions, setAddedSkillSuggestions] = useState<Set<string>>(new Set())
  
  // Estados para generador de sugerencias de herramientas
  const [toolsExperienceInput, setToolsExperienceInput] = useState('')
  const [toolSuggestions, setToolSuggestions] = useState<string[]>([])
  const [showToolSuggestions, setShowToolSuggestions] = useState(false)
  const [addedToolSuggestions, setAddedToolSuggestions] = useState<Set<string>>(new Set())
  
    // Estados para generador de sugerencias de experiencia (por índice de experiencia)
  const [experienceInputs, setExperienceInputs] = useState<{[key: number]: string}>({})
  const [experienceSuggestions, setExperienceSuggestions] = useState<{[key: number]: string[]}>({})
  const [showExperienceSuggestions, setShowExperienceSuggestions] = useState<{[key: number]: boolean}>({})
  const [addedExperienceSuggestions, setAddedExperienceSuggestions] = useState<{[key: number]: Set<string>}>({}) 
  
  const addTag = (section: string, value: string) => {
    if (value.trim()) {
      const current = cvData[section as keyof CVData] as string[]
      updateCVData(section, [...current, value.trim()])
    }
  }

  const removeTag = (section: string, index: number) => {
    const current = cvData[section as keyof CVData] as string[]
    updateCVData(section, current.filter((_, i) => i !== index))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es muy grande. Por favor selecciona un archivo menor a 5MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        updateCVData("personalInfo", {
          ...cvData.personalInfo,
          photo: {
            ...cvData.personalInfo.photo,
            url: imageUrl,
            enabled: true
          },
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Funciones para mejorar con IA
  const handleImproveTitles = async () => {
    try {
      if (cvData.personalInfo.titles.length === 0) {
        showError('Agrega al menos un título antes de mejorarlo con IA')
        return
      }
      
      const improved = await improve('titles', cvData.personalInfo.titles, undefined, 'titles')
      updateCVData("personalInfo", {
        ...cvData.personalInfo,
        titles: improved,
      })
      showSuccess('¡Títulos mejorados con IA!')
    } catch {
      showError('Error al mejorar títulos con IA')
    }
  }

  const handleImproveSummary = async () => {
    try {
      if (!cvData.summary.trim()) {
        showError('Escribe un resumen antes de mejorarlo con IA')
        return
      }
      
      const improved = await improve('summary', cvData.summary, undefined, 'summary')
      updateCVData("summary", improved[0] || cvData.summary)
      showSuccess('¡Resumen mejorado con IA!')
    } catch {
      showError('Error al mejorar resumen con IA')
    }
  }

  const handleImproveSkills = async () => {
    try {
      if (cvData.skills.length === 0) {
        showError('Agrega al menos una competencia antes de mejorarlas con IA')
        return
      }
      
      const improved = await improve('skills', cvData.skills, undefined, 'skills')
      updateCVData("skills", improved)
      showSuccess('¡Competencias mejoradas con IA!')
    } catch {
      showError('Error al mejorar competencias con IA')
    }
  }

  const handleImproveTools = async () => {
    try {
      if (cvData.tools.length === 0) {
        showError('Agrega al menos una herramienta antes de mejorarlas con IA')
        return
      }
      
      const improved = await improve('tools', cvData.tools, undefined, 'tools')
      updateCVData("tools", improved)
      showSuccess('¡Herramientas mejoradas con IA!')
    } catch {
      showError('Error al mejorar herramientas con IA')
    }
  }

  const handleImproveResponsibility = async (expIndex: number, respIndex: number) => {
    try {
      const responsibility = cvData.experience[expIndex].responsibilities[respIndex]
      if (!responsibility.trim()) {
        showError('Escribe una responsabilidad antes de mejorarla con IA')
        return
      }
      
      const context = {
        position: cvData.experience[expIndex].position,
        company: cvData.experience[expIndex].company
      }
      
      const improved = await improve('responsibility', responsibility, context, `resp-${expIndex}-${respIndex}`)
      
      const newExp = [...cvData.experience]
      newExp[expIndex].responsibilities[respIndex] = improved[0] || responsibility
      updateCVData("experience", newExp)
      showSuccess('¡Responsabilidad mejorada con IA!')
    } catch {
      showError('Error al mejorar responsabilidad con IA')
    }
  }

  const handleImproveAllResponsibilities = async (expIndex: number) => {
    try {
      const responsibilities = cvData.experience[expIndex].responsibilities.filter(r => r.trim())
      if (responsibilities.length === 0) {
        showError('Agrega al menos una responsabilidad antes de mejorarlas con IA')
        return
      }
      
      const context = {
        position: cvData.experience[expIndex].position,
        company: cvData.experience[expIndex].company
      }
      
      const improved = await improve('all-responsibilities', responsibilities, context, `all-resp-${expIndex}`)
      
      const newExp = [...cvData.experience]
      newExp[expIndex].responsibilities = improved
      updateCVData("experience", newExp)
      showSuccess('¡Todas las responsabilidades mejoradas con IA!')
    } catch {
      showError('Error al mejorar responsabilidades con IA')
    }
  }

  const handleGenerateTitleSuggestions = async () => {
    try {
      if (!experienceInput.trim()) {
        showError('Describe tu experiencia antes de generar sugerencias')
        return
      }
      
      const suggestions = await improve('title-suggestions', experienceInput, undefined, 'title-suggestions')
      setTitleSuggestions(suggestions)
      setShowSuggestions(true)
      setAddedSuggestions(new Set()) // Limpiar tracking de sugerencias anteriores
      showSuccess('¡Sugerencias de títulos generadas!')
    } catch {
      showError('Error al generar sugerencias de títulos')
      setShowSuggestions(false)
    }
  }

  const addSuggestedTitle = (title: string) => {
    if (cvData.personalInfo.titles.length < 5) {
      updateCVData("personalInfo", {
        ...cvData.personalInfo,
        titles: [...cvData.personalInfo.titles, title],
      })
      // Marcar como agregado para evitar duplicados
      setAddedSuggestions(prev => new Set([...prev, title]))
      showSuccess('¡Título agregado!')
    } else {
      showError('Ya tienes el máximo de 5 títulos')
    }
  }

  const handleGenerateSkillSuggestions = async () => {
    try {
      if (!skillsExperienceInput.trim()) {
        showError('Describe tu experiencia y habilidades antes de generar sugerencias')
        return
      }
      
      const suggestions = await improve('skill-suggestions', skillsExperienceInput, undefined, 'skill-suggestions')
      setSkillSuggestions(suggestions)
      setShowSkillSuggestions(true)
      setAddedSkillSuggestions(new Set()) // Limpiar tracking de sugerencias anteriores
      showSuccess('¡Sugerencias de competencias generadas!')
    } catch {
      showError('Error al generar sugerencias de competencias')
      setShowSkillSuggestions(false)
    }
  }

  const addSuggestedSkill = (skill: string) => {
    if (cvData.skills.length < 10) {
      updateCVData("skills", [...cvData.skills, skill])
      // Marcar como agregado para evitar duplicados
      setAddedSkillSuggestions(prev => new Set([...prev, skill]))
      showSuccess('¡Competencia agregada!')
    } else {
      showError('Ya tienes el máximo de 10 competencias')
    }
  }

  const handleGenerateToolSuggestions = async () => {
    try {
      if (!toolsExperienceInput.trim()) {
        showError('Describe tu experiencia con herramientas antes de generar sugerencias')
        return
      }
      
      const suggestions = await improve('tool-suggestions', toolsExperienceInput, undefined, 'tool-suggestions')
      setToolSuggestions(suggestions)
      setShowToolSuggestions(true)
      setAddedToolSuggestions(new Set()) // Limpiar tracking de sugerencias anteriores
      showSuccess('¡Sugerencias de herramientas generadas!')
    } catch {
      showError('Error al generar sugerencias de herramientas')
      setShowToolSuggestions(false)
    }
  }

  const addSuggestedTool = (tool: string) => {
    if (cvData.tools.length < 14) {
      updateCVData("tools", [...cvData.tools, tool])
      // Marcar como agregado para evitar duplicados
      setAddedToolSuggestions(prev => new Set([...prev, tool]))
      showSuccess('¡Herramienta agregada!')
    } else {
      showError('Ya tienes el máximo de 14 herramientas')
    }
  }

  const handleGenerateExperienceSuggestions = async (expIndex: number) => {
    try {
      const input = experienceInputs[expIndex]
      if (!input?.trim()) {
        showError('Describe lo que hiciste en este trabajo antes de generar sugerencias')
        return
      }
      
      const context = {
        position: cvData.experience[expIndex].position,
        company: cvData.experience[expIndex].company
      }
      
      const suggestions = await improve('experience-suggestions', input, context, `exp-suggestions-${expIndex}`)
      
      setExperienceSuggestions(prev => ({ ...prev, [expIndex]: suggestions }))
      setShowExperienceSuggestions(prev => ({ ...prev, [expIndex]: true }))
      setAddedExperienceSuggestions(prev => ({ ...prev, [expIndex]: new Set() })) // Limpiar tracking
      showSuccess('¡Responsabilidades orientadas a logros generadas!')
    } catch {
      showError('Error al generar sugerencias de responsabilidades')
      setShowExperienceSuggestions(prev => ({ ...prev, [expIndex]: false }))
    }
  }

  const addSuggestedResponsibility = (expIndex: number, responsibility: string) => {
    const currentResponsibilities = cvData.experience[expIndex].responsibilities
    if (currentResponsibilities.length < 8) {
      const newExp = [...cvData.experience]
      newExp[expIndex].responsibilities = [...currentResponsibilities, responsibility]
      updateCVData("experience", newExp)
      
      // Marcar como agregado para evitar duplicados
      setAddedExperienceSuggestions(prev => ({
        ...prev,
        [expIndex]: new Set([...(prev[expIndex] || []), responsibility])
      }))
      showSuccess('¡Responsabilidad agregada!')
    } else {
      showError('Ya tienes el máximo de 8 responsabilidades en esta experiencia')
    }
  }

  const updateExperienceInput = (expIndex: number, value: string) => {
    setExperienceInputs(prev => ({ ...prev, [expIndex]: value }))
  }

  const renderSection = () => {
    switch (currentStep) {
      case 0: // Nombre
        return (
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Nombre *</Label>
                  <Input
                    id="firstName"
                    value={cvData.personalInfo.firstName}
                    onChange={(e) =>
                      updateCVData("personalInfo", {
                        ...cvData.personalInfo,
                        firstName: e.target.value,
                      })
                    }
                    className="text-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Apellidos *</Label>
                  <Input
                    id="lastName"
                    value={cvData.personalInfo.lastName}
                    onChange={(e) =>
                      updateCVData("personalInfo", {
                        ...cvData.personalInfo,
                        lastName: e.target.value,
                      })
                    }
                    className="text-lg"
                  />
                </div>
              </div>

              {/* Photo Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center space-x-2">
                      <Label className="text-base font-medium">Foto de Perfil</Label>
                      <div className="group relative inline-block">
                        <AlertCircle className="w-4 h-4 text-amber-500 cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 w-80">
                          <div className="text-center">
                            <span className="block font-semibold text-amber-300 mb-1">⚠️ Recomendación Jobealo</span>
                            <span className="block">NO incluir fotos en tu CV. Las mejores prácticas de reclutamiento sugieren CVs sin fotos para evitar sesgos inconscientes y enfocarse en tus habilidades y experiencia.</span>
                          </div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  <Switch
                    checked={cvData.personalInfo.photo.enabled}
                    onCheckedChange={(checked) => {
                      updateCVData("personalInfo", {
                        ...cvData.personalInfo,
                        photo: {
                          ...cvData.personalInfo.photo,
                          enabled: checked,
                        },
                      })
                    }}
                  />
                </div>

                {cvData.personalInfo.photo.enabled && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      {cvData.personalInfo.photo.url && (
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                          <img
                            src={cvData.personalInfo.photo.url || "/placeholder.svg"}
                            alt="Foto de perfil"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-3">
                        <div>
                          <Label htmlFor="photoUrl">URL de la foto</Label>
                          <Input
                            id="photoUrl"
                            placeholder="https://ejemplo.com/mi-foto.jpg"
                            value={cvData.personalInfo.photo.url}
                            onChange={(e) =>
                              updateCVData("personalInfo", {
                                ...cvData.personalInfo,
                                photo: {
                                  ...cvData.personalInfo.photo,
                                  url: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 border-t border-gray-200"></div>
                          <span className="text-xs text-gray-500 bg-white px-2">O</span>
                          <div className="flex-1 border-t border-gray-200"></div>
                        </div>

                        <div>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="image/*"
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-center space-x-2"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Subir desde dispositivo</span>
                          </Button>
                        </div>
                        
                        <p className="text-xs text-gray-500">
                          Recomendado: foto profesional, formato cuadrado, máx. 5MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )

      case 1: // Título
        return (
          <Card>
            <CardHeader>
              <CardTitle>Título / Área de Expertise</CardTitle>
              <p className="text-sm text-gray-600">Máximo 5 títulos. Aparecerán separados por | en tu CV.</p>
              {/* Ejemplo visual */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                <p className="text-xs font-medium text-blue-800 mb-1">📋 Ejemplo de cómo se verán en tu CV:</p>
                <p className="text-sm text-blue-700 font-medium">Ingeniero Civil | Experto en Carreteras | 10 años de experiencia</p>
              </div>
              <p className="text-xs text-blue-600">💡 Haz clic en la ✕ para eliminar un título</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {cvData.personalInfo.titles.map((title, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <Badge variant="secondary" className="px-3 py-1">
                      {title}
                    </Badge>
                    <button
                      type="button"
                      className="w-5 h-5 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center cursor-pointer text-xs font-bold"
                      onClick={() => {
                        const newTitles = cvData.personalInfo.titles.filter((_, i) => i !== index)
                        updateCVData("personalInfo", {
                          ...cvData.personalInfo,
                          titles: newTitles,
                        })
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              {cvData.personalInfo.titles.length < 5 && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: E-COMMERCE LEADER"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          const value = (e.target as HTMLInputElement).value
                          if (value.trim()) {
                            updateCVData("personalInfo", {
                              ...cvData.personalInfo,
                              titles: [...cvData.personalInfo.titles, value.trim()],
                            })
                            ;(e.target as HTMLInputElement).value = ""
                          }
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.querySelector(
                          'input[placeholder="Ej: E-COMMERCE LEADER"]',
                        ) as HTMLInputElement
                        if (input?.value.trim()) {
                          updateCVData("personalInfo", {
                            ...cvData.personalInfo,
                            titles: [...cvData.personalInfo.titles, input.value.trim()],
                          })
                          input.value = ""
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-2 bg-transparent"
                      onClick={handleImproveTitles}
                      disabled={isImproving('titles') || cvData.personalInfo.titles.length === 0}
                    >
                      {isImproving('titles') ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {isImproving('titles') ? 'Mejorando...' : 'Mejorar títulos con IA'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Generador de sugerencias de títulos */}
              <div className="border-t pt-4">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-purple-600" />
                    <h3 className="font-medium text-purple-800">Generador de Títulos con IA</h3>
                  </div>
                  <p className="text-sm text-purple-700 mb-3">
                    Cuéntame qué has hecho en los últimos años a nivel profesional o estudiantil y te daré ejemplos de títulos:
                  </p>
                  
                  <div className="space-y-3">
                    <Textarea
                      value={experienceInput}
                      onChange={(e) => setExperienceInput(e.target.value)}
                      placeholder="Ej: Soy ingeniero civil con 10 años de experiencia en construcción de carreteras y puentes. He liderado equipos de hasta 50 personas y gestionado proyectos de más de $5M..."
                      className="min-h-20 bg-white border-purple-200 focus:border-purple-400"
                      maxLength={500}
                    />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-600">{experienceInput.length}/500 caracteres</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
                        onClick={handleGenerateTitleSuggestions}
                        disabled={isImproving('title-suggestions') || !experienceInput.trim()}
                      >
                        {isImproving('title-suggestions') ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {isImproving('title-suggestions') ? 'Generando...' : 'Generar sugerencias'}
                      </Button>
                    </div>
                  </div>

                  {/* Mostrar sugerencias */}
                  {showSuggestions && titleSuggestions.length > 0 && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-sm font-medium text-purple-800 mb-2">✨ Sugerencias de títulos:</p>
                      <div className="space-y-2">
                        {titleSuggestions.map((suggestion, index) => {
                          const isAdded = addedSuggestions.has(suggestion)
                          const isMaxReached = cvData.personalInfo.titles.length >= 5
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-100">
                              <span className={`text-sm font-medium ${isAdded ? 'text-gray-500 line-through' : 'text-purple-900'}`}>
                                {suggestion}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addSuggestedTitle(suggestion)}
                                disabled={isAdded || isMaxReached}
                                className={`text-xs ${
                                  isAdded 
                                    ? 'bg-green-100 text-green-700 border-green-300 cursor-not-allowed' 
                                    : isMaxReached
                                    ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                                    : 'bg-purple-600 text-white hover:bg-purple-700 border-purple-600'
                                }`}
                              >
                                {isAdded ? '✓ Agregado' : isMaxReached ? 'Máximo alcanzado' : 'Agregar'}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 2: // Contacto
        return (
          <Card>
            <CardHeader>
              <CardTitle>Datos de Contacto</CardTitle>
              <p className="text-sm text-gray-600">Selecciona qué información mostrar en tu CV.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(cvData.personalInfo.contactInfo).map(([key, data]) => {
                const getLabel = (key: string) => {
                  switch (key) {
                    case "country": return "País";
                    case "city": return "Ciudad";
                    case "phone": return "Teléfono";
                    case "email": return "Email";
                    case "age": return "Edad";
                    case "gender": return "Género";
                    case "nationality": return "Nacionalidad";
                    case "linkedin": return "LinkedIn";
                    default: return key;
                  }
                }
                
                return (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={data.show}
                      onCheckedChange={(checked) => {
                        updateCVData("personalInfo", {
                          ...cvData.personalInfo,
                          contactInfo: {
                            ...cvData.personalInfo.contactInfo,
                            [key]: { ...data, show: checked },
                          },
                        })
                      }}
                    />
                    <Label>{getLabel(key)}</Label>
                  </div>
                  {data.show && (
                    <Input
                      className="w-48"
                      value={data.value}
                      placeholder={`Ingresa tu ${getLabel(key).toLowerCase()}`}
                      onChange={(e) => {
                        updateCVData("personalInfo", {
                          ...cvData.personalInfo,
                          contactInfo: {
                            ...cvData.personalInfo.contactInfo,
                            [key]: { ...data, value: e.target.value },
                          },
                        })
                      }}
                    />
                  )}
                </div>
                )
              })}
            </CardContent>
          </Card>
        )

      case 3: // Resumen
        return (
          <Card>
            <CardHeader>
              <CardTitle>Resumen Profesional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={cvData.summary}
                onChange={(e) => updateCVData("summary", e.target.value)}
                placeholder="Describe tu experiencia profesional y logros principales..."
                className="min-h-32"
                maxLength={600}
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{cvData.summary.length}/600 caracteres</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2 bg-transparent"
                  onClick={handleImproveSummary}
                  disabled={isImproving('summary') || !cvData.summary.trim()}
                >
                  {isImproving('summary') ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isImproving('summary') ? 'Mejorando...' : 'Mejorar con IA'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      case 4: // Competencias
        return (
          <Card>
            <CardHeader>
              <CardTitle>Competencias</CardTitle>
              <p className="text-sm text-gray-600">Máximo 10 competencias. Aparecerán con • en tu CV.</p>
              {/* Ejemplo visual */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                <p className="text-xs font-medium text-green-800 mb-1">📋 Ejemplo de cómo se verán en tu CV:</p>
                <p className="text-sm text-green-700 font-medium">• Liderazgo de equipos • Gestión de proyectos • Análisis de datos</p>
              </div>
              <p className="text-xs text-blue-600">💡 Haz clic en la ✕ para eliminar una competencia</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {cvData.skills.map((skill, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <Badge variant="secondary" className="px-3 py-1">
                      {skill}
                    </Badge>
                    <button
                      type="button"
                      className="w-5 h-5 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center cursor-pointer text-xs font-bold"
                      onClick={() => {
                        removeTag("skills", index)
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              {cvData.skills.length < 10 && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: Liderazgo de equipos"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          const value = (e.target as HTMLInputElement).value
                          addTag("skills", value)
                          ;(e.target as HTMLInputElement).value = ""
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.querySelector(
                          'input[placeholder="Ej: Liderazgo de equipos"]',
                        ) as HTMLInputElement
                        if (input?.value.trim()) {
                          addTag("skills", input.value)
                          input.value = ""
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-2 bg-transparent"
                      onClick={handleImproveSkills}
                      disabled={isImproving('skills') || cvData.skills.length === 0}
                    >
                      {isImproving('skills') ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {isImproving('skills') ? 'Mejorando...' : 'Mejorar competencias con IA'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Generador de sugerencias de competencias */}
              <div className="border-t pt-4">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-purple-600" />
                    <h3 className="font-medium text-purple-800">Generador de Competencias con IA</h3>
                  </div>
                  <p className="text-sm text-purple-700 mb-3">
                    Describe qué sabes hacer, qué competencias has aplicado en tus trabajos o estudios:
                  </p>
                  
                  <div className="space-y-3">
                    <Textarea
                      value={skillsExperienceInput}
                      onChange={(e) => setSkillsExperienceInput(e.target.value)}
                      placeholder="Ej: He liderado equipos de 15 personas, gestionado proyectos con presupuestos de $500K, analizado datos con Excel y Power BI, presentado a directivos, resuelto problemas complejos, planificado estrategias de marketing..."
                      className="min-h-20 bg-white border-purple-200 focus:border-purple-400"
                      maxLength={600}
                    />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-600">{skillsExperienceInput.length}/600 caracteres</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
                        onClick={handleGenerateSkillSuggestions}
                        disabled={isImproving('skill-suggestions') || !skillsExperienceInput.trim()}
                      >
                        {isImproving('skill-suggestions') ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {isImproving('skill-suggestions') ? 'Generando...' : 'Generar competencias (mín. 6)'}
                      </Button>
                    </div>
                  </div>

                  {/* Mostrar sugerencias */}
                  {showSkillSuggestions && skillSuggestions.length > 0 && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-sm font-medium text-purple-800 mb-2">✨ Competencias identificadas ({skillSuggestions.length} encontradas):</p>
                      <div className="space-y-2">
                        {skillSuggestions.map((suggestion, index) => {
                          const isAdded = addedSkillSuggestions.has(suggestion)
                          const isMaxReached = cvData.skills.length >= 10
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-100">
                              <span className={`text-sm font-medium ${isAdded ? 'text-gray-500 line-through' : 'text-purple-900'}`}>
                                {suggestion}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addSuggestedSkill(suggestion)}
                                disabled={isAdded || isMaxReached}
                                className={`text-xs ${
                                  isAdded 
                                    ? 'bg-green-100 text-green-700 border-green-300 cursor-not-allowed' 
                                    : isMaxReached
                                    ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                                    : 'bg-purple-600 text-white hover:bg-purple-700 border-purple-600'
                                }`}
                              >
                                {isAdded ? '✓ Agregada' : isMaxReached ? 'Máximo alcanzado' : 'Agregar'}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 5: // Herramientas
        return (
          <Card>
            <CardHeader>
              <CardTitle>Herramientas & Tecnologías</CardTitle>
              <p className="text-sm text-gray-600">Máximo 14 herramientas. Aparecerán con • en tu CV.</p>
              {/* Ejemplo visual */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
                <p className="text-xs font-medium text-orange-800 mb-1">📋 Ejemplo de cómo se verán en tu CV:</p>
                <p className="text-sm text-orange-700 font-medium">• Microsoft Excel • Adobe Photoshop • Google Analytics • AutoCAD</p>
              </div>
              <p className="text-xs text-blue-600">💡 Haz clic en la ✕ para eliminar una herramienta</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {cvData.tools.map((tool, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <Badge variant="secondary" className="px-3 py-1">
                      {tool}
                    </Badge>
                    <button
                      type="button"
                      className="w-5 h-5 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center cursor-pointer text-xs font-bold"
                      onClick={() => {
                        removeTag("tools", index)
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              {cvData.tools.length < 14 && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: Google Analytics"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          const value = (e.target as HTMLInputElement).value
                          addTag("tools", value)
                          ;(e.target as HTMLInputElement).value = ""
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.querySelector(
                          'input[placeholder="Ej: Google Analytics"]',
                        ) as HTMLInputElement
                        if (input?.value.trim()) {
                          addTag("tools", input.value)
                          input.value = ""
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-2 bg-transparent"
                      onClick={handleImproveTools}
                      disabled={isImproving('tools') || cvData.tools.length === 0}
                    >
                      {isImproving('tools') ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {isImproving('tools') ? 'Mejorando...' : 'Mejorar herramientas con IA'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Generador de sugerencias de herramientas */}
              <div className="border-t pt-4">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-purple-600" />
                    <h3 className="font-medium text-purple-800">Generador de Herramientas con IA</h3>
                  </div>
                  <p className="text-sm text-purple-700 mb-3">
                    Describe qué herramientas, software, tecnologías o equipos has usado en tu trabajo o estudios:
                  </p>
                  
                  <div className="space-y-3">
                    <Textarea
                      value={toolsExperienceInput}
                      onChange={(e) => setToolsExperienceInput(e.target.value)}
                      placeholder="Ej: He usado Excel para análisis, Photoshop para diseño, AutoCAD para planos técnicos, equipos de soldadura en taller, microscopios en laboratorio, Google Analytics para métricas web, Python para programación..."
                      className="min-h-20 bg-white border-purple-200 focus:border-purple-400"
                      maxLength={600}
                    />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-600">{toolsExperienceInput.length}/600 caracteres</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
                        onClick={handleGenerateToolSuggestions}
                        disabled={isImproving('tool-suggestions') || !toolsExperienceInput.trim()}
                      >
                        {isImproving('tool-suggestions') ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {isImproving('tool-suggestions') ? 'Generando...' : 'Generar herramientas (mín. 6)'}
                      </Button>
                    </div>
                  </div>

                  {/* Mostrar sugerencias */}
                  {showToolSuggestions && toolSuggestions.length > 0 && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-sm font-medium text-purple-800 mb-2">✨ Herramientas identificadas ({toolSuggestions.length} encontradas):</p>
                      <div className="space-y-2">
                        {toolSuggestions.map((suggestion, index) => {
                          const isAdded = addedToolSuggestions.has(suggestion)
                          const isMaxReached = cvData.tools.length >= 14
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-100">
                              <span className={`text-sm font-medium ${isAdded ? 'text-gray-500 line-through' : 'text-purple-900'}`}>
                                {suggestion}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addSuggestedTool(suggestion)}
                                disabled={isAdded || isMaxReached}
                                className={`text-xs ${
                                  isAdded 
                                    ? 'bg-green-100 text-green-700 border-green-300 cursor-not-allowed' 
                                    : isMaxReached
                                    ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                                    : 'bg-purple-600 text-white hover:bg-purple-700 border-purple-600'
                                }`}
                              >
                                {isAdded ? '✓ Agregada' : isMaxReached ? 'Máximo alcanzado' : 'Agregar'}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 6: // Experiencia
        return (
          <Card>
            <CardHeader>
              <CardTitle>Experiencia Profesional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cvData.experience.map((exp, index) => (
                <Card key={index} className="border-l-4 border-l-[#0052CC]">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Cargo"
                        value={exp.position}
                        onChange={(e) => {
                          const newExp = [...cvData.experience]
                          newExp[index].position = e.target.value
                          updateCVData("experience", newExp)
                        }}
                      />
                      <Input
                        placeholder="Empresa"
                        value={exp.company}
                        onChange={(e) => {
                          const newExp = [...cvData.experience]
                          newExp[index].company = e.target.value
                          updateCVData("experience", newExp)
                        }}
                      />
                    </div>
                    <Input
                      placeholder="Período (Ej: Ene 2020 - Presente)"
                      value={exp.period}
                      onChange={(e) => {
                        const newExp = [...cvData.experience]
                        newExp[index].period = e.target.value
                        updateCVData("experience", newExp)
                      }}
                    />
                    <div className="space-y-2">
                      <Label>Responsabilidades (máx. 8)</Label>
                      {exp.responsibilities.map((resp, respIndex) => (
                        <div key={respIndex} className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              value={resp}
                              onChange={(e) => {
                                const newExp = [...cvData.experience]
                                newExp[index].responsibilities[respIndex] = e.target.value
                                updateCVData("experience", newExp)
                              }}
                              placeholder="Describe una responsabilidad específica..."
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newExp = [...cvData.experience]
                                newExp[index].responsibilities = newExp[index].responsibilities.filter(
                                  (_, i) => i !== respIndex,
                                )
                                updateCVData("experience", newExp)
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          {resp.trim() && (
                            <div className="flex justify-end">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center gap-1 bg-transparent text-xs"
                                onClick={() => handleImproveResponsibility(index, respIndex)}
                                disabled={isImproving(`resp-${index}-${respIndex}`)}
                              >
                                {isImproving(`resp-${index}-${respIndex}`) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3" />
                                )}
                                {isImproving(`resp-${index}-${respIndex}`) ? 'Mejorando...' : 'Mejorar con IA'}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                      {exp.responsibilities.length < 8 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newExp = [...cvData.experience]
                            newExp[index].responsibilities.push("")
                            updateCVData("experience", newExp)
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar responsabilidad
                        </Button>
                      )}
                      {exp.responsibilities.some(resp => resp.trim()) && (
                        <div className="flex justify-end mt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-2 bg-transparent"
                            onClick={() => handleImproveAllResponsibilities(index)}
                            disabled={isImproving(`all-resp-${index}`)}
                          >
                            {isImproving(`all-resp-${index}`) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            {isImproving(`all-resp-${index}`) ? 'Mejorando...' : 'Mejorar todas las responsabilidades con IA'}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Generador de responsabilidades orientadas a logros */}
                    <div className="border-t pt-4">
                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="w-5 h-5 text-purple-600" />
                          <h3 className="font-medium text-purple-800">Generar Responsabilidades con IA</h3>
                        </div>
                        <p className="text-sm text-purple-700 mb-3">
                          Describe qué hiciste en este trabajo. Menciona logros, métricas, equipos que lideraste, presupuestos, metas superadas:
                        </p>
                        
                        <div className="space-y-3">
                          <Textarea
                            value={experienceInputs[index] || ''}
                            onChange={(e) => updateExperienceInput(index, e.target.value)}
                            placeholder="Ej: Lideré un equipo de 8 personas, aumenté las ventas en 30%, manejé presupuesto de $200K, reduje costos en 15%, implementé nuevo sistema que ahorró 20 horas semanales, superé meta trimestral por 125%..."
                            className="min-h-20 bg-white border-purple-200 focus:border-purple-400"
                            maxLength={500}
                          />
                          
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-purple-600">{(experienceInputs[index] || '').length}/500 caracteres</span>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
                              onClick={() => handleGenerateExperienceSuggestions(index)}
                              disabled={isImproving(`exp-suggestions-${index}`) || !(experienceInputs[index]?.trim())}
                            >
                              {isImproving(`exp-suggestions-${index}`) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                              {isImproving(`exp-suggestions-${index}`) ? 'Generando...' : 'Generar logros (máx. 5)'}
                            </Button>
                          </div>
                        </div>

                        {/* Mostrar sugerencias */}
                        {showExperienceSuggestions[index] && experienceSuggestions[index]?.length > 0 && (
                          <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
                            <p className="text-sm font-medium text-purple-800 mb-2">✨ Responsabilidades orientadas a logros ({experienceSuggestions[index].length} generadas):</p>
                            <div className="space-y-2">
                              {experienceSuggestions[index].map((suggestion, suggIndex) => {
                                const isAdded = addedExperienceSuggestions[index]?.has(suggestion) || false
                                const isMaxReached = exp.responsibilities.length >= 8
                                
                                return (
                                  <div key={suggIndex} className="flex items-start justify-between p-3 bg-purple-50 rounded border border-purple-100">
                                    <span className={`text-sm font-medium flex-1 mr-3 ${isAdded ? 'text-gray-500 line-through' : 'text-purple-900'}`}>
                                      {suggestion}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addSuggestedResponsibility(index, suggestion)}
                                      disabled={isAdded || isMaxReached}
                                      className={`text-xs flex-shrink-0 ${
                                        isAdded 
                                          ? 'bg-green-100 text-green-700 border-green-300 cursor-not-allowed' 
                                          : isMaxReached
                                          ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                                          : 'bg-purple-600 text-white hover:bg-purple-700 border-purple-600'
                                      }`}
                                    >
                                      {isAdded ? '✓ Agregada' : isMaxReached ? 'Máximo alcanzado' : 'Agregar'}
                                    </Button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const newExp = cvData.experience.filter((_, i) => i !== index)
                        updateCVData("experience", newExp)
                      }}
                    >
                      Eliminar experiencia
                    </Button>
                  </CardContent>
                </Card>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  updateCVData("experience", [
                    ...cvData.experience,
                    { position: "", company: "", period: "", responsibilities: [""] },
                  ])
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar experiencia
              </Button>
            </CardContent>
          </Card>
        )

      case 7: // Educación
        return (
          <Card>
            <CardHeader>
              <CardTitle>Educación</CardTitle>
              <p className="text-sm text-gray-600">Máximo 6 registros educativos.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {cvData.education.map((edu, index) => (
                <Card key={index} className="border-l-4 border-l-[#00C47A]">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Universidad/Institución"
                        value={edu.university}
                        onChange={(e) => {
                          const newEdu = [...cvData.education]
                          newEdu[index].university = e.target.value
                          updateCVData("education", newEdu)
                        }}
                      />
                      <Input
                        placeholder="Título"
                        value={edu.degree}
                        onChange={(e) => {
                          const newEdu = [...cvData.education]
                          newEdu[index].degree = e.target.value
                          updateCVData("education", newEdu)
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        value={edu.level}
                        onValueChange={(value) => {
                          const newEdu = [...cvData.education]
                          newEdu[index].level = value
                          updateCVData("education", newEdu)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nivel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bachillerato">Bachillerato</SelectItem>
                          <SelectItem value="Técnico">Técnico</SelectItem>
                          <SelectItem value="Licenciatura">Licenciatura</SelectItem>
                          <SelectItem value="Maestría">Maestría</SelectItem>
                          <SelectItem value="Doctorado">Doctorado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Período"
                        value={edu.period}
                        onChange={(e) => {
                          const newEdu = [...cvData.education]
                          newEdu[index].period = e.target.value
                          updateCVData("education", newEdu)
                        }}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const newEdu = cvData.education.filter((_, i) => i !== index)
                        updateCVData("education", newEdu)
                      }}
                    >
                      Eliminar
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {cvData.education.length < 6 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    updateCVData("education", [
                      ...cvData.education,
                      { university: "", degree: "", level: "", period: "" },
                    ])
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar educación
                </Button>
              )}
            </CardContent>
          </Card>
        )

      case 8: // Certificaciones
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Certificaciones
                <Switch
                  checked={cvData.certifications.enabled}
                  onCheckedChange={(checked) => {
                    updateCVData("certifications", {
                      ...cvData.certifications,
                      enabled: checked,
                    })
                  }}
                />
              </CardTitle>
            </CardHeader>
            {cvData.certifications.enabled && (
              <CardContent className="space-y-4">
                {cvData.certifications.items.map((cert, index) => (
                  <Card key={index} className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <Input
                          placeholder="Certificación"
                          value={cert.name}
                          onChange={(e) => {
                            const newCerts = [...cvData.certifications.items]
                            newCerts[index].name = e.target.value
                            updateCVData("certifications", {
                              ...cvData.certifications,
                              items: newCerts,
                            })
                          }}
                        />
                        <Input
                          placeholder="Institución"
                          value={cert.institution}
                          onChange={(e) => {
                            const newCerts = [...cvData.certifications.items]
                            newCerts[index].institution = e.target.value
                            updateCVData("certifications", {
                              ...cvData.certifications,
                              items: newCerts,
                            })
                          }}
                        />
                        <Input
                          placeholder="Año"
                          value={cert.year}
                          onChange={(e) => {
                            const newCerts = [...cvData.certifications.items]
                            newCerts[index].year = e.target.value
                            updateCVData("certifications", {
                              ...cvData.certifications,
                              items: newCerts,
                            })
                          }}
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const newCerts = cvData.certifications.items.filter((_, i) => i !== index)
                          updateCVData("certifications", {
                            ...cvData.certifications,
                            items: newCerts,
                          })
                        }}
                      >
                        Eliminar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  variant="outline"
                  onClick={() => {
                    updateCVData("certifications", {
                      ...cvData.certifications,
                      items: [...cvData.certifications.items, { name: "", institution: "", year: "" }],
                    })
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar certificación
                </Button>
              </CardContent>
            )}
          </Card>
        )

      case 9: // Idiomas
        return (
          <Card>
            <CardHeader>
              <CardTitle>Idiomas</CardTitle>
              <p className="text-xs text-blue-600">💡 Haz clic en el botón ✕ para eliminar un idioma</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {cvData.languages.map((lang, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <Input
                    placeholder="Idioma"
                    value={lang.language}
                    onChange={(e) => {
                      const newLangs = [...cvData.languages]
                      newLangs[index].language = e.target.value
                      updateCVData("languages", newLangs)
                    }}
                  />
                  <Select
                    value={lang.level}
                    onValueChange={(value) => {
                      const newLangs = [...cvData.languages]
                      newLangs[index].level = value
                      updateCVData("languages", newLangs)
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Principiante">Principiante</SelectItem>
                      <SelectItem value="Intermedio">Intermedio</SelectItem>
                      <SelectItem value="Negocios">Negocios</SelectItem>
                      <SelectItem value="Avanzado">Avanzado</SelectItem>
                      <SelectItem value="Nativo">Nativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newLangs = cvData.languages.filter((_, i) => i !== index)
                      updateCVData("languages", newLangs)
                    }}
                    className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  updateCVData("languages", [...cvData.languages, { language: "", level: "" }])
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar idioma
              </Button>
            </CardContent>
          </Card>
        )

      case 10: // Referencias
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Referencias
                <Switch
                  checked={cvData.references.enabled}
                  onCheckedChange={(checked) => {
                    updateCVData("references", {
                      ...cvData.references,
                      enabled: checked,
                    })
                  }}
                />
              </CardTitle>
            </CardHeader>
            {cvData.references.enabled && (
              <CardContent className="space-y-4">
                {cvData.references.items.map((ref, index) => (
                  <Card key={index} className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <Input
                          placeholder="Nombre"
                          value={ref.name}
                          onChange={(e) => {
                            const newRefs = [...cvData.references.items]
                            newRefs[index].name = e.target.value
                            updateCVData("references", {
                              ...cvData.references,
                              items: newRefs,
                            })
                          }}
                        />
                        <Input
                          placeholder="Compañía"
                          value={ref.company}
                          onChange={(e) => {
                            const newRefs = [...cvData.references.items]
                            newRefs[index].company = e.target.value
                            updateCVData("references", {
                              ...cvData.references,
                              items: newRefs,
                            })
                          }}
                        />
                        <Input
                          placeholder="Teléfono"
                          value={ref.phone}
                          onChange={(e) => {
                            const newRefs = [...cvData.references.items]
                            newRefs[index].phone = e.target.value
                            updateCVData("references", {
                              ...cvData.references,
                              items: newRefs,
                            })
                          }}
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const newRefs = cvData.references.items.filter((_, i) => i !== index)
                          updateCVData("references", {
                            ...cvData.references,
                            items: newRefs,
                          })
                        }}
                      >
                        Eliminar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  variant="outline"
                  onClick={() => {
                    updateCVData("references", {
                      ...cvData.references,
                      items: [...cvData.references.items, { name: "", company: "", phone: "" }],
                    })
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar referencia
                </Button>
              </CardContent>
            )}
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {renderSection()}

      {/* Notificaciones de IA */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isFirstStep}
          className="flex items-center gap-2 bg-transparent"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>
        <Button
          onClick={isLastStep ? onReview : onNext}
          className="flex items-center gap-2 bg-[#0052CC] hover:bg-[#0052CC]/90"
        >
          {isLastStep ? (
            <>
              Revisar CV
              <Eye className="w-4 h-4" />
            </>
          ) : (
            <>
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
