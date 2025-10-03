'use client';

import { AvailabilitySlot, User } from '@/types';
import { formatDateTime } from '@/lib/dateUtils';

interface ParsedTimeBlocksProps {
  timeBlocks: AvailabilitySlot[];
  users: User[];
  onDeleteBlock: (blockId: string) => void;
  isProcessing: boolean;
}

export default function ParsedTimeBlocks({ 
  timeBlocks, 
  users, 
  onDeleteBlock, 
  isProcessing 
}: ParsedTimeBlocksProps) {
  if (timeBlocks.length === 0) {
    return null;
  }

  const getUserById = (userId: string) => {
    return users.find(user => user.id === userId);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'busy':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'preferred':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'unavailable':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'available':
        return '✅';
      case 'busy':
        return '❌';
      case 'preferred':
        return '⭐';
      case 'unavailable':
        return '🚫';
      default:
        return '📅';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">Parsed Time Blocks</h3>
      
      {isProcessing && (
        <div className="flex items-center gap-2 text-blue-600 mb-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm">Processing your message...</span>
        </div>
      )}

      <div className="space-y-3">
        {timeBlocks.map((block) => {
          const user = getUserById(block.userId);
          const startTime = block.startTime instanceof Date ? block.startTime : new Date(block.startTime);
          const endTime = block.endTime instanceof Date ? block.endTime : new Date(block.endTime);
          
          return (
            <div
              key={block.id}
              className={`border rounded-lg p-4 ${getTypeColor(block.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getTypeIcon(block.type)}</span>
                    <span className="font-medium capitalize">{block.type}</span>
                    <span className="text-sm opacity-75">
                      ({Math.round(block.confidence * 100)}% confidence)
                    </span>
                  </div>
                  
                  <div className="text-sm mb-2">
                    <div className="font-medium">
                      {user?.name || block.userName || 'Unknown User'}
                    </div>
                    <div className="text-gray-600">
                      {formatDateTime(startTime)} - {formatDateTime(endTime)}
                    </div>
                  </div>
                  
                  {block.originalText && (
                    <div className="text-xs text-gray-500 mb-2">
                      <span className="font-medium">From message:</span> "{block.originalText}"
                    </div>
                  )}
                  
                  {block.notes && (
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Notes:</span> {block.notes}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => onDeleteBlock(block.id)}
                  disabled={isProcessing}
                  className="ml-4 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete this time block"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        {timeBlocks.length} time block{timeBlocks.length !== 1 ? 's' : ''} parsed from your message
      </div>
    </div>
  );
}
