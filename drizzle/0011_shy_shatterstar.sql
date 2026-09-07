CREATE TABLE `stockNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`status` enum('pending','sent') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`notifiedAt` timestamp,
	CONSTRAINT `stockNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `stock_notifications_product_idx` ON `stockNotifications` (`productId`,`status`);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_notifications_product_email_uq` ON `stockNotifications` (`productId`,`email`);
