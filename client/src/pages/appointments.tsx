import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppointments, useCreateAppointment } from "@/hooks/use-appointments";
import { useClinics, useDoctors } from "@/hooks/use-clinics";
import { useUser } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { arEG } from "date-fns/locale";
import { CalendarIcon, Clock, Stethoscope, UserCircle, CheckCircle, XCircle, Edit3, Check, AlertTriangle, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@shared/routes";

const schema = z.object({
  clinicId: z.coerce.number().min(1, "يرجى اختيار العيادة"),
  doctorId: z.coerce.number().min(1, "يرجى اختيار الطبيب"),
  date: z.date({ required_error: "يرجى اختيار التاريخ" }),
  time: z.string().min(1, "يرجى اختيار الوقت"),
});

const clinicTranslations: Record<string, string> = {
  "الباطنة": "Internal Medicine",
  "الجراحة العامة": "General Surgery",
  "الأطفال": "Pediatrics",
  "النساء والتوليد": "Obstetrics & Gynecology",
  "العظام": "Orthopedics",
  "الأنف والأذن والحنجرة": "ENT",
  "الجلدية": "Dermatology",
  "الرمد": "Ophthalmology",
  "القلب": "Cardiology",
  "الصدر": "Pulmonology",
  "المخ والأعصاب": "Neurology",
  "المسالك البولية": "Urology",
  "الجهاز الهضمي": "Gastroenterology",
};

export default function AppointmentsPage() {
  const { data: user } = useUser();
  const { data: appointments, isLoading: isLoadingAppts } = useAppointments();
  const { data: clinics } = useClinics();
  const { data: doctors } = useDoctors();
  const createMutation = useCreateAppointment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);
  const [editingAppt, setEditingAppt] = useState<any | null>(null);
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editTime, setEditTime] = useState<string>("10:00");
  const [isUpdating, setUpdating] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      clinicId: 0,
      doctorId: 0,
      time: "",
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initClinic = Number(params.get("clinicId")) || 0;
    const initDoctor = Number(params.get("doctorId")) || 0;
    if (initClinic > 0) {
      setSelectedClinicId(initClinic);
      form.setValue("clinicId", initClinic);
    }
    if (initDoctor > 0) {
      form.setValue("doctorId", initDoctor);
    }
  }, [window.location.search, clinics, doctors]);

  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  const filteredDoctors = doctors?.filter(d => !selectedClinicId || d.clinicId === selectedClinicId) ?? [];

  const getClinicName = (arabicName: string) => {
    if (isEn) return clinicTranslations[arabicName] || arabicName;
    return arabicName;
  };

  const onSubmit = (data: any) => {
    if (!user) return;
    
    const [hours, minutes] = data.time.split(':');
    const datetime = new Date(data.date);
    datetime.setHours(parseInt(hours), parseInt(minutes));

    createMutation.mutate({
      patientId: user.id,
      doctorId: data.doctorId,
      clinicId: data.clinicId,
      datetime,
      notes: isEn ? "Booked via platform" : "حجز عبر المنصة",
    });
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      toast({
        title: isEn ? "Status Updated" : "تم تحديث حالة الموعد",
        description: isEn ? `Appointment marked as ${newStatus}` : `تم تحويل الموعد إلى حالة (${newStatus === 'confirmed' ? 'مؤكد' : newStatus === 'completed' ? 'منتهي ومكتمل' : 'ملغي'}) بنجاح.`,
      });
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ في التحديث", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAppt) return;
    setUpdating(true);
    try {
      const [hours, minutes] = editTime.split(':');
      const newDatetime = new Date(editDate);
      newDatetime.setHours(parseInt(hours), parseInt(minutes));

      const res = await fetch(`/api/appointments/${editingAppt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datetime: newDatetime.toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to edit appointment");
      await queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      toast({
        title: isEn ? "Appointment Rescheduled" : "تم تعديل وتأجيل الموعد بنجاح",
        description: isEn ? "New date and time saved." : "تم حفظ الموعد الزمني الجديد وإشعار المستشفى.",
      });
      setEditingAppt(null);
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ في التعديل", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" dir={isEn ? "ltr" : "rtl"}>
      <div className="space-y-2 border-b pb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <CalendarIcon className="w-6 h-6" />
          </div>
          {isEn ? "Appointment Management" : "إدارة المواعيد وتأكيد الحجوزات"}
        </h1>
        <p className="text-muted-foreground text-lg">
          {isEn ? "Book, confirm, reschedule, or complete your medical appointments dynamically." : "احجز موعدك الجديد، قم بتأكيد الحجوزات المعلقة، وتحديث حالة الزيارات الطبية الفورية."}
        </p>
      </div>

      <div className={`grid grid-cols-1 ${user?.role === 'patient' ? 'lg:grid-cols-3' : ''} gap-8`}>
        
        {/* Book Appointment Form: Only for patients */}
        {user?.role === 'patient' && (
        <div className="lg:col-span-1">
          <Card className="border-border shadow-lg shadow-black/5 rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-sky-300"></div>
            <CardHeader className="bg-secondary/30 pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                {isEn ? "Book New Appointment" : "حجز موعد جديد"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isEn ? "Select Clinic" : "اختر العيادة"}</label>
                  <Select onValueChange={(v) => {
                    const id = parseInt(v);
                    form.setValue("clinicId", id);
                    form.setValue("doctorId", 0);
                    setSelectedClinicId(id);
                  }}>
                    <SelectTrigger className="w-full rounded-xl py-5 border-2">
                      <SelectValue placeholder={isEn ? "Clinic..." : "العيادة..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {clinics?.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {getClinicName(c.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.clinicId && <p className="text-xs text-destructive">{form.formState.errors.clinicId.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{isEn ? "Select Doctor" : "اختر الطبيب"}</label>
                  <Select
                    key={selectedClinicId}
                    onValueChange={(v) => form.setValue("doctorId", parseInt(v))}
                    disabled={!selectedClinicId}
                  >
                    <SelectTrigger className="w-full rounded-xl py-5 border-2">
                      <SelectValue placeholder={
                        !selectedClinicId
                          ? (isEn ? "Choose a clinic first" : "اختر العيادة أولاً")
                          : (filteredDoctors.length === 0
                            ? (isEn ? "No doctors available" : "لا يوجد أطباء")
                            : (isEn ? "Doctor..." : "الطبيب المعالج..."))
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDoctors.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          {isEn ? d.name.replace('د. ', 'Dr. ').replace('د.', 'Dr.') : d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.watch("doctorId") && (() => {
                    const docObj = doctors?.find(d => d.id === form.watch("doctorId"));
                    if (!docObj) return null;
                    const daysMap: Record<string, string> = {
                      "0": "الأحد", "1": "الإثنين", "2": "الثلاثاء", "3": "الأربعاء", "4": "الخميس", "5": "الجمعة", "6": "السبت"
                    };
                    const enDaysMap: Record<string, string> = {
                      "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat"
                    };
                    const allowed = ((docObj as any).workingDays || "0,1,2,3,4").split(",").map((d: string) => d.trim());
                    const formattedDays = allowed.map((d: string) => (isEn ? enDaysMap[d] || d : daysMap[d] || d)).join("، ");
                    const formattedHours = (docObj as any).workingHours || "09:00 - 17:00";
                    return (
                      <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl mt-2.5 text-xs text-muted-foreground space-y-2 shadow-sm">
                        <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                          <span className="font-bold text-primary flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {isEn ? "Working Days:" : "أيام تواجد الطبيب:"}
                          </span>
                          <span className="font-black text-foreground">{formattedDays}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5" />
                            {isEn ? "Working Hours:" : "مواعيد الكشف:"}
                          </span>
                          <span className="font-black text-foreground">{formattedHours}</span>
                        </div>
                        <p className="leading-relaxed text-foreground/80 font-medium pt-1 border-t border-primary/10">
                          {(docObj as any).bio || (isEn ? "Certified specialist with extensive clinical experience in diagnostics and patient care." : "طبيب استشاري متخصص وذو خبرة سريرية متميزة في تشخيص ومتابعة الحالات الطبية بأعلى معايير الرعاية والدقة.")}
                        </p>
                      </div>
                    );
                  })()}
                  {form.formState.errors.doctorId && <p className="text-xs text-destructive">{form.formState.errors.doctorId.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{isEn ? "Date" : "التاريخ"}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-start font-normal rounded-xl py-5 border-2", !form.watch("date") && "text-muted-foreground")}
                      >
                        <CalendarIcon className="me-2 h-4 w-4" />
                        {form.watch("date") ? format(form.watch("date"), "PPP", { locale: isEn ? undefined : arEG }) : <span>{isEn ? "Pick a date" : "اختر اليوم"}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.watch("date")}
                        onSelect={(date) => form.setValue("date", date as Date)}
                        initialFocus
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          if (date < today) return true;
                          const selectedDoctorId = form.watch("doctorId");
                          if (selectedDoctorId) {
                            const docObj = doctors?.find(d => d.id === selectedDoctorId);
                            if (docObj && (docObj as any).workingDays) {
                              const allowed = (docObj as any).workingDays.split(",").map((d: string) => d.trim());
                              if (!allowed.includes(date.getDay().toString())) return true;
                            }
                          }
                          return false;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.date && <p className="text-xs text-destructive">{form.formState.errors.date.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{isEn ? "Preferred Time" : "الوقت المفضل"}</label>
                  <Select onValueChange={(v) => form.setValue("time", v)}>
                    <SelectTrigger className="w-full rounded-xl py-5 border-2">
                      <SelectValue placeholder={isEn ? "Time..." : "الساعة..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "17:00", "18:00", "19:00", "20:00"].map(t => {
                        const selectedDoctorId = form.watch("doctorId");
                        const selectedDate = form.watch("date");
                        let isBooked = false;
                        if (selectedDoctorId && selectedDate && appointments) {
                          const [h, m] = t.split(":");
                          isBooked = appointments.some(a => {
                            if (a.doctorId !== selectedDoctorId || a.status === 'cancelled') return false;
                            const aDate = new Date(a.datetime);
                            return aDate.toDateString() === selectedDate.toDateString() && aDate.getHours() === parseInt(h) && aDate.getMinutes() === parseInt(m);
                          });
                        }
                        return (
                          <SelectItem key={t} value={t} disabled={isBooked} className={isBooked ? "opacity-40 font-bold text-destructive underline" : "font-semibold"}>
                            {t} {isBooked ? (isEn ? "(Booked)" : "(محجوز مسبقاً)") : (isEn ? "(Available)" : "(متاح)")}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.time && <p className="text-xs text-destructive">{form.formState.errors.time.message as string}</p>}
                </div>

                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  className="w-full py-6 mt-4 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  {createMutation.isPending ? (isEn ? "Booking..." : "جاري الحجز...") : (isEn ? "Confirm Booking" : "تأكيد الحجز")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Existing Appointments List */}
        <div className={user?.role === 'patient' ? "lg:col-span-2 space-y-4" : "space-y-4"}>
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            {isEn 
               ? (user?.role === 'admin' ? "System Appointments" : user?.role === 'doctor' ? "My Schedule" : "My Upcoming Appointments")
               : (user?.role === 'admin' ? "مواعيد المستشفى وجداول الكشوفات" : user?.role === 'doctor' ? "جدول مواعيدي والمرضى" : "مواعيدي القادمة وحالة الحجوزات")
            }
          </h2>
          
          {isLoadingAppts ? (
            <div className="space-y-4">
              {[1,2].map(i => <div key={i} className="h-32 bg-secondary/50 rounded-2xl animate-pulse" />)}
            </div>
          ) : appointments?.length === 0 ? (
            <div className="text-center p-12 bg-secondary/30 rounded-2xl border-2 border-dashed border-border">
              <CalendarIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">{isEn ? "No upcoming appointments" : "لا توجد مواعيد قادمة أو مسجلة"}</h3>
              <p className="text-muted-foreground">{isEn ? "Book your first appointment from the form." : "يمكنك حجز موعد جديد أو إضافة زيارة من النموذج الزمني."}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {appointments?.map(appt => {
                const apptDoctor = doctors?.find(d => d.id === appt.doctorId);
                const apptClinic = clinics?.find(c => c.id === appt.clinicId);
                return (
                  <Card key={appt.id} className="hover:border-primary/40 transition-all border-border shadow-sm rounded-2xl overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <div className="bg-primary/5 p-6 flex flex-col items-center justify-center min-w-[140px] border-e border-border/50">
                        <span className="text-sm font-bold text-primary">{format(new Date(appt.datetime), 'MMM', { locale: isEn ? undefined : arEG })}</span>
                        <span className="text-3xl font-black text-foreground">{format(new Date(appt.datetime), 'dd')}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-2 font-mono">
                          <Clock className="w-3 h-3" />
                          {format(new Date(appt.datetime), 'p', { locale: isEn ? undefined : arEG })}
                        </span>
                      </div>
                      
                      <div className="p-6 flex-1 flex flex-col justify-between h-full space-y-4">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
                              <UserCircle className="w-5 h-5 text-primary" />
                              {apptDoctor
                                ? (isEn ? apptDoctor.name.replace('د. ', 'Dr. ').replace('د.', 'Dr.') : apptDoctor.name)
                                : (isEn ? 'Unknown Doctor' : 'طبيب استشاري')}
                            </h3>
                            <p className="text-primary text-sm flex items-center gap-1 mt-1 font-semibold">
                              <Stethoscope className="w-4 h-4" />
                              {apptClinic
                                ? getClinicName(apptClinic.name)
                                : (isEn ? 'Clinic' : 'العيادة التخصصية')}
                            </p>
                          </div>
                          
                          <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1.5
                            ${appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 
                              appt.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400' :
                              appt.status === 'cancelled' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400' :
                              'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'}`}>
                            {appt.status === 'confirmed' && <CheckCircle className="w-3.5 h-3.5" />}
                            {appt.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                            {appt.status === 'cancelled' && <XCircle className="w-3.5 h-3.5" />}
                            {appt.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                            {isEn ? appt.status.toUpperCase() : (appt.status === 'confirmed' ? 'مؤكد' : appt.status === 'completed' ? 'منتهي ومكتمل' : appt.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار')}
                          </span>
                        </div>
                        
                        <div className="flex gap-2 flex-wrap pt-2 border-t border-border/50">
                          {/* Patient Actions */}
                          {user?.role === 'patient' && appt.status !== 'cancelled' && appt.status !== 'completed' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setEditingAppt(appt);
                                  setEditDate(new Date(appt.datetime));
                                  setEditTime(format(new Date(appt.datetime), 'HH:mm'));
                                }}
                                className="rounded-xl border-2 hover:bg-secondary gap-1.5 font-semibold"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                {isEn ? "Reschedule" : "تعديل الموعد"}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  if (confirm(isEn ? "Are you sure you want to cancel this appointment?" : "هل أنت متأكد من إلغاء هذا الموعد؟")) {
                                    handleUpdateStatus(appt.id, 'cancelled');
                                  }
                                }}
                                className="rounded-xl border-2 text-destructive hover:bg-destructive/10 hover:border-destructive/30 gap-1.5 font-semibold"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                {isEn ? "Cancel" : "إلغاء الحجز"}
                              </Button>
                            </>
                          )}

                          {/* Doctor / Admin Actions */}
                          {(user?.role === 'doctor' || user?.role === 'admin') && (
                            <>
                              {appt.status === 'pending' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                                  className="rounded-xl border-2 hover:bg-emerald-50 text-emerald-600 border-emerald-300 gap-1 font-bold"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  {isEn ? "Confirm" : "تأكيد الحجز"}
                                </Button>
                              )}
                              {(appt.status === 'pending' || appt.status === 'confirmed') && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleUpdateStatus(appt.id, 'completed')}
                                  className="rounded-xl border-2 hover:bg-blue-50 text-blue-600 border-blue-300 gap-1 font-bold"
                                >
                                  <Check className="w-4 h-4" />
                                  {isEn ? "Complete Visit" : "إنهاء الكشف (مكتمل)"}
                                </Button>
                              )}
                              {appt.status !== 'cancelled' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    if (confirm(isEn ? "Cancel this appointment?" : "تأكيد إلغاء هذا الموعد؟")) {
                                      handleUpdateStatus(appt.id, 'cancelled');
                                    }
                                  }}
                                  className="rounded-xl border-2 text-destructive hover:bg-destructive/10 hover:border-destructive/30 gap-1 font-bold ms-auto"
                                >
                                  <XCircle className="w-4 h-4" />
                                  {isEn ? "Cancel" : "إلغاء الموعد"}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={!!editingAppt} onOpenChange={(open) => !open && setEditingAppt(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
              <Edit3 className="w-5 h-5" />
              {isEn ? "Reschedule Appointment" : "تعديل موعد الحجز"}
            </DialogTitle>
            <DialogDescription>
              {isEn ? "Select a new date and time for your medical appointment." : "اختر اليوم والساعة الجديدين ليتم تحديث حجزك فوراً وإرسال تأكيد."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "New Date" : "التاريخ الجديد"}</label>
              <Input 
                type="date" 
                value={format(editDate, 'yyyy-MM-dd')}
                onChange={e => e.target.value && setEditDate(new Date(e.target.value))}
                className="h-11 rounded-xl border-2 font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "New Time" : "الساعة الجديدة"}</label>
              <Select value={editTime} onValueChange={setEditTime}>
                <SelectTrigger className="w-full h-11 rounded-xl border-2 font-bold">
                  <SelectValue placeholder={isEn ? "Select time" : "اختر الساعة"} />
                </SelectTrigger>
                <SelectContent>
                  {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "17:00", "18:00", "19:00", "20:00"].map(t => (
                    <SelectItem key={t} value={t} className="font-semibold">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4 flex sm:justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setEditingAppt(null)} disabled={isUpdating} className="rounded-xl px-5 h-11 font-semibold">
              {isEn ? "Cancel" : "تراجع"}
            </Button>
            <Button type="button" onClick={handleSaveEdit} disabled={isUpdating} className="rounded-xl px-6 h-11 font-bold shadow-md bg-primary gap-2">
              {isUpdating ? (isEn ? "Saving..." : "جاري الحفظ...") : (isEn ? "Save New Date" : "حفظ الموعد الجديد")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
