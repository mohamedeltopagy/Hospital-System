import type {
  User, InsertUser,
  Clinic, InsertClinic,
  Appointment, InsertAppointment,
  MedicalHistory, InsertMedicalHistory,
  Report, InsertReport,
  TreatmentPlan, InsertTreatmentPlan,
  Prescription, InsertPrescription,
  Service, InsertService
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getDoctors(): Promise<User[]>;
  getDoctorsByClinic(clinicId: number): Promise<User[]>;

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

  getServices(): Promise<Service[]>;
  getServicesByClinic(clinicId: number): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, data: Partial<Service>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;

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
  private services: Service[] = [
    { id: 1, clinicId: 1, name: "كشف استشارة عيادة الباطنة العامة", price: 200, description: "كشف شامل وتشخيص مبدئي للمريض مع قياس العلامات الحيوية" },
    { id: 2, clinicId: 1, name: "فحص السكر التراكمي العاجل (HbA1c)", price: 150, description: "تحليل معملي فوري داخل العيادة للسكري" },
    { id: 3, clinicId: 1, name: "تخطيط قلب كهربائي (ECG)", price: 250, description: "فحص ورسم القلب بالكمبيوتر" },
    { id: 4, clinicId: 2, name: "كشف استشارة جراحة عامة", price: 300, description: "تقييم وتشخيص الجروح والحالات الجراحية" },
    { id: 5, clinicId: 3, name: "كشف دوري ومتابعة نمو حديثي الولادة", price: 220, description: "فحص دوري للأطفال ومتابعة التطعيمات" }
  ];
  private nextId = { user: 1, clinic: 1, appointment: 1, history: 1, report: 1, plan: 1, prescription: 1, service: 6 };

  async cleanDatabase(): Promise<void> {
    this.appointments = [];
    this.medicalHistory = [];
    this.reports = [];
    this.treatmentPlans = [];
    this.prescriptions = [];
    this.services = [];
    // Keep root admin account so admin can continue adding doctors/patients, wipe all other users (doctors/patients)
    this.users = this.users.filter(u => u.username === 'admin1' || u.role === 'admin');
    // Reset clinic doctor counts
    this.clinics = this.clinics.map(c => ({ ...c, doctorCount: 0 }));
    this.nextId.appointment = 1;
    this.nextId.history = 1;
    this.nextId.report = 1;
    this.nextId.plan = 1;
    this.nextId.prescription = 1;
    this.nextId.service = 1;
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
  async getDoctors() { return this.users.filter(u => u.role === 'doctor'); }
  async getDoctorsByClinic(clinicId: number) { return this.users.filter(u => u.role === 'doctor' && u.clinicId === clinicId); }

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
    const appt: Appointment = { id: this.nextId.appointment++, status: 'pending', notes: null, ...data };
    this.appointments.push(appt);
    return appt;
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

  async getServices() { return this.services; }
  async getServicesByClinic(clinicId: number) { return this.services.filter(s => s.clinicId === clinicId); }
  async createService(data: InsertService): Promise<Service> {
    const service: Service = { id: this.nextId.service++, description: null, ...data };
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
}

export const storage = new MemoryStorage();