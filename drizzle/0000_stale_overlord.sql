CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`tags` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`created_at` integer NOT NULL
);
