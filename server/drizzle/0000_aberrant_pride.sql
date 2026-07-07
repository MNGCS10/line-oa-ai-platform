CREATE TABLE `ai_models` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`model_id` varchar(120) NOT NULL,
	`label` varchar(120) NOT NULL,
	`supports_vision` boolean NOT NULL DEFAULT false,
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_providers` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`kind` enum('anthropic','openai','google') NOT NULL,
	`label` varchar(120) NOT NULL,
	`api_key` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`line_user_id` int NOT NULL,
	`customer_name` varchar(255) NOT NULL,
	`patient_age` varchar(60),
	`service_name` varchar(255),
	`reason` text,
	`scheduled_at` timestamp NOT NULL,
	`status` enum('pending','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'pending',
	`reminder_sent_at` timestamp,
	`google_calendar_event_id` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`line_user_id` int NOT NULL,
	`ai_paused` boolean NOT NULL DEFAULT false,
	`last_message_at` timestamp,
	`unread_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_info` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`business_name` varchar(255) NOT NULL,
	`business_type` varchar(255) NOT NULL,
	`business_hours` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`phone` varchar(60),
	`line_oa_id` varchar(120),
	`customer_journey` text,
	`ai_persona_name` varchar(120) NOT NULL,
	`ai_persona_style` text NOT NULL,
	`ai_persona_language_note` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_info_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`chat_session_id` int NOT NULL,
	`title` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `line_users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`line_user_id` varchar(64) NOT NULL,
	`display_name` varchar(255),
	`picture_url` text,
	`status_message` text,
	`is_blocked` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `line_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `line_users_line_user_id_unique` UNIQUE(`line_user_id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`chat_session_id` int NOT NULL,
	`conversation_id` int,
	`sender_type` enum('customer','ai','admin','system') NOT NULL,
	`sender_user_id` int,
	`content_type` enum('text','image','sticker','flex','video','audio','file') NOT NULL DEFAULT 'text',
	`content` text NOT NULL,
	`media_url` text,
	`line_message_id` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int,
	`product_name` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` decimal(10,2) NOT NULL DEFAULT '0',
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`line_user_id` int NOT NULL,
	`status` enum('pending','confirmed','preparing','completed','cancelled') NOT NULL DEFAULT 'pending',
	`total_amount` decimal(10,2) NOT NULL DEFAULT '0',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(120),
	`price_label` varchar(120) NOT NULL,
	`price_min` decimal(10,2),
	`price_max` decimal(10,2),
	`image_url` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`key` varchar(120) NOT NULL,
	`value` json NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` enum('owner','admin','staff') NOT NULL DEFAULT 'staff',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `appointments_line_user_id_idx` ON `appointments` (`line_user_id`);--> statement-breakpoint
CREATE INDEX `appointments_scheduled_at_idx` ON `appointments` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `chat_sessions_line_user_id_idx` ON `chat_sessions` (`line_user_id`);--> statement-breakpoint
CREATE INDEX `conversations_chat_session_id_idx` ON `conversations` (`chat_session_id`);--> statement-breakpoint
CREATE INDEX `line_users_line_user_id_idx` ON `line_users` (`line_user_id`);--> statement-breakpoint
CREATE INDEX `messages_chat_session_id_idx` ON `messages` (`chat_session_id`);--> statement-breakpoint
CREATE INDEX `messages_created_at_idx` ON `messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `order_items_order_id_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `orders_line_user_id_idx` ON `orders` (`line_user_id`);