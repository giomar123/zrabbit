CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`description` text,
	`accentColor` varchar(20) NOT NULL DEFAULT '#B7E4C7',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(180) NOT NULL,
	`imageUrl` text,
	`unitPriceInCents` int NOT NULL,
	`quantity` int NOT NULL,
	`subtotalInCents` int NOT NULL,
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(32) NOT NULL,
	`customerName` varchar(160) NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`customerPhone` varchar(40),
	`shippingAddress` text,
	`shippingDistrict` varchar(120),
	`totalInCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'PEN',
	`status` enum('pending','awaiting_payment','paid','cancelled','fulfilled') NOT NULL DEFAULT 'pending',
	`paymentProvider` enum('mercado_pago') NOT NULL DEFAULT 'mercado_pago',
	`mercadoPagoPreferenceId` varchar(180),
	`mercadoPagoPaymentId` varchar(180),
	`mercadoPagoStatus` varchar(80),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_number_uq` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `productImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`url` text NOT NULL,
	`altText` varchar(220) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`sku` varchar(80),
	`shortDescription` varchar(280) NOT NULL,
	`description` text,
	`priceInCents` int NOT NULL,
	`compareAtPriceInCents` int,
	`stock` int NOT NULL DEFAULT 0,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`isFeatured` boolean NOT NULL DEFAULT false,
	`isOffer` boolean NOT NULL DEFAULT false,
	`mainImageUrl` text,
	`metaTitle` varchar(180),
	`metaDescription` varchar(300),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_uq` UNIQUE(`slug`),
	CONSTRAINT `products_sku_uq` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `orderItems` (`orderId`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_mp_payment_idx` ON `orders` (`mercadoPagoPaymentId`);--> statement-breakpoint
CREATE INDEX `product_images_product_idx` ON `productImages` (`productId`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`categoryId`);--> statement-breakpoint
CREATE INDEX `products_catalog_idx` ON `products` (`status`,`stock`);