import { config } from '../config.js';
import { getFirestore } from '../firestore.js';
import { CommunityActivityReport, InboxMessage, MessageDocument, UnspscTally } from '../types.js';

export class MessageRepository {
  private db = getFirestore();

  async insertMessage(doc: Omit<MessageDocument, 'id' | 'createdAt'>): Promise<MessageDocument> {
    const now = new Date().toISOString();
    const ref = this.db.collection(config.messagesCollection).doc();

    const stored: MessageDocument = {
      id: ref.id,
      createdAt: now,
      ...doc,
    };

    await ref.set(stored);
    return stored;
  }

  async listMessagesByPublicKeys(publicKeys: string[]): Promise<MessageDocument[]> {
    if (publicKeys.length === 0) return [];

    const chunks = chunk(publicKeys, 10);
    const out: MessageDocument[] = [];

    for (const keys of chunks) {
      const snapshot = await this.db
        .collection(config.messagesCollection)
        .where('publicKey', 'in', keys)
        .get();

      snapshot.forEach((doc) => out.push(doc.data() as MessageDocument));
    }

    return out;
  }

  async listAnonymizedMessages(limit = 500): Promise<MessageDocument[]> {
    const snapshot = await this.db
      .collection(config.messagesCollection)
      .where('messageType', '==', 'anonymized')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((d) => d.data() as MessageDocument);
  }

  async pushInbox(msg: Omit<InboxMessage, 'id' | 'createdAt' | 'read'>): Promise<InboxMessage> {
    const now = new Date().toISOString();
    const ref = this.db.collection(config.inboxCollection).doc();
    const stored: InboxMessage = {
      id: ref.id,
      createdAt: now,
      read: false,
      ...msg,
    };
    await ref.set(stored);
    return stored;
  }

  async pollInbox(recipientPublicKey: string, since?: string): Promise<InboxMessage[]> {
    let query: FirebaseFirestore.Query = this.db
      .collection(config.inboxCollection)
      .where('recipientPublicKey', '==', recipientPublicKey)
      .orderBy('createdAt', 'asc');

    if (since) {
      query = query.where('createdAt', '>', since);
    }

    const snapshot = await query.limit(200).get();
    return snapshot.docs.map((d) => d.data() as InboxMessage);
  }

  async findExistingMatchNotification(recipientPublicKey: string, matchId: string): Promise<boolean> {
    const snapshot = await this.db
      .collection(config.inboxCollection)
      .where('recipientPublicKey', '==', recipientPublicKey)
      .where('data.matchId', '==', matchId)
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  async markInboxMessageAsRead(inboxMessageId: string): Promise<void> {
    const ref = this.db.collection(config.inboxCollection).doc(inboxMessageId);
    await ref.update({ read: true });
  }

  async getCommunityActivityReport(
    callerPublicKeys: Set<string>,
    since: Date,
  ): Promise<CommunityActivityReport> {
    const sinceIso = since.toISOString();

    // 1. Get recent third-party contact events
    const contactsSnapshot = await this.db
      .collection(config.inboxCollection)
      .where('messageType', '==', 'contact_info')
      .where('createdAt', '>=', sinceIso)
      .get();

    let connectionCount = 0;
    contactsSnapshot.forEach((doc) => {
      const msg = doc.data() as InboxMessage;
      const sender = msg.data?.senderPublicKey;
      if (
        !callerPublicKeys.has(msg.recipientPublicKey) &&
        sender &&
        typeof sender === 'string' &&
        !callerPublicKeys.has(sender)
      ) {
        connectionCount++;
      }
    });

    // 2. Get top active UNSPSC codes from third-party messages
    const messagesSnapshot = await this.db
      .collection(config.messagesCollection)
      .where('messageType', '==', 'anonymized')
      .where('createdAt', '>=', sinceIso)
      .get();

    const unspscCounts: Record<number, number> = {};
    messagesSnapshot.forEach((doc) => {
      const msg = doc.data() as MessageDocument;
      if (!callerPublicKeys.has(msg.publicKey) && msg.searchable.unspscCode) {
        const code = msg.searchable.unspscCode;
        unspscCounts[code] = (unspscCounts[code] || 0) + 1;
      }
    });

    const topActiveUnspscs = Object.entries(unspscCounts)
      .map(([code, count]) => ({ code: Number(code), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { connectionCount, topActiveUnspscs };
  }

  async hasAnonymizedMessageForKey(publicKey: string): Promise<boolean> {
    const snapshot = await this.db
      .collection(config.messagesCollection)
      .where('publicKey', '==', publicKey)
      .where('messageType', '==', 'anonymized')
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  async getMessageById(id: string): Promise<MessageDocument | null> {
    const snap = await this.db.collection(config.messagesCollection).doc(id).get();
    return snap.exists ? (snap.data() as MessageDocument) : null;
  }

  async deleteMessage(id: string): Promise<void> {
    await this.db.collection(config.messagesCollection).doc(id).delete();
  }

  async deleteInboxBySourceMessageId(sourceMessageId: string): Promise<number> {
    const snapshot = await this.db
      .collection(config.inboxCollection)
      .where('data.sourceMessageId', '==', sourceMessageId)
      .get();
    if (snapshot.empty) return 0;
    const batch = this.db.batch();
    snapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return snapshot.size;
  }

  async getContactById(id: string): Promise<{ senderPublicKey: string } | null> {
    const snap = await this.db.collection(config.contactsCollection).doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data() as { senderPublicKey?: string } | undefined;
    if (!data || typeof data.senderPublicKey !== 'string') return null;
    return { senderPublicKey: data.senderPublicKey };
  }

  async deleteContact(id: string): Promise<void> {
    await this.db.collection(config.contactsCollection).doc(id).delete();
  }

  async deleteInboxByContactRecordId(contactRecordId: string): Promise<number> {
    const snapshot = await this.db
      .collection(config.inboxCollection)
      .where('data.contactRecordId', '==', contactRecordId)
      .get();
    if (snapshot.empty) return 0;
    const batch = this.db.batch();
    snapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return snapshot.size;
  }

  async insertEncryptedContact(input: {
    senderPublicKey: string;
    recipientPublicKey: string;
    encryptedPayload: string;
    signature: string;
  }): Promise<{ id: string; createdAt: string }> {
    const now = new Date().toISOString();
    const ref = this.db.collection(config.contactsCollection).doc();
    await ref.set({
      id: ref.id,
      createdAt: now,
      ...input,
    });
    return { id: ref.id, createdAt: now };
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
