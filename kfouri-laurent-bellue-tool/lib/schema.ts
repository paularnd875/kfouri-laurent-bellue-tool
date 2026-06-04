import { pgTable, uuid, text, integer, boolean, jsonb, timestamp, real, unique, index } from 'drizzle-orm/pg-core';

// Table principale des avocats
export const lawyers = pgTable('lawyers', {
  id: uuid('id').primaryKey().defaultRandom(),
  prenomnom: text('prenomnom').unique().notNull(),
  civilite: text('civilite'),
  nom_complet: text('nom_complet'),
  telephone: text('telephone'),
  email: text('email'),
  annee_serment: integer('annee_serment'),
  cabinet: text('cabinet').notNull(),
  
  // Classification principale
  classement: text('classement'), // C1|C2|C3|Blacklist|null
  
  // Relations LinkedIn spécifiques à Kfouri-Laurent Bellue
  linkedin_bernard: boolean('linkedin_bernard').default(false),
  linkedin_sabine: boolean('linkedin_sabine').default(false),
  
  // URL de la photo
  photo_url: text('photo_url'),
  
  // Étiquettes additionnelles (colonnes AX à BQ du Google Sheet)
  additional_tags: jsonb('additional_tags').$type<string[]>(),
  
  // Historique des soutiens précédents
  soutiens_precedents: jsonb('soutiens_precedents').$type<string[]>(),
  
  // Données brutes pour flexibilité future
  raw_data: jsonb('raw_data'),
  last_synced_at: timestamp('last_synced_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  cabinetIdx: index('lawyers_cabinet_idx').on(table.cabinet),
  classementIdx: index('lawyers_classement_idx').on(table.classement),
  linkedinBernardIdx: index('lawyers_linkedin_bernard_idx').on(table.linkedin_bernard),
  linkedinSabineIdx: index('lawyers_linkedin_sabine_idx').on(table.linkedin_sabine),
}));

// Table des cabinets avec statistiques
export const firms = pgTable('firms', {
  name: text('name').primaryKey(),
  lawyer_count: integer('lawyer_count').default(0),
  
  // Compteurs de classification
  c1_count: integer('c1_count').default(0),
  c2_count: integer('c2_count').default(0),
  c3_count: integer('c3_count').default(0),
  bl_count: integer('bl_count').default(0),
  unclassified_count: integer('unclassified_count').default(0),
  
  // Statistiques LinkedIn
  bernard_linkedin_count: integer('bernard_linkedin_count').default(0),
  sabine_linkedin_count: integer('sabine_linkedin_count').default(0),
  
  // Taux de participation aux élections
  participation_rate_2023: real('participation_rate_2023'),
  participation_rate_2021: real('participation_rate_2021'),
  
  // Compteur des avocats assignés à l'équipe
  assigned_count: integer('assigned_count').default(0),
  
  // Métadonnées
  last_updated: timestamp('last_updated', { withTimezone: true }).defaultNow(),
});

// Table des membres de l'équipe Kfouri-Laurent Bellue
export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  prenom: text('prenom').notNull(),
  nom: text('nom').notNull(),
  email: text('email').notNull(),
  role: text('role').default('member'), // 'admin' | 'member' | 'viewer'
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Table des assignations d'avocats aux membres de l'équipe
export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  lawyer_prenomnom: text('lawyer_prenomnom').notNull().references(() => lawyers.prenomnom),
  team_member_id: uuid('team_member_id').notNull().references(() => teamMembers.id),
  assigned_at: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
  notes: text('notes'), // Notes privées sur l'assignation
}, (table) => ({
  uniqueAssignment: unique().on(table.lawyer_prenomnom),
}));

// Table des logs d'emails envoyés
export const mailLogs = pgTable('mail_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  team_member_id: uuid('team_member_id').references(() => teamMembers.id),
  subject: text('subject'),
  lawyer_prenomnoms: jsonb('lawyer_prenomnoms').$type<string[]>(),
  status: text('status'), // 'sent' | 'failed'
  error_message: text('error_message'),
  sent_at: timestamp('sent_at', { withTimezone: true }).defaultNow(),
});

// Table des erreurs de synchronisation
export const syncErrors = pgTable('sync_errors', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date', { withTimezone: true }).defaultNow(),
  type_erreur: text('type_erreur').notNull(), // 'orphan' | 'duplicate' | 'invalid' | 'missing_column'
  prenomnom: text('prenomnom'),
  details: text('details'),
  resolved: boolean('resolved').default(false),
});

// Table des activités/logs pour traçabilité
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => teamMembers.id),
  action: text('action').notNull(), // 'classify', 'assign', 'update', 'import'
  target_type: text('target_type').notNull(), // 'lawyer', 'firm', 'team_member'
  target_id: text('target_id').notNull(),
  old_value: jsonb('old_value'),
  new_value: jsonb('new_value'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
});

// Table pour les imports de données depuis Google Sheets
export const dataImports = pgTable('data_imports', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: text('source').notNull(), // 'google_sheets' | 'csv' | 'manual'
  total_records: integer('total_records'),
  successful_records: integer('successful_records'),
  failed_records: integer('failed_records'),
  errors: jsonb('errors'),
  imported_by: uuid('imported_by').references(() => teamMembers.id),
  imported_at: timestamp('imported_at', { withTimezone: true }).defaultNow(),
});

// Types pour TypeScript
export type Lawyer = typeof lawyers.$inferSelect;
export type NewLawyer = typeof lawyers.$inferInsert;
export type Firm = typeof firms.$inferSelect;
export type NewFirm = typeof firms.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type MailLog = typeof mailLogs.$inferSelect;
export type NewMailLog = typeof mailLogs.$inferInsert;
export type SyncError = typeof syncErrors.$inferSelect;
export type NewSyncError = typeof syncErrors.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type DataImport = typeof dataImports.$inferSelect;
export type NewDataImport = typeof dataImports.$inferInsert;