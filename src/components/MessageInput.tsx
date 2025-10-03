'use client';

import { useState } from 'react';
import { User } from '@/types';

interface MessageInputProps {
  users: User[];
  onAddUser: (name: string, email?: string) => Promise<User>;
  onSendMessage: (userId: string, userName: string, message: string) => Promise<void>;
  isProcessing: boolean;
}

export default function MessageInput({ users, onAddUser, onSendMessage, isProcessing }: MessageInputProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newUserName, setNewUserName] = useState('');
  const [message, setMessage] = useState('');
  const [showNewUserForm, setShowNewUserForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let userId = selectedUserId;
    let userName = '';

    // If creating a new user
    if (showNewUserForm && newUserName.trim()) {
      try {
        const newUser = await onAddUser(newUserName.trim());
        userId = newUser.id;
        userName = newUser.name;
        setNewUserName('');
        setShowNewUserForm(false);
      } catch (error) {
        console.error('Error creating user:', error);
        return;
      }
    } else if (selectedUserId) {
      const user = users.find(u => u.id === selectedUserId);
      userName = user?.name || '';
    }

    if (userId && message.trim()) {
      try {
        await onSendMessage(userId, userName, message.trim());
        setMessage('');
      } catch (error) {
        console.error('Failed to send message:', error);
        alert('Failed to process message. Please try again.');
      }
    }
  };


  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">Add Availability Message</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select User
          </label>
          
          {!showNewUserForm ? (
            <div className="flex gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={!showNewUserForm}
              >
                <option value="">Select a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewUserForm(true)}
                className="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add New User
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Enter user name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => {
                  setShowNewUserForm(false);
                  setNewUserName('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Availability Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="I'm available tomorrow from 2-4 PM"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing || (!selectedUserId && !showNewUserForm)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Find me a time'}
        </button>
      </form>

    </div>
  );
}
