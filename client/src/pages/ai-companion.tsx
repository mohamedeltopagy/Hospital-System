import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Sparkles, Pill, Clock, ShieldCheck, AlertTriangle, 
  CheckCircle2, Send, Camera, UploadCloud, RotateCcw, 
  Truck, MessageSquare, HeartHandshake, FileText, ChevronRight,
  Info, Stethoscope, Smartphone, Check
} from "lucide-react";

interface DecodedMedication {
  name: string;
  scientificName?: string;
  dosage: string;
  frequency: string;
  timeOfDay: string;
  duration?: string;
  purpose: string;
  category?: string;
  instructions: string;
}

interface DailyScheduleSlot {
  period: "morning" | "afternoon" | "evening" | "bedtime";
  periodArabic: string;
  time: string;
  items: {
    medicationName: string;
    instruction: string;
  }[];
}

interface PrescriptionAnalysisResult {
  doctorName?: string;
  clinicSpecialty?: string;
  date?: string;
  diagnosisOrSummary: string;
  medications: DecodedMedication[];
  dailySchedule: DailyScheduleSlot[];
  safetyWarnings: {
    type: "warning" | "info" | "critical";
    title: string;
    description: string;
  }[];
  drugInteractions: {
    severity: "safe" | "moderate" | "high";
    description: string;
  }[];
  lifestyleTips: string[];
}

export default function AICompanionPage() {
  const { data: user } = useUser();
  const { toast } = useToast();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [textNotes, setTextNotes] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<PrescriptionAnalysisResult | null>(null);

  // Taken doses tracker for the interactive schedule
  const [takenDoses, setTakenDoses] = useState<Record<string, boolean>>({});

  // WhatsApp Send state
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);
  const [customPhone, setCustomPhone] = useState<string>(user?.phone || "");

  // Pharmacy Delivery Dialog state
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState<boolean>(false);
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [deliveryPhone, setDeliveryPhone] = useState<string>(user?.phone || "");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");
  const [isOrderingDelivery, setIsOrderingDelivery] = useState<boolean>(false);

  // Companion Chat state
  const [chatQuestion, setChatQuestion] = useState<string>("");
  const [isAskingChat, setIsAskingChat] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    {
      role: "ai",
      text: "مرحباً بك! أنا رفيقك الطبي الذكي. بعد فك شفرة روشتتك، يمكنك سؤالي عن أي استفسار يخص الجرعات، الأعراض الجانبية، أو الأطعمة الممنوعة والمسموحة."
    }
  ]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "صيغة غير مدعومة",
        description: "يرجى رفع ملف صورة (JPG, PNG, WEBP)",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRunAnalysis = async (useSample: boolean = false) => {
    setIsAnalyzing(true);
    try {
      const payload: any = {
        textNotes: textNotes.trim()
      };

      if (!useSample && selectedImage) {
        payload.imageBase64 = selectedImage;
        payload.mimeType = "image/jpeg";
      } else if (useSample) {
        payload.textNotes = "روشتة باطنة وجهاز هضمي: مضاد حيوي ومسكن وحامي معدة لمريض يعاني من التهاب معوي وإجهاد";
      }

      const res = await fetch("/api/ai/decode-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "فشل التحليل");
      }

      setAnalysisResult(data.analysis);
      setTakenDoses({});
      toast({
        title: "✨ تم فك شفرة الروشتة بنجاح!",
        description: `تم استخراج ${data.analysis.medications?.length || 0} أدوية وتنظيم جدول الجرعات اليومي`,
      });
    } catch (err: any) {
      toast({
        title: "خطأ في التحليل",
        description: err.message || "يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleDose = (id: string) => {
    setTakenDoses(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const totalDosesCount = analysisResult?.dailySchedule?.reduce((sum, slot) => sum + slot.items.length, 0) || 0;
  const takenCount = Object.values(takenDoses).filter(Boolean).length;
  const progressPercent = totalDosesCount > 0 ? Math.round((takenCount / totalDosesCount) * 100) : 0;

  const handleSendScheduleWhatsApp = async () => {
    if (!analysisResult) return;
    setIsSendingWhatsApp(true);
    try {
      const res = await fetch("/api/ai/send-schedule-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule: analysisResult.dailySchedule,
          medications: analysisResult.medications,
          customPhone: customPhone.trim() || user?.phone
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast({
        title: "📲 تم الإرسال عبر واتساب!",
        description: `تم إرسال جدول أدويتك اليومي المنظم إلى الرقم (${data.recipientPhone || customPhone})`,
      });
    } catch (err: any) {
      toast({
        title: "تعذر الإرسال عبر واتساب",
        description: err.message || "يرجى التحقق من رقم الهاتف",
        variant: "destructive"
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleOrderPharmacyDelivery = async () => {
    if (!analysisResult || !deliveryAddress.trim() || !deliveryPhone.trim()) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال العنوان ورقم الهاتف للتوصيل",
        variant: "destructive"
      });
      return;
    }

    setIsOrderingDelivery(true);
    try {
      const res = await fetch("/api/ai/order-decoded-meds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medications: analysisResult.medications,
          deliveryAddress,
          deliveryPhone,
          deliveryNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setIsDeliveryDialogOpen(false);
      toast({
        title: "🛵 تم طلب الأدوية بنجاح!",
        description: "تم إرسال الطلب لصيدلية المستشفى وسيصلك مندوب التوصيل قريباً، كما تم إرسال رسالة تأكيد لواتسابك.",
      });
    } catch (err: any) {
      toast({
        title: "فشل طلب التوصيل",
        description: err.message || "حدث خطأ أثناء إرسال الطلب",
        variant: "destructive"
      });
    } finally {
      setIsOrderingDelivery(false);
    }
  };

  const handleAskCompanion = async (customPrompt?: string) => {
    const questionToAsk = customPrompt || chatQuestion;
    if (!questionToAsk.trim() || isAskingChat) return;

    setChatMessages(prev => [...prev, { role: "user", text: questionToAsk }]);
    if (!customPrompt) setChatQuestion("");
    setIsAskingChat(true);

    try {
      const res = await fetch("/api/ai/companion-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questionToAsk,
          context: analysisResult
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setChatMessages(prev => [...prev, { role: "ai", text: data.answer }]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        { role: "ai", text: "عذراً، حدث ضغط مؤقت في خادم الرفيق الطبي. يرجى تجربة السؤال مرة أخرى." }
      ]);
    } finally {
      setIsAskingChat(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8" dir="rtl">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs sm:text-sm font-medium border border-white/20">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>نظام الذكاء الاصطناعي التوليدي والرؤية الحاسوبية (Multimodal AI)</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            رفيق المريض الذكي وفك شفرة الروشتات 💊
          </h1>
          <p className="text-emerald-100 max-w-3xl text-sm sm:text-base leading-relaxed">
            التقط صورة لروشتتك الطبية بخط اليد أو تقريرك الطبي؛ وسيقوم الذكاء الاصطناعي بقراءة أسماء الأدوية بدقة، بناء جدول زمني تفاعلي لجرعاتك اليومية، فحص الأمان الدوائي، وإرسال تنبيهات الجرعات لهاتفك عبر الواتساب.
          </p>
        </div>
        <div className="absolute left-[-20px] bottom-[-40px] opacity-15 pointer-events-none">
          <Stethoscope className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* Upload & Demo Trigger Section */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600" />
            <span>رفع الروشتة أو التقرير الطبي للتحليل</span>
          </CardTitle>
          <CardDescription>
            يمكنك رفع صورة للروشتة الورقية أو تجربة الروشتة النموذجية فوراً بضغطة زر واحدة لمعاينة الذكاء الاصطناعي.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Image Box */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-muted-foreground block">
                صورة الروشتة أو عبوة الدواء:
              </label>
              <div className="border-2 border-dashed border-emerald-300/80 dark:border-emerald-800/80 rounded-xl p-6 text-center hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors flex flex-col items-center justify-center min-h-[200px] relative">
                {selectedImage ? (
                  <div className="relative w-full">
                    <img 
                      src={selectedImage} 
                      alt="Prescription preview" 
                      className="max-h-56 mx-auto rounded-lg object-contain shadow-md"
                    />
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="mt-3 text-xs"
                      onClick={() => setSelectedImage(null)}
                    >
                      إزالة الصورة
                    </Button>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      اضغط لاختيار صورة الروشتة أو اسحبها هنا
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      يدعم صيغ JPG, PNG, WEBP (حتى خط اليد الصعب)
                    </p>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Additional Patient Notes & Quick Triggers */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-muted-foreground block">
                ملاحظات المريض أو شكاوى إضافية (اختياري):
              </label>
              <Textarea 
                placeholder="مثال: عندي حساسية من البنسلين، أو بأخذ دواء ضغط، أو عندي ألم بالمعدة بعد الأكل..."
                value={textNotes}
                onChange={(e) => setTextNotes(e.target.value)}
                rows={4}
                className="resize-none"
              />

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold shadow-md shadow-emerald-600/20"
                  onClick={() => handleRunAnalysis(false)}
                  disabled={isAnalyzing || (!selectedImage && !textNotes)}
                >
                  {isAnalyzing ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>جاري فك الشفرة والتحليل بالـ AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>تحليل الروشتة بالذكاء الاصطناعي</span>
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  className="border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-2 font-medium"
                  onClick={() => handleRunAnalysis(true)}
                  disabled={isAnalyzing}
                >
                  <FileText className="w-4 h-4" />
                  <span>📸 تجربة فورية بروشتة نموذجية</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results View when Analysis is Ready */}
      {analysisResult && (
        <div className="space-y-8 animate-in fade-in-50 duration-500">
          {/* Header Summary Card */}
          <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-50/60 via-background to-teal-50/40 dark:from-emerald-950/20 dark:to-background shadow-md">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-200/40 dark:border-emerald-900/40 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white font-bold">
                      {analysisResult.clinicSpecialty || "روشتة طبية معتمدة"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{analysisResult.date}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-emerald-600" />
                    <span>{analysisResult.doctorName || "عيادة الرعاية الطبية الذكية"}</span>
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
                    onClick={handleSendScheduleWhatsApp}
                    disabled={isSendingWhatsApp}
                  >
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>{isSendingWhatsApp ? "جاري الإرسال..." : "إرسال الجدول للواتساب 📲"}</span>
                  </Button>

                  <Button 
                    size="sm" 
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow"
                    onClick={() => setIsDeliveryDialogOpen(true)}
                  >
                    <Truck className="w-4 h-4" />
                    <span>طلب الأدوية دليفري للبيت 🛵</span>
                  </Button>
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white/70 dark:bg-slate-900/60 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                <span className="font-bold text-emerald-800 dark:text-emerald-400">ملخص الحالة الطبية: </span>
                {analysisResult.diagnosisOrSummary}
              </div>
            </CardContent>
          </Card>

          {/* Interactive Navigation Tabs */}
          <Tabs defaultValue="schedule" className="space-y-6">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl h-auto">
              <TabsTrigger value="schedule" className="py-2.5 gap-2 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>جدول الجرعات اليومي</span>
              </TabsTrigger>
              <TabsTrigger value="medications" className="py-2.5 gap-2 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                <Pill className="w-4 h-4 text-emerald-600" />
                <span>الأدوية المفكوكة ({analysisResult.medications?.length || 0})</span>
              </TabsTrigger>
              <TabsTrigger value="safety" className="py-2.5 gap-2 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>رادار الأمان والتداخلات</span>
              </TabsTrigger>
              <TabsTrigger value="companion" className="py-2.5 gap-2 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                <span>اسأل الرفيق الطبي</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Daily Schedule with Interactive Checkboxes */}
            <TabsContent value="schedule" className="space-y-6">
              {/* Daily Progress Tracker */}
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
                    <div>
                      <h4 className="font-bold text-base flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>معدل الالتزام بالأدوية اليوم:</span>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        اضغط على أي جرعة بعد تناولها لتحديث معدل الالتزام الطبي اليومي
                      </p>
                    </div>
                    <div className="text-left">
                      <span className="text-2xl font-extrabold text-emerald-600">{progressPercent}%</span>
                      <span className="text-xs text-muted-foreground mr-1">({takenCount} من {totalDosesCount} جرعات)</span>
                    </div>
                  </div>
                  <Progress value={progressPercent} className="h-2.5 bg-slate-100 dark:bg-slate-800" />
                </CardContent>
              </Card>

              {/* 4 Time Slots Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analysisResult.dailySchedule?.map((slot, idx) => {
                  const periodIcons: Record<string, string> = {
                    morning: "🌅",
                    afternoon: "☀️",
                    evening: "🌇",
                    bedtime: "🌙"
                  };

                  return (
                    <Card key={idx} className="border-border/60 hover:shadow-md transition-shadow">
                      <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-3 border-b">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            <span className="text-xl">{periodIcons[slot.period] || "⏰"}</span>
                            <span>{slot.periodArabic}</span>
                          </CardTitle>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {slot.time}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-5 space-y-3">
                        {slot.items && slot.items.length > 0 ? (
                          slot.items.map((item, itemIdx) => {
                            const doseId = `${slot.period}-${itemIdx}`;
                            const isTaken = !!takenDoses[doseId];

                            return (
                              <div 
                                key={itemIdx}
                                onClick={() => toggleDose(doseId)}
                                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                  isTaken 
                                    ? "bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800 text-slate-700 dark:text-slate-300" 
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400"
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 transition-colors ${
                                  isTaken ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 dark:border-slate-700"
                                }`}>
                                  {isTaken && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <p className={`font-bold text-sm ${isTaken ? "line-through text-muted-foreground" : "text-slate-900 dark:text-slate-100"}`}>
                                    {item.medicationName}
                                  </p>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {item.instruction}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-muted-foreground italic py-2">لا توجد أدوية مخصصة لهذه الفترة.</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB 2: Decoded Medications Cards */}
            <TabsContent value="medications" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {analysisResult.medications?.map((med, idx) => (
                  <Card key={idx} className="border-border/60 hover:shadow-lg transition-all flex flex-col justify-between">
                    <CardHeader className="bg-gradient-to-br from-emerald-50/40 to-transparent dark:from-emerald-950/20 pb-3 border-b">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-400 mb-1 border-emerald-300">
                            {med.category || "دواء علاجي"}
                          </Badge>
                          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {med.name}
                          </CardTitle>
                          {med.scientificName && (
                            <p className="text-xs font-mono text-muted-foreground mt-0.5">
                              {med.scientificName}
                            </p>
                          )}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                          <Pill className="w-5 h-5" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-3 flex-1 text-sm">
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border">
                        <div>
                          <span className="text-muted-foreground block">الجرعة:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{med.dosage}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">التكرار:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{med.frequency}</span>
                        </div>
                        <div className="col-span-2 pt-1 border-t">
                          <span className="text-muted-foreground block">المدة:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{med.duration || "حسب تعليمات الطبيب"}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">الغرض والفائدة:</span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {med.purpose}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">طريقة الاستخدام:</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {med.instructions}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* TAB 3: Safety & Drug Interactions */}
            <TabsContent value="safety" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Drug-Drug Interactions */}
                <Card className="border-border/60">
                  <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-3 border-b">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span>تقييم التوافق والتداخلات الدوائية</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {analysisResult.drugInteractions?.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold text-xs text-emerald-800 dark:text-emerald-400 block">
                            درجة الأمان: {item.severity === "safe" ? "آمن تماماً ✅" : "يتطلب انتباه ⚠️"}
                          </span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Safety Warnings & Food Interactions */}
                <Card className="border-border/60">
                  <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-3 border-b">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <span>محاذير وتنبيهات الأطعمة والامتصاص</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {analysisResult.safetyWarnings?.map((warn, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold text-xs text-amber-800 dark:text-amber-400 block">
                            {warn.title}
                          </span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {warn.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Lifestyle & Nutrition Tips */}
                <Card className="col-span-1 md:col-span-2 border-border/60">
                  <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-3 border-b">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <HeartHandshake className="w-5 h-5 text-purple-600" />
                      <span>إرشادات غذائية لتسريع الشفاء والتعافي</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {analysisResult.lifestyleTips?.map((tip, idx) => (
                        <li key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 4: Ask Medication Companion Chat */}
            <TabsContent value="companion" className="space-y-6">
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-3 border-b">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <span>مساعدك الصيدلي الشخصي (Ask Companion)</span>
                  </CardTitle>
                  <CardDescription>
                    اسأل الرفيق الطبي أي سؤال عن أدويتك أو ماذا تفعل في حال نسيان جرعة أو ظهور عرض مفاجئ.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Quick Prompt Chips */}
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleAskCompanion("ماذا أفعل لو نسيت جرعة المضاد الحيوي؟")}
                      className="text-xs px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 hover:bg-purple-100 transition-colors"
                    >
                      💡 ماذا أفعل لو نسيت جرعة؟
                    </button>
                    <button 
                      onClick={() => handleAskCompanion("هل يمكن تناول هذه الأدوية على معدة فارغة؟")}
                      className="text-xs px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      ☕ هل تؤخذ على معدة فارغة؟
                    </button>
                    <button 
                      onClick={() => handleAskCompanion("ما هي أهم الأعراض الجانبية المتوقعة؟")}
                      className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      🩺 الأعراض الجانبية الشائعة
                    </button>
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="space-y-3 max-h-96 overflow-y-auto p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border">
                    {chatMessages.map((msg, idx) => (
                      <div 
                        key={idx}
                        className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-emerald-600 text-white rounded-br-none"
                            : "bg-white dark:bg-slate-800 border text-slate-800 dark:text-slate-100 rounded-bl-none shadow-sm"
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isAskingChat && (
                      <div className="flex gap-2 items-center text-xs text-muted-foreground p-2">
                        <RotateCcw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                        <span>جاري صياغة النصيحة الطبية من الرفيق الذكي...</span>
                      </div>
                    )}
                  </div>

                  {/* Input Box */}
                  <div className="flex gap-2">
                    <Input 
                      placeholder="اكتب استفسارك الطبي بخصوص الروشتة هنا..."
                      value={chatQuestion}
                      onChange={(e) => setChatQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAskCompanion()}
                      disabled={isAskingChat}
                      className="text-sm"
                    />
                    <Button 
                      onClick={() => handleAskCompanion()} 
                      disabled={isAskingChat || !chatQuestion.trim()}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Pharmacy Home Delivery Dialog */}
      <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
        <DialogContent className="sm:max-w-[480px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Truck className="w-5 h-5 text-emerald-600" />
              <span>طلب توصيل أدوية الروشتة للمنزل 🛵</span>
            </DialogTitle>
            <DialogDescription>
              سيتم إرسال الأدوية المفكوكة آلياً لصيدلية المستشفى مع إشعار فوري عبر الواتساب ومتابعة حية للتوصيل.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">عنوان التوصيل بالتفصيل:</label>
              <Input 
                placeholder="المدينة، اسم الشارع، رقم العمارة، رقم الشقة..." 
                value={deliveryAddress} 
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">رقم الهاتف للتواصل والواتساب:</label>
              <Input 
                placeholder="010XXXXXXXX" 
                value={deliveryPhone} 
                onChange={(e) => setDeliveryPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">ملاحظات للمندوب أو الصيدلي (اختياري):</label>
              <Input 
                placeholder="يرجى الاتصال قبل الوصول بـ 15 دقيقة..." 
                value={deliveryNotes} 
                onChange={(e) => setDeliveryNotes(e.target.value)}
              />
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300">
              💳 طريقة الدفع: الدفع عند الاستلام (كاش أو محفظة إلكترونية للمندوب).
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeliveryDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={handleOrderPharmacyDelivery}
              disabled={isOrderingDelivery}
            >
              {isOrderingDelivery ? "جاري إرسال الطلب..." : "تأكيد طلب الدليفري الآن ✅"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
