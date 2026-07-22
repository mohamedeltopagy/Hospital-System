import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'patient', 'doctor', 'admin'
  clinicId: integer("clinic_id"), // For doctors
  bio: text("bio"), // Doctor's self-description / biography
  workingDays: text("working_days"), // Comma-separated days e.g. "Sun,Mon,Tue,Wed,Thu" or "0,1,2,3,4"
  workingHours: text("working_hours"), // e.g. "09:00 - 16:00"
});

export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  doctorCount: integer("doctor_count").default(0),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  clinicId: integer("clinic_id").notNull(),
  datetime: timestamp("datetime").notNull(),
  status: text("status").notNull().default("pending"), // pending, confirmed, completed, cancelled
  notes: text("notes"),
});

export const medicalHistory = pgTable("medical_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  condition: text("condition").notNull(),
  date: timestamp("date").notNull(),
  notes: text("notes"),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  date: timestamp("date").defaultNow(),
});

export const treatmentPlans = pgTable("treatment_plans", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  title: text("title").notNull(),
  details: text("details").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
});

export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  medicationName: text("medication_name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  duration: text("duration").notNull(),
  notes: text("notes"),
  date: timestamp("date").defaultNow(),
  status: text("status").notNull().default("active"), // active, completed
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").notNull(),
  name: text("name").notNull(),
  price: integer("price").notNull(), // Price in SAR
  description: text("description"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertClinicSchema = createInsertSchema(clinics).omit({ id: true, doctorCount: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, status: true });
export const insertMedicalHistorySchema = createInsertSchema(medicalHistory).omit({ id: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, date: true });
export const insertTreatmentPlanSchema = createInsertSchema(treatmentPlans).omit({ id: true });
export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ id: true, date: true, status: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true });

// Explicit API Contract Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Clinic = typeof clinics.$inferSelect;
export type InsertClinic = z.infer<typeof insertClinicSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type MedicalHistory = typeof medicalHistory.$inferSelect;
export type InsertMedicalHistory = z.infer<typeof insertMedicalHistorySchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export type TreatmentPlan = typeof treatmentPlans.$inferSelect;
export type InsertTreatmentPlan = z.infer<typeof insertTreatmentPlanSchema>;

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof loginSchema>;