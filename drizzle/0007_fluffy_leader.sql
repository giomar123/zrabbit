CREATE TABLE `inventorySyncRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trigger` enum('manual','scheduled') NOT NULL,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`createdCount` int NOT NULL DEFAULT 0,
	`updatedCount` int NOT NULL DEFAULT 0,
	`skippedCount` int NOT NULL DEFAULT 0,
	`errorMessage` varchar(500),
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	CONSTRAINT `inventorySyncRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `inventory_sync_runs_started_idx` ON `inventorySyncRuns` (`startedAt`);