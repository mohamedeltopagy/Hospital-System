import { Link, useLocation } from "wouter";
import { 
  HeartPulse, Activity, FileText, ClipboardList, 
  Calendar, CreditCard, Stethoscope, Home, ChevronDown, User, LogOut, Settings,
  Languages, Moon, Sun, Users
} from "lucide-react";
import { useTheme } from "next-themes";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useClinics } from "@/hooks/use-clinics";
import { Button } from "@/components/ui/button";
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupLabel, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter
} from "@/components/ui/sidebar";

const clinics_ar = [
  "الباطنة", "الجراحة العامة", "الأطفال", "النساء والتوليد", 
  "العظام", "الأنف والأذن والحنجرة", "الجلدية", "الرمد", 
  "القلب", "الصدر", "المخ والأعصاب", "المسالك البولية", "الجهاز الهضمي"
];

const clinics_en = [
  "Internal Medicine", "General Surgery", "Pediatrics", "OB/GYN",
  "Orthopedics", "ENT", "Dermatology", "Ophthalmology",
  "Cardiology", "Pulmonology", "Neurology", "Urology", "Gastroenterology"
];

export function AppSidebar() {
  const [location] = useLocation();
  const { data: user } = useUser();
  const { data: allClinics } = useClinics();
  const logout = useLogout();
  
  const doctorClinicName = allClinics?.find(c => c.id === user?.clinicId)?.name;
  
  // Check global language from html tag
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  let navItems: { title: string, url: string, icon: any }[] = [];
  
  if (user?.role === "doctor") {
    navItems = isEn ? [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Patient Directory", url: "/patients", icon: Users },
      { title: "Clinics", url: "/clinics", icon: Stethoscope },
      { title: "Appointments", url: "/appointments", icon: Calendar },
      { title: "Patient History", url: "/medical-history", icon: Activity },
      { title: "Medical Reports", url: "/reports", icon: FileText },
      { title: "Treatment Plans", url: "/treatment-plans", icon: ClipboardList },
      { title: "Earnings & Payments", url: "/payments", icon: CreditCard },
      { title: "Settings", url: "/settings", icon: Settings },
    ] : [
      { title: "الرئيسية", url: "/", icon: Home },
      { title: "إدارة ملفات المرضى", url: "/patients", icon: Users },
      { title: "العيادات الطبية", url: "/clinics", icon: Stethoscope },
      { title: "جدول المواعيد", url: "/appointments", icon: Calendar },
      { title: "التاريخ المرضي للمرضى", url: "/medical-history", icon: Activity },
      { title: "التقارير الطبية", url: "/reports", icon: FileText },
      { title: "خطط العلاج والروشتات", url: "/treatment-plans", icon: ClipboardList },
      { title: "الإعدادات", url: "/settings", icon: Settings },
      { title: "الإيرادات والمستحقات", url: "/payments", icon: CreditCard },
    ];
  } else if (user?.role === "admin") {
    navItems = isEn ? [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Patient Directory", url: "/patients", icon: Users },
      { title: "Doctors' Appointments", url: "/appointments", icon: Calendar },
      { title: "Manage Clinics", url: "/clinics", icon: Stethoscope },
      { title: "Payments & Revenue", url: "/payments", icon: CreditCard },
      { title: "Settings", url: "/settings", icon: Settings },
    ] : [
      { title: "الرئيسية", url: "/", icon: Home },
      { title: "دليل ملفات المرضى", url: "/patients", icon: Users },
      { title: "مواعيد الأطباء", url: "/appointments", icon: Calendar },
      { title: "إدارة العيادات", url: "/clinics", icon: Stethoscope },
      { title: "الدفع والإيرادات", url: "/payments", icon: CreditCard },
      { title: "الإعدادات", url: "/settings", icon: Settings },
    ];
  } else {
    // Default to Patient Role View
    navItems = isEn ? [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Appointments", url: "/appointments", icon: Calendar },
      { title: "Medical History", url: "/medical-history", icon: Activity },
      { title: "Reports", url: "/reports", icon: FileText },
      { title: "Treatment Plans", url: "/treatment-plans", icon: ClipboardList },
      { title: "Payments", url: "/payments", icon: CreditCard },
      { title: "Settings", url: "/settings", icon: Settings },
    ] : [
      { title: "الرئيسية", url: "/", icon: Home },
      { title: "حجز موعد", url: "/appointments", icon: Calendar },
      { title: "التاريخ المرضي", url: "/medical-history", icon: Activity },
      { title: "التقارير", url: "/reports", icon: FileText },
      { title: "خطة العلاج", url: "/treatment-plans", icon: ClipboardList },
      { title: "طرق الدفع", url: "/payments", icon: CreditCard },
      { title: "الإعدادات", url: "/settings", icon: Settings },
    ];
  }

  const clinics = isEn ? clinics_en : clinics_ar;

  const { theme, setTheme } = useTheme();

  const handleLanguageToggle = () => {
    const newLang = document.documentElement.lang === 'en' ? 'ar' : 'en';
    localStorage.setItem('app-language', newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    window.location.reload();
  };

  const side = isEn ? "left" : "right";

  return (
    <Sidebar side={side} className="border-e bg-sidebar shadow-2xl opacity-100 z-[100]">
      <SidebarHeader className="p-6 bg-sidebar border-b border-primary/5">
        <div className="flex items-center gap-4 font-bold text-2xl text-primary">
          <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-inner">
            <HeartPulse className="w-7 h-7" />
          </div>
          <span className="tracking-tight">{isEn ? "Health First" : "صحتك أولاً"}</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
            {isEn ? "Main Menu" : "القائمة الرئيسية"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    tooltip={item.title}
                    className="h-12 px-4 rounded-xl transition-all duration-200 hover:bg-primary/5 data-[active=true]:bg-primary data-[active=true]:text-white shadow-sm data-[active=true]:shadow-primary/30"
                  >
                    <Link href={item.url} className="flex items-center gap-4 w-full">
                      <item.icon className={`w-5 h-5 ${location === item.url ? "text-white" : "text-primary"}`} />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {true && (
                <Collapsible defaultOpen className="group/collapsible mt-2">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        tooltip={isEn ? "Clinics" : "العيادات الطبية"}
                        className="h-12 px-4 rounded-xl hover:bg-primary/5 transition-all"
                      >
                        <Stethoscope className="w-5 h-5 text-primary" />
                        <span className="font-medium">{isEn ? "Clinics" : "العيادات الطبية"}</span>
                        <ChevronDown className="ms-auto w-4 h-4 transition-transform group-data-[state=open]/collapsible:rotate-180 opacity-50" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-2 pt-1">
                      <SidebarMenuSub className="border-s-2 border-primary/10 ms-6 gap-0.5">
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={location === "/clinics"} className="rounded-lg h-9 px-3">
                            <Link href="/clinics" className="text-sm">{isEn ? "All Clinics" : "كل العيادات"}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {clinics.map(clinic => (
                          <SidebarMenuSubItem key={clinic}>
                            <SidebarMenuSubButton asChild className="rounded-lg h-9 px-3">
                              <Link href={`/clinics?q=${clinic}`} className="text-sm opacity-80 hover:opacity-100">{clinic}</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6 border-t border-primary/5 bg-sidebar/50">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLanguageToggle}
            className="h-9 w-9 rounded-xl hover:bg-primary/10 transition-colors"
            title={isEn ? "Change Language" : "تغيير اللغة"}
          >
            <Languages className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 rounded-xl hover:bg-primary/10 transition-colors"
            title={isEn ? "Toggle Theme" : "تغيير المظهر"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </div>
        {user && (
          <div className="flex flex-col gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary/80 cursor-pointer hover:bg-secondary transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold truncate">{user.name}</span>
                    <span className="text-xs text-muted-foreground font-semibold truncate">
                      {isEn 
                        ? (user.role === 'doctor' ? `Doctor • ${doctorClinicName || 'General'}` : user.role) 
                        : (user.role === 'patient' ? 'مريض' : user.role === 'doctor' ? `طبيب • (${doctorClinicName || 'عام'})` : 'مسؤول')}
                    </span>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="left" align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-none">
                <DropdownMenuLabel className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                  {isEn ? "My Account" : "حسابي الشخصي"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 opacity-50" />
                <DropdownMenuItem className="rounded-xl p-3 focus:bg-primary/5 cursor-pointer">
                  <Link href="/settings" className="flex items-center gap-3 w-full font-bold">
                    <Settings className="h-4 w-4 text-primary" />
                    {isEn ? "Settings" : "الإعدادات"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl p-3 focus:bg-primary/5 cursor-pointer" onClick={() => logout.mutate()}>
                  <div className="flex items-center gap-3 w-full text-destructive">
                    <LogOut className="h-4 w-4" />
                    {isEn ? "Logout" : "تسجيل الخروج"}
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
