import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import { getMedicalResponse, type ChatMessage } from "./ai";
import { PSOOptimizer } from "./psoOptimizer";

const SessionStore = MemoryStore(session);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup simple session auth
  app.use(session({
    cookie: { maxAge: 86400000 },
    store: new SessionStore({
      checkPeriod: 86400000
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'supersecret'
  }));

  // Auth routes
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const cleanUser = input.username.trim().toLowerCase();
      const cleanPass = input.password.trim();
      const allUsers = (storage as any).users || [];
      const user = allUsers.find((u: any) => u.username.toLowerCase() === cleanUser) || await storage.getUserByUsername(input.username.trim());
      if (!user || user.password !== cleanPass) { // in real app, hash compare
        return res.status(401).json({ message: "Invalid credentials" });
      }
      (req.session as any).userId = user.id;
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const userId = (req.session as any).userId;
      const caller = userId ? await storage.getUser(userId) : null;
      if (input.role !== 'patient' && caller?.role !== 'admin') {
        input.role = 'patient'; // Force public registration to be strictly 'patient'
      }
      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(400).json({ message: "Username exists" });
      }
      const user = await storage.createUser(input);
      if (!caller) {
        (req.session as any).userId = user.id;
      }
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get(api.auth.me.path, async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Not logged in" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ message: "Not logged in" });
    res.json(user);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // Clinics
  app.get(api.clinics.list.path, async (req, res) => {
    const clinics = await storage.getClinics();
    res.json(clinics);
  });

  app.get(api.clinics.get.path, async (req, res) => {
    const clinic = await storage.getClinic(Number(req.params.id));
    if (!clinic) return res.status(404).json({ message: "Not found" });
    res.json(clinic);
  });

  // Doctors (Support both /api/doctors and /api/users/doctors)
  app.get([api.users.doctors.path, "/api/users/doctors"], async (req, res) => {
    const doctors = await storage.getDoctors();
    res.json(doctors);
  });

  app.post([api.users.doctors.path, "/api/users/doctors"], async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const caller = userId ? await storage.getUser(userId) : null;
      if (caller?.role !== "admin") {
        return res.status(403).json({ message: "Only administrators can add doctors" });
      }
      const { name, username, password, clinicId, bio } = req.body;
      if (!name || !clinicId) {
        return res.status(400).json({ message: "Name and clinicId are required" });
      }
      const existing = username ? await storage.getUserByUsername(username) : null;
      if (existing) {
        return res.status(400).json({ message: "Username already taken" });
      }
      const docUsername = username || `doc_${Date.now()}`;
      const newDoctor = await storage.createUser({
        username: docUsername,
        password: password || "123456",
        name: name.startsWith("د. ") ? name : `د. ${name}`,
        role: "doctor",
        clinicId: Number(clinicId),
        bio: bio || null,
        workingDays: req.body.workingDays || "0,1,2,3,4",
        workingHours: req.body.workingHours || "09:00 - 17:00",
      });
      res.status(201).json(newDoctor);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error creating doctor" });
    }
  });

  app.delete([`${api.users.doctors.path}/:id`, "/api/users/doctors/:id"], async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const caller = userId ? await storage.getUser(userId) : null;
      if (caller?.role !== "admin") {
        return res.status(403).json({ message: "Only administrators can delete doctors" });
      }
      const id = Number(req.params.id);
      const deleted = await storage.deleteUser(id);
      if (!deleted) return res.status(404).json({ message: "Doctor not found" });
      res.json({ message: "Doctor deleted successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error deleting doctor" });
    }
  });

  app.patch([`${api.users.doctors.path}/:id`, "/api/users/doctors/:id", "/api/users/:id"], async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const caller = userId ? await storage.getUser(userId) : null;
      const id = Number(req.params.id);
      if (caller?.role !== "admin" && caller?.id !== id) {
        return res.status(403).json({ message: "Only administrators can modify other doctors" });
      }
      const { clinicId, name, bio, workingDays, workingHours } = req.body;
      const updated = await storage.updateUser(id, {
        ...(caller?.role === 'admin' && clinicId !== undefined ? { clinicId: Number(clinicId) } : {}),
        ...(name ? { name } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(workingDays !== undefined ? { workingDays } : {}),
        ...(workingHours !== undefined ? { workingHours } : {}),
      });
      if (!updated) return res.status(404).json({ message: "Doctor not found" });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error updating doctor" });
    }
  });

  // Patients
  app.get("/api/patients", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const allUsers = (storage as any).users || [];
    res.json(allUsers.filter((u: any) => u.role === 'patient'));
  });

  app.get("/api/patients/:id/summary", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const patId = Number(req.params.id);
      const allUsers = (storage as any).users || [];
      const patient = allUsers.find((u: any) => u.id === patId && u.role === 'patient');
      if (!patient) return res.status(404).json({ message: "Patient not found" });

      const appointments = await storage.getAppointmentsByPatient(patId);
      const history = await storage.getMedicalHistoryByPatient(patId);
      const reports = await storage.getReportsByPatient(patId);
      const plans = await storage.getTreatmentPlansByPatient(patId);
      const prescriptions = await storage.getPrescriptionsByPatient(patId);

      res.json({
        patient,
        appointments,
        history,
        reports,
        plans,
        prescriptions
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error fetching patient summary" });
    }
  });

  // Appointments
  app.get(api.appointments.list.path, async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    let appts = [];
    if (user?.role === 'patient') {
      appts = await storage.getAppointmentsByPatient(userId);
    } else if (user?.role === 'doctor') {
      appts = await storage.getAppointmentsByDoctor(userId);
    } else {
      appts = await storage.getAppointments();
    }
    res.json(appts);
  });

  app.post(api.appointments.create.path, async (req, res) => {
    try {
      const bodySchema = api.appointments.create.input.extend({
        patientId: z.coerce.number(),
        doctorId: z.coerce.number(),
        clinicId: z.coerce.number(),
        datetime: z.coerce.date(),
      });
      const input = bodySchema.parse(req.body);

      // Check doctor working days
      const doctor = await storage.getUser(input.doctorId);
      if (doctor && doctor.workingDays) {
        const dayOfWeek = input.datetime.getDay().toString();
        const allowedDays = doctor.workingDays.split(",").map(d => d.trim());
        if (!allowedDays.includes(dayOfWeek)) {
          const daysMap: Record<string, string> = {
            "0": "الأحد", "1": "الإثنين", "2": "الثلاثاء", "3": "الأربعاء", "4": "الخميس", "5": "الجمعة", "6": "السبت"
          };
          const doctorDaysNames = allowedDays.map(d => daysMap[d] || d).join("، ");
          return res.status(400).json({
            message: `عفواً، الطبيب غير متواجد في هذا اليوم. أيام عمل الطبيب هي: (${doctorDaysNames})`
          });
        }
      }

      // Check double booking / conflict
      const existingAppts = await storage.getAppointmentsByDoctor(input.doctorId);
      const isConflict = existingAppts.some((a) => {
        if (a.status === 'cancelled') return false;
        const existingTime = new Date(a.datetime).getTime();
        const requestedTime = input.datetime.getTime();
        return Math.abs(existingTime - requestedTime) < 25 * 60 * 1000; // within 25 minutes slot
      });

      if (isConflict) {
        return res.status(400).json({
          message: "عفواً، هذا الموعد محجوز مسبقاً لمريض آخر عند نفس الطبيب. يرجى اختيار موعد أو توقيت مختلف."
        });
      }

      const appt = await storage.createAppointment(input);
      res.status(201).json(appt);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const id = Number(req.params.id);
      const { status, notes, datetime, doctorId, clinicId } = req.body;
      const updated = await storage.updateAppointment(id, {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(datetime ? { datetime: new Date(datetime) } : {}),
        ...(doctorId ? { doctorId: Number(doctorId) } : {}),
        ...(clinicId ? { clinicId: Number(clinicId) } : {}),
      });
      if (!updated) return res.status(404).json({ message: "Appointment not found" });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error updating appointment" });
    }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const id = Number(req.params.id);
      const deleted = await storage.deleteAppointment(id);
      if (!deleted) return res.status(404).json({ message: "Appointment not found" });
      res.json({ message: "Deleted successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error deleting appointment" });
    }
  });

  // Medical History
  app.get(api.medicalHistory.list.path, async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (user?.role === 'patient') {
      const history = await storage.getMedicalHistoryByPatient(userId);
      res.json(history);
    } else {
      const allHistory = await storage.getMedicalHistory();
      res.json(allHistory);
    }
  });

  app.post("/api/medical-history", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const { patientId, condition, date, notes } = req.body;
      if (!condition || !date) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // If user is patient, force patientId to be their own ID
      const targetPatientId = user.role === 'patient' ? user.id : Number(patientId);

      const newRecord = await storage.createMedicalHistory({
        patientId: targetPatientId,
        condition,
        date: new Date(date),
        notes: notes || null
      });
      res.status(201).json(newRecord);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error creating medical history" });
    }
  });

  app.patch("/api/medical-history/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      const id = Number(req.params.id);
      const { condition, date, notes } = req.body;
      const updated = await storage.updateMedicalHistory(id, {
        ...(condition ? { condition } : {}),
        ...(date ? { date: new Date(date) } : {}),
        ...(notes !== undefined ? { notes } : {}),
      });
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error updating medical history" });
    }
  });

  app.delete("/api/medical-history/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      const id = Number(req.params.id);
      const deleted = await storage.deleteMedicalHistory(id);
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ message: "Deleted successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error deleting medical history" });
    }
  });

  // Reports
  app.get(api.reports.list.path, async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (user?.role === 'patient') {
      const reps = await storage.getReportsByPatient(userId);
      res.json(reps);
    } else if (user?.role === 'doctor') {
      const allReps = await storage.getReports();
      res.json(allReps.filter(r => r.doctorId === userId));
    } else {
      const allReps = await storage.getReports();
      res.json(allReps);
    }
  });

  app.post("/api/reports", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== 'doctor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Only doctors can create reports" });
      }

      const { patientId, title, content } = req.body;
      if (!patientId || !title || !content) return res.status(400).json({ message: "Missing fields" });

      const newReport = await storage.createReport({
        patientId: Number(patientId),
        doctorId: user.id,
        title,
        content
      });
      res.status(201).json(newReport);
    } catch(e) {
      console.error(e);
      res.status(500).json({ message: "Server Error" });
    }
  });

  app.patch("/api/reports/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== 'doctor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      const id = Number(req.params.id);
      const { title, content } = req.body;
      const updated = await storage.updateReport(id, {
        ...(title ? { title } : {}),
        ...(content ? { content } : {}),
      });
      if (!updated) return res.status(404).json({ message: "Report not found" });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error updating report" });
    }
  });

  app.delete("/api/reports/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== 'doctor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      const id = Number(req.params.id);
      const deleted = await storage.deleteReport(id);
      if (!deleted) return res.status(404).json({ message: "Report not found" });
      res.json({ message: "Report deleted successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error deleting report" });
    }
  });

  // Treatment Plans
  app.get(api.treatmentPlans.list.path, async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (user?.role === 'patient') {
      const plans = await storage.getTreatmentPlansByPatient(userId);
      res.json(plans);
    } else if (user?.role === 'doctor') {
      const allPlans = await storage.getTreatmentPlans();
      res.json(allPlans.filter(p => p.doctorId === userId));
    } else {
      const allPlans = await storage.getTreatmentPlans();
      res.json(allPlans);
    }
  });

  app.post("/api/treatment-plans", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== 'doctor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { patientId, title, details, startDate, endDate } = req.body;
      if (!patientId || !title || !details || !startDate) return res.status(400).json({ message: "Missing fields" });

      const newPlan = await storage.createTreatmentPlan({
        patientId: Number(patientId),
        doctorId: user.id,
        title,
        details,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null
      });
      res.status(201).json(newPlan);
    } catch(e) {
      console.error(e);
      res.status(500).json({ message: "Server Error" });
    }
  });

  app.patch("/api/treatment-plans/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== 'doctor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      const id = Number(req.params.id);
      const { title, details, startDate, endDate } = req.body;
      const updated = await storage.updateTreatmentPlan(id, {
        ...(title ? { title } : {}),
        ...(details ? { details } : {}),
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      });
      if (!updated) return res.status(404).json({ message: "Plan not found" });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error updating treatment plan" });
    }
  });

  app.delete("/api/treatment-plans/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== 'doctor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      const id = Number(req.params.id);
      const deleted = await storage.deleteTreatmentPlan(id);
      if (!deleted) return res.status(404).json({ message: "Plan not found" });
      res.json({ message: "Treatment plan deleted successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error deleting treatment plan" });
    }
  });

  // Prescriptions
  app.get(api.prescriptions.list.path, async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (user?.role === 'patient') {
      const prescs = await storage.getPrescriptionsByPatient(userId);
      res.json(prescs);
    } else if (user?.role === 'doctor') {
      const allPrescs = await storage.getPrescriptions();
      res.json(allPrescs.filter(p => p.doctorId === userId));
    } else {
      const allPrescs = await storage.getPrescriptions();
      res.json(allPrescs);
    }
  });

  app.post("/api/prescriptions", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== 'doctor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Only doctors can prescribe" });
      }
      
      const { patientId, medicationName, dosage, frequency, duration, notes, serviceId } = req.body;
      if (!patientId || !medicationName || !dosage || !frequency || !duration) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const newPrescription = await storage.createPrescription({
        patientId: Number(patientId),
        doctorId: user.id,
        medicationName,
        dosage,
        frequency,
        duration,
        notes: notes || null
      });

      // Auto-create invoice if serviceId exists
      if (serviceId) {
        const service = await storage.getService(serviceId);
        if (service) {
          await storage.createInvoice({
            patientId: Number(patientId),
            appointmentId: null as any,
            amount: service.price,
            currency: 'EGP',
            status: 'pending',
            description: `صرف دواء: ${service.name}`
          } as any);
        }
      }

      res.status(201).json(newPrescription);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error creating prescription" });
    }
  });

  app.patch("/api/prescriptions/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== 'doctor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      const id = Number(req.params.id);
      const { medicationName, dosage, frequency, duration, notes, status } = req.body;
      const updated = await storage.updatePrescription(id, {
        ...(medicationName ? { medicationName } : {}),
        ...(dosage ? { dosage } : {}),
        ...(frequency ? { frequency } : {}),
        ...(duration ? { duration } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(status ? { status } : {}),
      });
      if (!updated) return res.status(404).json({ message: "Prescription not found" });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error updating prescription" });
    }
  });

  app.delete("/api/prescriptions/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== 'doctor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      const id = Number(req.params.id);
      const deleted = await storage.deletePrescription(id);
      if (!deleted) return res.status(404).json({ message: "Prescription not found" });
      res.json({ message: "Prescription deleted successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error deleting prescription" });
    }
  });

  // Lab Requests
  app.get("/api/lab-requests", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (user?.role === 'patient') {
      const labs = await storage.getLabRequestsByPatient(userId);
      res.json(labs);
    } else if (user?.role === 'doctor') {
      const allLabs = await storage.getLabRequests();
      res.json(allLabs.filter(l => l.doctorId === userId));
    } else {
      const allLabs = await storage.getLabRequests();
      res.json(allLabs);
    }
  });

  app.post("/api/lab-requests", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== 'doctor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Only doctors can request lab tests" });
      }

      const { patientId, testType, testName, instructions, serviceId } = req.body;
      if (!patientId || !testType || !testName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const newLabReq = await storage.createLabRequest({
        patientId: Number(patientId),
        doctorId: user.id,
        testType,
        testName,
        instructions: instructions || null
      });

      // Auto-create invoice if serviceId exists
      if (serviceId) {
        const service = await storage.getService(serviceId);
        if (service) {
          await storage.createInvoice({
            patientId: Number(patientId),
            appointmentId: null as any,
            amount: service.price,
            currency: 'EGP',
            status: 'pending',
            description: `فحص معملي/أشعة: ${service.name}`
          } as any);
        }
      }

      res.status(201).json(newLabReq);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error creating lab request" });
    }
  });

  app.patch("/api/lab-requests/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const id = Number(req.params.id);
      const { result, status } = req.body;
      const updated = await storage.updateLabRequest(id, {
        ...(result !== undefined ? { result } : {}),
        ...(status ? { status } : {}),
      });
      if (!updated) return res.status(404).json({ message: "Lab request not found" });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error updating lab request" });
    }
  });

  app.delete("/api/lab-requests/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== 'doctor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      const id = Number(req.params.id);
      const deleted = await storage.deleteLabRequest(id);
      if (!deleted) return res.status(404).json({ message: "Lab request not found" });
      res.json({ message: "Lab request deleted successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error deleting lab request" });
    }
  });

  // Clinic Services & Prices
  app.get(api.services.list.path, async (req, res) => {
    try {
      const clinicId = req.query.clinicId ? Number(req.query.clinicId) : undefined;
      const category = req.query.category as string | undefined;
      
      let servicesList;
      if (category) {
        servicesList = await storage.getServicesByCategory(category);
      } else if (clinicId) {
        servicesList = await storage.getServicesByClinic(clinicId);
      } else {
        servicesList = await storage.getServices();
      }
      
      res.json(servicesList);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error getting services" });
    }
  });

  app.post(api.services.create.path, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Only Admin can add clinic services and set prices" });
      }
      const data = api.services.create.input.parse(req.body);
      const created = await storage.createService(data);
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0].message });
      }
      console.error(e);
      res.status(500).json({ message: "Server error creating service" });
    }
  });

  app.patch("/api/services/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Only Admin can modify services and prices" });
      }
      const id = Number(req.params.id);
      const { name, price, description, clinicId } = req.body;
      const updated = await storage.updateService(id, {
        ...(name !== undefined ? { name } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(clinicId !== undefined ? { clinicId: Number(clinicId) } : {})
      });
      if (!updated) return res.status(404).json({ message: "Service not found" });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error updating service" });
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Only Admin can delete services" });
      }
      const id = Number(req.params.id);
      const deleted = await storage.deleteService(id);
      if (!deleted) return res.status(404).json({ message: "Service not found" });
      res.json({ message: "Service deleted successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error deleting service" });
    }
  });

  // Admin: Clean Database
  app.post("/api/admin/clean-database", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (user?.role !== "admin") return res.status(403).json({ message: "Forbidden: Admin access required" });

      await storage.cleanDatabase();
      res.json({ message: "Database cleaned successfully. All test transaction records and temporary accounts have been reset." });
    } catch (e) {
      console.error("Clean database error:", e);
      res.status(500).json({ message: "Server error cleaning database" });
    }
  });

  // Payments
  app.get("/api/payments/methods", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const methods = await storage.getPaymentMethods(userId);
    res.json(methods);
  });

  app.post("/api/payments/methods", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { type, provider, last4, expiry, policyId } = req.body;
      const newMethod = await storage.createPaymentMethod({
        patientId: userId,
        type, provider, last4, expiry, policyId, isPrimary: false
      });
      res.status(201).json(newMethod);
    } catch(e) {
      res.status(500).json({ message: "Error adding payment method" });
    }
  });

  app.get("/api/payments/invoices", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const invoices = await storage.getInvoices(userId);
    res.json(invoices);
  });

  app.post("/api/payments/pay", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { invoiceId, methodId, customType } = req.body;
      
      const invoice = await storage.getInvoice(Number(invoiceId));
      if (!invoice || invoice.patientId !== userId) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      if (invoice.status === 'paid') {
        return res.status(400).json({ message: "Invoice is already paid" });
      }

      if (customType === "cash_reception") {
        // Only confirm appointment. Invoice remains pending.
        await storage.updateAppointment(invoice.appointmentId, { status: 'confirmed' });
        return res.json({ message: "Will pay at reception" });
      }

      // Process payment (Simulate success)
      const transaction = await storage.createTransaction({
        invoiceId: invoice.id,
        patientId: userId,
        methodId: Number(methodId),
        amount: invoice.amount,
        status: "success"
      });

      // Update invoice status
      await storage.updateInvoice(invoice.id, { status: 'paid' });

      // Update appointment status to confirmed
      await storage.updateAppointment(invoice.appointmentId, { status: 'confirmed' });

      res.json({ message: "Payment successful", transaction });
    } catch(e) {
      res.status(500).json({ message: "Payment failed" });
    }
  });

  // AI Medical Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Invalid request" });
      }
      
      let patientContext = null;
      let hospitalContext = null;
      const userId = (req.session as any)?.userId;

      if (userId) {
        const user = await storage.getUser(userId);
        if (user && user.role === 'patient') {
          const mHistory = await storage.getMedicalHistoryByPatient(userId);
          patientContext = {
            id: user.id,
            name: user.name,
            age: user.dateOfBirth ? Math.floor((new Date().getTime() - new Date(user.dateOfBirth).getTime()) / 31557600000) : "Unknown",
            gender: user.gender || "Unknown",
            medicalHistory: mHistory.length > 0 ? mHistory.map(h => h.condition + " (" + (h.notes || "") + ")").join(", ") : "None"
          };
        }
      }

      const clinics = await storage.getClinics();
      const doctors = await storage.getDoctors();
      hospitalContext = {
        clinics: clinics.map(c => ({ id: c.id, name: c.name, description: c.description })),
        doctors: doctors.map(d => ({ 
          id: d.id, 
          name: d.name, 
          clinicId: d.clinicId,
          workingDays: d.workingDays,
          workingHours: d.workingHours
        }))
      };

      const chatHistory: ChatMessage[] = Array.isArray(history) ? history : [];
      let reply = await getMedicalResponse(message, chatHistory, patientContext, hospitalContext);

      // Check if AI wants to book an appointment
      const actionMatch = reply.match(/\[ACTION:BOOK_APPOINTMENT,\s*(\{.*?\})\s*\]/is);
      if (actionMatch && userId) {
        try {
          const actionData = JSON.parse(actionMatch[1]);
          await storage.createAppointment({
            patientId: userId,
            doctorId: Number(actionData.doctorId),
            clinicId: Number(actionData.clinicId),
            datetime: new Date(actionData.date),
            status: "scheduled",
            notes: "Booked automatically by AI Assistant"
          });
          // Remove the action block from the reply text shown to user
          reply = reply.replace(actionMatch[0], "").trim();
          reply += "\n\n✅ تم حجز الموعد بنجاح وإضافته إلى سجل مواعيدك!";
        } catch(e) {
          console.error("Failed to parse/execute AI action:", e);
        }
      }

      res.json({ reply });
    } catch (err) {
      console.error("Chat error:", err);
      res.status(500).json({ message: "AI service error" });
    }
  });

  // PSO Schedule Optimization Route
  app.post("/api/optimize-schedule", async (req, res) => {
    try {
      const { patients } = req.body; // Array of patients with {id, name, expectedDuration}
      if (!patients || !Array.isArray(patients)) {
        return res.status(400).json({ message: "Invalid input. Expected array of patients." });
      }
      
      const doctorsDb = await storage.getDoctors();
      const doctors = doctorsDb.map(d => ({ id: d.id, name: d.name }));
      
      if (doctors.length === 0) {
        return res.status(400).json({ message: "No doctors available for optimization." });
      }

      const optimizer = new PSOOptimizer(patients, doctors);
      const result = optimizer.optimize();
      
      res.json({ message: "Schedule optimized using Particle Swarm Optimization (PSO)", result });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error during schedule optimization" });
    }
  });

  // Seed DB with the 13 base clinics and default root admin (no doctors/patients) if empty
  setTimeout(async () => {
    try {
      const allClinics = await storage.getClinics();
      if (allClinics.length === 0) {
        const clinicsToSeed = [
          { name: "الباطنة", description: "عيادة الباطنة العامة", doctorCount: 0 },
          { name: "الجراحة العامة", description: "جراحة عامة", doctorCount: 0 },
          { name: "الأطفال", description: "طب الأطفال", doctorCount: 0 },
          { name: "النساء والتوليد", description: "نساء وتوليد", doctorCount: 0 },
          { name: "العظام", description: "جراحة العظام", doctorCount: 0 },
          { name: "الأنف والأذن والحنجرة", description: "أنف وأذن وحنجرة", doctorCount: 0 },
          { name: "الجلدية", description: "الأمراض الجلدية", doctorCount: 0 },
          { name: "الرمد", description: "طب العيون", doctorCount: 0 },
          { name: "القلب", description: "أمراض القلب", doctorCount: 0 },
          { name: "الصدر", description: "أمراض الصدر", doctorCount: 0 },
          { name: "المخ والأعصاب", description: "طب المخ والأعصاب", doctorCount: 0 },
          { name: "المسالك البولية", description: "المسالك البولية", doctorCount: 0 },
          { name: "الجهاز الهضمي", description: "أمراض الجهاز الهضمي", doctorCount: 0 },
        ];
        for (const c of clinicsToSeed) {
          await storage.createClinic(c);
        }

        const adminExists = await storage.getUserByUsername('admin1');
        if (!adminExists) {
          await storage.createUser({
            username: 'admin1', password: '123', name: 'المسؤول الرئيسي', role: 'admin'
          });
        }
      }
    } catch(e) { console.error('Seed error:', e) }
  }, 1000);

  return httpServer;
}