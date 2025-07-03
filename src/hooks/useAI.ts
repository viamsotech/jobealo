import { useState } from 'react';
import { type ImprovementType } from '@/lib/openai';

interface AIState {
  isLoading: boolean;
  error: string | null;
  isImproving: { [key: string]: boolean };
}

interface UseAIResult {
  isLoading: boolean;
  error: string | null;
  isImproving: (key: string) => boolean;
  improve: (
    type: ImprovementType,
    content: string | string[],
    context?: {
      position?: string;
      company?: string;
      industry?: string;
    },
    key?: string
  ) => Promise<string[]>;
  clearError: () => void;
}

export function useAI(): UseAIResult {
  const [state, setState] = useState<AIState>({
    isLoading: false,
    error: null,
    isImproving: {},
  });

  const improve = async (
    type: ImprovementType,
    content: string | string[],
    context?: {
      position?: string;
      company?: string;
      industry?: string;
    },
    key: string = 'default'
  ): Promise<string[]> => {
    // Marcar como cargando
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isImproving: {
        ...prev.isImproving,
        [key]: true
      }
    }));

    try {
      const response = await fetch('/api/ai/improve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          content,
          context,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al mejorar con IA');
      }

      // Marcar como completado
      setState(prev => ({
        ...prev,
        isLoading: false,
        isImproving: {
          ...prev.isImproving,
          [key]: false
        }
      }));

      return data.improved;

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Error desconocido',
        isImproving: {
          ...prev.isImproving,
          [key]: false
        }
      }));

      throw error;
    }
  };

  const clearError = () => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  };

  const isImproving = (key: string = 'default'): boolean => {
    return state.isImproving[key] || false;
  };

  return {
    isLoading: state.isLoading,
    error: state.error,
    isImproving,
    improve,
    clearError,
  };
}

// Hook específico para notificaciones de éxito/error
export function useAINotifications() {
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showSuccess = (message: string) => {
    setNotification({ type: 'success', message });
    setTimeout(() => setNotification(null), 3000);
  };

  const showError = (message: string) => {
    setNotification({ type: 'error', message });
    setTimeout(() => setNotification(null), 5000);
  };

  const clearNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    showSuccess,
    showError,
    clearNotification,
  };
} 