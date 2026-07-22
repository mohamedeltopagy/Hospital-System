import { Bell, Search, Moon, Sun, Languages } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useUser } from "@/hooks/use-auth";
import { useClinics } from "@/hooks/use-clinics";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function Header() {
  const { data: user } = useUser();
  const { data: clinics } = useClinics();
  const { theme, setTheme } = useTheme();
  const doctorClinicName = clinics?.find(c => c.id === user?.clinicId)?.name;

  const handleLanguageToggle = () => {
    const newLang = document.documentElement.lang === 'en' ? 'ar' : 'en';
    localStorage.setItem('app-language', newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    window.location.reload();
  };

  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-primary hover:bg-primary/10 hover:text-primary" />
        <div className="hidden md:flex items-center relative w-64 lg:w-96">
          <Search className={`absolute ${isEn ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input 
            placeholder={isEn ? "Search for doctor or clinic..." : "ابحث عن طبيب أو عيادة..."}
            className={`${isEn ? "pl-10" : "pr-10"} rounded-full bg-secondary/50 border-transparent focus-visible:border-primary focus-visible:ring-primary/20`}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={handleLanguageToggle}>
          <Languages className="w-5 h-5" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full" 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background"></span>
        </button>
        <div className={`hidden sm:block text-sm ${isEn ? "text-start" : "text-end"}`}>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">
              {isEn ? `Welcome, ${user?.name?.split(' ')[0]}` : `مرحباً، ${user?.name?.split(' ')[0]}`}
            </p>
            {user?.role === 'doctor' && (
              <span className="text-[11px] font-bold bg-primary/15 text-primary px-2.5 py-0.5 rounded-full shadow-xs">
                {doctorClinicName || (isEn ? "General Medicine" : "طب عام")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString(isEn ? 'en-US' : 'ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </header>
  );
}
