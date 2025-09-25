import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  CameraIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { PatientSummary, StaffAction, Message } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import TemplateSelector from './TemplateSelector';

interface PatientReviewDrawerProps {
  patient: PatientSummary;
  onClose: () => void;
  onAction: (action: string, payload: any) => Promise<void>;
}

export default function PatientReviewDrawer({
  patient,
  onClose,
  onAction
}: PatientReviewDrawerProps) {
  const [isResolved, setIsResolved] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [note, setNote] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Fetch conversation history when drawer opens
  useEffect(() => {
    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const response = await fetch(`/api/conversations/patient/${patient.id}`);
        if (response.ok) {
          const data = await response.json();
          // Flatten all messages from all conversations and sort by timestamp
          const allMessages = Object.values(data.conversations).flat() as Message[];
          allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setMessages(allMessages);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [patient.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      // Find the active conversation or use the most recent one
      const activeConversation = messages.length > 0 ? messages[messages.length - 1].conversation_id : null;

      if (!activeConversation) {
        console.error('No conversation found to send message to');
        return;
      }

      const response = await fetch(`/api/conversations/${activeConversation}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage,
          staff_user_id: 'staff-user-1' // TODO: Get from auth context
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Add the new message to the local state
        const newMsg: Message = {
          id: result.message_id,
          conversation_id: activeConversation,
          patient_id: patient.id,
          direction: 'outbound',
          content: newMessage,
          message_sid: result.sms_sid,
          timestamp: new Date().toISOString(),
          message_type: 'staff_reply',
          metadata: {
            staff_user_id: 'staff-user-1'
          },
          processed: true
        };

        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAction = async (action: string, payload: any = {}) => {
    setIsLoading(true);
    try {
      await onAction(action, { ...payload, note });
      if (action === 'resolved') {
        setIsResolved(true);
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition.Root show={true} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <div className="fixed inset-0" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Header */}
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                              {patient.first_name} {patient.last_initial}.
                            </h2>
                            <p className="text-sm text-gray-500">
                              {patient.procedure_type} • Day {patient.days_post_op}
                            </p>
                          </div>
                          <div className={`risk-badge ${
                            patient.risk_level === 'red' ? 'risk-badge-red' :
                            patient.risk_level === 'yellow' ? 'risk-badge-yellow' : 'risk-badge-green'
                          } capitalize`}>
                            {patient.risk_level}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!isResolved && (
                            <button
                              onClick={() => handleAction('resolved')}
                              disabled={isLoading}
                              className="btn-primary text-sm py-1 px-3 flex items-center space-x-1"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                              <span>Mark Resolved</span>
                            </button>
                          )}
                          <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-500 rounded-md hover:bg-gray-100"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                      {/* Latest Response */}
                      {patient.latest_response && (
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-sm font-medium text-gray-900 mb-3">Latest Update</h3>
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="text-sm font-medium text-blue-900">
                                {format(new Date(patient.latest_response.received_at), 'MMM d, h:mm a')}
                              </div>
                              <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                via SMS
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Pain Level:</span>
                                <span className="font-medium text-gray-900">
                                  {patient.latest_response.pain_score !== undefined ?
                                    `${patient.latest_response.pain_score}/10` : '—'}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Bleeding:</span>
                                <span className={`font-medium ${
                                  patient.latest_response.bleeding ? 'text-red-600' : 'text-gray-900'
                                }`}>
                                  {patient.latest_response.bleeding !== null ?
                                    (patient.latest_response.bleeding ? 'Yes' : 'No') : '—'}
                                </span>
                              </div>
                              {patient.latest_response.concerns_text && (
                                <div className="mt-3">
                                  <p className="text-sm text-gray-600 mb-1">Concerns:</p>
                                  <p className="text-sm text-gray-900 italic">
                                    "{patient.latest_response.concerns_text}"
                                  </p>
                                </div>
                              )}
                            </div>

                            {patient.latest_response.voice_url && (
                              <div className="mt-3 pt-3 border-t border-blue-200">
                                <button className="flex items-center space-x-2 text-sm text-blue-700 hover:text-blue-800">
                                  <PlayIcon className="h-4 w-4" />
                                  <span>Play voice note (0:42)</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Flags and Analysis */}
                      {patient.flags.length > 0 && (
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-sm font-medium text-gray-900 mb-3">Analysis</h3>
                          <div className="space-y-2">
                            {patient.flags.map((flag, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  patient.risk_level === 'red' ? 'bg-red-500' :
                                  patient.risk_level === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                                }`} />
                                <span className="text-sm text-gray-700">
                                  {formatFlag(flag)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {patient.latest_triage?.reasons && (
                            <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                              {patient.latest_triage.reasons}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setShowTemplates(true)}
                            disabled={isLoading}
                            className="btn-secondary flex items-center justify-center space-x-2 py-2"
                          >
                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                            <span>Send Template</span>
                          </button>
                          <button
                            onClick={() => handleAction('request_photo')}
                            disabled={isLoading}
                            className="btn-secondary flex items-center justify-center space-x-2 py-2"
                          >
                            <CameraIcon className="h-4 w-4" />
                            <span>Request Photo</span>
                          </button>
                          <button
                            onClick={() => handleAction('schedule_call')}
                            disabled={isLoading}
                            className="btn-secondary flex items-center justify-center space-x-2 py-2"
                          >
                            <PhoneIcon className="h-4 w-4" />
                            <span>Schedule Call</span>
                          </button>
                          <button
                            onClick={() => handleAction('escalate')}
                            disabled={isLoading}
                            className="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-md font-medium hover:bg-red-100 flex items-center justify-center space-x-2"
                          >
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            <span>Escalate</span>
                          </button>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="px-6 py-4">
                        <label htmlFor="note" className="block text-sm font-medium text-gray-900 mb-2">
                          Add Note
                        </label>
                        <textarea
                          id="note"
                          rows={3}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Additional notes about this patient..."
                        />
                      </div>

                      {/* Conversation Thread */}
                      <div className="border-t border-gray-200 flex-1 flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-sm font-medium text-gray-900">SMS Conversation</h3>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 px-6 py-4 space-y-4 max-h-80 overflow-y-auto">
                          {loadingMessages ? (
                            <div className="text-center py-8">
                              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <p className="text-sm text-gray-500 mt-2">Loading conversation...</p>
                            </div>
                          ) : messages.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <ChatBubbleLeftRightIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm">No messages yet</p>
                            </div>
                          ) : (
                            messages.map((message, index) => (
                              <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm ${
                                  message.direction === 'outbound'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}>
                                  <p className="mb-1">{message.content}</p>
                                  <div className={`text-xs flex items-center justify-between ${
                                    message.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'
                                  }`}>
                                    <span>
                                      {format(new Date(message.timestamp), 'MMM d, h:mm a')}
                                    </span>
                                    <span className="ml-2 capitalize">
                                      {message.message_type === 'checkin_response' ? 'patient' :
                                       message.message_type === 'auto_reply' ? 'auto' :
                                       message.message_type === 'staff_reply' ? 'staff' :
                                       message.message_type}
                                    </span>
                                  </div>
                                  {message.metadata && (message.metadata.pain_score !== undefined || message.metadata.bleeding !== undefined) && (
                                    <div className={`text-xs mt-1 pt-1 border-t ${
                                      message.direction === 'outbound' ? 'border-blue-500' : 'border-gray-300'
                                    }`}>
                                      {message.metadata.pain_score !== undefined && (
                                        <span className="mr-3">Pain: {message.metadata.pain_score}/10</span>
                                      )}
                                      {message.metadata.bleeding !== undefined && (
                                        <span>Bleeding: {message.metadata.bleeding ? 'Yes' : 'No'}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Message Input */}
                        <div className="border-t border-gray-200 px-6 py-4">
                          <div className="flex space-x-3">
                            <input
                              type="text"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                              placeholder="Send a message to patient..."
                              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                              disabled={sendingMessage}
                            />
                            <button
                              onClick={handleSendMessage}
                              disabled={!newMessage.trim() || sendingMessage}
                              className="btn-primary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {sendingMessage ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <PaperAirplaneIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Message will be sent via SMS to {patient.first_name}
                          </p>
                        </div>
                      </div>
                    </div>

                    {isResolved && (
                      <div className="px-6 py-4 bg-green-50 border-t border-green-200">
                        <div className="flex items-center space-x-2 text-green-800">
                          <CheckCircleIcon className="h-5 w-5" />
                          <span className="text-sm font-medium">Patient marked as resolved</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>

        {/* Template Selector Modal */}
        {showTemplates && (
          <TemplateSelector
            patientName={patient.first_name}
            riskLevel={patient.risk_level}
            dayPostOp={patient.days_post_op}
            onSend={async (template, customMessage) => {
              await handleAction('reply_template', { template, message: customMessage });
              setShowTemplates(false);
            }}
            onClose={() => setShowTemplates(false)}
          />
        )}
      </Dialog>
    </Transition.Root>
  );
}

function formatFlag(flag: string): string {
  const flagMap: Record<string, string> = {
    'PAIN_HIGH': 'Severe pain reported (≥9/10)',
    'PAIN_MODERATE': 'Moderate pain (7-8/10)',
    'BLEEDING_YES': 'Patient reports bleeding',
    'BLEEDING_HEAVY': 'Heavy bleeding keywords detected',
    'BLEEDING_LIGHT': 'Light bleeding mentioned',
    'SWELLING_INCREASED': 'Increased swelling reported',
    'FEVER_HIGH': 'High fever (≥101°F)',
    'FEVER_MILD': 'Mild fever reported',
    'FEVER_MENTIONED': 'Fever mentioned without temperature',
    'CONCERNING_SYMPTOMS': 'Concerning symptoms detected'
  };

  return flagMap[flag] || flag.replace(/_/g, ' ').toLowerCase();
}