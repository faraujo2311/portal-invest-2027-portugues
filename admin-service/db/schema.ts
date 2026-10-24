import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const adminConfig=sqliteTable('admin_config',{id:text('id').primaryKey(),value:text('value').notNull(),updated:integer('updated').notNull()});
export const pendingAuth=sqliteTable('pending_auth',{hash:text('hash').primaryKey(),kind:text('kind').notNull(),identity:text('identity').notNull(),value:text('value').notNull(),expires:integer('expires').notNull()});
export const adminSessions=sqliteTable('admin_sessions',{hash:text('hash').primaryKey(),identity:text('identity').notNull(),value:text('value').notNull(),csrf:text('csrf').notNull(),expires:integer('expires').notNull()});
export const publishOperations=sqliteTable('publish_operations',{id:text('id').primaryKey(),identity:text('identity').notNull(),status:text('status').notNull(),result:text('result'),created:integer('created').notNull()});

export const portalContent=sqliteTable('portal_content',{id:integer('id').primaryKey(),version:text('version').notNull(),content:text('content').notNull(),updated:integer('updated').notNull()});
export const contentVersions=sqliteTable('content_versions',{version:text('version').primaryKey(),previous:text('previous').notNull(),content:text('content').notNull(),created:integer('created').notNull()});
export const editorLoginAttempts=sqliteTable('editor_login_attempts',{bucket:text('bucket').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull()});
