import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useClinic, useDoctors, useClinics, useServices, useCreateService, useDeleteService } from "@/hooks/use-clinics";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { api } from "@shared/routes";
import { 
  Stethoscope, HeartPulse, Brain, Eye, Baby, Activity, 
  Users, ArrowRight, ArrowLeft, Calendar, UserCheck, ShieldPlus,
  Plus, Trash2, ArrowRightLeft, UserPlus, AlertCircle, DollarSign, Tag, Edit3, Star
} from "lucide-react";

const getClinicStyle = (name: string = "") => {
  if (name.includes("قلب")) return { icon: HeartPulse, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/40" };
  if (name.includes("مخ") || name.includes("أعصاب")) return { icon: Brain, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/40" };
  if (name.includes("رمد") || name.includes("عين")) return { icon: Eye, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40" };
  if (name.includes("أطفال")) return { icon: Baby, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40" };
  if (name.includes("باطنة")) return { icon: Activity, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/40" };
  return { icon: Stethoscope, color: "text-primary", bg: "bg-primary/10" };
};

export default function ClinicDetailPage() {
  const [, params] = useRoute("/clinics/:id");
  const clinicId = Number(params?.id) || 0;
  const { data: clinic, isLoading: isLoadingClinic } = useClinic(clinicId);
  const { data: doctors, isLoading: isLoadingDoctors } = useDoctors();
  const { data: allClinics } = useClinics();
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  const clinicDoctors = doctors?.filter(d => d.clinicId === clinicId) ?? [];
  const style = getClinicStyle(clinic?.name);

  // Dialog states for Doctor Management
  const [isAddOpen, setAddOpen] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocUsername, setNewDocUsername] = useState("");
  const [newDocPassword, setNewDocPassword] = useState("123456");
  const [newDocBio, setNewDocBio] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  // Transfer Doctor Modal
  const [transferDoc, setTransferDoc] = useState<any | null>(null);
  const [targetClinicId, setTargetClinicId] = useState<string>("");

  const { data: services, isLoading: isLoadingServices } = useServices(clinicId);
  const createServiceMutation = useCreateService();
  const deleteServiceMutation = useDeleteService();

  const [isServiceOpen, setServiceOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");

  const isAdminOrManager = user?.role === 'admin';

  // 5-Star Doctor Rating State
  const [ratingDoc, setRatingDoc] = useState<any | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState("");
  const [isRatingSubmitting, setRatingSubmitting] = useState(false);

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingDoc) return;
    setRatingSubmitting(true);
    try {
      const res = await fetch(`/api/doctors/${ratingDoc.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating: selectedRating, comment: ratingComment })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit rating");
      }
      toast({
        title: isEn ? "Thank you!" : "تم تسجيل تقييمك بنجاح! ⭐",
        description: isEn 
          ? `Your ${selectedRating}-star rating for ${ratingDoc.name} has been saved.` 
          : `تم حفظ تقييمك (${selectedRating} نجوم) للطبيب بنجاح واحتسابه في متوسط التقييمات.`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      setRatingDoc(null);
      setRatingComment("");
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName || !newServicePrice) {
      toast({ title: isEn ? "Error" : "تنبيه", description: isEn ? "Please fill name and price" : "يرجى إدخال اسم الخدمة وسعرها", variant: "destructive" });
      return;
    }
    try {
      await createServiceMutation.mutateAsync({
        clinicId: clinicId,
        name: newServiceName,
        price: Number(newServicePrice),
        description: newServiceDesc || null,
      });
      toast({
        title: isEn ? "Service Added!" : "تم إضافة الخدمة للعيادة بنجاح!",
        description: isEn ? `Added "${newServiceName}" (${newServicePrice} EGP)` : `تم اعتماد خدمة "${newServiceName}" بسعر (${newServicePrice} ج.م) في قائمة أسعار العيادة.`,
      });
      setServiceOpen(false);
      setNewServiceName("");
      setNewServicePrice("");
      setNewServiceDesc("");
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ", description: err.message || "Failed to add service", variant: "destructive" });
    }
  };

  const handleDeleteService = async (serviceId: number, serviceName: string) => {
    if (!window.confirm(isEn ? `Delete service "${serviceName}"?` : `هل أنت متأكد من حذف خدمة "${serviceName}" من لائحة الأسعار؟`)) return;
    try {
      await deleteServiceMutation.mutateAsync(serviceId);
      toast({ title: isEn ? "Deleted" : "تم الحذف", description: isEn ? `Service "${serviceName}" removed.` : `تم حذف الخدمة من لائحة العيادة.` });
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName) {
      toast({ title: isEn ? "Error" : "تنبيه", description: isEn ? "Please enter doctor name" : "يرجى إدخال اسم الطبيب", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(api.users.doctors.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDocName,
          username: newDocUsername || `doc_${Date.now()}`,
          password: newDocPassword || "123456",
          clinicId: clinicId,
          bio: newDocBio || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create doctor");
      }
      await queryClient.invalidateQueries({ queryKey: [api.users.doctors.path] });
      await queryClient.invalidateQueries({ queryKey: ["/api/users/doctors"] });
      await queryClient.invalidateQueries({ queryKey: [api.clinics.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.clinics.get.path, clinicId] });
      toast({
        title: isEn ? "Doctor Added Successfully!" : "تم إضافة الطبيب بنجاح!",
        description: isEn ? `Dr. ${newDocName} added to ${clinic?.name}` : `تم تسجيل (${newDocName.startsWith('د. ') ? newDocName : 'د. ' + newDocName}) في عيادة ${clinic?.name}`,
      });
      setAddOpen(false);
      setNewDocName("");
      setNewDocUsername("");
      setNewDocBio("");
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ في الإضافة", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDoctor = async (docId: number, docName: string) => {
    if (!confirm(isEn ? `Are you sure you want to remove ${docName} from this clinic?` : `هل أنت متأكد من حذف الطبيب (${docName}) نهائياً من العيادة؟`)) {
      return;
    }
    try {
      const res = await fetch(`${api.users.doctors.path}/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete doctor");
      await queryClient.invalidateQueries({ queryKey: [api.users.doctors.path] });
      await queryClient.invalidateQueries({ queryKey: ["/api/users/doctors"] });
      await queryClient.invalidateQueries({ queryKey: [api.clinics.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.clinics.get.path, clinicId] });
      toast({
        title: isEn ? "Doctor Removed" : "تم حذف الطبيب بنجاح",
        description: isEn ? `${docName} removed from the clinic.` : `تم حذف الطبيب (${docName}) من العيادة وتحديث القائمة.`,
      });
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ في الحذف", description: err.message, variant: "destructive" });
    }
  };

  const handleTransferDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferDoc || !targetClinicId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${api.users.doctors.path}/${transferDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId: Number(targetClinicId) }),
      });
      if (!res.ok) throw new Error("Failed to transfer doctor");
      await queryClient.invalidateQueries({ queryKey: [api.users.doctors.path] });
      await queryClient.invalidateQueries({ queryKey: ["/api/users/doctors"] });
      await queryClient.invalidateQueries({ queryKey: [api.clinics.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.clinics.get.path, clinicId] });
      const targetClinicObj = allClinics?.find(c => c.id === Number(targetClinicId));
      toast({
        title: isEn ? "Doctor Transferred" : "تم نقل الطبيب بنجاح",
        description: isEn ? `${transferDoc.name} transferred to ${targetClinicObj?.name || 'another clinic'}.` : `تم نقل الطبيب (${transferDoc.name}) إلى عيادة (${targetClinicObj?.name || ''}) بنجاح.`,
      });
      setTransferDoc(null);
    } catch (err: any) {
      toast({ title: isEn ? "Error" : "خطأ في النقل", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoadingClinic || isLoadingDoctors) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!clinic && !isLoadingClinic) {
    return (
      <div className="p-12 max-w-2xl mx-auto text-center space-y-6">
        <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
          <Stethoscope className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold">{isEn ? "Clinic Not Found" : "العيادة غير موجودة"}</h2>
        <p className="text-muted-foreground">{isEn ? "The clinic you are looking for does not exist or has been removed." : "العيادة التي تبحث عنها غير متاحة حالياً أو تم حذفها."}</p>
        <Button asChild className="rounded-xl">
          <Link href="/clinics">{isEn ? "Back to All Clinics" : "العودة لقائمة العيادات"}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" dir={isEn ? "ltr" : "rtl"}>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" asChild className="rounded-xl gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/clinics">
            {isEn ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            {isEn ? "Back to All Clinics" : "العودة لكل العيادات"}
          </Link>
        </Button>

        {/* Quick Admin Actions Banner button */}
        {isAdminOrManager && (
          <Button 
            onClick={() => setAddOpen(true)}
            className="rounded-xl font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
          >
            <UserPlus className="w-4 h-4" />
            {isEn ? `Add Doctor to ${clinic?.name}` : `+ إضافة طبيب لعيادة (${clinic?.name})`}
          </Button>
        )}
      </div>

      <Card className="border-border shadow-xl rounded-3xl overflow-hidden relative">
        <div className={`h-3 w-full ${style.bg.replace('bg-', 'bg-').replace('/10', '-500')}`} />
        <CardContent className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className={`p-5 rounded-2xl ${style.bg} ${style.color} shadow-inner`}>
              <style.icon className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black text-foreground">{clinic?.name}</h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  {clinicDoctors.length} {isEn ? "Doctors available" : "أطباء بالعيادة"}
                </span>
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl">
                {clinic?.description || (isEn ? `Specialized department providing comprehensive diagnosis and treatment in ${clinic?.name}.` : `قسم متخصص في تشخيص وعلاج أمراض ${clinic?.name} وتوفير الرعاية الطبية الفائقة بأحدث التقنيات.`)}
              </p>
            </div>
          </div>

          {user?.role === 'patient' && (
            <Button asChild size="lg" className="rounded-2xl py-6 px-8 text-base font-bold shadow-lg shadow-primary/25 hover:shadow-xl transition-all shrink-0">
              <Link href={`/appointments?clinicId=${clinicId}`}>
                <Calendar className="w-5 h-5 me-2" />
                {isEn ? "Book in this Clinic" : "حجز موعد بالعيادة"}
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {user?.role !== 'admin' && (
        <div className="bg-secondary/40 border rounded-2xl p-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary shrink-0" />
            {isEn ? "Only the System Administrator (admin1) has permission to add, edit, transfer, or delete doctors in clinics." : "💡 صلاحية إضافة، حذف، أو نقل الأطباء في العيادات مخصصة حصراً للمسؤول (admin1) فقط."}
          </span>
          <Link href="/settings" className="font-bold text-primary underline hover:text-primary/80 shrink-0 ms-2">
            {isEn ? "Switch Account" : "تبديل الحساب"}
          </Link>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <UserCheck className="w-6 h-6 text-primary" />
            {isEn ? "Medical Staff & Specialists" : "الأطباء والمتخصصون في العيادة"}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {isEn ? `Showing ${clinicDoctors.length} specialist(s)` : `عرض ${clinicDoctors.length} طبيب مختص`}
            </span>
            {isAdminOrManager && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setAddOpen(true)}
                className="rounded-xl gap-1.5 text-primary border-primary/40 hover:bg-primary/5 font-bold"
              >
                <Plus className="w-4 h-4" />
                {isEn ? "Add Doctor" : "إضافة طبيب جديد"}
              </Button>
            )}
          </div>
        </div>

        {clinicDoctors.length === 0 ? (
          <div className="text-center p-12 bg-secondary/30 rounded-3xl border-2 border-dashed border-border space-y-4">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">{isEn ? "No Doctors Assigned Yet" : "لا يوجد أطباء مسجلون في هذه العيادة حالياً"}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{isEn ? "Click 'Add Doctor' to register medical staff for this department." : "يمكنك إضافة أول طبيب لهذه العيادة بالضغط على زر إضافة طبيب أعلى القائمة."}</p>
            </div>
            {isAdminOrManager && (
              <Button onClick={() => setAddOpen(true)} className="rounded-xl font-bold gap-2">
                <UserPlus className="w-4 h-4" />
                {isEn ? "Add Doctor Now" : "إضافة طبيب للعيادة الآن"}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinicDoctors.map((doc) => (
              <Card key={doc.id} className="border-border hover:border-primary/40 rounded-2xl transition-all duration-300 hover:shadow-md overflow-hidden flex flex-col justify-between relative group">
                <CardHeader className="p-6 pb-4 flex flex-row items-start gap-4 justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl shrink-0 shadow-inner">
                      {doc.name.replace('د. ', '').charAt(0)}
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-bold text-foreground">
                        {isEn ? doc.name.replace('د. ', 'Dr. ').replace('د.', 'Dr.') : doc.name}
                      </CardTitle>
                      <p className="text-sm font-medium text-primary flex items-center gap-1.5">
                        <ShieldPlus className="w-4 h-4" />
                        {isEn ? "Senior Specialist" : "استشاري متخصص"}
                      </p>
                      {/* Doctor 5-Star Rating Display */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3.5 h-3.5 ${i < Math.round((doc as any).averageRating || 5) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-xs font-black text-foreground">
                          {((doc as any).averageRating || 5.0).toFixed(1)}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          ({(doc as any).reviewsCount || 0} {isEn ? "reviews" : "تقييم"})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin action buttons on Doctor Card */}
                  {isAdminOrManager && (
                    <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl border opacity-90 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { setTransferDoc(doc); setTargetClinicId(""); }}
                        title={isEn ? "Transfer to another clinic" : "نقل لعيادة أخرى"}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteDoctor(doc.id, doc.name)} 
                        title={isEn ? "Delete doctor from clinic" : "حذف الطبيب من العيادة"}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-6 pt-0 mt-auto space-y-4">
                  <div className="text-sm text-muted-foreground bg-primary/5 border border-primary/10 p-3 rounded-xl leading-relaxed">
                    <p className="font-semibold text-primary text-xs mb-1 flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5" />
                      {isEn ? "Doctor Profile & Bio:" : "نبذة عن الطبيب:"}
                    </p>
                    <p className="line-clamp-3 text-xs">
                      {(doc as any).bio || (isEn ? "Certified specialist with extensive clinical experience in diagnostics and patient care." : "طبيب متخصص وذو خبرة سريرية متميزة في تشخيص ومتابعة الحالات الطبية بأعلى معايير الرعاية.")}
                    </p>
                  </div>

                  {(() => {
                    const daysMap: Record<string, string> = { "0": "الأحد", "1": "الإثنين", "2": "الثلاثاء", "3": "الأربعاء", "4": "الخميس", "5": "الجمعة", "6": "السبت" };
                    const enDaysMap: Record<string, string> = { "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat" };
                    const allowed = ((doc as any).workingDays || "0,1,2,3,4").split(",").map((d: string) => d.trim());
                    const formattedDays = allowed.map((d: string) => (isEn ? enDaysMap[d] || d : daysMap[d] || d)).join("، ");
                    const hours = (doc as any).workingHours || "09:00 - 17:00";
                    return (
                      <div className="text-xs text-muted-foreground bg-secondary/60 p-3 rounded-xl space-y-1 font-semibold">
                        <div className="flex items-center justify-between">
                          <span>{isEn ? "Working Days:" : "أيام التواجد:"}</span>
                          <span className="text-primary font-black">{formattedDays}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{isEn ? "Working Hours:" : "مواعيد الكشف:"}</span>
                          <span className="text-foreground font-black">{hours}</span>
                        </div>
                      </div>
                    );
                  })()}
                  {user?.role === 'patient' && (
                    <>
                      <Button asChild variant="default" className="w-full rounded-xl py-5 font-bold shadow-sm">
                        <Link href={`/appointments?clinicId=${clinicId}&doctorId=${doc.id}`}>
                          <Calendar className="w-4 h-4 me-2" />
                          {isEn ? "Book with Doctor" : "حجز موعد مع الطبيب"}
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => { setRatingDoc(doc); setSelectedRating(5); setRatingComment(""); }}
                        className="w-full rounded-xl text-xs font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1.5 h-10"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        {isEn ? "Rate Doctor (5 Stars)" : "⭐ تقييم الطبيب (5 نجوم)"}
                      </Button>
                    </>
                  )}
                  {isAdminOrManager && (
                    <div className="flex gap-2 pt-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => { setTransferDoc(doc); setTargetClinicId(""); }}
                        className="w-1/2 rounded-xl text-xs gap-1.5 h-9 font-semibold"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        {isEn ? "Transfer" : "نقل لعيادة"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                        className="w-1/2 rounded-xl text-xs gap-1.5 h-9 font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {isEn ? "Remove" : "حذف الطبيب"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* NEW SECTION: Clinic Services & Approved Price List */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-emerald-500 p-1 bg-emerald-500/10 rounded-xl" />
              {isEn ? "Clinic Services & Approved Price List" : "قائمة خدمات العيادة والأسعار المعتمدة"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {isEn ? "Official medical services, checkups, and diagnostic procedures approved by hospital administration." : "تسعيرة الكشوفات والخدمات الطبية المعتمدة رسمياً من قِبل إدارة المستشفى (المسؤول)."}
            </p>
          </div>
          {isAdminOrManager && (
            <Button 
              onClick={() => setServiceOpen(true)}
              className="rounded-xl gap-2 font-bold shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4" />
              {isEn ? "Add Clinic Service & Price" : "إضافة خدمة وتحديد السعر"}
            </Button>
          )}
        </div>

        {(!services || services.length === 0) ? (
          <div className="text-center p-10 bg-secondary/30 rounded-3xl border border-dashed border-border space-y-3">
            <Tag className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-semibold text-muted-foreground">
              {isEn ? "No services listed for this clinic yet." : "لم يتم تسجيل خدمات طبية أو أسعار كشف خاصة بهذه العيادة بعد."}
            </p>
            {isAdminOrManager && (
              <Button variant="outline" onClick={() => setServiceOpen(true)} className="rounded-xl text-xs font-bold gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                {isEn ? "Add First Service Now" : "إضافة أول خدمة للعيادة الآن"}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((srv) => (
              <Card key={srv.id} className="rounded-2xl border-2 border-border hover:border-emerald-500/40 transition-all shadow-sm flex flex-col justify-between">
                <CardHeader className="p-5 pb-3 flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-500 shrink-0" />
                      {srv.name}
                    </CardTitle>
                    {srv.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{srv.description}</p>
                    )}
                  </div>
                  {isAdminOrManager && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteService(srv.id, srv.name)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-lg"
                      title={isEn ? "Delete Service" : "حذف الخدمة"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-5 pt-2 mt-auto flex items-center justify-between border-t border-border/50 bg-secondary/20">
                  <span className="text-xs font-semibold text-muted-foreground">{isEn ? "Official Price:" : "السعر المعتمد:"}</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {srv.price} {isEn ? "EGP" : "ج.م"}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* DIALOG 1: Add New Doctor to this Clinic */}
      <Dialog open={isAddOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
              <UserPlus className="w-5 h-5" />
              {isEn ? `Add Doctor to ${clinic?.name}` : `إضافة طبيب جديد لعيادة (${clinic?.name})`}
            </DialogTitle>
            <DialogDescription>
              {isEn ? "Enter doctor details below. They will immediately appear in this clinic staff list." : "أدخل بيانات الطبيب الجديد لإنشاء حسابه وإضافته فوراً ضمن طاقم أطباء هذه العيادة."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddDoctor} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{isEn ? "Doctor Name" : "اسم الطبيب ثلاثي"}</Label>
              <Input 
                type="text" 
                placeholder={isEn ? "e.g. Dr. Ahmed Sami" : "مثال: د. حسام عادل محمود"} 
                value={newDocName}
                onChange={e => setNewDocName(e.target.value)}
                required
                className="h-11 rounded-xl border-2 font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">{isEn ? "Username (for login)" : "اسم المستخدم للدخول (Username)"}</Label>
              <Input 
                type="text" 
                placeholder="dr_hossam" 
                value={newDocUsername}
                onChange={e => setNewDocUsername(e.target.value)}
                className="h-11 rounded-xl border-2 font-mono text-start"
                dir="ltr"
              />
              <p className="text-[11px] text-muted-foreground">{isEn ? "* Leave empty to auto-generate from timestamp" : "* إن تركته فارغاً سيتم إنشاؤه تلقائياً بصيغة doc_123"}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">{isEn ? "Initial Password" : "كلمة المرور الأولية للحساب"}</Label>
              <Input 
                type="text" 
                value={newDocPassword}
                onChange={e => setNewDocPassword(e.target.value)}
                className="h-11 rounded-xl border-2 font-mono text-start"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                <Stethoscope className="w-4 h-4" />
                {isEn ? "Doctor Bio / Qualifications (Optional)" : "نبذة عن الطبيب والمؤهلات (اختياري)"}
              </Label>
              <Textarea 
                placeholder={isEn ? "Write a short bio about qualifications and clinical focus..." : "اكتب نبذة مختصرة عن الطبيب والخبرات لتظهر للمرضى..."} 
                value={newDocBio}
                onChange={e => setNewDocBio(e.target.value)}
                className="rounded-xl border-2 min-h-[80px]"
              />
            </div>

            <DialogFooter className="pt-4 flex sm:justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={isSubmitting} className="rounded-xl px-5 h-11">
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl px-6 h-11 font-bold shadow-md gap-2">
                <UserPlus className="w-4 h-4" />
                {isSubmitting ? (isEn ? "Adding..." : "جاري الإضافة...") : (isEn ? "Confirm & Add Doctor" : "تأكيد إضافة الطبيب")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Transfer Doctor to Another Clinic */}
      <Dialog open={!!transferDoc} onOpenChange={(open) => !open && setTransferDoc(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
              <ArrowRightLeft className="w-5 h-5" />
              {isEn ? "Transfer Doctor to Another Clinic" : "نقل الطبيب إلى عيادة / قسم آخر"}
            </DialogTitle>
            <DialogDescription>
              {isEn ? `Select target clinic to reassign ${transferDoc?.name}.` : `حدد العيادة التي تود نقل أو انتداب (${transferDoc?.name || ''}) إليها بدلاً من (${clinic?.name}).`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTransferDoctor} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{isEn ? "Target Clinic" : "العيادة المستهدفة للنقل"}</Label>
              <Select value={targetClinicId} onValueChange={setTargetClinicId} required>
                <SelectTrigger className="w-full h-11 rounded-xl border-2 font-bold">
                  <SelectValue placeholder={isEn ? "Select target department..." : "اختر العيادة أو القسم..."} />
                </SelectTrigger>
                <SelectContent>
                  {allClinics?.filter(c => c.id !== clinicId).map(c => (
                    <SelectItem key={c.id} value={String(c.id)} className="font-semibold">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 flex sm:justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setTransferDoc(null)} disabled={isSubmitting} className="rounded-xl px-5 h-11">
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button type="submit" disabled={isSubmitting || !targetClinicId} className="rounded-xl px-6 h-11 font-bold shadow-md gap-2 bg-primary">
                <ArrowRightLeft className="w-4 h-4" />
                {isSubmitting ? (isEn ? "Transferring..." : "جاري النقل...") : (isEn ? "Confirm Transfer" : "تأكيد نقل الطبيب")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Add Clinic Service & Price */}
      <Dialog open={isServiceOpen} onOpenChange={setServiceOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-emerald-600">
              <DollarSign className="w-5 h-5" />
              {isEn ? `Add Service to ${clinic?.name}` : `إضافة خدمة جديدة لعيادة (${clinic?.name})`}
            </DialogTitle>
            <DialogDescription>
              {isEn ? "Define the medical service/consultation name and assign an official price in Egyptian Pounds (EGP)." : "حدد اسم الكشف أو الخدمة الطبية مع السعر المعتمد بالريال السعودي ليعرف المرضى تسعيرة العيادة."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddService} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{isEn ? "Service Name" : "اسم الخدمة أو الكشف"}</Label>
              <Input 
                type="text" 
                placeholder={isEn ? "e.g. Specialist Consultation / Blood Test" : "مثال: كشف استشارة تخصصي / تحليل دم عاجل"} 
                value={newServiceName}
                onChange={e => setNewServiceName(e.target.value)}
                required
                className="h-11 rounded-xl border-2 font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">{isEn ? "Approved Price (in EGP)" : "السعر المعتمد (بالريال السعودي)"}</Label>
              <Input 
                type="number" 
                min="0"
                placeholder="200" 
                value={newServicePrice}
                onChange={e => setNewServicePrice(e.target.value)}
                required
                className="h-11 rounded-xl border-2 font-mono text-start"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">{isEn ? "Description / Notes (Optional)" : "وصف الخدمة ومحتوياتها (اختياري)"}</Label>
              <Textarea 
                placeholder={isEn ? "Brief notes on what this service includes..." : "توضيح مختصر لما يشمله هذا الكشف أو الخدمة..."} 
                value={newServiceDesc}
                onChange={e => setNewServiceDesc(e.target.value)}
                className="rounded-xl border-2 min-h-[70px]"
              />
            </div>

            <DialogFooter className="pt-4 flex sm:justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setServiceOpen(false)} disabled={createServiceMutation.isPending} className="rounded-xl px-5 h-11">
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button type="submit" disabled={createServiceMutation.isPending} className="rounded-xl px-6 h-11 font-bold shadow-md gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4" />
                {createServiceMutation.isPending ? (isEn ? "Saving..." : "جاري الحفظ...") : (isEn ? "Save Service & Price" : "حفظ الخدمة والتسعيرة")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: Rate Doctor (5-Star Rating System) */}
      <Dialog open={!!ratingDoc} onOpenChange={(open) => !open && setRatingDoc(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader className="space-y-2 text-center">
            <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2 text-amber-500">
              <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
              {isEn ? "Rate Doctor" : "تقييم الطبيب وتجربة الكشف"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {isEn
                ? `Share your experience and feedback for Dr. ${ratingDoc?.name}`
                : `شاركنا تقييمك ورأيك في الخدمة الطبية المقدمة من ${ratingDoc?.name}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRating} className="space-y-5 py-3">
            {/* 5-Star Interactive Rating Selector */}
            <div className="flex flex-col items-center justify-center gap-2 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20">
              <span className="text-sm font-semibold text-muted-foreground">
                {isEn ? "Choose rating (out of 5):" : "اختر التقييم (من 5 نجوم):"}
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedRating(star)}
                    className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
                    title={`${star} ${isEn ? "Stars" : "نجوم"}`}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= selectedRating
                          ? "fill-amber-400 text-amber-500"
                          : "text-muted-foreground/30 hover:text-amber-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {selectedRating === 5 && (isEn ? "⭐⭐⭐⭐⭐ Excellent (5/5)" : "⭐⭐⭐⭐⭐ ممتاز جداً (5 من 5)")}
                {selectedRating === 4 && (isEn ? "⭐⭐⭐⭐ Very Good (4/5)" : "⭐⭐⭐⭐ جيد جداً (4 من 5)")}
                {selectedRating === 3 && (isEn ? "⭐⭐⭐ Good (3/5)" : "⭐⭐⭐ جيد (3 من 5)")}
                {selectedRating === 2 && (isEn ? "⭐⭐ Fair (2/5)" : "⭐⭐ مقبول (2 من 5)")}
                {selectedRating === 1 && (isEn ? "⭐ Poor (1/5)" : "⭐ ضعيف (1 من 5)")}
              </span>
            </div>

            {/* Comment / Review Feedback */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {isEn ? "Your Review / Feedback (Optional)" : "ملاحظاتك أو تعليقك على الكشف (اختياري)"}
              </Label>
              <Textarea
                placeholder={
                  isEn
                    ? "Write your comments regarding the consultation, doctor's punctuality, care, etc..."
                    : "اكتب تجربتك مع الطبيب، دقة المواعيد، التعامل، والتشخيص..."
                }
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                className="rounded-xl border-2 min-h-[90px]"
              />
            </div>

            <DialogFooter className="pt-2 flex sm:justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRatingDoc(null)}
                disabled={isRatingSubmitting}
                className="rounded-xl px-5 h-11"
              >
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button
                type="submit"
                disabled={isRatingSubmitting}
                className="rounded-xl px-6 h-11 font-bold shadow-md gap-2 bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Star className="w-4 h-4 fill-white" />
                {isRatingSubmitting
                  ? (isEn ? "Submitting..." : "جاري الحفظ...")
                  : (isEn ? "Submit Rating" : "إرسال التقييم")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
