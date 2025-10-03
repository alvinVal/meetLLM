'use client';

import { useState } from 'react';
import { User, AvailabilitySlot } from '@/types';
import { formatDateTime } from '@/lib/dateUtils';

interface TeamMemberPopupProps {
  user: User;
  userSlots: AvailabilitySlot[];
  isOpen: boolean;
  onClose: () => void;
  onDeleteUser: (userId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onClearAllSlots: (userId: string) => void;
}

export default function TeamMemberPopup({
  user,
  userSlots,
  isOpen,
  onClose,
  onDeleteUser,
  onDeleteSlot,
  onClearAllSlots
}: TeamMemberPopupProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

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

  const handleDeleteUser = () => {
    if (confirm(`Are you sure you want to delete ${user.name}? This will remove all their availability slots and cannot be undone.`)) {
      onDeleteUser(user.id);
      onClose();
    }
  };

  const handleDeleteSlot = (slotId: string) => {
    if (confirm('Are you sure you want to delete this availability slot?')) {
      onDeleteSlot(slotId);
    }
  };

  const handleClearAllSlots = () => {
    if (confirm(`Are you sure you want to clear all availability slots for ${user.name}?`)) {
      onClearAllSlots(user.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: user.color }}
            />
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <span className="text-sm text-gray-500">
              ({userSlots.length} availability slot{userSlots.length !== 1 ? 's' : ''})
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* User Info */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">User Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Name:</span>
                  <span className="ml-2">{user.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Email:</span>
                  <span className="ml-2">{user.email || 'Not provided'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Color:</span>
                  <div className="inline-flex items-center gap-2 ml-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: user.color }}
                    />
                    <span className="text-xs font-mono">{user.color}</span>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Created:</span>
                  <span className="ml-2">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Availability Slots */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Availability Slots</h3>
              {userSlots.length > 0 && (
                <button
                  onClick={handleClearAllSlots}
                  className="text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded"
                >
                  Clear All
                </button>
              )}
            </div>

            {userSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📅</div>
                <p>No availability slots found</p>
                <p className="text-sm">Add availability by sending a message</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userSlots.map((slot) => {
                  const startTime = slot.startTime instanceof Date ? slot.startTime : new Date(slot.startTime);
                  const endTime = slot.endTime instanceof Date ? slot.endTime : new Date(slot.endTime);
                  
                  return (
                    <div
                      key={slot.id}
                      className={`border rounded-lg p-4 ${getTypeColor(slot.type)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{getTypeIcon(slot.type)}</span>
                            <span className="font-medium capitalize">{slot.type}</span>
                            <span className="text-sm opacity-75">
                              ({Math.round(slot.confidence * 100)}% confidence)
                            </span>
                          </div>
                          
                          <div className="text-sm mb-2">
                            <div className="font-medium">
                              {formatDateTime(startTime)} - {formatDateTime(endTime)}
                            </div>
                          </div>
                          
                          {slot.originalText && (
                            <div className="text-xs text-gray-500 mb-2">
                              <span className="font-medium">From message:</span> "{slot.originalText}"
                            </div>
                          )}
                          
                          {slot.notes && (
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">Notes:</span> {slot.notes}
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="ml-4 text-red-600 hover:text-red-800"
                          title="Delete this availability slot"
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
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {userSlots.length} availability slot{userSlots.length !== 1 ? 's' : ''} • 
            {userSlots.filter(s => s.type === 'available').length} available • 
            {userSlots.filter(s => s.type === 'preferred').length} preferred
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Close
            </button>
            <button
              onClick={handleDeleteUser}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
