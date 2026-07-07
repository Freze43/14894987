import { pgTable, uuid, varchar, text, integer, timestamp, bigint, doublePrecision } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: bigint("file_size", { mode: "bigint" }).notNull(),
  duration: integer("duration"),
  width: integer("width"),
  height: integer("height"),
  targetClipCount: integer("target_clip_count").notNull().default(5),
  status: varchar("status", { length: 50 }).notNull().default("uploaded"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clips = pgTable("clips", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  clipNumber: integer("clip_number").notNull(),
  startTime: doublePrecision("start_time").notNull(),
  endTime: doublePrecision("end_time").notNull(),
  subtitleText: text("subtitle_text"),
  filePath: text("file_path"),
  fileSize: bigint("file_size", { mode: "bigint" }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
