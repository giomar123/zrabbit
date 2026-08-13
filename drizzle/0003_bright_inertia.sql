CREATE TABLE `authorizedGoogleEmails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authorizedGoogleEmails_id` PRIMARY KEY(`id`),
	CONSTRAINT `authorized_google_emails_email_uq` UNIQUE(`email`)
);
