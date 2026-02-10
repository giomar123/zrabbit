ALTER TABLE `investments` MODIFY COLUMN `investmentDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `purchases` MODIFY COLUMN `purchaseDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `sales` MODIFY COLUMN `saleDate` varchar(10) NOT NULL;