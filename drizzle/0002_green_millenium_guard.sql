CREATE TABLE `memory_block_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`block_id` integer NOT NULL,
	`label` text NOT NULL,
	`value` text NOT NULL,
	`added_by` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`block_id`) REFERENCES `memory_blocks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `memory_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`did` text NOT NULL,
	`name` text DEFAULT 'memory' NOT NULL,
	`description` text DEFAULT 'User memory' NOT NULL,
	`mutable` integer DEFAULT false NOT NULL
);
