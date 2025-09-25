import * as admin from 'firebase-admin';
import { Conversation, Message } from '../types';

export async function getOrCreateConversation(patientId: string): Promise<string> {
  // Simplified: Just create a new conversation for now to avoid index issues
  // TODO: Add proper conversation reuse logic after creating the composite index

  // Create new conversation
  const conversationRef = await admin.firestore().collection('conversations').add({
    patient_id: patientId,
    created_at: admin.firestore.Timestamp.now(),
    updated_at: admin.firestore.Timestamp.now(),
    message_count: 0,
    last_message_at: admin.firestore.Timestamp.now(),
    status: 'active'
  });

  return conversationRef.id;
}

export async function addMessage(
  conversationId: string,
  patientId: string,
  direction: 'inbound' | 'outbound',
  content: string,
  messageSid: string,
  messageType: Message['message_type'],
  metadata?: Message['metadata']
): Promise<string> {
  const messageData: Omit<Message, 'id'> = {
    conversation_id: conversationId,
    patient_id: patientId,
    direction,
    content,
    message_sid: messageSid,
    timestamp: new Date().toISOString(),
    message_type: messageType,
    metadata: metadata || {},
    processed: false
  };

  // Add message to messages collection
  const messageRef = await admin.firestore().collection('messages').add({
    ...messageData,
    timestamp: admin.firestore.Timestamp.now()
  });

  // Update conversation metadata
  await admin.firestore().collection('conversations').doc(conversationId).update({
    updated_at: admin.firestore.Timestamp.now(),
    last_message_at: admin.firestore.Timestamp.now(),
    message_count: admin.firestore.FieldValue.increment(1)
  });

  return messageRef.id;
}

export async function getConversationHistory(conversationId: string): Promise<Message[]> {
  const messagesQuery = await admin.firestore().collection('messages')
    .where('conversation_id', '==', conversationId)
    .orderBy('timestamp', 'asc')
    .get();

  return messagesQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp.toDate().toISOString()
  })) as Message[];
}

export async function getPatientConversationHistory(patientId: string, limit = 50): Promise<Message[]> {
  const messagesQuery = await admin.firestore().collection('messages')
    .where('patient_id', '==', patientId)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return messagesQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp.toDate().toISOString()
  })) as Message[];
}

export async function markMessageProcessed(messageId: string): Promise<void> {
  await admin.firestore().collection('messages').doc(messageId).update({
    processed: true
  });
}

export async function updateConversationStatus(conversationId: string, status: Conversation['status']): Promise<void> {
  await admin.firestore().collection('conversations').doc(conversationId).update({
    status,
    updated_at: admin.firestore.Timestamp.now()
  });
}