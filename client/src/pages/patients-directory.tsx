import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { arEG } from "date-fns/locale";
import { Users, Search, FolderHeart, Calendar, FileText, Pill, Activity, UserCircle, Phone, Mail, ShieldAlert, ChevronRight, CheckCircle2, Clock, Plus, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function PatientsDirectoryPage() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  // Prescription Form State
  const [isPrescribeOpen, setIsPrescribeOpen] = useState(false);
  const [medName, setMedName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmittingPresc, setIsSubmittingPresc] = useState(false);

  // Fetch all patients
  const { data: patients, isLoading } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const res = await fetch('/api/patients');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: user?.role === 'doctor' || user?.role === 'admin'
  });

  // Fetch summary for selected patient
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['/api/patients', selectedPatientId, 'summary'],
    queryFn: async () => {
      if (!selectedPatientId) return null;
      const res = await fetch(`/api/patients/${selectedPatientId}/summary`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedPatientId
  });

  const filteredPatients = patients?.filter((p: any) => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.username?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handlePrescribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !medName || !dosage || !frequency || !duration) {
      toast({ title: isEn ? "Missing fields" : "بيانات ناقصة", description: isEn ? "Please fill all medication details" : "يرجى تعبئة كافة تفاصيل الدواء والجرعة", variant: "destructive" });
      return;
    }
    setIsSubmittingPresc(true);
    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          medicationName: medName,
          dosage,
          frequency,
          duration,
          notes: notes || null
        })
      });
      if (!res.ok) throw new Error("Failed to prescribe");
      await queryClient.invalidateQueries({ queryKey: ['/api/patients', selectedPatientId, 'summary'] });
      toast({
        title: isEn ? "Prescription Added" : "تم صرف الروشتة بنجاح",
        description: isEn ? `${medName} added to patient's electronic prescription.` : `تم صرف الدواء (${medName}) وإضافته للأضبارة الإلكترونية للمريض بنجاح.`
      });
      setIsPrescribeOpen(false);
      setMedName(""); setDosage(""); setFrequency(""); setDuration(""); setNotes("");
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmittingPresc(false);
    }
  };

  if (user?.role !== 'doctor' && user?.role !== 'admin') {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold">{isEn ? "Access Restricted" : "صلاحية محجوبة"}</h2>
        <p className="text-muted-foreground mt-2">{isEn ? "Only doctors and hospital administrators can access patient medical directories." : "هذه الصفحة مخصصة فقط للأطباء وإدارة المستشفى للاطلاع على ملفات المرضى الشاملة."}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" dir={isEn ? "ltr" : "rtl"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            {isEn ? "Patient Directory & Medical Profiles" : "دليل المرضى والملفات الطبية الشاملة"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isEn ? "Search across all registered hospital patients and inspect their comprehensive clinical records in one unified dashboard." : "البحث في جميع مرضى المستشفى المسجلين واستعراض الأضبارة الطبية الشاملة (المواعيد، التشخيصات، والتقارير) في شاشة واحدة."}
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-5 h-5 absolute top-3.5 start-3.5 text-muted-foreground" />
          <Input 
            placeholder={isEn ? "Search by patient name..." : "ابحث باسم المريض أو كود الحساب..."} 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="ps-11 h-12 rounded-2xl border-2 font-bold shadow-sm"
          />
        </div>
      </div>

      {/* Patient Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-44 bg-secondary/50 rounded-3xl animate-pulse" />)}
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center p-16 bg-secondary/30 rounded-3xl border-2 border-dashed border-border space-y-4">
          <UserCircle className="w-16 h-16 text-muted-foreground/40 mx-auto" />
          <h3 className="text-xl font-bold text-foreground">{isEn ? "No patients found" : "لم يتم العثور على أي مرضى مطابقة"}</h3>
          <p className="text-muted-foreground">{isEn ? "Try searching with a different keyword or check registered accounts." : "تأكد من كتابة الاسم بشكل صحيح أو تحقق من المرضى المسجلين في النظام."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient: any) => (
            <Card 
              key={patient.id} 
              onClick={() => setSelectedPatientId(patient.id)}
              className="hover:border-sky-400 transition-all cursor-pointer rounded-3xl shadow-sm hover:shadow-md group overflow-hidden border border-border"
            >
              <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-lg border border-sky-200/50 dark:border-sky-900 group-hover:scale-105 transition-transform">
                      {patient.name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground group-hover:text-sky-600 transition-colors">{patient.name}</h3>
                      <span className="text-xs text-muted-foreground font-mono">ID: #{patient.id} • @{patient.username}</span>
                    </div>
                  </div>
                  <span className="p-2 rounded-xl bg-secondary text-muted-foreground group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors">
                    <FolderHeart className="w-5 h-5" />
                  </span>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>{isEn ? "Status: Registered Patient" : "الحالة: مريض مسجل بالمستشفى"}</span>
                  <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-bold">
                    {isEn ? "View Medical File" : "فتح الملف الطبي"}
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Comprehensive Patient File Dialog */}
      <Dialog open={!!selectedPatientId} onOpenChange={(open) => !open && setSelectedPatientId(null)}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto rounded-3xl p-6 md:p-8" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader className="border-b pb-4 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-sky-600 text-white rounded-2xl">
                  <FolderHeart className="w-7 h-7" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-extrabold text-foreground">
                    {summary?.patient?.name || (isEn ? "Loading Patient..." : "جاري تحميل بيانات المريض...")}
                  </DialogTitle>
                  <DialogDescription className="text-sm font-semibold">
                    {isEn ? "Comprehensive Medical File • Unified Hospital Record" : "الأضبارة الطبية الموحدة وسجل المريض الشامل بالمستشفى"}
                  </DialogDescription>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold text-xs border border-sky-200">
                {isEn ? "Patient ID:" : "رقم المريض:"} #{selectedPatientId}
              </span>
            </div>
          </DialogHeader>

          {isLoadingSummary ? (
            <div className="p-16 text-center text-muted-foreground animate-pulse font-bold text-lg">
              {isEn ? "Loading comprehensive clinical history..." : "جاري جلب الملف الطبي والأضبارة الشاملة للمريض..."}
            </div>
          ) : !summary ? (
            <div className="p-12 text-center text-destructive font-bold">{isEn ? "Failed to load summary details." : "تعذر جلب تفاصيل أضبارة المريض."}</div>
          ) : (
            <Tabs defaultValue="history" className="w-full pt-2">
              <TabsList className="grid grid-cols-4 h-14 rounded-2xl bg-secondary/60 p-1 mb-6">
                <TabsTrigger value="history" className="rounded-xl font-bold gap-2 text-xs md:text-sm">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  {isEn ? "Diagnosis History" : "التاريخ المرضي"} ({summary.history?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="appointments" className="rounded-xl font-bold gap-2 text-xs md:text-sm">
                  <Calendar className="w-4 h-4 text-primary" />
                  {isEn ? "Appointments" : "المواعيد"} ({summary.appointments?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="reports" className="rounded-xl font-bold gap-2 text-xs md:text-sm">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  {isEn ? "Reports" : "التقارير الطبية"} ({summary.reports?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="plans" className="rounded-xl font-bold gap-2 text-xs md:text-sm">
                  <Pill className="w-4 h-4 text-purple-600" />
                  {isEn ? "Prescriptions & Plans" : "الروشتات وخطط العلاج"} ({(summary.prescriptions?.length || 0) + (summary.plans?.length || 0)})
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: Diagnosis History */}
              <TabsContent value="history" className="space-y-4">
                {summary.history?.length === 0 ? (
                  <div className="text-center p-8 bg-secondary/20 rounded-2xl border text-muted-foreground font-semibold">
                    {isEn ? "No recorded diagnoses for this patient." : "لا توجد تشخيصات أو حالات مرضية مسجلة لهذا المريض بعد."}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {summary.history?.map((h: any) => (
                      <div key={h.id} className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div>
                          <span className="inline-block px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold mb-2">
                            {h.condition}
                          </span>
                          <p className="text-sm font-semibold text-foreground">{h.notes || (isEn ? "No additional notes." : "لا توجد ملاحظات إضافية.")}</p>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                          {format(new Date(h.date || new Date()), 'dd MMM yyyy', { locale: isEn ? undefined : arEG })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: Appointments */}
              <TabsContent value="appointments" className="space-y-4">
                {summary.appointments?.length === 0 ? (
                  <div className="text-center p-8 bg-secondary/20 rounded-2xl border text-muted-foreground font-semibold">
                    {isEn ? "No past or upcoming appointments recorded." : "لا توجد أي مواعيد سابقة أو قادمة مسجلة للمريض."}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {summary.appointments?.map((a: any) => (
                      <div key={a.id} className="p-4 rounded-2xl bg-secondary/30 border flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-primary/10 text-primary font-bold text-center min-w-[70px]">
                            <span className="block text-xs uppercase">{format(new Date(a.datetime), 'MMM')}</span>
                            <span className="text-xl font-black">{format(new Date(a.datetime), 'dd')}</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground text-sm">{format(new Date(a.datetime), 'PPP p', { locale: isEn ? undefined : arEG })}</h4>
                            <p className="text-xs text-muted-foreground">{isEn ? "Clinic ID:" : "عيادة رقم:"} {a.clinicId} • {isEn ? "Doctor ID:" : "طبيب رقم:"} {a.doctorId}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full 
                          ${a.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 
                            a.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                          {isEn ? a.status.toUpperCase() : (a.status === 'confirmed' ? 'مؤكد' : a.status === 'completed' ? 'منتهي ومكتمل' : 'قيد الانتظار')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: Reports */}
              <TabsContent value="reports" className="space-y-4">
                {summary.reports?.length === 0 ? (
                  <div className="text-center p-8 bg-secondary/20 rounded-2xl border text-muted-foreground font-semibold">
                    {isEn ? "No clinical reports written for this patient." : "لا توجد تقارير طبية أو نتائج فحوصات صادرة لهذا المريض."}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {summary.reports?.map((r: any) => (
                      <div key={r.id} className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-emerald-800 dark:text-emerald-300">{r.title}</h4>
                          <span className="text-xs text-muted-foreground">{format(new Date(r.date || new Date()), 'dd/MM/yyyy')}</span>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* TAB 4: Prescriptions (Rx) */}
              <TabsContent value="plans" className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3 bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-900">
                  <div>
                    <h3 className="font-extrabold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                      <Pill className="w-5 h-5 text-purple-600" />
                      {isEn ? "Electronic Prescriptions (Rx & Medications)" : "الروشتة الإلكترونية الطبية وسجل الأدوية المصروفة"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isEn ? "Prescribed medications and active dosages for this patient" : "قائمة الأدوية الموصوفة والجرعات الحالية المعتمدة للمريض"}
                    </p>
                  </div>
                  {user?.role === 'doctor' && (
                    <Button onClick={() => setIsPrescribeOpen(true)} className="rounded-xl bg-purple-600 hover:bg-purple-700 font-bold gap-2 shadow-md">
                      <Plus className="w-4 h-4" />
                      {isEn ? "Prescribe New Medication" : "صرف دواء / روشتة جديدة"}
                    </Button>
                  )}
                </div>

                {/* Medications List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-muted-foreground">{isEn ? "Prescribed Medications:" : "الأدوية المصروفة:"}</h4>
                  {(!summary.prescriptions || summary.prescriptions.length === 0) ? (
                    <div className="text-center p-6 bg-secondary/20 rounded-2xl border text-muted-foreground text-sm font-medium">
                      {isEn ? "No active medications prescribed yet." : "لا توجد أدوية أو روشتات مصروفة لهذا المريض بعد."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {summary.prescriptions.map((presc: any) => (
                        <div key={presc.id} className="p-4 rounded-2xl bg-purple-500/10 dark:bg-purple-950/40 border-2 border-purple-200 dark:border-purple-800 space-y-2.5 relative group">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="font-mono text-xs font-black px-2 py-0.5 bg-purple-600 text-white rounded-md me-2 inline-block">Rx</span>
                              <span className="font-black text-foreground text-base">{presc.medicationName}</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground font-semibold">{format(new Date(presc.date || new Date()), 'dd/MM/yyyy')}</span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-background/80 p-2.5 rounded-xl border text-xs">
                            <div>
                              <span className="text-muted-foreground block text-[10px] font-bold">{isEn ? "DOSAGE:" : "الجرعة:"}</span>
                              <span className="font-extrabold text-purple-700 dark:text-purple-300">{presc.dosage}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[10px] font-bold">{isEn ? "FREQUENCY:" : "التكرار:"}</span>
                              <span className="font-extrabold">{presc.frequency}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[10px] font-bold">{isEn ? "DURATION:" : "المدة:"}</span>
                              <span className="font-extrabold text-emerald-600">{presc.duration}</span>
                            </div>
                          </div>

                          {presc.notes && (
                            <p className="text-xs text-muted-foreground bg-secondary/40 p-2 rounded-lg italic">
                              <span className="font-bold">{isEn ? "Doctor Note: " : "ملاحظة الطبيب: "}</span>{presc.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Treatment Plans List */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="text-sm font-bold text-muted-foreground">{isEn ? "Long-term Treatment Plans:" : "خطط العلاج والمتابعة الطويلة:"}</h4>
                  {(!summary.plans || summary.plans.length === 0) ? (
                    <div className="text-center p-6 bg-secondary/20 rounded-2xl border text-muted-foreground text-sm font-medium">
                      {isEn ? "No long-term treatment plans." : "لا توجد خطط علاجية طويلة المدى مسجلة."}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {summary.plans.map((p: any) => (
                        <div key={p.id} className="p-4 rounded-2xl bg-secondary/30 border space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-foreground">{p.title}</h4>
                            <span className="text-xs text-muted-foreground">{format(new Date(p.startDate), 'dd/MM/yyyy')}</span>
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed bg-card p-3 rounded-xl border">{p.details}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: Prescribe Medication */}
      <Dialog open={isPrescribeOpen} onOpenChange={setIsPrescribeOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-600">
              <Pill className="w-5 h-5" />
              {isEn ? "Prescribe New Medication (Rx)" : "صرف دواء وروشتة طبية للمريض"}
            </DialogTitle>
            <DialogDescription>
              {isEn ? `Add an electronic prescription for ${summary?.patient?.name || 'patient'}.` : `تسجيل دواء وجرعة طبية معتمدة للأضبارة الإلكترونية للمريض (${summary?.patient?.name || ''}).`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePrescribe} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "Medication Name" : "اسم الدواء والعلاج"}</label>
              <Input 
                placeholder={isEn ? "e.g. Amoxicillin 500mg" : "مثال: Amoxicillin 500mg / أوجمنتين"} 
                value={medName}
                onChange={e => setMedName(e.target.value)}
                required
                className="h-11 rounded-xl border-2 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold">{isEn ? "Dosage" : "الجرعة"}</label>
                <Input 
                  placeholder={isEn ? "e.g. 1 Tablet" : "مثال: كبسولة واحدة / 5 مل"} 
                  value={dosage}
                  onChange={e => setDosage(e.target.value)}
                  required
                  className="h-11 rounded-xl border-2 font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">{isEn ? "Frequency" : "تكرار الجرعة"}</label>
                <Input 
                  placeholder={isEn ? "e.g. Every 8 hours" : "مثال: كل 8 ساعات بعد الأكل"} 
                  value={frequency}
                  onChange={e => setFrequency(e.target.value)}
                  required
                  className="h-11 rounded-xl border-2 font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "Duration" : "مدة العلاج"}</label>
              <Input 
                placeholder={isEn ? "e.g. 7 Days" : "مثال: لمدة 7 أيام أو حتى انتهاء العبوة"} 
                value={duration}
                onChange={e => setDuration(e.target.value)}
                required
                className="h-11 rounded-xl border-2 font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "Doctor Instructions / Notes (Optional)" : "تعليمات وملاحظات الطبيب (اختياري)"}</label>
              <Textarea 
                placeholder={isEn ? "e.g. Take after food, avoid cold drinks..." : "مثال: تناول الدواء بعد الطعام بساعة، مع شرب كميات كافية من الماء..."} 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="rounded-xl border-2 min-h-[70px]"
              />
            </div>

            <DialogFooter className="pt-3 flex sm:justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setIsPrescribeOpen(false)} disabled={isSubmittingPresc} className="rounded-xl px-5 h-11">
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button type="submit" disabled={isSubmittingPresc} className="rounded-xl px-6 h-11 bg-purple-600 hover:bg-purple-700 font-bold shadow-md gap-2">
                <Pill className="w-4 h-4" />
                {isSubmittingPresc ? (isEn ? "Saving..." : "جاري الصرف...") : (isEn ? "Save Prescription" : "اعتماد وصرف الروشتة")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
