CREATE TABLE `interactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uri` text,
	`did` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interactions_uri_unique` ON `interactions` (`uri`);--> statement-breakpoint
CREATE TABLE `muted_threads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uri` text,
	`muted_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `muted_threads_uri_unique` ON `muted_threads` (`uri`);