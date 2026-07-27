import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
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
  gender: text("gender"), // "male" | "female"
  dateOfBirth: text("date_of_birth"), // "YYYY-MM-DD"
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
  status: text("status").notNull().default("active"), // active, dispensed, completed
});

export const labRequests = pgTable("lab_requests", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  testType: text("test_type").notNull(), // Lab Test, X-Ray, MRI, etc.
  testName: text("test_name").notNull(),
  instructions: text("instructions"),
  result: text("result"), // To be filled by lab
  status: text("status").notNull().default("pending"), // pending, processing, completed
  date: timestamp("date").defaultNow(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id"), // Nullable for lab/pharmacy services
  category: text("category").notNull().default("clinic"), // 'clinic', 'lab', 'pharmacy'
  name: text("name").notNull(),
  price: integer("price").notNull(), // Price in SAR
  description: text("description"),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  type: text("type").notNull(), // card, wallet, insurance
  provider: text("provider").notNull(),
  last4: text("last4"),
  expiry: text("expiry"),
  policyId: text("policy_id"),
  isPrimary: boolean("is_primary").default(false),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  appointmentId: integer("appointment_id"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("SAR"),
  status: text("status").notNull().default("pending"), // pending, paid, cancelled
  description: text("description"),
  date: timestamp("date").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  patientId: integer("patient_id").notNull(),
  methodId: integer("method_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("success"), // success, failed
  date: timestamp("date").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertClinicSchema = createInsertSchema(clinics).omit({ id: true, doctorCount: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, status: true });
export const insertMedicalHistorySchema = createInsertSchema(medicalHistory).omit({ id: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, date: true });
export const insertTreatmentPlanSchema = createInsertSchema(treatmentPlans).omit({ id: true });
export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ id: true, date: true, status: true });
export const insertLabRequestSchema = createInsertSchema(labRequests).omit({ id: true, date: true, status: true, result: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, date: true, status: true, currency: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, date: true, status: true });

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

export type LabRequest = typeof labRequests.$inferSelect;
export type InsertLabRequest = z.infer<typeof insertLabRequestSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof loginSchema>;