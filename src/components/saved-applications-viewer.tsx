"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  X, 
  Mail, 
  FileSpreadsheet,
  Copy,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Edit3,
  Save,
  Loader2
} from 'lucide-react'
import { ApplicationEmail, CoverLetter } from '@/hooks/useApplications'

interface SavedApplicationsViewerProps {
  isOpen: boolean
  onClose: () => void
  cvId: string
  cvTitle: string
}

export function SavedApplicationsViewer({
  isOpen,
  onClose,
  cvId,
  cvTitle
}: SavedApplicationsViewerProps) {
  const [activeTab, setActiveTab] = useState<'emails' | 'cover-letters'>('emails')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  
  // Local state for applications
  const [emails, setEmails] = useState<ApplicationEmail[]>([])
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Edit form state
  const [editForm, setEditForm] = useState<{
    title: string
    content: string
  }>({ title: '', content: '' })

  // Load applications data
  const loadApplications = async () => {
    if (!cvId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const [emailsResponse, coverLettersResponse] = await Promise.all([
        fetch(`/api/applications/emails?cvId=${cvId}`),
        fetch(`/api/applications/cover-letters?cvId=${cvId}`)
      ])

      const emailsData = await emailsResponse.json()
      const coverLettersData = await coverLettersResponse.json()

      if (emailsResponse.ok) {
        setEmails(emailsData.emails || [])
      } else {
        console.error('Error loading emails:', emailsData.error)
      }

      if (coverLettersResponse.ok) {
        setCoverLetters(coverLettersData.coverLetters || [])
      } else {
        console.error('Error loading cover letters:', coverLettersData.error)
      }
    } catch (error) {
      console.error('Error loading applications:', error)
      setError('Error al cargar las aplicaciones')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && cvId) {
      loadApplications()
    }
  }, [isOpen, cvId])

  if (!isOpen) return null

  const handleDelete = async (id: string, type: 'email' | 'cover-letter') => {
    setDeletingId(id)
    
    try {
      const endpoint = type === 'email' 
        ? `/api/applications/emails/${id}`
        : `/api/applications/cover-letters/${id}`
      
      const response = await fetch(endpoint, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove from local state
        if (type === 'email') {
          setEmails(prev => prev.filter(e => e.id !== id))
        } else {
          setCoverLetters(prev => prev.filter(c => c.id !== id))
        }
      } else {
        const data = await response.json()
        setError(data.error || 'Error al eliminar')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      setError('Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (item: ApplicationEmail | CoverLetter) => {
    setEditingId(item.id)
    setEditForm({
      title: item.title,
      content: item.content
    })
    setExpandedItem(item.id) // Expand to show edit form
  }

  const handleSaveEdit = async (id: string, type: 'email' | 'cover-letter') => {
    if (!editForm.title.trim() || !editForm.content.trim()) return

    setSavingId(id)
    
    try {
      const endpoint = type === 'email' 
        ? `/api/applications/emails/${id}`
        : `/api/applications/cover-letters/${id}`
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editForm.title.trim(),
          content: editForm.content.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update local state
        if (type === 'email') {
          setEmails(prev => prev.map(e => e.id === id ? { ...e, ...data.email } : e))
        } else {
          setCoverLetters(prev => prev.map(c => c.id === id ? { ...c, ...data.coverLetter } : c))
        }
        
        setEditingId(null)
        setEditForm({ title: '', content: '' })
      } else {
        const data = await response.json()
        setError(data.error || 'Error al guardar cambios')
      }
    } catch (error) {
      console.error('Error saving edit:', error)
      setError('Error al guardar cambios')
    } finally {
      setSavingId(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ title: '', content: '' })
  }

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      // Could add a toast notification here
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const handleDownload = (content: string, title: string, type: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleExpanded = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPersonalityBadgeColor = (personality: string) => {
    switch (personality) {
      case 'amigable': return 'bg-green-100 text-green-700 border-green-200'
      case 'persuasivo': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'inspirador': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'profesional': return 'bg-gray-100 text-gray-700 border-gray-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getFormalityBadgeColor = (formality: string) => {
    switch (formality) {
      case 'informal': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'semi-formal': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'formal': return 'bg-indigo-100 text-indigo-700 border-indigo-200'
      case 'neutral': return 'bg-slate-100 text-slate-700 border-slate-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-100">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Emails y Cartas Guardados
              </h2>
              <p className="text-sm text-gray-600">
                CV: {cvTitle}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('emails')}
            className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'emails'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Mail className="w-4 h-4" />
              <span>Emails ({emails.length}/3)</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('cover-letters')}
            className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'cover-letters'
                ? 'border-purple-500 text-purple-600 bg-purple-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Cartas ({coverLetters.length}/3)</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Cargando...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === 'emails' && (
                <>
                  {emails.length === 0 ? (
                    <div className="text-center py-12">
                      <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No hay emails guardados
                      </h3>
                      <p className="text-gray-600">
                        Genera tu primer email de postulación para este CV
                      </p>
                    </div>
                  ) : (
                    emails.map((email) => (
                      <Card key={email.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {editingId === email.id ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editForm.title}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Título del email..."
                                    className="text-lg font-semibold"
                                  />
                                </div>
                              ) : (
                                <CardTitle className="text-lg text-gray-900 mb-2">
                                  {email.title}
                                </CardTitle>
                              )}
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge className={getFormalityBadgeColor(email.formality)}>
                                  {email.formality}
                                </Badge>
                                <Badge className={getPersonalityBadgeColor(email.personality)}>
                                  {email.personality}
                                </Badge>
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(email.createdAt)}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {editingId === email.id ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSaveEdit(email.id, 'email')}
                                    disabled={savingId === email.id}
                                    className="text-green-500 hover:text-green-700"
                                  >
                                    {savingId === email.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Save className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    disabled={savingId === email.id}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleExpanded(email.id)}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    {expandedItem === email.id ? (
                                      <EyeOff className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(email)}
                                    className="text-orange-500 hover:text-orange-700"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopy(email.content)}
                                    className="text-blue-500 hover:text-blue-700"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownload(email.content, email.title, 'email')}
                                    className="text-green-500 hover:text-green-700"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(email.id, 'email')}
                                    disabled={deletingId === email.id}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        {expandedItem === email.id && (
                          <CardContent className="pt-0">
                            {editingId === email.id ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Contenido del email:
                                  </label>
                                  <Textarea
                                    value={editForm.content}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                                    className="min-h-96 font-mono text-sm"
                                    placeholder="Contenido del email..."
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="whitespace-pre-wrap text-sm font-mono">
                                    {email.content}
                                  </div>
                                </div>
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                  <p className="text-xs font-medium text-blue-800 mb-1">
                                    Descripción del trabajo:
                                  </p>
                                  <p className="text-xs text-blue-700 whitespace-pre-wrap">
                                    {email.jobDescription.substring(0, 200)}
                                    {email.jobDescription.length > 200 && '...'}
                                  </p>
                                </div>
                              </>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    ))
                  )}
                </>
              )}

              {activeTab === 'cover-letters' && (
                <>
                  {coverLetters.length === 0 ? (
                    <div className="text-center py-12">
                      <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No hay cartas guardadas
                      </h3>
                      <p className="text-gray-600">
                        Genera tu primera carta de presentación para este CV
                      </p>
                    </div>
                  ) : (
                    coverLetters.map((letter) => (
                      <Card key={letter.id} className="border-l-4 border-l-purple-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {editingId === letter.id ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editForm.title}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Título de la carta..."
                                    className="text-lg font-semibold"
                                  />
                                </div>
                              ) : (
                                <CardTitle className="text-lg text-gray-900 mb-2">
                                  {letter.title}
                                </CardTitle>
                              )}
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge className={getFormalityBadgeColor(letter.formality)}>
                                  {letter.formality}
                                </Badge>
                                <Badge className={getPersonalityBadgeColor(letter.personality)}>
                                  {letter.personality}
                                </Badge>
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(letter.createdAt)}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {editingId === letter.id ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSaveEdit(letter.id, 'cover-letter')}
                                    disabled={savingId === letter.id}
                                    className="text-green-500 hover:text-green-700"
                                  >
                                    {savingId === letter.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Save className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    disabled={savingId === letter.id}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleExpanded(letter.id)}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    {expandedItem === letter.id ? (
                                      <EyeOff className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(letter)}
                                    className="text-orange-500 hover:text-orange-700"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopy(letter.content)}
                                    className="text-purple-500 hover:text-purple-700"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownload(letter.content, letter.title, 'carta')}
                                    className="text-green-500 hover:text-green-700"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(letter.id, 'cover-letter')}
                                    disabled={deletingId === letter.id}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        {expandedItem === letter.id && (
                          <CardContent className="pt-0">
                            {editingId === letter.id ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Contenido de la carta:
                                  </label>
                                  <Textarea
                                    value={editForm.content}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                                    className="min-h-96 font-mono text-sm"
                                    placeholder="Contenido de la carta..."
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="whitespace-pre-wrap text-sm font-mono">
                                    {letter.content}
                                  </div>
                                </div>
                                <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                                  <p className="text-xs font-medium text-purple-800 mb-1">
                                    Descripción del trabajo:
                                  </p>
                                  <p className="text-xs text-purple-700 whitespace-pre-wrap">
                                    {letter.jobDescription.substring(0, 200)}
                                    {letter.jobDescription.length > 200 && '...'}
                                  </p>
                                </div>
                              </>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 