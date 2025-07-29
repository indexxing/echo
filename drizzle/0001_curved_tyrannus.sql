ALTER TABLE `muted_threads` ADD `rkey` text;--> statement-breakpoint
CREATE UNIQUE INDEX `muted_threads_rkey_unique` ON `muted_threads` (`rkey`);