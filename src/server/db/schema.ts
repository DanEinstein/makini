import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export type StoredSourceLink = {
  title: string;
  description: string;
  url: string;
  icon: string;
};

/**
 * The client also models an 'idle' status, but that just means "no active
 * session" and is never persisted.
 */
export const sessionStatus = pgEnum('session_status', ['locked', 'reflecting', 'completed']);

export const messageRole = pgEnum('message_role', ['user', 'assistant', 'system']);

export const reflectionMode = pgEnum('reflection_mode', ['typed', 'spoken']);

export const usageKind = pgEnum('usage_kind', ['groq', 'elevenlabs']);

/**
 * Clerk owns identity; this table exists so study data has a foreign key to
 * hang off and so profile fields can be read without an API call per row.
 * Rows are provisioned just-in-time on the first authenticated request.
 */
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email'),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    topic: text('topic').notNull(),
    plannedMinutes: integer('planned_minutes').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    status: sessionStatus('status').notNull().default('locked'),
    scratchpadNotes: text('scratchpad_notes').notNull().default(''),
    sources: jsonb('sources').$type<StoredSourceLink[]>().notNull().default([]),
  },
  table => [index('sessions_user_started_idx').on(table.userId, table.startedAt)],
);

export const reflections = pgTable('reflections', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id')
    .notNull()
    .unique()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  inputMode: reflectionMode('input_mode').notNull().default('typed'),
  explainWithoutNotes: boolean('explain_without_notes').notNull().default(false),
  identifyEdgeCases: boolean('identify_edge_cases').notNull().default(false),
  teachSomeoneElse: boolean('teach_someone_else').notNull().default(false),
  confidenceRating: smallint('confidence_rating').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull(),
});

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    role: messageRole('role').notNull(),
    content: text('content').notNull(),
    model: text('model'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [index('chat_messages_session_created_idx').on(table.sessionId, table.createdAt)],
);

/**
 * Transcripts are stored; the audio blob is discarded after Scribe returns.
 * sessionId is optional because a learner can record before submitting.
 */
export const reflectionTranscripts = pgTable(
  'reflection_transcripts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    durationMs: integer('duration_ms').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [index('reflection_transcripts_user_created_idx').on(table.userId, table.createdAt)],
);

export const usageEvents = pgTable(
  'usage_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: usageKind('kind').notNull(),
    units: integer('units').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [index('usage_events_user_kind_created_idx').on(table.userId, table.kind, table.createdAt)],
);
