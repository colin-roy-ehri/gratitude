import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MessageRepository } from '../repositories/messageRepository.js';
import { GemmaService } from '../services/gemmaService.js';
import { MatchService } from '../services/matchService.js';
import { deletionMessage, isFreshTimestamp, verifyEd25519 } from '../services/signing.js';
import type { SearchableFields, Coordinates, DateRange, OrientedMatch } from '../types.js';

const submitSchema = z.object({
  messageType: z.enum(['anonymized', 'text', 'public_contact_unencrypted']),
  publicKey: z.string().min(8),
  signature: z.string().min(8),
  payload: z.record(z.unknown()),
  recipientPublicKey: z.string().optional(),
});

const matchSchema = z.object({
  publicKeys: z.array(z.string().min(8)).min(1),
});

const pulseSchema = z.object({
  publicKeys: z.array(z.string().min(8)).min(1),
});

const contactSchema = z.object({
  senderPublicKey: z.string().min(8),
  recipientPublicKey: z.string().min(8),
  encryptedPayload: z.string().min(8),
  signature: z.string().min(8),
});

const deleteSchema = z.object({
  recordType: z.enum(['message', 'contact']),
  recordId: z.string().min(1),
  timestamp: z.number().int(),
  signature: z.string().min(8),
});

export async function registerMessageRoutes(app: FastifyInstance): Promise<void> {
  const repo = new MessageRepository();
  const matchService = new MatchService();
  const gemmaService = new GemmaService();

  app.post('/v1/messages/submit', async (request, reply) => {
    const parsed = submitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const input = parsed.data;
    const searchable = extractSearchable(input.payload);

    const stored = await repo.insertMessage({
      messageType: input.messageType,
      publicKey: input.publicKey,
      signature: input.signature,
      payload: input.payload,
      searchable,
      recipientPublicKey: input.recipientPublicKey,
    });

    if (input.messageType === 'text' && input.recipientPublicKey) {
      await repo.pushInbox({
        recipientPublicKey: input.recipientPublicKey,
        messageType: 'text',
        content: String(input.payload.content ?? ''),
        data: {
          sourceMessageId: stored.id,
          fromPublicKey: input.publicKey,
        },
      });
    }

    return reply.code(201).send({
      messageId: stored.id,
      createdAt: stored.createdAt,
      searchable,
    });
  });

  app.get('/v1/messages/poll', async (request, reply) => {
    const q = request.query as { publicKey?: string; since?: string };
    if (!q.publicKey) {
      return reply.code(400).send({ error: 'publicKey is required' });
    }

    const messages = await repo.pollInbox(q.publicKey, q.since);
    return { messages };
  });

  app.post('/v1/connect/match', async (request, reply) => {
    const parsed = matchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const { publicKeys } = parsed.data;

    const myMessages = await repo.listMessagesByPublicKeys(publicKeys);
    const globalMessages = await repo.listAnonymizedMessages(500);

    const matches = matchService.findMatches(myMessages, globalMessages);

    // Push matches to the inboxes of both parties involved in the match
    const allMessages = new Map([...myMessages, ...globalMessages].map((m) => [m.id, m]));

    // Caller-oriented view of each match for the response payload. Lets the
    // post-skill chain (community-offer/need) populate matchCache without
    // needing a follow-up inbox poll to learn theirPublicKey.
    const callerKeySet = new Set(publicKeys);
    const orientedMatches: OrientedMatch[] = [];

    for (const match of matches) {
      const leftMsg = allMessages.get(match.leftMessageId);
      const rightMsg = allMessages.get(match.rightMessageId);

      if (!leftMsg || !rightMsg) continue;

      // Orient relative to the caller. If neither side is the caller (shouldn't
      // happen since matchService draws "mine" from publicKeys, but be safe),
      // fall back to left=mine for a stable shape.
      const leftIsMine = callerKeySet.has(leftMsg.publicKey);
      const mine = leftIsMine ? leftMsg : rightMsg;
      const theirs = leftIsMine ? rightMsg : leftMsg;
      orientedMatches.push({
        ...match,
        yourMessageId: mine.id,
        yourPublicKey: mine.publicKey,
        yourUnspscCode: mine.searchable.unspscCode,
        theirMessageId: theirs.id,
        theirPublicKey: theirs.publicKey,
        theirUnspscCode: theirs.searchable.unspscCode,
      });

      const matchId = [leftMsg.id, rightMsg.id].sort().join(':');

      const leftExists = await repo.findExistingMatchNotification(leftMsg.publicKey, matchId);
      if (!leftExists) {
        await repo.pushInbox({
          recipientPublicKey: leftMsg.publicKey,
          messageType: 'match',
          content: `You have a new match! ${match.reason}`,
          data: {
            match,
            matchId,
            yourMessageId: leftMsg.id,
            yourUnspscCode: leftMsg.searchable.unspscCode,
            theirMessageId: rightMsg.id,
            theirPublicKey: rightMsg.publicKey,
            theirUnspscCode: rightMsg.searchable.unspscCode,
          },
        });
      }

      const rightExists = await repo.findExistingMatchNotification(rightMsg.publicKey, matchId);
      if (!rightExists) {
        await repo.pushInbox({
          recipientPublicKey: rightMsg.publicKey,
          messageType: 'match',
          content: `You have a new match! ${match.reason}`,
          data: {
            match,
            matchId,
            yourMessageId: rightMsg.id,
            yourUnspscCode: rightMsg.searchable.unspscCode,
            theirMessageId: leftMsg.id,
            theirPublicKey: leftMsg.publicKey,
            theirUnspscCode: leftMsg.searchable.unspscCode,
          },
        });
      }
    }

    return {
      keyCount: publicKeys.length,
      myMessageCount: myMessages.length,
      globalMessageCount: globalMessages.length,
      matches: orientedMatches,
    };
  });

  app.post('/v1/connect/pulse', async (request, reply) => {
    const parsed = pulseSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const { publicKeys } = parsed.data;

    const since = new Date();
    since.setDate(since.getDate() - 7);
    const callerKeys = new Set(publicKeys);
    const communityActivityReport = await repo.getCommunityActivityReport(callerKeys, since);
    const communityActivitySummary = await gemmaService.generateCommunityReport(
      communityActivityReport,
    );

    return { communityActivitySummary };
  });

  app.patch('/v1/inbox/messages/:id/read', async (request, reply) => {
    const params = request.params as { id?: string };
    const inboxMessageId = params.id;

    if (!inboxMessageId) {
      return reply.code(400).send({ error: 'Message ID is required' });
    }

    // In a real app, you'd also verify that the authenticated user
    // has permission to mark this specific message as read.
    // For now, we'll allow any message to be marked.
    await repo.markInboxMessageAsRead(inboxMessageId);

    return reply.code(200).send({ ok: true });
  });

  app.post('/v1/contact/share', async (request, reply) => {
    const parsed = contactSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const reachable = await repo.hasAnonymizedMessageForKey(parsed.data.recipientPublicKey);
    if (!reachable) {
      return reply.code(403).send({ error: 'recipient not reachable' });
    }

    const stored = await repo.insertEncryptedContact(parsed.data);

    await repo.pushInbox({
      recipientPublicKey: parsed.data.recipientPublicKey,
      messageType: 'contact_info',
      content: 'Encrypted contact details received',
      data: {
        encryptedPayload: parsed.data.encryptedPayload,
        senderPublicKey: parsed.data.senderPublicKey,
        contactRecordId: stored.id,
      },
    });

    return reply.code(201).send({
      contactRecordId: stored.id,
      createdAt: stored.createdAt,
    });
  });

  app.post('/v1/records/delete', async (request, reply) => {
    const parsed = deleteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const { recordType, recordId, timestamp, signature } = parsed.data;
    const unauthorized = () => reply.code(403).send({ error: 'unauthorized' });

    if (!isFreshTimestamp(timestamp)) return unauthorized();

    const canonical = deletionMessage(recordType, recordId, timestamp);

    if (recordType === 'message') {
      const msg = await repo.getMessageById(recordId);
      if (!msg) return unauthorized();
      if (!verifyEd25519(msg.publicKey, canonical, signature)) return unauthorized();

      await repo.deleteMessage(recordId);
      if (msg.messageType === 'text') {
        await repo.deleteInboxBySourceMessageId(recordId);
      }
      return reply.code(200).send({ ok: true });
    }

    const contact = await repo.getContactById(recordId);
    if (!contact) return unauthorized();
    if (!verifyEd25519(contact.senderPublicKey, canonical, signature)) return unauthorized();

    await repo.deleteContact(recordId);
    await repo.deleteInboxByContactRecordId(recordId);
    return reply.code(200).send({ ok: true });
  });

  app.post('/v1/dev/simulate', async (request, reply) => {
    if (process.env.ENABLE_DEV_ROUTES !== 'true') {
      return reply.code(404).send({ error: 'Not found' });
    }

    const body = request.body as { recipientPublicKey?: string };
    if (!body.recipientPublicKey) {
      return reply.code(400).send({ error: 'recipientPublicKey required' });
    }

    const msg = await repo.pushInbox({
      recipientPublicKey: body.recipientPublicKey,
      messageType: 'story',
      content: 'Gratitude story: hygiene supplies reached 14 families.',
      data: {
        needed: 'hygiene supplies',
        offered: 'community stock + rides',
        context: 'Delivered same day through local coordination',
      },
    });

    return { messageId: msg.id };
  });
}

function extractSearchable(payload: Record<string, unknown>) {
  const unspscCode = toNumber(payload.unspscCode);

  const lat = toNumber(payload.latitude) ?? toNumber((payload.location as Record<string, unknown> | undefined)?.latitude);
  const lng = toNumber(payload.longitude) ?? toNumber((payload.location as Record<string, unknown> | undefined)?.longitude);

  const startTimestamp =
    toNumber(payload.startTimestamp) ??
    toNumber((payload.dateRange as Record<string, unknown> | undefined)?.startTimestamp);

  const endTimestamp =
    toNumber(payload.endTimestamp) ??
    toNumber((payload.dateRange as Record<string, unknown> | undefined)?.endTimestamp);

  const cronSchedule = typeof payload.cronSchedule === 'string' ? payload.cronSchedule : undefined;

  const searchable: SearchableFields = {};
  if (unspscCode !== undefined) searchable.unspscCode = unspscCode;
  if (lat !== undefined && lng !== undefined) {
    const location: Coordinates = { latitude: lat, longitude: lng };
    searchable.location = location;
  }
  if (startTimestamp !== undefined || endTimestamp !== undefined) {
    const dateRange: DateRange = {};
    if (startTimestamp !== undefined) dateRange.startTimestamp = startTimestamp;
    if (endTimestamp !== undefined) dateRange.endTimestamp = endTimestamp;
    searchable.dateRange = dateRange;
  }
  if (cronSchedule !== undefined) searchable.cronSchedule = cronSchedule;
  return searchable;
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}
