import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { getConversationHistory, getPatientConversationHistory, addMessage, updateConversationStatus } from '../services/conversations';
import { sendSMS } from '../services/twilio';

export async function conversationsAPI(req: Request, res: Response) {
  try {
    const path = req.path.replace('/conversations', '');
    const method = req.method;

    // GET /conversations/patient/:patientId - Get all messages for a patient
    if (method === 'GET' && path.startsWith('/patient/')) {
      const patientId = path.split('/')[2];
      if (!patientId) {
        res.status(400).json({ error: 'Patient ID required' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await getPatientConversationHistory(patientId, limit);

      // Group messages by conversation for better organization
      const conversationGroups: { [key: string]: typeof messages } = {};
      messages.forEach(message => {
        if (!conversationGroups[message.conversation_id]) {
          conversationGroups[message.conversation_id] = [];
        }
        conversationGroups[message.conversation_id].push(message);
      });

      res.json({
        patient_id: patientId,
        conversations: conversationGroups,
        total_messages: messages.length
      });
      return;
    }

    // GET /conversations/:conversationId - Get messages for a specific conversation
    if (method === 'GET' && path.match(/^\/[a-zA-Z0-9]+$/)) {
      const conversationId = path.substring(1);
      const messages = await getConversationHistory(conversationId);

      // Get conversation metadata
      const conversationDoc = await admin.firestore().collection('conversations').doc(conversationId).get();
      if (!conversationDoc.exists) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      res.json({
        conversation: {
          id: conversationId,
          ...conversationDoc.data(),
          created_at: conversationDoc.data()?.created_at?.toDate?.()?.toISOString() || conversationDoc.data()?.created_at,
          updated_at: conversationDoc.data()?.updated_at?.toDate?.()?.toISOString() || conversationDoc.data()?.updated_at,
          last_message_at: conversationDoc.data()?.last_message_at?.toDate?.()?.toISOString() || conversationDoc.data()?.last_message_at
        },
        messages
      });
      return;
    }

    // POST /conversations/:conversationId/messages - Send a message (staff reply)
    if (method === 'POST' && path.match(/^\/[a-zA-Z0-9]+\/messages$/)) {
      const conversationId = path.split('/')[1];
      const { message, staff_user_id } = req.body;

      if (!message || !staff_user_id) {
        res.status(400).json({ error: 'Message and staff_user_id are required' });
        return;
      }

      // Get conversation details
      const conversationDoc = await admin.firestore().collection('conversations').doc(conversationId).get();
      if (!conversationDoc.exists) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      const conversation = conversationDoc.data();
      const patientId = conversation?.patient_id;

      // Get patient phone number
      const patientDoc = await admin.firestore().collection('patients').doc(patientId).get();
      if (!patientDoc.exists) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      const patient = patientDoc.data();
      const phoneNumber = patient?.phone_e164;

      // Send SMS
      const smsResult = await sendSMS({
        to: phoneNumber,
        message: message
      });

      // Add message to conversation
      const messageId = await addMessage(
        conversationId,
        patientId,
        'outbound',
        message,
        smsResult.messageSid,
        'staff_reply',
        {
          staff_user_id: staff_user_id
        }
      );

      // Log audit event
      await admin.firestore().collection('audit_events').add({
        actor: staff_user_id,
        entity: 'conversation',
        entity_id: conversationId,
        event: 'staff_message_sent',
        timestamp: admin.firestore.Timestamp.now(),
        meta: {
          message_id: messageId,
          patient_id: patientId,
          message_preview: message.substring(0, 100)
        }
      });

      res.json({
        success: true,
        message_id: messageId,
        sms_sid: smsResult.messageSid
      });
      return;
    }

    // PUT /conversations/:conversationId/status - Update conversation status
    if (method === 'PUT' && path.match(/^\/[a-zA-Z0-9]+\/status$/)) {
      const conversationId = path.split('/')[1];
      const { status, staff_user_id } = req.body;

      if (!status || !['active', 'resolved', 'escalated'].includes(status)) {
        res.status(400).json({ error: 'Valid status required (active, resolved, escalated)' });
        return;
      }

      await updateConversationStatus(conversationId, status);

      // Log audit event
      if (staff_user_id) {
        await admin.firestore().collection('audit_events').add({
          actor: staff_user_id,
          entity: 'conversation',
          entity_id: conversationId,
          event: 'status_updated',
          timestamp: admin.firestore.Timestamp.now(),
          meta: {
            new_status: status
          }
        });
      }

      res.json({ success: true });
      return;
    }

    // GET /conversations - List all conversations with filters
    if (method === 'GET' && path === '') {
      const { patient_id, status = 'active', limit = 50, offset = 0 } = req.query;

      let query = admin.firestore().collection('conversations') as admin.firestore.Query;

      if (patient_id) {
        query = query.where('patient_id', '==', patient_id);
      }

      if (status && status !== 'all') {
        query = query.where('status', '==', status);
      }

      query = query.orderBy('updated_at', 'desc')
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      const conversationsQuery = await query.get();

      const conversations = conversationsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at,
        last_message_at: doc.data().last_message_at?.toDate?.()?.toISOString() || doc.data().last_message_at
      }));

      res.json({
        conversations,
        total: conversationsQuery.size,
        filters: { patient_id, status, limit, offset }
      });
      return;
    }

    res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('Conversations API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}