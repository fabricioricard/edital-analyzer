CREATE TABLE `editalAnalyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editalId` int NOT NULL,
	`userId` int NOT NULL,
	`summary` text,
	`deadlines` json,
	`requirements` json,
	`selectionCriteria` json,
	`requiredDocuments` json,
	`penalties` json,
	`alerts` json,
	`hasCriticalDeadline` boolean NOT NULL DEFAULT false,
	`notificationSent` boolean NOT NULL DEFAULT false,
	`rawText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `editalAnalyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int NOT NULL,
	`title` text,
	`organization` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `editals_id` PRIMARY KEY(`id`)
);
