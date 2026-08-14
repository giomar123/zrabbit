CREATE TABLE `customerAddresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`label` varchar(80) NOT NULL,
	`recipientName` varchar(160) NOT NULL,
	`phone` varchar(40),
	`address` text NOT NULL,
	`district` varchar(120) NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customerAddresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `customer_addresses_email_idx` ON `customerAddresses` (`customerEmail`);--> statement-breakpoint
CREATE INDEX `customer_addresses_default_idx` ON `customerAddresses` (`customerEmail`,`isDefault`);