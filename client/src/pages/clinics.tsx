import { useState, useEffect } from "react";
import { useClinics } from "@/hooks/use-clinics";
import { Card, CardContent } from "@/components/ui/card";
import { Stethoscope, HeartPulse, Brain, Eye, Baby, Activity, Users, Search, X, ArrowRight, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/use-auth";

// Map clinic names to icons and colors
const getClinicStyle = (name: string) => {
  if (name.includes("قلب")) return { icon: HeartPulse, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/40" };
  if (name.includes("مخ") || name.includes("أعصاب")) return { icon: Brain, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/40" };
  if (name.includes("رمد") || name.includes("عين")) return { icon: Eye, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40" };
  if (name.includes("أطفال")) return { icon: Baby, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40" };
  if (name.includes("باطنة")) return { icon: Activity, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/40" };
  return { icon: Stethoscope, color: "text-primary", bg: "bg-primary/10" };
};

export default function ClinicsPage() {
  const { data: user } = useUser();
  const { data: clinics, isLoading } = useClinics();
  const [location, setLocation] = useLocation();
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    setSearchQuery(q);
  }, [location, window.location.search]);

  const filteredClinics = clinics?.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(query) || (c.description && c.description.toLowerCase().includes(query));
  });

  const clearSearch = () => {
    setSearchQuery("");
    setLocation("/clinics");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" dir={isEn ? "ltr" : "rtl"}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Stethoscope className="w-6 h-6" />
            </div>
            {isEn ? "Specialized Medical Clinics" : "العيادات الطبية المتخصصة"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isEn 
              ? "A top selection of specialized doctors across all medical fields to provide premium healthcare."
              : "نخبة من أفضل الأطباء في كافة التخصصات الطبية لتقديم رعاية صحية متميزة."}
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute top-3.5 start-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={isEn ? "Search clinic name..." : "ابحث عن اسم العيادة أو التخصص..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10 pe-10 h-11 rounded-xl bg-card border-2 shadow-sm focus:border-primary"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute top-3 end-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {searchQuery && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 px-4 py-3 rounded-2xl text-sm">
          <span className="font-semibold text-primary">
            {isEn ? `Filtered results for: "${searchQuery}"` : `تصفية النتائج لـ: "${searchQuery}"`}
          </span>
          <Button variant="ghost" size="sm" onClick={clearSearch} className="ms-auto h-8 gap-1.5 text-xs rounded-lg hover:bg-primary/10">
            <X className="w-3.5 h-3.5" />
            {isEn ? "Show all clinics" : "عرض جميع العيادات"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : user?.role === 'admin' ? (
        <div className="bg-card border-2 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-xs uppercase font-bold text-muted-foreground border-b-2">
              <tr className={!isEn ? "text-right" : ""}>
                <th className="px-6 py-4">{isEn ? "ID" : "المعرف"}</th>
                <th className="px-6 py-4">{isEn ? "Clinic Name" : "اسم العيادة"}</th>
                <th className="px-6 py-4">{isEn ? "Doctor Count" : "عدد الأطباء"}</th>
                <th className="px-6 py-4 text-center">{isEn ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredClinics?.map((clinic) => (
                <tr key={clinic.id} className="border-b transition duration-300 ease-in-out hover:bg-secondary/20">
                  <td className="px-6 py-4 whitespace-nowrap font-medium pointer-events-none">
                    #{clinic.id}
                  </td>
                  <td className="px-6 py-4 font-bold text-primary">
                    <Link href={`/clinics/${clinic.id}`} className="hover:underline flex items-center gap-2">
                      {clinic.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">
                    {clinic.doctorCount || 0} {isEn ? "Doctors" : "أطباء"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" asChild className="rounded-lg">
                        <Link href={`/clinics/${clinic.id}`}>{isEn ? "View Details" : "عرض التفاصيل"}</Link>
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-lg">{isEn ? "Edit" : "تعديل"}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredClinics && filteredClinics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClinics.map((clinic) => {
            const style = getClinicStyle(clinic.name);
            return (
              <Link key={clinic.id} href={`/clinics/${clinic.id}`}>
                <Card className="hover-elevate cursor-pointer border-border hover:border-primary/50 transition-all duration-300 h-full overflow-hidden group shadow-sm hover:shadow-md">
                  <div className={`h-2.5 w-full ${style.bg.replace('bg-', 'bg-').replace('/10', '-500')}`} />
                  <CardContent className="p-6 space-y-4 flex flex-col justify-between h-[calc(100%-10px)]">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className={`p-3.5 rounded-2xl ${style.bg} ${style.color} group-hover:scale-110 transition-transform shadow-inner`}>
                          <style.icon className="w-8 h-8" />
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                          <Users className="w-3.5 h-3.5 text-primary" />
                          {clinic.doctorCount || 0} {isEn ? "Doctors" : "أطباء"}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{clinic.name}</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                          {clinic.description || (isEn ? `Specialized department providing comprehensive diagnosis and treatment in ${clinic.name}.` : `قسم متخصص في تشخيص وعلاج أمراض ${clinic.name} وتوفير الرعاية الطبية الشاملة.`)}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-primary">
                      <span>{isEn ? "View clinic doctors & book" : "عرض الأطباء وحجز موعد"}</span>
                      {isEn ? <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> : <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center p-16 bg-card rounded-3xl border-2 border-dashed border-border space-y-4">
          <div className="w-16 h-16 bg-secondary text-muted-foreground rounded-full flex items-center justify-center mx-auto">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold">{isEn ? "No clinics match your search" : "لا توجد عيادات مطابقة لبحثك"}</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {isEn ? `We couldn't find any clinic matching "${searchQuery}". Try searching for another specialty.` : `لم يتم العثور على أي عيادة تطابق "${searchQuery}". جرب البحث باسم تخصص آخر كـ "الباطنة" أو "الأطفال".`}
          </p>
          <Button onClick={clearSearch} variant="outline" className="rounded-xl mt-2">
            {isEn ? "Clear search" : "مسح عبارة البحث"}
          </Button>
        </div>
      )}
    </div>
  );
}
