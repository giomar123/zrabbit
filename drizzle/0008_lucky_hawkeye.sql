CREATE TABLE `inventorySyncSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`lastScheduledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventorySyncSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventorySyncSettings_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
