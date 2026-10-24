CREATE TABLE `admin_config` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`identity` text NOT NULL,
	`value` text NOT NULL,
	`csrf` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pending_auth` (
	`hash` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`identity` text NOT NULL,
	`value` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `publish_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`identity` text NOT NULL,
	`status` text NOT NULL,
	`result` text,
	`created` integer NOT NULL
);
