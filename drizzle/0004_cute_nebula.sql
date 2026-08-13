ALTER TABLE `users` MODIFY COLUMN `role` enum('user','editor','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `authorizedGoogleEmails` ADD `role` enum('editor','admin') DEFAULT 'editor' NOT NULL;
ALTER TABLE `users` MODIFY `role` enum('user','editor','admin') NOT NULL DEFAULT 'user';
