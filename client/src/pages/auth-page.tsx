import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HeartPulse, User, Lock, Activity, ShieldCheck, Mail, Globe, Moon, Sun, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLogin, useRegister, useUser } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useTheme } from "next-themes";

const registerSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يحتوي على حرفين على الأقل"),
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  role: z.enum(["patient", "doctor", "admin"], {
    required_error: "يرجى تحديد نوع الحساب",
  }),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

const loginSchema = z.object({
  username: z.string().min(1, "مطلوب"),
  password: z.string().min(1, "مطلوب"),
});

export default function AuthPage() {
  const { data: user, isLoading: isLoadingUser } = useUser();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const { theme, setTheme } = useTheme();

  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", username: "", password: "", role: "patient", gender: "male", dateOfBirth: "" },
  });

  const handleLanguageToggle = () => {
    const newLang = document.documentElement.lang === 'en' ? 'ar' : 'en';
    localStorage.setItem('app-language', newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    window.location.reload();
  };

  if (isLoadingUser) return null;
  if (user) return <Redirect to="/" />;

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background relative overflow-hidden">
      {/* Language and Theme Toggles */}
      <div className={`absolute top-6 ${isEn ? 'right-6' : 'left-6'} z-50 flex items-center gap-2`}>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleLanguageToggle}
          className="rounded-full bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/10 transition-all duration-300 shadow-lg hover:scale-110"
          title={isEn ? "العربية" : "English"}
          data-testid="button-language-toggle"
        >
          <Globe className="h-5 w-5 text-primary" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/10 transition-all duration-300 shadow-lg hover:scale-110"
          title={isEn ? "Toggle Theme" : "تبديل المظهر"}
          data-testid="button-theme-toggle"
        >
          {theme === "dark" ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-primary" />}
        </Button>
      </div>

      {/* Right Side - Form */}
      <div className="flex items-center justify-center p-6 sm:p-8 lg:p-12 relative overflow-y-auto max-h-screen">
        <div className="w-full max-w-lg space-y-6 my-auto py-8">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-2">
              <HeartPulse className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {isEn ? "Medical System Portal" : "بوابة النظام الطبي"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isEn ? "Sign in with your credentials below or create a new account" : "أدخل بياناتك لتسجيل الدخول الفوري أو أنشئ حساباً جديداً"}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full" dir={isEn ? "ltr" : "rtl"}>
            <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-secondary rounded-xl">
              <TabsTrigger value="login" className="rounded-lg py-2.5 font-bold">
                {isEn ? "Login with Credentials" : "تسجيل الدخول اليدوي"}
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg py-2.5 font-bold">
                {isEn ? "Create New Account" : "إنشاء حساب جديد"}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-6">
              <form onSubmit={loginForm.handleSubmit((d) => loginMutation.mutate(d))} className="space-y-4">
                <div className="space-y-2 relative">
                  <div className={`absolute inset-y-0 ${isEn ? "left-0 pl-3" : "right-0 pr-3"} flex items-center pointer-events-none text-muted-foreground`}>
                    <User className="w-5 h-5" />
                  </div>
                  <Input 
                    {...loginForm.register("username")} 
                    placeholder={isEn ? "Username" : "اسم المستخدم"} 
                    className={`${isEn ? "pl-10" : "pr-10"} py-6 rounded-xl bg-white dark:bg-slate-900 border-2 hover:border-primary/50 focus:border-primary transition-colors text-base font-mono`}
                    dir="ltr"
                    data-testid="input-login-username"
                  />
                  {loginForm.formState.errors.username && <p className="text-xs text-destructive px-1">{loginForm.formState.errors.username.message}</p>}
                </div>
                
                <div className="space-y-2 relative">
                  <div className={`absolute inset-y-0 ${isEn ? "left-0 pl-3" : "right-0 pr-3"} flex items-center pointer-events-none text-muted-foreground`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <Input 
                    type="password"
                    {...loginForm.register("password")} 
                    placeholder={isEn ? "Password" : "كلمة المرور"} 
                    className={`${isEn ? "pl-10" : "pr-10"} py-6 rounded-xl bg-white dark:bg-slate-900 border-2 hover:border-primary/50 focus:border-primary transition-colors text-base font-mono`}
                    dir="ltr"
                    data-testid="input-login-password"
                  />
                  {loginForm.formState.errors.password && <p className="text-xs text-destructive px-1">{loginForm.formState.errors.password.message}</p>}
                </div>

                <Button 
                  type="submit" 
                  disabled={loginMutation.isPending}
                  className="w-full py-6 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all bg-gradient-to-r from-primary to-primary/90"
                  data-testid="button-login-submit"
                >
                  {loginMutation.isPending ? (isEn ? "Logging in..." : "جاري الدخول...") : (isEn ? "Login Now" : "تسجيل الدخول الآن")}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={registerForm.handleSubmit((d) => registerMutation.mutate(d as any))} className="space-y-4">
                <div className="space-y-2 relative">
                  <div className={`absolute inset-y-0 ${isEn ? "left-0 pl-3" : "right-0 pr-3"} flex items-center pointer-events-none text-muted-foreground`}>
                    <User className="w-5 h-5" />
                  </div>
                  <Input 
                    {...registerForm.register("name")} 
                    placeholder={isEn ? "Full Name" : "الاسم الكامل"} 
                    className={`${isEn ? "pl-10" : "pr-10"} py-5 rounded-xl bg-white dark:bg-slate-900 border-2`}
                    data-testid="input-register-name"
                  />
                  {registerForm.formState.errors.name && <p className="text-xs text-destructive px-1">{registerForm.formState.errors.name.message}</p>}
                </div>

                <div className="space-y-2 relative">
                  <div className={`absolute inset-y-0 ${isEn ? "left-0 pl-3" : "right-0 pr-3"} flex items-center pointer-events-none text-muted-foreground`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <Input 
                    {...registerForm.register("username")} 
                    placeholder={isEn ? "Username" : "اسم المستخدم"} 
                    className={`${isEn ? "pl-10" : "pr-10"} py-5 rounded-xl bg-white dark:bg-slate-900 border-2`}
                    dir="ltr"
                    data-testid="input-register-username"
                  />
                  {registerForm.formState.errors.username && <p className="text-xs text-destructive px-1">{registerForm.formState.errors.username.message}</p>}
                </div>
                
                <div className="space-y-2 relative">
                  <div className={`absolute inset-y-0 ${isEn ? "left-0 pl-3" : "right-0 pr-3"} flex items-center pointer-events-none text-muted-foreground`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <Input 
                    type="password"
                    {...registerForm.register("password")} 
                    placeholder={isEn ? "Password" : "كلمة المرور"} 
                    className={`${isEn ? "pl-10" : "pr-10"} py-5 rounded-xl bg-white dark:bg-slate-900 border-2`}
                    dir="ltr"
                    data-testid="input-register-password"
                  />
                  {registerForm.formState.errors.password && <p className="text-xs text-destructive px-1">{registerForm.formState.errors.password.message}</p>}
                </div>

                <div className="space-y-2 relative">
                  <div className={`absolute inset-y-0 ${isEn ? "left-0 pl-3" : "right-0 pr-3"} flex items-center pointer-events-none text-muted-foreground z-10`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <Select onValueChange={(val) => registerForm.setValue("role", val as any)} defaultValue="patient">
                    <SelectTrigger className={`${isEn ? "pl-10" : "pr-10"} py-5 rounded-xl bg-white dark:bg-slate-900 border-2 w-full text-base font-normal`} data-testid="select-register-role">
                      <SelectValue placeholder={isEn ? "Select account type" : "اختر نوع الحساب"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient" data-testid="option-role-patient">{isEn ? "Patient (Patient Account)" : "مريض (حساب مريض)"}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5 px-1">
                    <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                    {isEn ? "Public registration is for Patients only. Doctors and Staff accounts must be created by the System Administrator." : "💡 ملاحظة: التسجيل العام مخصص للمرضى فقط. يتم إنشاء وتعيين حسابات الأطباء من قبل مسؤول النظام."}
                  </p>
                  {registerForm.formState.errors.role && <p className="text-xs text-destructive px-1">{registerForm.formState.errors.role.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 relative">
                    <Select onValueChange={(val) => registerForm.setValue("gender", val)} defaultValue="male">
                      <SelectTrigger className="py-5 rounded-xl bg-white dark:bg-slate-900 border-2 w-full text-base font-normal">
                        <SelectValue placeholder={isEn ? "Gender" : "النوع"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{isEn ? "Male" : "ذكر"}</SelectItem>
                        <SelectItem value="female">{isEn ? "Female" : "أنثى"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 relative">
                    <Input 
                      type="date"
                      {...registerForm.register("dateOfBirth")} 
                      className="py-5 rounded-xl bg-white dark:bg-slate-900 border-2"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={registerMutation.isPending}
                  className="w-full py-6 mt-2 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all bg-gradient-to-r from-primary to-primary/90"
                  data-testid="button-register-submit"
                >
                  {registerMutation.isPending ? (isEn ? "Creating..." : "جاري الإنشاء...") : (isEn ? "Create New Account" : "إنشاء حساب جديد")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Left Side - Visual */}
      <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-sky-800 opacity-90 z-0"></div>
        <div className="absolute inset-0 opacity-10 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:20px_20px] bg-repeat"></div>
        
        <div className="relative z-10 text-white text-center max-w-lg space-y-6">
          <Activity className="w-24 h-24 mx-auto opacity-90 mb-8" />
          <h2 className="text-4xl font-extrabold leading-tight">
            {isEn ? "Integrated Medical Care at Your Fingertips" : "رعاية طبية متطورة بين يديك"}
          </h2>
          <p className="text-lg opacity-80 leading-relaxed">
            {isEn 
              ? "A modern system combining easy appointment booking, medical history access, and effective communication with top doctors to ensure your health and your family's." 
              : "أدر مواعيدك، تاريخك الطبي، وخطط علاجك بكل سهولة وأمان. نظامنا الذكي يضمن لك تجربة رعاية صحية متكاملة."}
          </p>
        </div>
        
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
