import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { MedicalChatbot } from "@/components/chatbot/medical-chatbot";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Activity, Calendar, FileText, Pill, Users, ClipboardList, BriefcaseMedical, 
  ShieldCheck, Settings, LayoutDashboard, CheckCircle2, Clock, Truck, Star, 
  CreditCard, Search, RefreshCw, XCircle, ArrowUpRight, Sparkles, Filter 
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, formatDistanceToNow } from "date-fns";
import { arEG } from "date-fns/locale";
import { useAppointments } from "@/hooks/use-appointments";
import { useReports, useTreatmentPlans } from "@/hooks/use-records";
import { useDoctors, useClinics } from "@/hooks/use-clinics";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: appointments = [] } = useAppointments();
  const { data: reports = [] } = useReports();
  const { data: treatmentPlans = [] } = useTreatmentPlans();
  const { data: doctors = [] } = useDoctors();
  const { data: clinics = [] } = useClinics();

  const { data: patients = [] } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const res = await fetch('/api/patients');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: user?.role === 'doctor' || user?.role === 'admin'
  });
  
  // Check global language from html tag
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';
  const doctorClinicObj = clinics.find((c: any) => c.id === user?.clinicId);

  // Admin Live Activity Feed State
  const [activityRoleFilter, setActivityRoleFilter] = useState<string>("all");
  const [activitySearchQuery, setActivitySearchQuery] = useState<string>("");

  const { data: activityLogs = [], isLoading: isLoadingActivityLogs, refetch: refetchActivityLogs } = useQuery<any[]>({
    queryKey: ['/api/admin/activity-logs', activityRoleFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/activity-logs${activityRoleFilter !== 'all' ? `?role=${activityRoleFilter}` : ''}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: user?.role === 'admin',
    refetchInterval: 4000,
  });

  const getActionMeta = (actionType: string) => {
    switch (actionType) {
      case 'APPOINTMENT_BOOKED':
        return { icon: Calendar, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400', badge: isEn ? 'Booked Appointment' : 'حجز كشف' };
      case 'APPOINTMENT_CANCELLED':
        return { icon: XCircle, color: 'text-rose-600 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400', badge: isEn ? 'Cancelled Appointment' : 'إلغاء كشف' };
      case 'APPOINTMENT_CONFIRMED':
        return { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400', badge: isEn ? 'Confirmed Appointment' : 'تأكيد كشف' };
      case 'PRESCRIPTION_CREATED':
        return { icon: Pill, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400', badge: isEn ? 'Prescription' : 'روشتة علاج' };
      case 'DELIVERY_REQUESTED':
        return { icon: Truck, color: 'text-purple-600 bg-purple-100 dark:bg-purple-950/60 dark:text-purple-400', badge: isEn ? 'Home Delivery 🛵' : 'دليفري صيدلية 🛵' };
      case 'REPORT_ISSUED':
        return { icon: FileText, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-950/60 dark:text-cyan-400', badge: isEn ? 'Medical Report' : 'تقرير طبي' };
      case 'LAB_REQUESTED':
        return { icon: ClipboardList, color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400', badge: isEn ? 'Lab / Radiology' : 'تحاليل وأشعة' };
      case 'TREATMENT_PLAN_CREATED':
        return { icon: BriefcaseMedical, color: 'text-teal-600 bg-teal-100 dark:bg-teal-950/60 dark:text-teal-400', badge: isEn ? 'Treatment Plan' : 'خطة علاجية' };
      case 'PAYMENT_COMPLETED':
        return { icon: CreditCard, color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300', badge: isEn ? 'Payment 💳' : 'سداد مالي 💳' };
      case 'DOCTOR_REVIEWED':
        return { icon: Star, color: 'text-amber-500 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300', badge: isEn ? '5-Star Rating ⭐' : 'تقييم 5 نجوم ⭐' };
      default:
        return { icon: Activity, color: 'text-primary bg-primary/10', badge: isEn ? 'System Event' : 'عملية' };
    }
  };

  const filteredLogs = activityLogs.filter((log: any) => {
    if (!activitySearchQuery.trim()) return true;
    const q = activitySearchQuery.toLowerCase();
    return (
      log.userName?.toLowerCase().includes(q) ||
      log.title?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q) ||
      log.actionType?.toLowerCase().includes(q)
    );
  });

  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [workingHours, setWorkingHours] = useState("09:00 - 17:00");
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    if (user && user.role === 'doctor') {
      setWorkingDays(((user as any).workingDays || "0,1,2,3,4").split(",").map((d: string) => d.trim()));
      setWorkingHours((user as any).workingHours || "09:00 - 17:00");
    }
  }, [user]);

  const handleSaveSchedule = async () => {
    if (!user) return;
    setSavingSchedule(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workingDays: workingDays.join(","),
          workingHours,
        }),
      });
      if (!res.ok) throw new Error("Failed to save schedule");
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: isEn ? "Schedule Saved!" : "تم حفظ جدول العمل بنجاح!",
        description: isEn ? "Your clinic working days and hours are now updated across the booking system." : "تم تحديث أيام وساعات تواجدك في العيادة، وسيتم تطبيقها فوراً على المرضى أثناء حجز المواعيد.",
      });
    } catch (e: any) {
      toast({ title: isEn ? "Error" : "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setSavingSchedule(false);
    }
  };

  const upcomingApptsCount = appointments.filter((a: any) => a.status === 'pending' || a.status === 'confirmed').length;
  const nextPatientAppt = appointments.find((a: any) => a.status === 'pending' || a.status === 'confirmed');

  const patientStats = isEn ? [
    { title: "Upcoming Appointments", value: upcomingApptsCount.toString(), icon: Calendar, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40", link: "/appointments" },
    { title: "New Reports", value: reports.length.toString(), icon: FileText, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", link: "/reports" },
    { title: "Current Medications", value: treatmentPlans.length.toString(), icon: Pill, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/40", link: "/treatment-plans" },
  ] : [
    { title: "المواعيد القادمة", value: upcomingApptsCount.toString(), icon: Calendar, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40", link: "/appointments" },
    { title: "التقارير الجديدة", value: reports.length.toString(), icon: FileText, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", link: "/reports" },
    { title: "الأدوية الحالية", value: treatmentPlans.length.toString(), icon: Pill, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/40", link: "/treatment-plans" },
  ];

  const doctorStats = isEn ? [
    { title: "Today's Patients", value: appointments.length.toString(), icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40", link: "/appointments" },
    { title: "Pending Reports", value: reports.length.toString(), icon: ClipboardList, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40", link: "/reports" },
    { title: "Total Appointments", value: appointments.length.toString(), icon: BriefcaseMedical, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", link: "/appointments" },
  ] : [
    { title: "مرضى اليوم", value: appointments.length.toString(), icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40", link: "/appointments" },
    { title: "تقارير معلقة", value: reports.length.toString(), icon: ClipboardList, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40", link: "/reports" },
    { title: "إجمالي المواعيد", value: appointments.length.toString(), icon: BriefcaseMedical, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", link: "/appointments" },
  ];

  const adminStats = isEn ? [
    { title: "Total Doctors", value: doctors.length.toString(), icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40", link: "/clinics" },
    { title: "Active Clinics", value: clinics.length.toString(), icon: BriefcaseMedical, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", link: "/clinics" },
    { title: "Total Patients", value: (patients as any[]).length.toString(), icon: Activity, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/40", link: "/patients-directory" },
  ] : [
    { title: "إجمالي الأطباء", value: doctors.length.toString(), icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40", link: "/clinics" },
    { title: "العيادات النشطة", value: clinics.length.toString(), icon: BriefcaseMedical, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", link: "/clinics" },
    { title: "إجمالي المرضى", value: (patients as any[]).length.toString(), icon: Activity, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/40", link: "/patients-directory" },
  ];

  const stats = user?.role === 'doctor' ? doctorStats : user?.role === 'admin' ? adminStats : patientStats;

  if (user?.role === 'admin') {
    return (
      <div className="p-8 space-y-10 max-w-7xl mx-auto" dir={isEn ? "ltr" : "rtl"}>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden border border-white/10">
          <div className="space-y-6 z-10 relative text-center md:text-start w-full">
            <div className="inline-flex px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-sm font-medium mb-2 border border-white/10">
              {isEn ? "Admin Dashboard 🛡️" : "لوحة تحكم المسؤول 🛡️"}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              {isEn ? `Welcome, ${user?.name}` : `مرحباً بك، ${user?.name}`}
            </h1>
            <p className="text-slate-300 text-xl max-w-2xl font-medium leading-relaxed">
              {isEn ? "Comprehensive overview of system performance and clinics today." : "إليك نظرة شاملة والحالة الفعلية لأداء النظام الطبي والعيادات اليوم."}
            </p>
          </div>
          <div className="z-10 bg-white/10 p-6 rounded-[2rem] backdrop-blur-xl border border-white/10 hidden lg:block shadow-2xl">
            <ShieldCheck className="w-20 h-20 text-white opacity-95" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <Link key={i} href={stat.link}>
              <Card className="hover-elevate cursor-pointer rounded-[1.5rem] border-none shadow-md bg-white dark:bg-slate-900">
                <CardContent className="p-8 flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase">{stat.title}</p>
                    <p className="text-4xl font-black">{stat.value}</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-8 h-8" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* --- Live Patient & Doctor Activity Monitoring Feed --- */}
        <Card className="rounded-[2rem] border shadow-xl bg-card overflow-hidden">
          <CardHeader className="bg-slate-50 dark:bg-slate-800/60 p-6 md:p-8 border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <Activity className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black text-foreground flex items-center gap-3">
                      {isEn ? "Live Patient & Doctor Activity Feed" : "مركز المراقبة وسجل أنشطة المرضى والأطباء المباشر"}
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        {isEn ? "Live Real-Time" : "محدث لحظياً"}
                      </span>
                    </CardTitle>
                    <CardDescription className="text-sm mt-0.5">
                      {isEn 
                        ? "Real-time audit log of all actions taken by patients and doctors across the hospital."
                        : "متابعة فورية لكافة العمليات التي يقوم بها الأطباء والمرضى (حجوزات، روشتات، دليفري صيدلية، تقارير، وتقييمات)."}
                    </CardDescription>
                  </div>
                </div>
              </div>

              {/* Refresh Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchActivityLogs()} 
                className="gap-2 rounded-xl border-border hover:bg-secondary font-semibold shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingActivityLogs ? 'animate-spin' : ''}`} />
                {isEn ? "Refresh" : "تحديث فوري"}
              </Button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6">
              <div className="flex items-center gap-1.5 bg-background/80 p-1 rounded-xl border w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActivityRoleFilter("all")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activityRoleFilter === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {isEn ? "All Activities" : "جميع العمليات"} ({activityLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivityRoleFilter("doctor")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${activityRoleFilter === 'doctor' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  👨‍⚕️ {isEn ? "Doctors Only" : "الأطباء فقط"}
                </button>
                <button
                  type="button"
                  onClick={() => setActivityRoleFilter("patient")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${activityRoleFilter === 'patient' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  👤 {isEn ? "Patients Only" : "المرضى فقط"}
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 rtl:right-3 rtl:left-auto top-3" />
                <Input 
                  value={activitySearchQuery} 
                  onChange={(e) => setActivitySearchQuery(e.target.value)} 
                  placeholder={isEn ? "Search by user or action..." : "بحث بالاسم، الدواء، أو الإجراء..."} 
                  className="rounded-xl h-10 ps-9 rtl:pe-9 rtl:ps-3 text-xs bg-background"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 md:p-8 space-y-4">
            {isLoadingActivityLogs ? (
              <div className="p-12 text-center text-muted-foreground">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary opacity-50" />
                <span>{isEn ? "Loading live activity..." : "جاري تحميل سجل الأنشطة المباشر..."}</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-secondary/20 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-25" />
                <p className="font-bold text-foreground">{isEn ? "No activities matching your filter." : "لا توجد عمليات تطابق البحث المحدد حالياً."}</p>
                <p className="text-xs mt-1">{isEn ? "Activities performed by doctors and patients will appear here automatically." : "ستظهر هنا تلقائياً أي عمليات يقوم بها الطبيب أو المريض فور حدوثها."}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pe-2">
                {filteredLogs.map((log: any) => {
                  const meta = getActionMeta(log.actionType);
                  const IconComponent = meta.icon;
                  const isDoctor = log.userRole === 'doctor';

                  return (
                    <div 
                      key={log.id} 
                      className="p-4 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`p-3 rounded-2xl ${meta.color} shrink-0 mt-0.5 group-hover:scale-105 transition-transform shadow-sm`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-foreground text-sm md:text-base">
                              {log.title}
                            </span>
                            
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] font-bold px-2 py-0.5 ${isDoctor ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'}`}
                            >
                              {isDoctor ? (isEn ? "👨‍⚕️ Doctor" : "👨‍⚕️ طبيب") : (isEn ? "👤 Patient" : "👤 مريض")}: {log.userName}
                            </Badge>

                            <Badge variant="secondary" className="text-[10px] font-semibold text-muted-foreground">
                              {meta.badge}
                            </Badge>
                          </div>

                          <p className="text-xs md:text-sm text-foreground/80 leading-relaxed font-medium">
                            {log.details}
                          </p>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto text-xs text-muted-foreground pt-2 sm:pt-0 border-t sm:border-t-0">
                        <span className="font-bold text-foreground/90 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          {format(new Date(log.timestamp), 'hh:mm a', { locale: isEn ? undefined : arEG })}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: isEn ? undefined : arEG })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Directory & Health Status Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> {isEn ? "System Directory Status" : "حالة الدليل الطبي والطلبات"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-bold text-lg">
                {isEn ? "All active accounts and clinics are synchronized" : "جميع الحسابات والعيادات النشطة متزامنة وتعمل بشكل طبيعي"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isEn ? "No pending doctor registration requests at this moment." : "لا توجد طلبات تسجيل معلقة تتطلب موافقة المسؤول حالياً."}
              </p>
              <Button asChild variant="outline" className="rounded-xl mt-2">
                <Link href="/clinics">{isEn ? "Manage Clinics & Doctors" : "إدارة العيادات والأطباء"}</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b">
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-primary" /> {isEn ? "System Health" : "حالة النظام"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-medium">{isEn ? "Response Time" : "سرعة الاستجابة"}</span>
                <Badge className="bg-emerald-500">{isEn ? "Excellent 99%" : "ممتاز 99%"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">{isEn ? "Database Records" : "البيانات الفعلية"}</span>
                <span className="text-sm font-bold text-emerald-600">{doctors.length} أطباء | {clinics.length} عيادات</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-1/4 h-full bg-primary"></div>
              </div>
              <Button asChild variant="outline" className="w-full rounded-xl gap-2">
                <Link href="/settings"><Settings className="w-4 h-4" /> {isEn ? "Advanced Settings" : "إعدادات النظام المتقدمة"}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto" dir={isEn ? "ltr" : "rtl"}>
      {/* Hero Welcome */}
      <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-primary/30 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden border border-white/10">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')]"></div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-primary-foreground/10 rounded-full blur-2xl"></div>
        
        <div className="space-y-6 z-10 relative text-center md:text-start w-full">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <div className="inline-flex px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-sm font-medium border border-white/20">
              {user?.role === 'doctor' 
                ? (isEn ? "Productive Day 👨‍⚕️" : "يوم عمل موفق 👨‍⚕️") 
                : (isEn ? "Welcome Back ✨" : "مرحباً بك مجدداً ✨")}
            </div>
            {user?.role === 'doctor' && (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/25 text-white font-black text-sm border border-white/30 shadow-md">
                🏥 {isEn ? `Specialty: ${doctorClinicObj?.name || 'General Medicine'}` : `التخصص والعيادة: ${doctorClinicObj?.name || 'طب عام'}`}
              </div>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            {isEn ? `Welcome, ${user?.name}` : `مرحباً بك، ${user?.name}`}
          </h1>
          <p className="text-primary-foreground/90 text-xl max-w-2xl font-medium leading-relaxed">
            {user?.role === 'doctor' 
              ? (isEn ? `We appreciate your efforts at ${doctorClinicObj?.name || 'the clinic'}. Here is your live schedule for today.` : `نقدر جهودك في رعاية المرضى بـ (${doctorClinicObj?.name || 'العيادة الطبية'}). إليك نظرة على مواعيدك الحالية.`)
              : (isEn ? "We wish you health and wellness. How can we help you today?" : "نتمنى لك دوام الصحة والعافية. يمكنك الاطلاع على مواعيدك، تقاريرك وأدويتك الحقيقية أدناه.")}
          </p>
        </div>
        <div className="z-10 bg-white/15 p-6 rounded-[2rem] backdrop-blur-xl border border-white/20 hidden lg:block shadow-2xl">
          <Activity className="w-20 h-20 text-white opacity-95" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-3 text-foreground">
              <Activity className="w-6 h-6 text-primary" /> {isEn ? (user?.role === 'doctor' ? "Clinic Stats" : "Overview") : (user?.role === 'doctor' ? "إحصائيات العيادة" : "نظرة عامة")}
            </h2>
            <Link href={user?.role === 'doctor' ? "/appointments" : "/reports"} className="text-sm font-bold text-primary hover:underline">{isEn ? "View All" : "عرض الكل"}</Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
            {stats.map((stat, i) => (
              <Link key={i} href={stat.link}>
                <Card className="hover-elevate cursor-pointer border-border hover:border-primary/40 transition-all shadow-md group rounded-[1.5rem] overflow-hidden">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                      <p className="text-3xl font-black text-foreground tracking-tighter">{stat.value}</p>
                    </div>
                    <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                      <stat.icon className="w-7 h-7" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-100/50 dark:border-indigo-900/30 overflow-hidden relative group rounded-[1.5rem] shadow-sm">
            <div className="absolute right-0 top-0 w-2.5 h-full bg-indigo-500 shadow-[2px_0_10px_rgba(99,102,241,0.2)]"></div>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-black text-indigo-950 dark:text-indigo-100 text-lg">
                  {isEn ? (user?.role === 'doctor' ? "Next Appointment" : "Upcoming Reminder") : (user?.role === 'doctor' ? 'المريض القادم' : 'تذكير المواعيد')}
                </h3>
              </div>
              <p className="text-base text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed font-medium">
                {nextPatientAppt ? (
                  isEn ? (
                    <>You have a booked appointment on <span className="font-bold underline">{new Date(nextPatientAppt.datetime).toLocaleDateString()}</span>.</>
                  ) : (
                    <>لديك موعد محجوز في تاريخ <span className="font-bold underline">{new Date(nextPatientAppt.datetime).toLocaleDateString('ar-EG')}</span> بعيادتك.</>
                  )
                ) : (
                  user?.role === 'doctor' ? (
                    isEn ? "No upcoming patient appointments at the moment." : "لا توجد مواعيد مرضى قادمة في جدول انتظارك حالياً."
                  ) : (
                    isEn ? "No upcoming appointments booked. You can easily book your first appointment now!" : "لا توجد مواعيد قادمة محجوزة حالياً. يمكنك حجز موعدك الأول بسهولة وبضغطة زر من قائمة العيادات!"
                  )
                )}
              </p>
              {!nextPatientAppt && user?.role === 'patient' && (
                <Button asChild className="mt-4 rounded-xl font-bold w-full" size="sm">
                  <Link href="/appointments">{isEn ? "Book Appointment Now" : "احجز موعدك الآن"}</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {user?.role === 'doctor' && (
            <Card className="rounded-[2.5rem] border border-primary/20 shadow-xl bg-card/90 overflow-hidden">
              <CardHeader className="bg-primary/5 p-6 border-b border-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2.5 text-xl text-primary font-black">
                    <Calendar className="w-5 h-5" />
                    {isEn ? "Set Your Clinic Working Days & Hours" : "تحديد أيام وساعات التواجد بالعيادة"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1.5 font-semibold">
                    {isEn ? "Patients can only book appointments during these active weekdays and hours without time conflicts." : "سيتعرف نظام الحجز تلقائياً على هذه الأيام والساعات، ويمنع أي مريض من الحجز في الأيام غير المحددة أو المواعيد المتداخلة."}
                  </p>
                </div>
                <Button 
                  onClick={handleSaveSchedule} 
                  disabled={savingSchedule} 
                  className="rounded-xl px-6 h-11 font-bold shadow-lg gap-2 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {savingSchedule ? (isEn ? "Saving..." : "جاري الحفظ...") : (isEn ? "Save Schedule" : "حفظ الجدول")}
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-extrabold text-foreground mb-3 block flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    {isEn ? "Select Available Weekdays for Patient Visits:" : "اختر أيام العمل المتاحة لاستقبال المرضى:"}
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { id: "0", ar: "الأحد", en: "Sun" },
                      { id: "1", ar: "الإثنين", en: "Mon" },
                      { id: "2", ar: "الثلاثاء", en: "Tue" },
                      { id: "3", ar: "الأربعاء", en: "Wed" },
                      { id: "4", ar: "الخميس", en: "Thu" },
                      { id: "5", ar: "الجمعة", en: "Fri" },
                      { id: "6", ar: "السبت", en: "Sat" },
                    ].map(day => {
                      const isActive = workingDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setWorkingDays(workingDays.filter(d => d !== day.id));
                            } else {
                              setWorkingDays([...workingDays, day.id]);
                            }
                          }}
                          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all border-2 flex items-center gap-2 ${
                            isActive 
                              ? "bg-primary text-white border-primary shadow-md scale-105" 
                              : "bg-secondary/40 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          {isActive && <CheckCircle2 className="w-4 h-4" />}
                          {isEn ? day.en : day.ar}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-extrabold text-foreground mb-2 block flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    {isEn ? "Working Hours Range:" : "ساعات وأوقات الكشف المعتادة:"}
                  </label>
                  <input
                    type="text"
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    placeholder="09:00 - 17:00"
                    className="w-full sm:max-w-xs h-12 px-4 rounded-xl border-2 bg-background font-bold text-base focus:border-primary focus:outline-none shadow-sm"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-3 text-foreground">
              {isEn ? (user?.role === 'doctor' ? "Today's Schedule" : "Medical AI Assistant 🤖") : (user?.role === 'doctor' ? 'جدول المواعيد المسجلة' : 'المساعد الطبي الذكي 🤖')}
            </h2>
            <div className="text-xs font-bold text-muted-foreground bg-secondary px-3 py-1 rounded-full uppercase tracking-tighter">
              {user?.role === 'doctor' ? 'Live Updates' : 'AI Powered'}
            </div>
          </div>
          <div className="shadow-2xl shadow-sky-900/5 rounded-[2.5rem] overflow-hidden border border-border/50">
            {user?.role === 'doctor' ? (
              <Card className="border-none">
                <CardContent className="p-0">
                  {appointments.length === 0 ? (
                    <div className="p-12 text-center space-y-3 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto opacity-40" />
                      <p className="font-semibold text-base">{isEn ? "No appointments scheduled for today yet." : "لا توجد مواعيد مسجلة لديك في جدول اليوم حتى الآن."}</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {appointments.map((apt: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-6 hover:bg-secondary/20 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                              {apt.patientId || 'P'}
                            </div>
                            <div>
                              <p className="font-bold text-lg">{isEn ? `Patient #${apt.patientId}` : `مريض رقم #${apt.patientId}`}</p>
                              <p className="text-sm text-muted-foreground">{new Date(apt.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          <Badge variant={apt.status === 'confirmed' ? "secondary" : "default"} className="px-4 py-1 rounded-full">
                            {apt.status === 'pending' ? (isEn ? "Pending" : "قيد الانتظار") : apt.status === 'confirmed' ? (isEn ? "Confirmed" : "مؤكد") : apt.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <MedicalChatbot />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
