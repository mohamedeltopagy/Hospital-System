import { useState } from "react";
import { useTreatmentPlans, useCreateTreatmentPlan } from "@/hooks/use-records";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { arEG } from "date-fns/locale";
import { Pill, CalendarClock, Plus, Edit3, Trash2, Printer, Building2, Eye, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useUser } from "@/hooks/use-auth";
import { useDoctors } from "@/hooks/use-clinics";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";

const planSchema = z.object({
  patientId: z.coerce.number().min(1, "يرجى اختيار المريض"),
  title: z.string().min(3, "مطلوب"),
  details: z.string().min(10, "التفاصيل مطلوبة"),
  startDate: z.string().min(1, "التاريخ مطلوب"),
  endDate: z.string().optional()
});

export default function TreatmentPlansPage() {
  const { data: user } = useUser();
  const { data: plans, isLoading } = useTreatmentPlans();
  const { data: doctors } = useDoctors();
  const createMutation = useCreateTreatmentPlan();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  const { data: patients } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const res = await fetch('/api/patients');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: user?.role === 'doctor' || user?.role === 'admin'
  });

  const [activeViewRx, setActiveViewRx] = useState<any | null>(null);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isUpdating, setUpdating] = useState(false);

  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      patientId: 0,
      title: "",
      details: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: ""
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        form.reset();
        toast({
          title: isEn ? "Prescription Issued" : "تم إصدار الروشتة والخطة العلاجية",
          description: isEn ? "Saved to patient medical file." : "تم حفظ الخطة الدوائية وإتاحتها للمريض بنجاح.",
        });
      }
    });
  };

  const handleDeletePlan = async (id: number) => {
    if (!confirm(isEn ? "Are you sure you want to delete this treatment plan?" : "هل أنت متأكد من مسح وإلغاء هذه الروشتة والخطة العلاجية؟")) return;
    try {
      const res = await fetch(`/api/treatment-plans/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete treatment plan");
      await queryClient.invalidateQueries({ queryKey: [api.treatmentPlans.list.path] });
      toast({
        title: isEn ? "Plan Deleted" : "تم مسح الروشتة",
        description: isEn ? "Treatment plan removed." : "تم إزالة الخطة العلاجية من قاعدة البيانات.",
      });
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ في الحذف", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/treatment-plans/${editingPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingPlan.title,
          details: editingPlan.details,
          startDate: editingPlan.startDate,
          endDate: editingPlan.endDate || null
        }),
      });
      if (!res.ok) throw new Error("Failed to update plan");
      await queryClient.invalidateQueries({ queryKey: [api.treatmentPlans.list.path] });
      toast({
        title: isEn ? "Plan Updated" : "تم تحديث الخطة والجرعات",
        description: isEn ? "Changes saved successfully." : "تم حفظ التعديلات على الأدوية والمواعيد بنجاح.",
      });
      setEditingPlan(null);
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" dir={isEn ? "ltr" : "rtl"}>
      <div className="space-y-2 border-b pb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 rounded-lg">
            <Pill className="w-6 h-6" />
          </div>
          {isEn ? "Treatment Plans & Prescriptions (Rx)" : "خطط العلاج والروشتات الطبية (Rx)"}
        </h1>
        <p className="text-muted-foreground text-lg">
          {user?.role === 'doctor' 
             ? (isEn ? "Write prescriptions, long-term plans, and printable Rx documents." : "كتابة الوصفات الطبية الدقيقة، الجرعات، وإصدار روشتات معتمدة قابلة للطباعة.")
             : (isEn ? "Prescribed treatment plans and current active medications." : "الخطط العلاجية الموصوفة والأدوية الحالية مع مواعيد الجرعات.")}
        </p>
      </div>

      {(user?.role === 'doctor' || user?.role === 'admin') && (
        <Card className="border-2 border-purple-100 dark:border-purple-900/40 shadow-sm mb-8">
          <CardHeader className="bg-purple-50/50 dark:bg-purple-950/30 pb-4">
            <CardTitle className="text-xl text-purple-800 dark:text-purple-300 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {isEn ? "Create New Prescription / Treatment Plan" : "وصف روشتة أو خطة علاجية جديدة"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">{isEn ? "Select Patient" : "اختر المريض"}</label>
                <Select onValueChange={(v) => form.setValue("patientId", parseInt(v))}>
                  <SelectTrigger className="w-full rounded-xl border-2 h-11 font-bold">
                    <SelectValue placeholder={isEn ? "Select Patient..." : "اختر مريضاً..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {patients?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()} className="font-semibold">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.patientId && <p className="text-xs text-destructive">{form.formState.errors.patientId.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{isEn ? "Plan Title / Rx Title" : "عنوان الخطة / روشتة أدوية"}</label>
                <Input placeholder={isEn ? "e.g., Hypertension Regimen / Post-op Antibiotics" : "مثال: روشتة أدوية ضغط وسكر / كورس مضاد حيوي / علاج عظام"} {...form.register('title')} className="rounded-xl border-2 h-11 font-bold" />
                {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isEn ? "Start Date" : "تاريخ البدء"}</label>
                  <Input type="date" {...form.register('startDate')} className="rounded-xl border-2 h-11 font-bold" />
                  {form.formState.errors.startDate && <p className="text-xs text-destructive">{form.formState.errors.startDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isEn ? "End Date (Optional)" : "تاريخ الانتهاء (اختياري)"}</label>
                  <Input type="date" {...form.register('endDate')} className="rounded-xl border-2 h-11 font-bold" />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{isEn ? "Medications, Doses & Instructions" : "تفاصيل الأدوية والجرعات ومواعيد الاستخدام"}</label>
                <Textarea placeholder={isEn ? "Write exact medications, doses, frequencies (e.g. 1 pill twice daily after meals)..." : "اكتب أسماء الأدوية، التركيزات، مواعيد تعاطي الجرعات (مثال: قرص مرتين يومياً بعد الأكل)..."} {...form.register('details')} className="rounded-xl border-2 min-h-[130px] leading-relaxed" />
                {form.formState.errors.details && <p className="text-xs text-destructive">{form.formState.errors.details.message}</p>}
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={createMutation.isPending} className="px-8 py-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 shadow-md">
                  <CheckCircle2 className="w-5 h-5" />
                  {createMutation.isPending ? (isEn ? "Saving..." : "جاري حفظ الروشتة...") : (isEn ? "Issue Prescription" : "إصدار واعتماد الروشتة")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {isLoading ? (
          [1,2].map(i => <div key={i} className="h-40 bg-secondary/50 rounded-2xl animate-pulse" />)
        ) : plans?.length === 0 ? (
          <div className="text-center p-16 bg-secondary/30 rounded-3xl border-2 border-dashed border-border space-y-4">
            <div className="p-6 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-full w-fit mx-auto">
              <Pill className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{isEn ? "No treatment plans" : "لا توجد روشتات أو خطط علاجية"}</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {user?.role === 'doctor' || user?.role === 'admin'
                ? (isEn ? "You haven't issued any prescriptions yet. Use the form above to prescribe medication." : "لم تقم بكتابة أي روشتات أو خطط بعد. يمكنك إصدار أول روشتة للمريض من خلال النموذج الموضح أعلاه.") 
                : (isEn ? "You're in good health! No active medications or treatment plans." : "صحتك جيدة! لا توجد أدوية أو خطط علاجية نشطة لحسابك حالياً.")}
            </p>
          </div>
        ) : (
          plans?.map((plan) => {
            const docName = doctors?.find(d => d.id === plan.doctorId)?.name || (isEn ? "Consultant Doctor" : "طبيب استشاري");
            const patName = patients?.find((p:any) => p.id === plan.patientId)?.name || (isEn ? `Patient #${plan.patientId}` : `مريض #${plan.patientId}`);
            
            return (
              <Card key={plan.id} className="hover:border-purple-300 transition-all shadow-sm rounded-2xl overflow-hidden relative group">
                <div className={`absolute ${isEn ? "left-0" : "right-0"} top-0 w-2 h-full bg-purple-600`}></div>
                <CardContent className="p-6 flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="font-bold text-xl text-foreground flex items-center gap-2">
                          <span className="text-2xl font-black text-purple-600 font-mono">Rx</span>
                          {plan.title}
                        </h3>
                        {(user?.role === 'doctor' || user?.role === 'admin') && (
                           <p className="text-sm text-foreground/80 font-bold mt-1">{isEn ? "Patient:" : "للمريض:"} <span className="text-purple-700 dark:text-purple-400">{patName}</span></p>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-sm font-bold border border-purple-200 dark:border-purple-800">
                        <CalendarClock className="w-4 h-4" />
                        {isEn ? "From " : "من "}{format(new Date(plan.startDate), 'd MMM yyyy', { locale: isEn ? undefined : arEG })} 
                        {plan.endDate ? ` ${isEn ? "to" : "إلى"} ${format(new Date(plan.endDate), 'd MMM yyyy', { locale: isEn ? undefined : arEG })}` : ` (${isEn ? "Ongoing" : "مستمر"})`}
                      </span>
                    </div>
                    
                    <div className="p-4 bg-secondary/30 rounded-xl border border-border/50 text-foreground font-medium leading-relaxed whitespace-pre-line">
                      {plan.details}
                    </div>
                    
                    <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground bg-secondary/50 w-fit px-3 py-1.5 rounded-lg border">
                        <span className="text-muted-foreground">{isEn ? "Prescribing Doctor:" : "الطبيب المشرف:"}</span>
                        <span className="text-purple-700 dark:text-purple-400">{isEn ? "Dr. " : "د. "}{docName.replace('د. ', '')}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setActiveViewRx({ ...plan, docName, patName })}
                          className="rounded-xl gap-2 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 font-bold border-2"
                        >
                          <Eye className="w-4 h-4" />
                          {isEn ? "View Prescription" : "عرض وإصدار الروشتة"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setActiveViewRx({ ...plan, docName, patName })}
                          className="rounded-xl gap-1.5 px-4 font-semibold text-purple-600 border-2 border-purple-200"
                          title={isEn ? "Print Rx" : "طباعة الروشتة رسمياً"}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>

                        {(user?.role === 'doctor' || user?.role === 'admin') && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingPlan({ ...plan, startDate: new Date(plan.startDate).toISOString().split('T')[0], endDate: plan.endDate ? new Date(plan.endDate).toISOString().split('T')[0] : "" })}
                              className="rounded-lg text-muted-foreground hover:text-purple-600 hover:bg-purple-50 h-9"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePlan(plan.id)}
                              className="rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* DIALOG 1: Official Printable Rx Prescription View */}
      <Dialog open={!!activeViewRx} onOpenChange={(open) => !open && setActiveViewRx(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-8" dir={isEn ? "ltr" : "rtl"}>
          <div className="space-y-6 border-2 border-purple-300 dark:border-purple-900 rounded-2xl p-6 bg-card text-card-foreground print:border-none print:p-0 print:shadow-none">
            {/* Hospital Prescription Header */}
            <div className="flex items-center justify-between border-b-2 border-purple-600 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-600 text-white rounded-2xl print:bg-black">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-purple-700 dark:text-purple-400 print:text-black">
                    {isEn ? "AL-SHIFA HOSPITAL SPECIALIZED CLINICS" : "عيادات ومستشفى الشفاء التخصصي"}
                  </h2>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {isEn ? "Official Prescription Document (Rx)" : "روشتة طبية معتمدة / وصفة أدوية وكورس علاجي"}
                  </p>
                </div>
              </div>
              <div className="text-end text-xs font-mono text-muted-foreground space-y-1">
                <p>{isEn ? "Rx Ref:" : "رقم الروشتة:"} RX-{activeViewRx?.id?.toString().padStart(4, '0')}</p>
                <p>{format(new Date(activeViewRx?.startDate || new Date()), 'dd MMMM yyyy', { locale: isEn ? undefined : arEG })}</p>
              </div>
            </div>

            {/* Patient & Doctor Box */}
            <div className="grid grid-cols-2 gap-4 bg-purple-50/50 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-200/50 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs font-bold mb-0.5">{isEn ? "PATIENT NAME:" : "اسم المريض:"}</span>
                <span className="font-extrabold text-foreground text-base">{activeViewRx?.patName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs font-bold mb-0.5">{isEn ? "PRESCRIBING PHYSICIAN:" : "الطبيب المعالج والمشرف:"}</span>
                <span className="font-extrabold text-purple-700 dark:text-purple-400 text-base">{isEn ? "Dr. " : "د. "}{activeViewRx?.docName?.replace('د. ', '')}</span>
              </div>
            </div>

            {/* Rx Symbol and Medications */}
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 border-b pb-2">
                <span className="text-4xl font-black text-purple-600 font-serif italic">Rx</span>
                <div>
                  <h3 className="text-lg font-extrabold text-foreground">{activeViewRx?.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {isEn ? "Prescribed regimen and precise dosage guidelines:" : "الأدوية الموصوفة والتعليمات العلاجية لمواعيد الجرعات:"}
                  </p>
                </div>
              </div>

              <div className="p-5 bg-secondary/30 rounded-2xl min-h-[160px] text-foreground font-semibold leading-relaxed whitespace-pre-line border border-border/50 text-base font-mono">
                {activeViewRx?.details}
              </div>

              <div className="flex justify-between items-center text-xs text-muted-foreground bg-secondary/20 px-4 py-2 rounded-lg border">
                <span>{isEn ? "Start Date:" : "تاريخ بداية الكورس:"} <b>{format(new Date(activeViewRx?.startDate || new Date()), 'dd/MM/yyyy')}</b></span>
                <span>{isEn ? "End Date:" : "تاريخ نهاية الكورس:"} <b>{activeViewRx?.endDate ? format(new Date(activeViewRx.endDate), 'dd/MM/yyyy') : (isEn ? "Ongoing/As directed" : "حسب استجابة المريض واستشارة الطبيب")}</b></span>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="pt-8 border-t flex justify-between items-end text-sm">
              <div className="space-y-1 text-center">
                <p className="font-bold text-xs text-muted-foreground">{isEn ? "PHARMACY VERIFICATION" : "خاتم الصيدلية والصرف"}</p>
                <div className="w-32 h-12 border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-lg mx-auto flex items-center justify-center text-xs text-purple-600 font-bold opacity-60">
                  {isEn ? "DISPENSED" : "يُصرف من الصيدلية"}
                </div>
              </div>

              <div className="space-y-2 text-center">
                <p className="font-bold text-xs text-muted-foreground">{isEn ? "PHYSICIAN SIGNATURE" : "توقيع واعتماد الطبيب"}</p>
                <p className="font-bold text-purple-700 dark:text-purple-400 underline decoration-wavy">
                  {isEn ? "Dr. " : "د. "}{activeViewRx?.docName?.replace('د. ', '')}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between gap-3 pt-2 print:hidden">
            <Button variant="outline" onClick={() => setActiveViewRx(null)} className="rounded-xl px-6 h-11 font-bold">
              {isEn ? "Close" : "إغلاق"}
            </Button>
            <Button onClick={handlePrint} className="rounded-xl px-8 h-11 font-bold shadow-md bg-purple-600 hover:bg-purple-700 text-white gap-2">
              <Printer className="w-5 h-5" />
              {isEn ? "Print Prescription (Rx)" : "طباعة الروشتة رسمياً"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-600">
              <Edit3 className="w-5 h-5" />
              {isEn ? "Edit Treatment Plan" : "تعديل الروشتة والخطة العلاجية"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdatePlan} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "Plan Title" : "عنوان الخطة / الروشتة"}</label>
              <Input
                value={editingPlan?.title || ""}
                onChange={e => setEditingPlan({ ...editingPlan, title: e.target.value })}
                required
                className="h-11 rounded-xl border-2 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold">{isEn ? "Start Date" : "تاريخ البدء"}</label>
                <Input
                  type="date"
                  value={editingPlan?.startDate || ""}
                  onChange={e => setEditingPlan({ ...editingPlan, startDate: e.target.value })}
                  required
                  className="h-11 rounded-xl border-2 font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">{isEn ? "End Date" : "تاريخ الانتهاء"}</label>
                <Input
                  type="date"
                  value={editingPlan?.endDate || ""}
                  onChange={e => setEditingPlan({ ...editingPlan, endDate: e.target.value })}
                  className="h-11 rounded-xl border-2 font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "Medications & Details" : "الأدوية ومواعيد الجرعات"}</label>
              <Textarea
                value={editingPlan?.details || ""}
                onChange={e => setEditingPlan({ ...editingPlan, details: e.target.value })}
                required
                className="rounded-xl border-2 min-h-[130px] leading-relaxed font-mono"
              />
            </div>

            <DialogFooter className="pt-4 flex sm:justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingPlan(null)} disabled={isUpdating} className="rounded-xl px-5 h-11">
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button type="submit" disabled={isUpdating} className="rounded-xl px-6 h-11 font-bold shadow-md bg-purple-600 hover:bg-purple-700 text-white gap-2">
                {isUpdating ? (isEn ? "Saving..." : "جاري الحفظ...") : (isEn ? "Save Changes" : "حفظ التعديلات")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
