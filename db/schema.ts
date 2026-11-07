import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  tags: text('tags').notNull(),
  filename: text('filename').notNull(),
  contentType: text('content_type').notNull(),
  createdAt: integer('created_at').notNull(),
});
