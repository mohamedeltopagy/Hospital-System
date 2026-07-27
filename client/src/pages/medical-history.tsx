import { useState } from "react";
import { useMedicalHistory } from "@/hooks/use-records";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { arEG } from "date-fns/locale";
import { Activity, FileText, Plus, Trash2, Edit3, UserPlus, CheckCircle2, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";

export default function MedicalHistoryPage() {
  const { data: user } = useUser();
  const { data: records, isLoading } = useMedicalHistory();
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

  const [isAddOpen, setAddOpen] = useState(false);
  const [patientId, setPatientId] = useState<string>("");
  const [condition, setCondition] = useState("");
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  // Edit record modal
  const [editingRecord, setEditingRecord] = useState<any | null>(null);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !condition || !dateStr) {
      toast({ title: isEn ? "Missing fields" : "بيانات ناقصة", description: isEn ? "Please fill patient, diagnosis condition and date" : "يرجى اختيار المريض وكتابة التشخيص والتاريخ", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/medical-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: Number(patientId),
          condition,
          date: dateStr,
          notes
        }),
      });
      if (!res.ok) throw new Error("Failed to create record");
      await queryClient.invalidateQueries({ queryKey: [api.medicalHistory.list.path] });
      toast({
        title: isEn ? "Diagnosis Recorded" : "تم تسجيل التشخيص بنجاح",
        description: isEn ? "Medical record added to patient file." : "تم حفظ الحالة المرضية وإضافتها لسجل المريض في قاعدة البيانات.",
      });
      setAddOpen(false);
      setCondition("");
      setNotes("");
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!confirm(isEn ? "Are you sure you want to delete this medical record?" : "هل أنت متأكد من حذف هذا السجل المرضي نهائياً؟")) return;
    try {
      const res = await fetch(`/api/medical-history/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete record");
      await queryClient.invalidateQueries({ queryKey: [api.medicalHistory.list.path] });
      toast({
        title: isEn ? "Record Deleted" : "تم حذف السجل المرضي",
        description: isEn ? "The diagnosis record has been removed." : "تم مسح التشخيص من قائمة التاريخ المرضي بنجاح.",
      });
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ في الحذف", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/medical-history/${editingRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condition: editingRecord.condition,
          notes: editingRecord.notes,
          date: editingRecord.date
        }),
      });
      if (!res.ok) throw new Error("Failed to update record");
      await queryClient.invalidateQueries({ queryKey: [api.medicalHistory.list.path] });
      toast({
        title: isEn ? "Record Updated" : "تم تحديث السجل المرضي",
        description: isEn ? "Changes saved successfully." : "تم حفظ التعديلات على التشخيص والملاحظات بنجاح.",
      });
      setEditingRecord(null);
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" dir={isEn ? "ltr" : "rtl"}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            {isEn ? "Medical History & Diagnoses" : "التاريخ المرضي وسجلات التشخيص"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {user?.role === 'doctor' || user?.role === 'admin'
              ? (isEn ? "Record and manage comprehensive diagnoses and past conditions for all patients." : "تسجيل وإدارة التشخيصات الطبية والأمراض المزمنة لجميع مرضى المستشفى.")
              : (isEn ? "Comprehensive record of your health status and past diagnoses." : "سجل شامل لحالتك الصحية والتشخيصات السابقة الموثقة من الأطباء.")}
          </p>
        </div>

        <Button onClick={() => {
          if (user?.role === 'patient') {
            setPatientId(String(user.id));
          }
          setAddOpen(true);
        }} size="lg" className="rounded-xl font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
          <Plus className="w-5 h-5" />
          {isEn ? "Add Medical Record" : "إضافة تاريخ مرضي"}
        </Button>
      </div>

      <Card className="rounded-2xl overflow-hidden border border-border shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">{isEn ? "Loading medical records..." : "جاري تحميل سجلات التاريخ المرضي..."}</div>
        ) : records?.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center space-y-4">
            <div className="bg-secondary/50 p-6 rounded-full">
              <FileText className="w-12 h-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{isEn ? "No medical history recorded" : "لا يوجد سجل مرضي مسجل"}</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {user?.role === 'doctor' || user?.role === 'admin'
                  ? (isEn ? "Click 'Add Diagnosis Record' above to document the first condition for a patient." : "يمكنك إضافة أول تشخيص أو حالة مرضية لأحد المرضى بالضغط على زر التسجيل أعلاه.")
                  : (isEn ? "No diagnoses or medical conditions have been documented yet." : "لم يتم تسجيل أي تشخيصات أو حالات مزمنة لحسابك حتى الآن.")}
              </p>
            </div>
            {(user?.role === 'doctor' || user?.role === 'admin') && (
              <Button onClick={() => setAddOpen(true)} className="rounded-xl font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-4 h-4" />
                {isEn ? "Record First Diagnosis" : "تسجيل أول تشخيص الآن"}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table dir={isEn ? "ltr" : "rtl"}>
              <TableHeader className="bg-secondary/60">
                <TableRow>
                  <TableHead className="text-start font-bold">{isEn ? "Date" : "تاريخ التشخيص"}</TableHead>
                  {(user?.role === 'doctor' || user?.role === 'admin') && (
                    <TableHead className="text-start font-bold">{isEn ? "Patient Name" : "اسم المريض"}</TableHead>
                  )}
                  <TableHead className="text-start font-bold">{isEn ? "Condition / Diagnosis" : "الحالة / المرض أو التشخيص"}</TableHead>
                  <TableHead className="text-start font-bold">{isEn ? "Doctor Notes" : "ملاحظات الطبيب وتوصياته"}</TableHead>
                  {(user?.role === 'doctor' || user?.role === 'admin') && (
                    <TableHead className="text-end font-bold">{isEn ? "Actions" : "التحكم"}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records?.map((record) => {
                  const patName = patients?.find((p: any) => p.id === record.patientId)?.name || (isEn ? `Patient #${record.patientId}` : `مريض #${record.patientId}`);
                  return (
                    <TableRow key={record.id} className="hover:bg-secondary/30 transition-colors group">
                      <TableCell className="font-medium whitespace-nowrap text-muted-foreground">
                        {format(new Date(record.date || new Date()), 'dd MMMM yyyy', { locale: isEn ? undefined : arEG })}
                      </TableCell>
                      {(user?.role === 'doctor' || user?.role === 'admin') && (
                        <TableCell className="font-bold text-foreground">
                          {patName}
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="inline-flex px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-sm border border-indigo-200 dark:border-indigo-800">
                          {record.condition}
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground min-w-[280px] max-w-lg leading-relaxed">
                        {record.notes || '-'}
                      </TableCell>
                      <TableCell className="text-end whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRecord({ ...record, date: new Date(record.date).toISOString().split('T')[0] })}
                            title={isEn ? "Edit condition/notes" : "تعديل التشخيص والملاحظات"}
                            className="h-8 rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Edit3 className="w-4 h-4 me-1" />
                            {isEn ? "Edit" : "تعديل"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRecord(record.id)}
                            title={isEn ? "Delete record" : "حذف التشخيص"}
                            className="h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 me-1" />
                            {isEn ? "Remove" : "حذف"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* DIALOG 1: Add New Medical History Record */}
      <Dialog open={isAddOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-indigo-600">
              <Plus className="w-5 h-5" />
              {isEn ? "Record New Diagnosis" : "تسجيل تشخيص أو حالة مرضية جديدة"}
            </DialogTitle>
            <DialogDescription>
              {isEn ? "Document past or active diagnosis to attach to the patient's permanent medical file." : "وثق التشخيص الطبي أو المرض المزمن ليظهر في السجل المرضي الكامل للمريض المعني."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddRecord} className="space-y-4 py-2">
            {(user?.role === 'doctor' || user?.role === 'admin') && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">{isEn ? "Select Patient" : "اختر المريض من القائمة"}</label>
                <Select value={patientId} onValueChange={setPatientId} required>
                  <SelectTrigger className="w-full h-11 rounded-xl border-2 font-bold">
                    <SelectValue placeholder={isEn ? "Choose patient..." : "اختر مريضاً..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {patients?.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)} className="font-semibold">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "Condition / Diagnosis Name" : "اسم المرض أو التشخيص الطبي"}</label>
              <Input
                placeholder={isEn ? "e.g. Type 2 Diabetes / Hypertension" : "مثال: مرض السكري النوع الثاني / ارتفاع ضغط الدم / ربو مزمن"}
                value={condition}
                onChange={e => setCondition(e.target.value)}
                required
                className="h-11 rounded-xl border-2 font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "Date of Diagnosis" : "تاريخ التشخيص أو بداية الحالة"}</label>
              <Input
                type="date"
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                required
                className="h-11 rounded-xl border-2 font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "Doctor Notes & Recommendations" : "ملاحظات وتوصيات الطبيب المعالج"}</label>
              <Textarea
                placeholder={isEn ? "Write detailed clinical findings or background..." : "اكتب أي تفاصيل سريرية أو أدوية موصى بها لهذه الحالة هنا..."}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="rounded-xl border-2 min-h-[110px]"
              />
            </div>

            <DialogFooter className="pt-4 flex sm:justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={isSubmitting} className="rounded-xl px-5 h-11">
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button type="submit" disabled={isSubmitting || (!patientId && user?.role !== 'patient') || !condition} className="rounded-xl px-6 h-11 font-bold shadow-md bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? (isEn ? "Saving..." : "جاري الحفظ...") : (isEn ? "Save Diagnosis" : "حفظ في السجل المرضي")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Edit Medical Record */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-indigo-600">
              <Edit3 className="w-5 h-5" />
              {isEn ? "Edit Diagnosis Record" : "تعديل تشخيص أو ملاحظات الحالة"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateRecord} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "Condition Name" : "التشخيص أو الحالة"}</label>
              <Input
                value={editingRecord?.condition || ""}
                onChange={e => setEditingRecord({ ...editingRecord, condition: e.target.value })}
                required
                className="h-11 rounded-xl border-2 font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "Date" : "التاريخ"}</label>
              <Input
                type="date"
                value={editingRecord?.date || ""}
                onChange={e => setEditingRecord({ ...editingRecord, date: e.target.value })}
                required
                className="h-11 rounded-xl border-2 font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{isEn ? "Notes" : "الملاحظات التوضيحية"}</label>
              <Textarea
                value={editingRecord?.notes || ""}
                onChange={e => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                className="rounded-xl border-2 min-h-[110px]"
              />
            </div>

            <DialogFooter className="pt-4 flex sm:justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingRecord(null)} disabled={isSubmitting} className="rounded-xl px-5 h-11">
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl px-6 h-11 font-bold shadow-md bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                {isSubmitting ? (isEn ? "Updating..." : "جاري التحديث...") : (isEn ? "Save Changes" : "حفظ التعديلات")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
