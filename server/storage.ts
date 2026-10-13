import fs from "fs";
import path from "path";
import type {
  User, InsertUser,
  Clinic, InsertClinic,
  Appointment, InsertAppointment,
  MedicalHistory, InsertMedicalHistory,
  Report, InsertReport,
  TreatmentPlan, InsertTreatmentPlan,
  Prescription, InsertPrescription,
  Service, InsertService,
  PaymentMethod, InsertPaymentMethod,
  Invoice, InsertInvoice,
  Transaction, InsertTransaction,
  LabRequest, InsertLabRequest,
  DoctorReview, InsertDoctorReview,
  WhatsappLog, InsertWhatsappLog
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getDoctors(): Promise<User[]>;
  getDoctorsByClinic(clinicId: number): Promise<User[]>;

  getDoctorReviews(doctorId: number): Promise<DoctorReview[]>;
  createDoctorReview(review: InsertDoctorReview): Promise<DoctorReview>;

  getWhatsappLogs(): Promise<WhatsappLog[]>;
  getWhatsappLogsByPatient(patientId: number): Promise<WhatsappLog[]>;
  createWhatsappLog(log: InsertWhatsappLog): Promise<WhatsappLog>;

  getClinics(): Promise<Clinic[]>;
  getClinic(id: number): Promise<Clinic | undefined>;
  createClinic(clinic: InsertClinic): Promise<Clinic>;

  getAppointments(): Promise<Appointment[]>;
  getAppointmentsByPatient(patientId: number): Promise<Appointment[]>;
  getAppointmentsByDoctor(doctorId: number): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, data: Partial<Appointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;

  getMedicalHistory(): Promise<MedicalHistory[]>;
  getMedicalHistoryByPatient(patientId: number): Promise<MedicalHistory[]>;
  createMedicalHistory(history: InsertMedicalHistory): Promise<MedicalHistory>;
  updateMedicalHistory(id: number, data: Partial<MedicalHistory>): Promise<MedicalHistory | undefined>;
  deleteMedicalHistory(id: number): Promise<boolean>;

  getReports(): Promise<Report[]>;
  getReportsByPatient(patientId: number): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: number, data: Partial<Report>): Promise<Report | undefined>;
  deleteReport(id: number): Promise<boolean>;

  getTreatmentPlans(): Promise<TreatmentPlan[]>;
  getTreatmentPlansByPatient(patientId: number): Promise<TreatmentPlan[]>;
  createTreatmentPlan(plan: InsertTreatmentPlan): Promise<TreatmentPlan>;
  updateTreatmentPlan(id: number, data: Partial<TreatmentPlan>): Promise<TreatmentPlan | undefined>;
  deleteTreatmentPlan(id: number): Promise<boolean>;

  getPrescriptions(): Promise<Prescription[]>;
  getPrescriptionsByPatient(patientId: number): Promise<Prescription[]>;
  getPrescriptionsByDoctor(doctorId: number): Promise<Prescription[]>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: number, data: Partial<Prescription>): Promise<Prescription | undefined>;
  deletePrescription(id: number): Promise<boolean>;

  getLabRequests(): Promise<LabRequest[]>;
  getLabRequestsByPatient(patientId: number): Promise<LabRequest[]>;
  getLabRequestsByDoctor(doctorId: number): Promise<LabRequest[]>;
  createLabRequest(labReq: InsertLabRequest): Promise<LabRequest>;
  updateLabRequest(id: number, data: Partial<LabRequest>): Promise<LabRequest | undefined>;
  deleteLabRequest(id: number): Promise<boolean>;

  getServices(): Promise<Service[]>;
  getServicesByClinic(clinicId: number): Promise<Service[]>;
  getServicesByCategory(category: string): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, data: Partial<Service>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;

  getPaymentMethods(patientId: number): Promise<PaymentMethod[]>;
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;
  deletePaymentMethod(id: number): Promise<boolean>;

  getInvoices(patientId: number): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice | undefined>;

  getTransactions(patientId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;

  cleanDatabase(): Promise<void>;
}

export class MemoryStorage implements IStorage {
  private users: User[] = [];
  private clinics: Clinic[] = [];
  private appointments: Appointment[] = [];
  private medicalHistory: MedicalHistory[] = [];
  private reports: Report[] = [];
  private treatmentPlans: TreatmentPlan[] = [];
  private prescriptions: Prescription[] = [];
  private labRequests: LabRequest[] = [];
  private paymentMethods: PaymentMethod[] = [];
  private invoices: Invoice[] = [];
  private transactions: Transaction[] = [];
  private doctorReviews: DoctorReview[] = [
    { id: 1, doctorId: 2, patientId: 3, patientName: "أحمد إبراهيم", rating: 5, comment: "طبيب ممتاز ومستمع رائع وشرح الحالة بكل تفصيل ودقة.", date: new Date() },
    { id: 2, doctorId: 2, patientId: 4, patientName: "سارة محمد", rating: 5, comment: "تشخيص متميز جداً، والعلاج ساعدني كثيراً من أول يوم.", date: new Date() },
    { id: 3, doctorId: 2, patientId: 5, patientName: "محمود علي", rating: 4, comment: "تعامل راقي جداً واهتمام كبير من الطبيب وطاقم التمريض.", date: new Date() }
  ];
  private whatsappLogs: WhatsappLog[] = [];
  private services: Service[] = [
    { id: 1, clinicId: 1, category: "clinic", name: "كشف استشارة عيادة الباطنة العامة", price: 200, description: "كشف شامل وتشخيص مبدئي للمريض مع قياس العلامات الحيوية" },
    { id: 2, clinicId: 1, category: "clinic", name: "فحص السكر التراكمي العاجل (HbA1c)", price: 150, description: "تحليل معملي فوري داخل العيادة للسكري" },
    { id: 3, clinicId: 1, category: "clinic", name: "تخطيط قلب كهربائي (ECG)", price: 250, description: "فحص ورسم القلب بالكمبيوتر" },
    { id: 4, clinicId: 2, category: "clinic", name: "كشف استشارة جراحة عامة", price: 300, description: "تقييم وتشخيص الجروح والحالات الجراحية" },
    { id: 5, clinicId: 3, category: "clinic", name: "كشف دوري ومتابعة نمو حديثي الولادة", price: 220, description: "فحص دوري للأطفال ومتابعة التطعيمات" },
    // Lab Mock Services
    { id: 6, clinicId: null, category: "lab", name: "صورة دم كاملة (CBC)", price: 120, description: "فحص شامل لخلايا الدم" },
    { id: 7, clinicId: null, category: "lab", name: "وظائف كبد وكلى", price: 250, description: "تحليل شامل لإنزيمات الكبد ووظائف الكلى" },
    // Pharmacy Mock Services
    { id: 8, clinicId: null, category: "pharmacy", name: "Panadol Advance 500mg", price: 15, description: "مسكن للآلام وخافض للحرارة" },
    { id: 9, clinicId: null, category: "pharmacy", name: "Augmentin 1g", price: 85, description: "مضاد حيوي واسع المجال" }
  ];
  private nextId = { user: 1, clinic: 1, appointment: 1, history: 1, report: 1, plan: 1, prescription: 1, labRequest: 1, service: 10, paymentMethod: 1, invoice: 1, transaction: 1, doctorReview: 4, whatsappLog: 1 };

  constructor() {
    const dbPath = path.resolve(process.cwd(), "database.json");
    if (fs.existsSync(dbPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
        
        // Ensure dates are parsed correctly from strings
        if (data.reports) data.reports.forEach((r: any) => r.date = new Date(r.date));
        if (data.prescriptions) data.prescriptions.forEach((p: any) => p.date = new Date(p.date));
        if (data.labRequests) data.labRequests.forEach((l: any) => l.date = new Date(l.date));
        if (data.invoices) data.invoices.forEach((i: any) => i.date = new Date(i.date));
        if (data.transactions) data.transactions.forEach((t: any) => t.date = new Date(t.date));
        if (data.appointments) data.appointments.forEach((a: any) => { if(a.datetime) a.datetime = new Date(a.datetime) });
        if (data.doctorReviews) data.doctorReviews.forEach((dr: any) => dr.date = new Date(dr.date));
        if (data.whatsappLogs) data.whatsappLogs.forEach((w: any) => w.sentAt = new Date(w.sentAt));

        Object.assign(this, data);
      } catch (e) {
        console.error("Failed to load database.json", e);
      }
    }
    
    let lastSaved = JSON.stringify(this);
    setInterval(() => {
      const current = JSON.stringify(this);
      if (current !== lastSaved) {
        try {
          fs.writeFileSync(dbPath, current, "utf-8");
          lastSaved = current;
        } catch(e) {
          console.error("Failed to save database.json", e);
        }
      }
    }, 2000); // Check every 2 seconds
  }

  async cleanDatabase(): Promise<void> {
    this.appointments = [];
    this.medicalHistory = [];
    this.reports = [];
    this.treatmentPlans = [];
    this.prescriptions = [];
    this.labRequests = [];
    this.services = [];
    this.paymentMethods = [];
    this.invoices = [];
    this.transactions = [];
    // Keep root admin account so admin can continue adding doctors/patients, wipe all other users (doctors/patients)
    this.users = this.users.filter(u => u.username === 'admin1' || u.role === 'admin');
    // Reset clinic doctor counts
    this.clinics = this.clinics.map(c => ({ ...c, doctorCount: 0 }));
    this.nextId.appointment = 1;
    this.nextId.history = 1;
    this.nextId.report = 1;
    this.nextId.plan = 1;
    this.nextId.prescription = 1;
    this.nextId.labRequest = 1;
    this.nextId.service = 1;
    this.nextId.paymentMethod = 1;
    this.nextId.invoice = 1;
    this.nextId.transaction = 1;
  }

  async getUser(id: number) { return this.users.find(u => u.id === id); }
  async getUserByUsername(username: string) { return this.users.find(u => u.username === username); }
  async createUser(data: InsertUser): Promise<User> {
    const user: User = { 
      id: this.nextId.user++, 
      clinicId: null, 
      bio: null, 
      workingDays: data.role === 'doctor' ? (data.workingDays || "0,1,2,3,4") : null, 
      workingHours: data.role === 'doctor' ? (data.workingHours || "09:00 - 17:00") : null, 
      ...data 
    };
    this.users.push(user);
    return user;
  }
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.users[idx] = { ...this.users[idx], ...data };
    return this.users[idx];
  }
  async deleteUser(id: number): Promise<boolean> {
    const initialLen = this.users.length;
    this.users = this.users.filter(u => u.id !== id);
    return this.users.length < initialLen;
  }
  async getDoctors() { 
    return this.users.filter(u => u.role === 'doctor').map(doc => {
      const docReviews = this.doctorReviews.filter(r => r.doctorId === doc.id);
      const avg = docReviews.length > 0 
        ? Number((docReviews.reduce((sum, r) => sum + r.rating, 0) / docReviews.length).toFixed(1))
        : 5.0;
      return {
        ...doc,
        averageRating: avg,
        reviewsCount: docReviews.length
      };
    }); 
  }
  async getDoctorsByClinic(clinicId: number) { 
    return (await this.getDoctors()).filter(u => u.clinicId === clinicId); 
  }

  async getClinics() { 
    return this.clinics.map(c => ({
      ...c,
      doctorCount: this.users.filter(u => u.role === 'doctor' && u.clinicId === c.id).length
    })); 
  }
  async getClinic(id: number) { 
    const clinic = this.clinics.find(c => c.id === id);
    if (!clinic) return undefined;
    return {
      ...clinic,
      doctorCount: this.users.filter(u => u.role === 'doctor' && u.clinicId === clinic.id).length
    };
  }
  async createClinic(data: InsertClinic): Promise<Clinic> {
    const clinic: Clinic = { id: this.nextId.clinic++, doctorCount: 0, description: null, ...data };
    this.clinics.push(clinic);
    return clinic;
  }

  async getAppointments() { return this.appointments; }
  async getAppointmentsByPatient(patientId: number) { return this.appointments.filter(a => a.patientId === patientId); }
  async getAppointmentsByDoctor(doctorId: number) { return this.appointments.filter(a => a.doctorId === doctorId); }
  async createAppointment(data: InsertAppointment): Promise<Appointment> {
    const appointment: Appointment = { id: this.nextId.appointment++, status: "pending", notes: null, ...data };
    this.appointments.push(appointment);
    
    // Auto-generate invoice
    let price = 200;
    const service = this.services.find(s => s.clinicId === data.clinicId);
    if (service) price = service.price;
    
    this.createInvoice({
      patientId: data.patientId,
      appointmentId: appointment.id,
      amount: price,
    });
    
    return appointment;
  }
  async updateAppointment(id: number, data: Partial<Appointment>): Promise<Appointment | undefined> {
    const idx = this.appointments.findIndex(a => a.id === id);
    if (idx === -1) return undefined;
    this.appointments[idx] = { ...this.appointments[idx], ...data };
    return this.appointments[idx];
  }
  async deleteAppointment(id: number): Promise<boolean> {
    const initialLen = this.appointments.length;
    this.appointments = this.appointments.filter(a => a.id !== id);
    return this.appointments.length < initialLen;
  }

  async getMedicalHistory() { return this.medicalHistory; }
  async getMedicalHistoryByPatient(patientId: number) { return this.medicalHistory.filter(h => h.patientId === patientId); }
  async createMedicalHistory(data: InsertMedicalHistory): Promise<MedicalHistory> {
    const mh: MedicalHistory = { id: this.nextId.history++, notes: null, ...data };
    this.medicalHistory.push(mh);
    return mh;
  }
  async updateMedicalHistory(id: number, data: Partial<MedicalHistory>): Promise<MedicalHistory | undefined> {
    const idx = this.medicalHistory.findIndex(h => h.id === id);
    if (idx === -1) return undefined;
    this.medicalHistory[idx] = { ...this.medicalHistory[idx], ...data };
    return this.medicalHistory[idx];
  }
  async deleteMedicalHistory(id: number): Promise<boolean> {
    const initialLen = this.medicalHistory.length;
    this.medicalHistory = this.medicalHistory.filter(h => h.id !== id);
    return this.medicalHistory.length < initialLen;
  }

  async getReports() { return this.reports; }
  async getReportsByPatient(patientId: number) { return this.reports.filter(r => r.patientId === patientId); }
  async createReport(data: InsertReport): Promise<Report> {
    const r: Report = { id: this.nextId.report++, date: new Date(), ...data };
    this.reports.push(r);
    return r;
  }
  async updateReport(id: number, data: Partial<Report>): Promise<Report | undefined> {
    const idx = this.reports.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    this.reports[idx] = { ...this.reports[idx], ...data };
    return this.reports[idx];
  }
  async deleteReport(id: number): Promise<boolean> {
    const initialLen = this.reports.length;
    this.reports = this.reports.filter(r => r.id !== id);
    return this.reports.length < initialLen;
  }

  async getTreatmentPlans() { return this.treatmentPlans; }
  async getTreatmentPlansByPatient(patientId: number) { return this.treatmentPlans.filter(p => p.patientId === patientId); }
  async createTreatmentPlan(data: InsertTreatmentPlan): Promise<TreatmentPlan> {
    const plan: TreatmentPlan = { id: this.nextId.plan++, endDate: null, ...data };
    this.treatmentPlans.push(plan);
    return plan;
  }
  async updateTreatmentPlan(id: number, data: Partial<TreatmentPlan>): Promise<TreatmentPlan | undefined> {
    const idx = this.treatmentPlans.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.treatmentPlans[idx] = { ...this.treatmentPlans[idx], ...data };
    return this.treatmentPlans[idx];
  }
  async deleteTreatmentPlan(id: number): Promise<boolean> {
    const initialLen = this.treatmentPlans.length;
    this.treatmentPlans = this.treatmentPlans.filter(p => p.id !== id);
    return this.treatmentPlans.length < initialLen;
  }

  async getPrescriptions() { return this.prescriptions; }
  async getPrescriptionsByPatient(patientId: number) { return this.prescriptions.filter(p => p.patientId === patientId); }
  async getPrescriptionsByDoctor(doctorId: number) { return this.prescriptions.filter(p => p.doctorId === doctorId); }
  async createPrescription(data: InsertPrescription): Promise<Prescription> {
    const prescription: Prescription = { id: this.nextId.prescription++, date: new Date(), status: 'active', notes: null, ...data };
    this.prescriptions.push(prescription);
    return prescription;
  }
  async updatePrescription(id: number, data: Partial<Prescription>): Promise<Prescription | undefined> {
    const idx = this.prescriptions.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.prescriptions[idx] = { ...this.prescriptions[idx], ...data };
    return this.prescriptions[idx];
  }
  async deletePrescription(id: number): Promise<boolean> {
    const initialLen = this.prescriptions.length;
    this.prescriptions = this.prescriptions.filter(p => p.id !== id);
    return this.prescriptions.length < initialLen;
  }

  async getLabRequests() { return this.labRequests; }
  async getLabRequestsByPatient(patientId: number) { return this.labRequests.filter(l => l.patientId === patientId); }
  async getLabRequestsByDoctor(doctorId: number) { return this.labRequests.filter(l => l.doctorId === doctorId); }
  async createLabRequest(data: InsertLabRequest): Promise<LabRequest> {
    const labReq: LabRequest = { id: this.nextId.labRequest++, date: new Date(), status: 'pending', instructions: null, result: null, ...data };
    this.labRequests.push(labReq);
    return labReq;
  }
  async updateLabRequest(id: number, data: Partial<LabRequest>): Promise<LabRequest | undefined> {
    const idx = this.labRequests.findIndex(l => l.id === id);
    if (idx === -1) return undefined;
    this.labRequests[idx] = { ...this.labRequests[idx], ...data };
    return this.labRequests[idx];
  }
  async deleteLabRequest(id: number): Promise<boolean> {
    const initialLen = this.labRequests.length;
    this.labRequests = this.labRequests.filter(l => l.id !== id);
    return this.labRequests.length < initialLen;
  }

  async getServices() { return this.services; }
  async getServicesByClinic(clinicId: number) { return this.services.filter(s => s.clinicId === clinicId); }
  async getServicesByCategory(category: string) { return this.services.filter(s => s.category === category); }

  async createService(data: InsertService): Promise<Service> {
    const service: Service = { 
      id: this.nextId.service++, 
      clinicId: data.clinicId || null, 
      category: data.category || "clinic",
      description: null, 
      ...data 
    };
    this.services.push(service);
    return service;
  }
  async updateService(id: number, data: Partial<Service>): Promise<Service | undefined> {
    const idx = this.services.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    this.services[idx] = { ...this.services[idx], ...data };
    return this.services[idx];
  }
  async deleteService(id: number): Promise<boolean> {
    const initialLen = this.services.length;
    this.services = this.services.filter(s => s.id !== id);
    return this.services.length < initialLen;
  }

  async getPaymentMethods(patientId: number) { return this.paymentMethods.filter(m => m.patientId === patientId); }
  async createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod> {
    const method: PaymentMethod = { id: this.nextId.paymentMethod++, isPrimary: false, last4: null, expiry: null, policyId: null, ...data };
    this.paymentMethods.push(method);
    return method;
  }
  async deletePaymentMethod(id: number): Promise<boolean> {
    const initialLen = this.paymentMethods.length;
    this.paymentMethods = this.paymentMethods.filter(m => m.id !== id);
    return this.paymentMethods.length < initialLen;
  }

  async getInvoices(patientId: number) { return this.invoices.filter(i => i.patientId === patientId); }
  async getInvoice(id: number) { return this.invoices.find(i => i.id === id); }
  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    const invoice: Invoice = { id: this.nextId.invoice++, status: "pending", currency: "EGP", date: new Date(), ...data };
    this.invoices.push(invoice);
    return invoice;
  }
  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const idx = this.invoices.findIndex(i => i.id === id);
    if (idx === -1) return undefined;
    this.invoices[idx] = { ...this.invoices[idx], ...data };
    return this.invoices[idx];
  }

  async getTransactions(patientId: number) { return this.transactions.filter(t => t.patientId === patientId); }
  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const transaction: Transaction = { id: this.nextId.transaction++, status: "success", date: new Date(), ...data };
    this.transactions.push(transaction);
    return transaction;
  }

  async getDoctorReviews(doctorId: number) { 
    return this.doctorReviews.filter(r => r.doctorId === doctorId); 
  }
  async createDoctorReview(data: InsertDoctorReview): Promise<DoctorReview> {
    const review: DoctorReview = { 
      id: this.nextId.doctorReview++, 
      date: new Date(), 
      patientId: data.patientId,
      doctorId: data.doctorId,
      patientName: data.patientName,
      rating: data.rating,
      comment: data.comment ?? null
    };
    this.doctorReviews.push(review);
    return review;
  }

  async getWhatsappLogs(): Promise<WhatsappLog[]> {
    return [...(this.whatsappLogs || [])].reverse();
  }

  async getWhatsappLogsByPatient(patientId: number): Promise<WhatsappLog[]> {
    return (this.whatsappLogs || []).filter(w => w.patientId === patientId).reverse();
  }

  async createWhatsappLog(data: InsertWhatsappLog): Promise<WhatsappLog> {
    if (!this.whatsappLogs) this.whatsappLogs = [];
    if (!this.nextId.whatsappLog) this.nextId.whatsappLog = 1;
    const log: WhatsappLog = {
      id: this.nextId.whatsappLog++,
      patientId: data.patientId ?? null,
      patientName: data.patientName,
      recipientPhone: data.recipientPhone,
      message: data.message,
      status: data.status || "delivered",
      provider: data.provider || "system_gateway",
      sentAt: new Date(),
    };
    this.whatsappLogs.push(log);
    return log;
  }

  private whatsappConfig: any = {
    provider: "ultramsg",
    ultraMsgInstance: "instance194177",
    ultraMsgToken: "wkfef29dz2x4glh4",
    metaToken: "",
    metaPhoneId: "",
  };

  async getWhatsappConfig() {
    return this.whatsappConfig;
  }

  async setWhatsappConfig(config: any) {
    this.whatsappConfig = { ...this.whatsappConfig, ...config };
    return this.whatsappConfig;
  }
}

export const storage = new MemoryStorage();