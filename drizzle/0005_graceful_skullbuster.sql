CREATE TABLE `paymentEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int,
	`providerPaymentId` varchar(180),
	`eventType` varchar(80) NOT NULL DEFAULT 'payment',
	`signatureValid` boolean NOT NULL,
	`providerStatus` varchar(80),
	`result` varchar(40) NOT NULL,
	`reason` varchar(240),
	`requestId` varchar(180),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paymentEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `payment_events_order_idx` ON `paymentEvents` (`orderId`);--> statement-breakpoint
CREATE INDEX `payment_events_payment_idx` ON `paymentEvents` (`providerPaymentId`);