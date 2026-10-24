CREATE TABLE `content_versions` (
	`version` text PRIMARY KEY NOT NULL,
	`previous` text NOT NULL,
	`content` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `editor_login_attempts` (
	`bucket` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `portal_content` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`content` text NOT NULL,
	`updated` integer NOT NULL
);
