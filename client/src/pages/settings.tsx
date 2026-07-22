import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { User, Shield, Bell, Palette, Globe, Save, Stethoscope } from "lucide-react";
import { useUser } from "@/hooks/use-auth";
import { useClinics } from "@/hooks/use-clinics";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const { data: user } = useUser();
  const { data: clinics = [] } = useClinics();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fontSize, setFontSize] = useState("normal");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio((user as any).bio || "");
    }
  }, [user]);

  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/users/doctors"] });
      toast({
        title: isEn ? "Settings saved" : "تم حفظ الإعدادات بنجاح",
        description: isEn ? "Your profile and biography have been updated" : "تم تحديث بيانات حسابك ونبذتك الشخصية بنجاح",
      });
    } catch (err: any) {
      toast({
        title: isEn ? "Error" : "خطأ",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8" dir={isEn ? "ltr" : "rtl"}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {isEn ? "System Settings" : "إعدادات النظام"}
        </h1>
        <p className="text-muted-foreground">
          {isEn 
            ? `Manage account and system preferences for ${user?.role}` 
            : `إدارة الحساب وتفضيلات النظام لـ ${user?.role === 'admin' ? 'المسؤول' : user?.role === 'doctor' ? 'الطبيب' : 'المريض'}`}
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full" dir={isEn ? "ltr" : "rtl"}>
        <TabsList className="grid w-full grid-cols-4 h-14 p-1 bg-secondary rounded-xl mb-8">
          <TabsTrigger value="profile" className="rounded-lg flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{isEn ? "Account" : "الحساب"}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-lg flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span>{isEn ? "Appearance" : "المظهر"}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>{isEn ? "Security" : "الأمان"}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span>{isEn ? "Notifications" : "التنبيهات"}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="rounded-[1.5rem] shadow-sm">
            <CardHeader>
              <CardTitle>
                {isEn 
                  ? `${user?.role?.charAt(0).toUpperCase()}${user?.role?.slice(1)} Information` 
                  : `معلومات ${user?.role === 'admin' ? 'المسؤول' : user?.role === 'doctor' ? 'الطبيب' : 'المريض'}`}
              </CardTitle>
              <CardDescription>
                {isEn ? "Edit your personal details registered in the system" : "تعديل بياناتك الشخصية المسجلة في النظام"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isEn ? "Full Name" : "الاسم الكامل"}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>{isEn ? "Username" : "اسم المستخدم"}</Label>
                  <Input defaultValue={user?.username} disabled className="rounded-xl bg-secondary/50" />
                </div>
                {user?.role === 'doctor' && (
                  <>
                    <div className="space-y-2">
                      <Label>{isEn ? "Assigned Specialty / Clinic" : "العيادة والتخصص الطبي المسجل"}</Label>
                      <Input defaultValue={clinics.find(c => c.id === user?.clinicId)?.name || (isEn ? "General Medicine" : "طب عام")} disabled className="rounded-xl bg-primary/10 font-black text-primary" />
                    </div>
                    <div className="space-y-2">
                      <Label>{isEn ? "Medical License Number" : "رقم الترخيص الطبي"}</Label>
                      <Input defaultValue="DOC-12345" className="rounded-xl" />
                    </div>
                  </>
                )}
                {user?.role === 'admin' && (
                  <div className="space-y-2">
                    <Label>{isEn ? "Authority Level" : "مستوى الصلاحية"}</Label>
                    <Input defaultValue={isEn ? "Full System Administrator" : "مدير نظام كامل"} disabled className="rounded-xl bg-secondary/50" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{isEn ? "Phone Number" : "رقم الهاتف"}</Label>
                  <Input placeholder="01xxxxxxxxx" className="rounded-xl" />
                </div>
              </div>

              {user?.role === 'doctor' && (
                <div className="space-y-2 pt-2">
                  <Label className="flex items-center gap-2 text-primary font-bold">
                    <Stethoscope className="w-4 h-4" />
                    {isEn ? "Doctor Biography & Qualifications (Visible to Patients)" : "نبذة عن الطبيب والخبرات الطبية (تظهر للمرضى عند الحجز وفي العيادة)"}
                  </Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={isEn ? "Write about your qualifications, years of experience, fellowship degrees, philosophy, and working schedule..." : "اكتب نبذة مختصرة عن مؤهلاتك العلمية، سنوات الخبرة، الشهادات الحاصل عليها، وجدول تواجدك بالعيادة ليتعرف عليك المرضى..."}
                    className="rounded-xl min-h-[120px] bg-background border-2 focus:border-primary"
                  />
                </div>
              )}

              <Button onClick={handleSave} disabled={isSaving} className="rounded-xl px-8 mt-4 font-bold shadow-md shadow-primary/20">
                <Save className="w-4 h-4 ml-2" />
                {isSaving ? (isEn ? "Saving..." : "جاري الحفظ...") : (isEn ? "Save Changes" : "حفظ التغييرات")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card className="rounded-[1.5rem] shadow-sm">
            <CardHeader>
              <CardTitle>{isEn ? "Interface Customization" : "تخصيص الواجهة"}</CardTitle>
              <CardDescription>
                {isEn ? "Control how the system looks for you" : "تحكم في كيفية ظهور النظام لك"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div className="space-y-0.5">
                  <Label className="text-base">{isEn ? "Dark Mode" : "الوضع الليلي"}</Label>
                  <p className="text-sm text-muted-foreground">
                    {isEn ? "Enable dark appearance for eye comfort" : "تفعيل المظهر الداكن لراحة العين"}
                  </p>
                </div>
                <Switch 
                  checked={theme === "dark"} 
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} 
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div className="space-y-0.5">
                  <Label className="text-base">{isEn ? "Font Size" : "حجم الخط"}</Label>
                  <p className="text-sm text-muted-foreground">
                    {isEn ? "Enlarge font for easier reading (especially for seniors)" : "تكبير الخط لسهولة القراءة (خاصة لكبار السن)"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={fontSize === "normal" ? "default" : "outline"}
                    onClick={() => {
                      setFontSize("normal");
                      document.documentElement.style.fontSize = "16px";
                    }}
                    className="rounded-lg h-9"
                  >
                    {isEn ? "Normal" : "عادي"}
                  </Button>
                  <Button 
                    variant={fontSize === "large" ? "default" : "outline"}
                    onClick={() => {
                      setFontSize("large");
                      document.documentElement.style.fontSize = "20px";
                    }}
                    className="rounded-lg h-9"
                  >
                    {isEn ? "Extra Large" : "كبير جداً"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="rounded-[1.5rem] shadow-sm">
            <CardHeader>
              <CardTitle>{isEn ? "Security" : "الأمان"}</CardTitle>
              <CardDescription>
                {isEn ? "Secure your account and change password" : "تأمين حسابك وتغيير كلمة المرور"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{isEn ? "Current Password" : "كلمة المرور الحالية"}</Label>
                <Input type="password" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>{isEn ? "New Password" : "كلمة المرور الجديدة"}</Label>
                <Input type="password" className="rounded-xl" />
              </div>
              <Button onClick={handleSave} className="rounded-xl px-8">
                {isEn ? "Update Security" : "تحديث الأمان"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="rounded-[1.5rem] shadow-sm">
            <CardHeader>
              <CardTitle>{isEn ? "Notifications" : "التنبيهات"}</CardTitle>
              <CardDescription>
                {isEn ? "Choose how you want to receive updates" : "اختر كيف ترغب في استلام التحديثات"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3">
                <Label>{isEn ? "In-app appointment alerts" : "تنبيهات المواعيد عبر التطبيق"}</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3">
                <Label>{isEn ? "SMS Messages" : "رسائل نصية SMS"}</Label>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-3">
                <Label>{isEn ? "Email results and reports" : "بريد إلكتروني بالنتائج والتقارير"}</Label>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}