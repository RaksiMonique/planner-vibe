CREATE TYPE "planner"."budget_payment" AS ENUM('cash', 'credit', 'transfer');--> statement-breakpoint
ALTER TABLE "planner"."budgets" ADD COLUMN "payment_method" "planner"."budget_payment";