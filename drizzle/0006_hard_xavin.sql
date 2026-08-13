ALTER TABLE `orders` ADD `shippingMethod` varchar(40) DEFAULT 'shalom' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `shippingMethod` varchar(40) DEFAULT 'shalom' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `isFreeShipping` boolean DEFAULT false NOT NULL;
