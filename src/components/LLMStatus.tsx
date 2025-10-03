'use client';

import { useState, useEffect } from 'react';
import { getLLMStatus } from '@/lib/llmService';

interface LLMStatusInfo {
  provider: string;
  model: string;
  isLocal: boolean;
  available: boolean;
  availableModels?: string[];
  error?: string;
  baseUrl?: string;
}

export default function LLMStatus() {
  const [status, setStatus] = useState<LLMStatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const statusInfo = await getLLMStatus();
        setStatus(statusInfo);
      } catch (error) {
        console.error('Failed to get LLM status:', error);
        setStatus({
          provider: 'unknown',
          model: 'unknown',
          isLocal: false,
          available: false,
          error: 'Failed to check status'
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gray-100 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Checking LLM status...</span>
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const getStatusColor = () => {
    if (!status.available) return 'bg-red-100 border-red-200 text-red-800';
    if (status.isLocal) return 'bg-blue-100 border-blue-200 text-blue-800';
    return 'bg-green-100 border-green-200 text-green-800';
  };

  const getStatusIcon = () => {
    if (!status.available) return '❌';
    if (status.isLocal) return '🏠';
    return '☁️';
  };

  return (
    <div className={`rounded-lg p-3 border ${getStatusColor()}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <div>
          <div className="font-medium text-sm">
            {status.provider.charAt(0).toUpperCase() + status.provider.slice(1)} LLM
          </div>
          <div className="text-xs opacity-75">
            Model: {status.model}
          </div>
        </div>
      </div>

      {status.available ? (
        <div className="text-xs">
          <div className="flex items-center gap-1 mb-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Ready for message processing</span>
          </div>
          {status.isLocal && status.baseUrl && (
            <div className="text-gray-600">
              Local server: {status.baseUrl}
            </div>
          )}
          {status.availableModels && status.availableModels.length > 0 && (
            <div className="text-gray-600">
              Available models: {status.availableModels.slice(0, 3).join(', ')}
              {status.availableModels.length > 3 && ` +${status.availableModels.length - 3} more`}
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs">
          <div className="flex items-center gap-1 mb-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Not available</span>
          </div>
          {status.error && (
            <div className="text-red-700 font-medium">
              {status.error}
            </div>
          )}
          {status.provider === 'ollama' && (
            <div className="mt-2 text-gray-700">
              <div>To fix:</div>
              <div>1. Run: <code className="bg-black bg-opacity-20 px-1 rounded">ollama serve</code></div>
              <div>2. Pull model: <code className="bg-black bg-opacity-20 px-1 rounded">ollama pull {status.model}</code></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
