import { useState } from "react";
import { useReports, useCreateReport } from "@/hooks/use-records";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { arEG } from "date-fns/locale";
import { FileText, Download, Eye, Plus, Trash2, Edit3, Printer, Building2, Stethoscope, CheckCircle2 } from "lucide-react";
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

const reportSchema = z.object({
  patientId: z.coerce.number().min(1, "يرجى اختيار المريض"),
  title: z.string().min(3, "العنوان أطول من ذلك"),
  content: z.string().min(10, "التقرير قصير جداً"),
});

export default function ReportsPage() {
  const { data: user } = useUser();
  const { data: reports, isLoading } = useReports();
  const { data: doctors } = useDoctors();
  const createMutation = useCreateReport();
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

  const [activeViewReport, setActiveViewReport] = useState<any | null>(null);
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [isUpdating, setUpdating] = useState(false);

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      patientId: 0,
      title: "",
      content: "",
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        form.reset();
        toast({
          title: isEn ? "Report Created" : "تم إصدار التقرير الطبي",
          description: isEn ? "Successfully saved to patient file." : "تم حفظ التقرير وإضافته لملف المريض بنجاح.",
        });
      }
    });
  };

  const handleDeleteReport = async (id: number) => {
    if (!confirm(isEn ? "Are you sure you want to delete this medical report?" : "هل أنت متأكد من حذف هذا التقرير الطبي نهائياً؟")) return;
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete report");
      await queryClient.invalidateQueries({ queryKey: [api.reports.list.path] });
      toast({
        title: isEn ? "Report Deleted" : "تم حذف التقرير",
        description: isEn ? "Medical report removed." : "تم مسح التقرير الطبي من قاعدة البيانات.",
      });
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ في الحذف", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/reports/${editingReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingReport.title,
          content: editingReport.content
        }),
      });
      if (!res.ok) throw new Error("Failed to update report");
      await queryClient.invalidateQueries({ queryKey: [api.reports.list.path] });
      toast({
        title: isEn ? "Report Updated" : "تم تحديث التقرير",
        description: isEn ? "Changes saved successfully." : "تم حفظ التعديلات على التقرير بنجاح.",
      });
      setEditingReport(null);
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
          <div className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          {isEn ? "Medical Reports & Official Documents" : "التقارير الطبية والمستندات الرسمية"}
        </h1>
        <p className="text-muted-foreground text-lg">
          {user?.role === 'doctor' 
             ? (isEn ? "Write, edit, and print official patient medical reports." : "كتابة وتعديل وطباعة التقارير الطبية المعتمدة للمرضى.")
             : (isEn ? "Radiology reports, lab results, and examination outcomes." : "تقارير الأشعة والتحاليل ونتائج الفحوصات الطبية المعتمدة من أطباء المستشفى.")}
        </p>
      </div>

      {(user?.role === 'doctor' || user?.role === 'admin') && (
        <Card className="border-2 border-emerald-100 dark:border-emerald-900/40 shadow-sm mb-8">
          <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/30 pb-4">
            <CardTitle className="text-xl text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {isEn ? "Write New Report" : "كتابة وإصدار تقرير طبي جديد"}
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
                <label className="text-sm font-medium">{isEn ? "Report Title / Subject" : "عنوان وموضوع التقرير"}</label>
                <Input placeholder={isEn ? "e.g., Complete Blood Count / Chest X-Ray" : "مثال: تقرير فحص أشعة الصدر / تحاليل دم شاملة / حالة نقاهة"} {...form.register('title')} className="rounded-xl border-2 h-11 font-bold" />
                {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{isEn ? "Report Clinical Details" : "التشخيص الطبي والتفاصيل السريرية الكاملة"}</label>
                <Textarea placeholder={isEn ? "Write all medical findings, lab values, and recommendations here..." : "اكتب التشخيص، نتائج الفحص، والتوصيات الطبية الكاملة هنا..."} {...form.register('content')} className="rounded-xl border-2 min-h-[140px] leading-relaxed" />
                {form.formState.errors.content && <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>}
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={createMutation.isPending} className="px-8 py-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md">
                  <CheckCircle2 className="w-5 h-5" />
                  {createMutation.isPending ? (isEn ? "Saving..." : "جاري حفظ التقرير...") : (isEn ? "Save & Publish Report" : "حفظ واعتماد التقرير")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-48 bg-secondary/50 rounded-2xl animate-pulse" />)
        ) : reports?.length === 0 ? (
          <div className="col-span-full text-center p-16 bg-secondary/30 rounded-3xl border-2 border-dashed border-border space-y-4">
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-full w-fit mx-auto">
              <FileText className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{isEn ? "No reports available" : "لا توجد تقارير طبية مسجلة"}</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {user?.role === 'doctor' || user?.role === 'admin'
                ? (isEn ? "You haven't issued any medical reports yet. Fill out the form above to get started." : "لم تقم بكتابة أي تقارير طبية بعد. يمكنك إنشاء أول تقرير رسمي من النموذج الموضح أعلاه.") 
                : (isEn ? "Your medical reports and lab results will appear here once finalized by your doctor." : "تقاريرك الطبية وتحاليلك ستظهر في هذه الصفحة بمجرد اعتمادها من الطبيب المعالج.")}
            </p>
          </div>
        ) : (
          reports?.map((report) => {
            const docName = doctors?.find(d => d.id === report.doctorId)?.name || (isEn ? 'Consultant Doctor' : 'طبيب استشاري');
            const patName = patients?.find((p:any) => p.id === report.patientId)?.name || (isEn ? `Patient #${report.patientId}` : `مريض #${report.patientId}`);
            
            return (
              <Card key={report.id} className="hover:border-emerald-300 transition-all shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden group">
                <CardContent className="p-6 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900">
                        <FileText className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground bg-secondary px-3 py-1 rounded-full border">
                        {format(new Date(report.date || new Date()), 'dd MMM yyyy', { locale: isEn ? undefined : arEG })}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-lg mb-2 line-clamp-1 text-foreground">{report.title}</h3>
                    <div className="text-sm text-muted-foreground mb-4 space-y-1 bg-secondary/40 p-3 rounded-xl border border-border/50">
                      <p>{isEn ? "Patient: " : "للمريض: "} <span className="font-bold text-foreground">{patName}</span></p>
                      <p>{isEn ? "Doctor: " : "المعالج: "} <span className="font-semibold text-emerald-700 dark:text-emerald-400">{isEn ? "Dr. " : "د. "}{docName.replace('د. ', '')}</span></p>
                    </div>
                    
                    <p className="text-sm text-foreground/80 line-clamp-3 mb-6 leading-relaxed">
                      {report.content}
                    </p>
                  </div>
                  
                  <div className="space-y-2 pt-4 border-t border-border/50">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveViewReport({ ...report, docName, patName })} 
                        className="flex-1 rounded-xl gap-2 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 font-bold"
                      >
                        <Eye className="w-4 h-4" />
                        {isEn ? "View & Print" : "عرض وطباعة"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveViewReport({ ...report, docName, patName })}
                        className="rounded-xl gap-1.5 px-4 font-semibold text-emerald-600 border-emerald-200"
                        title={isEn ? "Print PDF" : "طباعة التقرير رسمي"}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    </div>

                    {(user?.role === 'doctor' || user?.role === 'admin') && (
                      <div className="flex gap-2 pt-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEditingReport(report)}
                          className="flex-1 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 h-8"
                        >
                          <Edit3 className="w-3.5 h-3.5 me-1" />
                          {isEn ? "Edit" : "تعديل"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteReport(report.id)}
                          className="flex-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8"
                        >
                          <Trash2 className="w-3.5 h-3.5 me-1" />
                          {isEn ? "Delete" : "حذف"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* DIALOG 1: Official Printable Report View */}
      <Dialog open={!!activeViewReport} onOpenChange={(open) => !open && setActiveViewReport(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-8" dir={isEn ? "ltr" : "rtl"}>
          <div className="space-y-6 border-2 border-emerald-200 dark:border-emerald-900 rounded-2xl p-6 bg-card text-card-foreground print:border-none print:p-0 print:shadow-none">
            {/* Hospital Official Header */}
            <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl print:bg-black">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-emerald-700 dark:text-emerald-400 print:text-black">
                    {isEn ? "AL-SHIFA MEDICAL CENTER & HOSPITAL" : "مستشفى ومركز الشفاء الطبي التخصصي"}
                  </h2>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {isEn ? "Official Medical Document / Clinical Report" : "وثيقة طبية رسمية معتمدة / تقرير سريري"}
                  </p>
                </div>
              </div>
              <div className="text-end text-xs font-mono text-muted-foreground space-y-1">
                <p>{isEn ? "Ref:" : "رقم المرجع:"} REP-{activeViewReport?.id?.toString().padStart(4, '0')}</p>
                <p>{format(new Date(activeViewReport?.date || new Date()), 'dd MMMM yyyy', { locale: isEn ? undefined : arEG })}</p>
              </div>
            </div>

            {/* Patient & Doctor Box */}
            <div className="grid grid-cols-2 gap-4 bg-secondary/40 p-4 rounded-xl border border-border/50 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs font-bold mb-0.5">{isEn ? "PATIENT NAME:" : "اسم المريض:"}</span>
                <span className="font-extrabold text-foreground text-base">{activeViewReport?.patName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs font-bold mb-0.5">{isEn ? "ATTENDING PHYSICIAN:" : "الطبيب المعالج:"}</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-base">{isEn ? "Dr. " : "د. "}{activeViewReport?.docName?.replace('د. ', '')}</span>
              </div>
            </div>

            {/* Title & Body Content */}
            <div className="space-y-3 py-2">
              <h3 className="text-xl font-black text-foreground border-s-4 border-emerald-600 ps-3">
                {activeViewReport?.title}
              </h3>
              <div className="p-4 bg-secondary/20 rounded-xl min-h-[160px] text-foreground font-medium leading-relaxed whitespace-pre-line border border-border/40">
                {activeViewReport?.content}
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="pt-8 border-t flex justify-between items-end text-sm">
              <div className="space-y-1 text-center">
                <p className="font-bold text-xs text-muted-foreground">{isEn ? "HOSPITAL STAMP" : "خاتم المستشفى الاعتمادي"}</p>
                <div className="w-32 h-12 border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-lg mx-auto flex items-center justify-center text-xs text-emerald-600 font-bold opacity-60">
                  {isEn ? "AL-SHIFA SEAL" : "خاتم الشفاء"}
                </div>
              </div>

              <div className="space-y-2 text-center">
                <p className="font-bold text-xs text-muted-foreground">{isEn ? "PHYSICIAN SIGNATURE" : "توقيع الطبيب الاستشاري"}</p>
                <p className="font-bold text-emerald-700 dark:text-emerald-400 underline decoration-wavy">
                  {isEn ? "Dr. " : "د. "}{activeViewReport?.docName?.replace('د. ', '')}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between gap-3 pt-2 print:hidden">
            <Button variant="outline" onClick={() => setActiveViewReport(null)} className="rounded-xl px-6 h-11 font-bold">
              {isEn ? "Close" : "إغلاق"}
            </Button>
            <Button onClick={handlePrint} className="rounded-xl px-8 h-11 font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Printer className="w-5 h-5" />
              {isEn ? "Print Official Document" : "طباعة التقرير الرسمي"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Edit Report Dialog */}
      <Dialog open={!!editingReport} onOpenChange={(open) => !open && setEditingReport(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-emerald-600">
              <Edit3 className="w-5 h-5" />
              {isEn ? "Edit Medical Report" : "تعديل التقرير الطبي"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateReport} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "Report Title" : "عنوان التقرير"}</label>
              <Input
                value={editingReport?.title || ""}
                onChange={e => setEditingReport({ ...editingReport, title: e.target.value })}
                required
                className="h-11 rounded-xl border-2 font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "Clinical Content" : "تفاصيل التقرير والتشخيص"}</label>
              <Textarea
                value={editingReport?.content || ""}
                onChange={e => setEditingReport({ ...editingReport, content: e.target.value })}
                required
                className="rounded-xl border-2 min-h-[140px] leading-relaxed"
              />
            </div>

            <DialogFooter className="pt-4 flex sm:justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingReport(null)} disabled={isUpdating} className="rounded-xl px-5 h-11">
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button type="submit" disabled={isUpdating} className="rounded-xl px-6 h-11 font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                {isUpdating ? (isEn ? "Saving..." : "جاري الحفظ...") : (isEn ? "Save Changes" : "حفظ التعديلات")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
