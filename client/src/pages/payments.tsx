import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  CreditCard, Plus, History, Receipt, ShieldCheck, Wallet, 
  TrendingUp, Users, CheckCircle2, DollarSign, ArrowUpRight, 
  Printer, Check, AlertCircle, Building2, Trash2, Star, CheckCircle,
  Globe, Coins, Smartphone, Banknote, ShieldAlert
} from "lucide-react";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useAppointments, useUpdateAppointment } from "@/hooks/use-appointments";
import { useServices, useClinics, useDoctors } from "@/hooks/use-clinics";

// Global supported currencies dictionary with exchange rates relative to SAR (1 SAR base)
export const CURRENCIES: Record<string, { code: string; nameAr: string; nameEn: string; symbol: string; rate: number; flag: string }> = {
  SAR: { code: "SAR", nameAr: "الريال السعودي", nameEn: "Saudi Riyal", symbol: "ر.س", rate: 1.0, flag: "🇸🇦" },
  EGP: { code: "EGP", nameAr: "الجنيه المصري", nameEn: "Egyptian Pound", symbol: "ج.م", rate: 13.25, flag: "🇪🇬" },
  USD: { code: "USD", nameAr: "الدولار الأمريكي", nameEn: "US Dollar", symbol: "$", rate: 0.266, flag: "🇺🇸" },
  EUR: { code: "EUR", nameAr: "اليورو الأوروبي", nameEn: "Euro", symbol: "€", rate: 0.245, flag: "🇪🇺" },
  AED: { code: "AED", nameAr: "الدرهم الإماراتي", nameEn: "UAE Dirham", symbol: "د.إ", rate: 0.978, flag: "🇦🇪" },
  KWD: { code: "KWD", nameAr: "الدينار الكويتي", nameEn: "Kuwaiti Dinar", symbol: "د.ك", rate: 0.082, flag: "🇰🇼" },
};

export function formatCurrency(amountInSAR: number, currencyCode: string, isEn: boolean = false) {
  const curr = CURRENCIES[currencyCode] || CURRENCIES.SAR;
  const converted = amountInSAR * curr.rate;
  return `${converted.toFixed(2)} ${isEn ? curr.code : curr.symbol}`;
}

interface PaymentMethodItem {
  id: string;
  type: string;
  last4?: string;
  expiry?: string;
  provider?: string;
  policyId?: string;
  balance?: string;
  icon: any;
  primary: boolean;
}

export default function PaymentsPage() {
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';
  const { data: user } = useUser();
  const [currency, setCurrency] = useState("SAR");

  if (user?.role === 'admin') {
    return <AdminPaymentsView isEn={isEn} currency={currency} setCurrency={setCurrency} />;
  }

  if (user?.role === 'doctor') {
    return <DoctorPaymentsView isEn={isEn} doctorName={user?.name || ""} currency={currency} setCurrency={setCurrency} />;
  }

  return <PatientPaymentsView isEn={isEn} patientName={user?.name || ""} currency={currency} setCurrency={setCurrency} />;
}

/* =========================================================
   1. PATIENT PAYMENTS VIEW (With Currency & Payment Method Checkout)
   ========================================================= */
function PatientPaymentsView({ isEn, patientName, currency, setCurrency }: { isEn: boolean; patientName: string; currency: string; setCurrency: (c: string) => void }) {
  const { toast } = useToast();
  const currInfo = CURRENCIES[currency] || CURRENCIES.SAR;

  const { data: appointments = [] } = useAppointments();
  const { data: services = [] } = useServices();
  const { data: clinics = [] } = useClinics();
  const updateAppt = useUpdateAppointment();

  const getApptPrice = (clinicId: number) => {
    const srv = services.find(s => s.clinicId === clinicId);
    return srv ? srv.price : 200;
  };

  const [methods, setMethods] = useState<PaymentMethodItem[]>([
    { id: "m1", type: isEn ? "Bank Card" : "بطاقة بنكية", last4: "4242", expiry: "12/26", provider: isEn ? "Visa Platinum" : "فيزا بلاتينيوم", icon: CreditCard, primary: true },
    { id: "m2", type: isEn ? "Health Insurance" : "تأمين صحي", provider: isEn ? "Bupa Arabia" : "بوبا العربية", policyId: "987***21", icon: ShieldCheck, primary: false },
    { id: "m3", type: isEn ? "E-Wallet" : "محفظة إلكترونية", balance: isEn ? "150.00 SAR" : "150.00 ر.س", icon: Wallet, primary: false },
  ]);

  const transactions = appointments.map((appt) => {
    const srv = services.find(s => s.clinicId === appt.clinicId);
    const cln = clinics.find(c => c.id === appt.clinicId);
    const amount = getApptPrice(appt.clinicId);
    const isPaid = appt.status === 'completed' || appt.status === 'confirmed';
    const dateStr = new Date(appt.datetime).toLocaleDateString(isEn ? "en-US" : "ar-SA");
    return {
      id: `INV-${appt.id + 1000}`,
      apptId: appt.id,
      date: dateStr,
      service: srv?.name || cln?.name || (isEn ? "General Consultation" : "كشف عيادة"),
      amount: amount,
      status: isPaid ? (isEn ? "Paid" : "مدفوع") : appt.status === 'cancelled' ? (isEn ? "Cancelled" : "ملغي") : (isEn ? "Pending" : "قيد الانتظار"),
      paidMethod: isPaid ? (isEn ? "Electronic Card" : "بطاقة إلكترونية") : undefined,
      paidCurrency: isPaid ? "SAR" : undefined
    };
  });

  const dueAmount = appointments
    .filter(a => a.status === 'pending')
    .reduce((sum, a) => sum + getApptPrice(a.clinicId), 0);

  // Dialog states
  const [isAddOpen, setAddOpen] = useState(false);
  const [isPayOpen, setPayOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [isProcessing, setProcessing] = useState(false);

  // New Method form
  const [newType, setNewType] = useState("card");
  const [newCardNum, setNewCardNum] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [newProvider, setNewProvider] = useState("");

  // Pay Now Checkout choices
  const [checkoutCurrency, setCheckoutCurrency] = useState(currency);
  const [checkoutMethodId, setCheckoutMethodId] = useState("m1"); // or custom instant option
  const [checkoutCustomType, setCheckoutCustomType] = useState<string | null>(null); // e.g. "apple_pay", "cash", etc.

  const handleOpenPay = () => {
    setCheckoutCurrency(currency);
    const primaryMethod = methods.find(m => m.primary) || methods[0];
    if (primaryMethod) {
      setCheckoutMethodId(primaryMethod.id);
      setCheckoutCustomType(null);
    }
    setPayOpen(true);
  };

  const handleAddMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardNum && !newProvider && newType !== "wallet") {
      toast({ title: isEn ? "Error" : "تنبيه", description: isEn ? "Please fill in required fields" : "يرجى تعبئة الحقول المطلوبة", variant: "destructive" });
      return;
    }

    const newMethodObj: PaymentMethodItem = {
      id: "m" + Date.now(),
      type: newType === "card" ? (isEn ? "Bank Card" : "بطاقة بنكية") : newType === "insurance" ? (isEn ? "Health Insurance" : "تأمين صحي") : (isEn ? "E-Wallet" : "محفظة إلكترونية"),
      last4: newCardNum ? newCardNum.slice(-4) : "8899",
      expiry: newExpiry || "08/28",
      provider: newProvider || (newType === "card" ? "MasterCard" : newType === "insurance" ? (isEn ? "Tawuniya" : "التعاونية") : (isEn ? "STC Pay" : "STC Pay")),
      balance: newType === "wallet" ? (isEn ? "300.00 SAR" : "300.00 ر.س") : undefined,
      policyId: newType === "insurance" ? "POL-5541" : undefined,
      icon: newType === "card" ? CreditCard : newType === "insurance" ? ShieldCheck : Wallet,
      primary: methods.length === 0,
    };

    setMethods([...methods, newMethodObj]);
    setAddOpen(false);
    setNewCardNum("");
    setNewExpiry("");
    setNewProvider("");

    toast({
      title: isEn ? "Method Added" : "تمت الإضافة بنجاح",
      description: isEn ? "Your payment method has been saved securely." : "تم تسجيل طريقة الدفع الخاصة بك في النظام بأمان.",
    });
  };

  const handleSetPrimary = (id: string) => {
    setMethods(methods.map(m => ({ ...m, primary: m.id === id })));
    toast({ title: isEn ? "Primary Method Updated" : "تم التحديث", description: isEn ? "Default payment method changed successfully." : "تم تغيير طريقة الدفع الأساسية بنجاح." });
  };

  const handleDeleteMethod = (id: string) => {
    if (methods.length <= 1) {
      toast({ title: isEn ? "Warning" : "تنبيه", description: isEn ? "You must keep at least one registered method." : "يجب الاحتفاظ بطريقة دفع واحدة على الأقل.", variant: "destructive" });
      return;
    }
    setMethods(methods.filter(m => m.id !== id));
    toast({ title: isEn ? "Deleted" : "تم الحذف", description: isEn ? "Payment method removed successfully." : "تم حذف طريقة الدفع من حسابك." });
  };

  const handleConfirmPay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      
      let chosenLabel = "";
      if (checkoutCustomType) {
        if (checkoutCustomType === "apple_pay") chosenLabel = isEn ? "Apple Pay" : "Apple Pay (دفع سريع)";
        else if (checkoutCustomType === "mada_instant") chosenLabel = isEn ? "Mada Debit Card" : "بطاقة مدى البنكية (فوري)";
        else if (checkoutCustomType === "stc_pay") chosenLabel = isEn ? "STC Pay Wallet" : "محفظة STC Pay الإلكترونية";
        else if (checkoutCustomType === "cash_reception") chosenLabel = isEn ? "Cash at Reception" : "الدفع نقداً عند مكتب الاستقبال";
      } else {
        const found = methods.find(m => m.id === checkoutMethodId);
        if (found) {
          chosenLabel = `${found.type} ${found.last4 ? `(**** ${found.last4})` : `(${found.provider})`}`;
        } else {
          chosenLabel = isEn ? "Bank Card" : "بطاقة إلكترونية";
        }
      }

      appointments.filter(a => a.status === 'pending').forEach((appt) => {
        updateAppt.mutate({ id: appt.id, data: { status: 'confirmed' } });
      });

      setPayOpen(false);
      const paidCurrObj = CURRENCIES[checkoutCurrency] || CURRENCIES.SAR;
      const convertedAmt = (dueAmount * paidCurrObj.rate).toFixed(2);

      toast({
        title: isEn ? "Payment Successful!" : "تم سداد الفاتورة بنجاح!",
        description: isEn 
          ? `Paid ${convertedAmt} ${paidCurrObj.code} using ${chosenLabel}. Receipt generated.`
          : `تم سداد مبلغ (${convertedAmt} ${paidCurrObj.symbol}) باستخدام: ${chosenLabel}. تم تأكيد الموعد وإصدار الفاتورة الإلكترونية.`
      });
    }, 1200);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10" dir={isEn ? "ltr" : "rtl"}>
      {/* Top Header with Currency Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{isEn ? "Payments & Billing" : "المدفوعات والفواتير الطبية"}</h1>
          <p className="text-muted-foreground">{isEn ? "Manage payment methods, select your billing currency, and review transaction history" : "اختر عملة الدفع المفضلة، أدر بطاقاتك البنكية، وقم بسداد الفواتير الطبية بسهولة"}</p>
        </div>

        <div className="flex items-center gap-3 bg-secondary/60 p-2 rounded-2xl border border-border">
          <Globe className="w-5 h-5 text-primary ms-2" />
          <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">{isEn ? "Billing Currency:" : "عملة العرض والدفع:"}</span>
          <Select value={currency} onValueChange={(val) => {
            setCurrency(val);
            toast({
              title: isEn ? "Currency Changed" : "تغيير العملة",
              description: isEn ? `All prices switched to ${CURRENCIES[val].nameEn} (${val})` : `تم تحويل عرض جميع المبالغ إلى ${CURRENCIES[val].nameAr} (${CURRENCIES[val].symbol})`
            });
          }}>
            <SelectTrigger className="w-48 h-10 rounded-xl bg-card border-2 font-bold text-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(CURRENCIES).map((c) => (
                <SelectItem key={c.code} value={c.code} className="font-semibold">
                  <span className="me-2">{c.flag}</span> {isEn ? c.code : c.symbol} - {isEn ? c.nameEn : c.nameAr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Registered Methods Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> {isEn ? "Registered Payment Methods" : "طرق الدفع المسجلة"}
              </h2>
              <Button onClick={() => setAddOpen(true)} variant="outline" className="rounded-xl gap-2 h-9 text-xs border-primary/40 text-primary hover:bg-primary/5">
                <Plus className="w-4 h-4" /> {isEn ? "Add New Method" : "إضافة بطاقة / طريقة جديدة"}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {methods.map((method) => (
                <Card key={method.id} className={`rounded-[1.5rem] border-2 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md ${method.primary ? "border-primary/40 bg-primary/[0.03]" : "border-border"}`}>
                  {method.primary && (
                    <div className={`absolute top-0 ${isEn ? "right-0 rounded-bl-xl" : "left-0 rounded-br-xl"} bg-primary text-white text-[10px] px-3 py-1 font-bold flex items-center gap-1`}>
                      <Star className="w-3 h-3 fill-white" />
                      {isEn ? "Primary" : "الأساسية"}
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className={`p-3 rounded-2xl ${method.primary ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        <method.icon className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-1">
                        {!method.primary && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleSetPrimary(method.id)} 
                            title={isEn ? "Set as primary" : "تعيين كطريقة أساسية"}
                            className="h-8 text-xs text-muted-foreground hover:text-primary rounded-lg"
                          >
                            {isEn ? "Set Primary" : "تعيين كأساسية"}
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteMethod(method.id)} 
                          title={isEn ? "Delete method" : "حذف الطريقة"}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg text-foreground">{method.type}</h3>
                      {method.last4 && <p className="text-sm font-mono text-muted-foreground" dir="ltr">**** **** **** {method.last4}</p>}
                      {method.provider && <p className="text-sm text-muted-foreground font-medium">{method.provider}</p>}
                      {method.policyId && <p className="text-xs text-muted-foreground">{isEn ? "Policy:" : "رقم الوثيقة:"} {method.policyId}</p>}
                      {method.balance && <p className="text-lg font-black text-primary pt-1">{formatCurrency(150, currency, isEn)}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Transactions Table Section */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 px-2">
              <History className="w-5 h-5 text-primary" /> {isEn ? "Transaction History" : "سجل الفواتير والمعاملات الطبية"}
            </h2>
            <Card className="rounded-[1.5rem] overflow-hidden shadow-sm border-2 border-border bg-card">
              <Table dir={isEn ? "ltr" : "rtl"}>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-secondary/40 text-xs uppercase">
                    <TableHead className="py-4 px-6">{isEn ? "Invoice ID" : "رقم الفاتورة"}</TableHead>
                    <TableHead className="py-4 px-6">{isEn ? "Date" : "التاريخ"}</TableHead>
                    <TableHead className="py-4 px-6">{isEn ? "Service" : "الخدمة الطبية"}</TableHead>
                    <TableHead className="py-4 px-6">{isEn ? "Amount" : "المبلغ المفترى"}</TableHead>
                    <TableHead className="py-4 px-6">{isEn ? "Paid Via" : "وسيلة الدفع"}</TableHead>
                    <TableHead className="py-4 px-6">{isEn ? "Status" : "الحالة"}</TableHead>
                    <TableHead className={`py-4 px-6 ${isEn ? "text-right" : "text-left"}`}>{isEn ? "Receipt" : "الإيصال"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-secondary/20 transition-colors">
                      <TableCell className="font-bold px-6 py-4">{tx.id}</TableCell>
                      <TableCell className="text-muted-foreground px-6 py-4 text-sm">{tx.date}</TableCell>
                      <TableCell className="font-medium px-6 py-4">{tx.service}</TableCell>
                      <TableCell className="font-bold px-6 py-4 text-primary">
                        {formatCurrency(tx.amount, tx.paidCurrency || currency, isEn)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs text-muted-foreground font-medium">
                        {tx.paidMethod || (isEn ? "Not paid yet" : "غير مسدد")}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant="outline" className={tx.status === (isEn ? "Paid" : "مدفوع") ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 px-3 py-1 font-semibold" : "bg-amber-500/10 text-amber-600 border-amber-200 px-3 py-1 font-semibold"}>
                          {tx.status === (isEn ? "Paid" : "مدفوع") ? <CheckCircle className="w-3.5 h-3.5 me-1.5 inline" /> : null}
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={`px-6 py-4 ${isEn ? "text-right" : "text-left"}`}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedTx(tx)}
                          className="h-8 px-3 rounded-lg text-primary hover:bg-primary/10 gap-1.5 font-bold text-xs"
                        >
                          <Receipt className="w-4 h-4" />
                          {isEn ? "View" : "عرض"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>
        </div>

        {/* Right Total Card & Security Card */}
        <div className="space-y-8">
          <Card className="rounded-[1.5rem] shadow-xl border-primary/20 bg-gradient-to-br from-primary via-primary/95 to-indigo-700 text-white overflow-hidden relative">
             <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none"></div>
             <CardHeader className="relative z-10 pb-2">
               <div className="flex items-center justify-between">
                 <CardTitle className="text-white/80 text-xs font-semibold uppercase tracking-widest">{isEn ? "Total Due Balance" : "إجمالي المبلغ المستحق"}</CardTitle>
                 <Badge className="bg-white/20 hover:bg-white/30 text-white border-none text-[11px] font-bold">
                   {currInfo.flag} {currency}
                 </Badge>
               </div>
               <div className="text-4xl font-black mt-2 tracking-tighter">
                 {formatCurrency(dueAmount, currency, isEn)}
               </div>
             </CardHeader>
             <CardContent className="space-y-6 relative z-10 pt-2">
               {dueAmount > 0 ? (
                 <>
                   <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/15 space-y-2">
                     <div className="flex justify-between text-sm font-medium">
                       <span className="opacity-90">{isEn ? "Pending Invoice (INV-1025)" : "فاتورة مستحقة (INV-1025)"}</span>
                       <span className="font-bold">{formatCurrency(dueAmount, currency, isEn)}</span>
                     </div>
                     <div className="text-xs text-white/70 flex items-center justify-between">
                       <span>{isEn ? "Full Blood Analysis Examination" : "كشف وتحليل دم شامل بالعيادة"}</span>
                       {currency !== "SAR" && <span className="text-[10px] opacity-80">(Base: 350 SAR)</span>}
                     </div>
                     <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mt-1">
                       <div className="w-full h-full bg-white rounded-full"></div>
                     </div>
                   </div>
                   <Button 
                     onClick={handleOpenPay}
                     className="w-full bg-white text-primary hover:bg-white/90 rounded-2xl py-6 font-bold text-lg shadow-2xl shadow-black/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                   >
                     <Coins className="w-5 h-5" />
                     {isEn ? `Pay ${formatCurrency(dueAmount, currency, isEn)}` : `سداد الفاتورة والدفع الآن`}
                   </Button>
                 </>
               ) : (
                 <div className="p-6 bg-white/10 rounded-2xl backdrop-blur-md border border-white/15 text-center space-y-3">
                   <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto" />
                   <h4 className="font-bold text-lg">{isEn ? "All Clear!" : "لا توجد مستحقات!"}</h4>
                   <p className="text-xs text-white/80 leading-relaxed">
                     {isEn ? "You have no outstanding medical bills at this time." : "لقد قمت بسداد جميع فواتيرك الطبية بنجاح."}
                   </p>
                 </div>
               )}
             </CardContent>
          </Card>
          
          <Card className="rounded-[1.5rem] border-2 border-dashed border-border p-6 text-center space-y-4 bg-card/60">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{isEn ? "Multi-Currency & Security" : "دعم العملات والأمان البنكي"}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                {isEn 
                  ? "All transactions allow instant currency selection and payment method flexibility protected by SSL medical encryption." 
                  : "يتيح النظام اختيار العملة المفضلة وطريقة الدفع السريعة بأمان تام وتشفير بنكي معتمد وفق معايير البنك المركزي السعودي."}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* DIALOG 1: Add New Method */}
      <Dialog open={isAddOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              {isEn ? "Add Payment Method" : "إضافة طريقة دفع جديدة"}
            </DialogTitle>
            <DialogDescription>
              {isEn ? "Choose your method type and enter the account details below." : "اختر نوع طريقة الدفع وأدخل بيانات الوثيقة أو البطاقة بأمان."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddMethod} className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{isEn ? "Method Type" : "نوع طريقة الدفع"}</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="w-full h-11 rounded-xl border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">{isEn ? "Bank Card (Mada / Visa / Mastercard)" : "بطاقة بنكية (مدى / فيزا / ماستر كارد)"}</SelectItem>
                  <SelectItem value="insurance">{isEn ? "Health Insurance Policy" : "وثيقة تأمين صحي"}</SelectItem>
                  <SelectItem value="wallet">{isEn ? "E-Wallet (STC Pay / Apple Pay)" : "محفظة إلكترونية (STC Pay / Apple Pay)"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newType === "card" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{isEn ? "Card Number" : "رقم البطاقة"}</Label>
                  <Input 
                    type="text" 
                    placeholder="4242 4242 4242 4242" 
                    value={newCardNum} 
                    onChange={e => setNewCardNum(e.target.value)}
                    maxLength={19}
                    className="h-11 rounded-xl font-mono border-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{isEn ? "Expiry Date" : "تاريخ الانتهاء"}</Label>
                    <Input 
                      type="text" 
                      placeholder="MM/YY" 
                      value={newExpiry} 
                      onChange={e => setNewExpiry(e.target.value)}
                      maxLength={5}
                      className="h-11 rounded-xl font-mono border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{isEn ? "CVV" : "الرمز السري (CVV)"}</Label>
                    <Input type="password" placeholder="***" maxLength={4} className="h-11 rounded-xl font-mono border-2" />
                  </div>
                </div>
              </>
            )}

            {newType === "insurance" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{isEn ? "Insurance Provider" : "شركة التأمين الصحي"}</Label>
                  <Input 
                    type="text" 
                    placeholder={isEn ? "e.g. Bupa, Tawuniya, Medgulf" : "مثال: بوبا العربية، التعاونية، ميدغلف"}
                    value={newProvider} 
                    onChange={e => setNewProvider(e.target.value)}
                    className="h-11 rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{isEn ? "Policy Number" : "رقم الوثيقة أو العضوية"}</Label>
                  <Input type="text" placeholder="POL-998877" className="h-11 rounded-xl font-mono border-2" />
                </div>
              </>
            )}

            {newType === "wallet" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{isEn ? "Wallet Phone Number" : "رقم الجوال المرتبط بالمحفظة"}</Label>
                <Input 
                  type="tel" 
                  placeholder="05xxxxxxxx" 
                  value={newProvider} 
                  onChange={e => setNewProvider(e.target.value)}
                  className="h-11 rounded-xl font-mono border-2 text-start"
                  dir="ltr"
                />
              </div>
            )}

            <DialogFooter className="pt-4 flex sm:justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl px-5 h-11">
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button type="submit" className="rounded-xl px-6 h-11 font-bold shadow-md">
                {isEn ? "Save Method" : "حفظ طريقة الدفع"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Pay Now Checkout with Currency & Payment Method Selection */}
      <Dialog open={isPayOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-primary">
              <Coins className="w-7 h-7 p-1 bg-primary/10 rounded-xl" />
              {isEn ? "Select Currency & Payment Method" : "اختيار عملة الدفع وسداد الفاتورة"}
            </DialogTitle>
            <DialogDescription>
              {isEn ? "Choose your desired currency and select or add your preferred payment method." : "حدد العملة المفضلة للخصم، ثم اختر وسيلة الدفع المسجلة أو الفورية وسدد بثوانٍ."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-6 max-h-[70vh] overflow-y-auto pe-1">
            {/* Step 1: Currency Selection inside Modal */}
            <div className="bg-secondary/60 p-4 rounded-2xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Globe className="w-4 h-4 text-primary" />
                  {isEn ? "1. Select Payment Currency:" : "1. اختر العملة التي تود الدفع بها:"}
                </Label>
                <Badge className="bg-primary text-white font-bold text-xs">
                  {CURRENCIES[checkoutCurrency]?.flag} {checkoutCurrency}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {Object.values(CURRENCIES).map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCheckoutCurrency(c.code)}
                    className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${checkoutCurrency === c.code ? "border-primary bg-primary/10 font-bold shadow-sm scale-105" : "border-border bg-card hover:border-primary/40 text-muted-foreground"}`}
                  >
                    <span className="text-lg">{c.flag}</span>
                    <span className="text-xs font-black">{c.code} ({c.symbol})</span>
                    <span className="text-[10px] opacity-80">{c.nameAr.split(" ")[0]}</span>
                  </button>
                ))}
              </div>

              <div className="border-t pt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{isEn ? "Total due conversion:" : "المتوجب دفعه بعد تحويل العملة:"}</span>
                <span className="text-lg font-black text-primary">
                  {formatCurrency(dueAmount, checkoutCurrency, isEn)}
                </span>
              </div>
              {checkoutCurrency !== "SAR" && (
                <p className="text-[11px] text-muted-foreground italic">
                  {isEn ? `* Converted from base hospital price (${dueAmount}.00 SAR) at rate 1 SAR = ${CURRENCIES[checkoutCurrency].rate} ${checkoutCurrency}` : `* تم التحويل من السعر الأساسي للمستشفى (${dueAmount}.00 ر.س) وفق سعر الصرف التقريبي.`}
                </p>
              )}
            </div>

            {/* Step 2: Payment Method Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2 text-foreground">
                <CreditCard className="w-4 h-4 text-primary" />
                {isEn ? "2. Select Payment Method & Source:" : "2. اختر وسيلة وطريقة الخصم:"}
              </Label>

              {/* Registered Methods Radio Cards */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-semibold">{isEn ? "Your Saved Methods:" : "طرق الدفع المسجلة بحسابك:"}</p>
                <div className="grid gap-2.5">
                  {methods.map((m) => {
                    const isSelected = checkoutMethodId === m.id && !checkoutCustomType;
                    return (
                      <div 
                        key={m.id} 
                        onClick={() => { setCheckoutMethodId(m.id); setCheckoutCustomType(null); }}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? "border-primary bg-primary/10 shadow-sm font-bold" : "border-border bg-card hover:border-primary/40"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${isSelected ? "bg-primary text-white" : "bg-secondary text-primary"}`}>
                            <m.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-foreground">
                              {m.type} {m.last4 ? `(**** ${m.last4})` : `(${m.provider})`}
                            </div>
                            {m.policyId && <span className="text-xs text-muted-foreground">{m.policyId}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {m.primary && <Badge className="text-[10px] py-0 bg-secondary text-secondary-foreground">{isEn ? "Default" : "الأساسية"}</Badge>}
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground"}`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instant Options / Other Methods */}
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground font-semibold">{isEn ? "Or Pay Immediately via Instant Method:" : "أو الدفع الفوري بوسائل أخرى غير مسجلة:"}</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "apple_pay", label: isEn ? "Apple Pay" : "Apple Pay (دفع سريع)", icon: Smartphone, color: "text-neutral-900 dark:text-white" },
                    { id: "mada_instant", label: isEn ? "Mada Debit Card" : "بطاقة مدى البنكية", icon: CreditCard, color: "text-emerald-600" },
                    { id: "stc_pay", label: isEn ? "STC Pay Wallet" : "محفظة STC Pay", icon: Wallet, color: "text-purple-600" },
                    { id: "cash_reception", label: isEn ? "Cash at Reception" : "الدفع نقداً بالاستقبال", icon: Banknote, color: "text-amber-600" }
                  ].map(opt => {
                    const isSelected = checkoutCustomType === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => { setCheckoutCustomType(opt.id); }}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-2.5 ${isSelected ? "border-primary bg-primary/10 shadow-sm font-bold" : "border-border bg-card hover:border-primary/40 text-muted-foreground"}`}
                      >
                        <opt.icon className={`w-5 h-5 shrink-0 ${opt.color}`} />
                        <span className="text-xs font-bold text-foreground leading-tight">{opt.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-primary ms-auto shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={isProcessing} className="rounded-xl px-5 h-12">
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button onClick={handleConfirmPay} disabled={isProcessing} className="rounded-xl px-8 h-12 font-bold shadow-xl text-base flex items-center gap-2">
              <Coins className="w-5 h-5" />
              {isProcessing ? (isEn ? "Processing Payment..." : "جاري إتمام الخصم...") : (isEn ? `Pay Now (${formatCurrency(dueAmount, checkoutCurrency, isEn)})` : `تأكيد ودفع ${formatCurrency(dueAmount, checkoutCurrency, isEn)}`)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Invoice Receipt Preview */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          {selectedTx && (
            <div className="space-y-6">
              <div className="border-b pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl">
                    +
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-foreground">{isEn ? "Health First Hospital" : "مستشفى صحتك أولاً"}</h3>
                    <p className="text-xs text-muted-foreground">{isEn ? "Official Electronic Medical Receipt" : "إيصال طبي إلكتروني معتمد"}</p>
                  </div>
                </div>
                <Badge variant="outline" className={selectedTx.status === (isEn ? "Paid" : "مدفوع") ? "bg-emerald-50 text-emerald-600 border-emerald-200 px-3 py-1 font-bold" : "bg-amber-50 text-amber-600 border-amber-200 px-3 py-1 font-bold"}>
                  {selectedTx.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-secondary/30 p-4 rounded-2xl border">
                <div>
                  <span className="text-muted-foreground text-xs block">{isEn ? "Invoice Number" : "رقم الفاتورة"}</span>
                  <span className="font-bold font-mono text-foreground">{selectedTx.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">{isEn ? "Date Issued" : "تاريخ الإصدار"}</span>
                  <span className="font-semibold text-foreground">{selectedTx.date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">{isEn ? "Patient Name" : "اسم المريض"}</span>
                  <span className="font-semibold text-foreground">{patientName || (isEn ? "Valued Patient" : "مريض تجريبي")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">{isEn ? "Payment Method" : "طريقة الخصم"}</span>
                  <span className="font-bold text-primary">{selectedTx.paidMethod || (isEn ? "Electronic Card" : "بطاقة إلكترونية")}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{isEn ? "Service Breakdown" : "تفاصيل الخدمة المقدمة"}</h4>
                <div className="p-4 rounded-2xl border border-border bg-card flex justify-between items-center">
                  <div>
                    <div className="font-bold text-foreground">{selectedTx.service}</div>
                    <div className="text-xs text-muted-foreground">{isEn ? "Medical consultation / diagnostic procedure" : "خدمة طبية استشارية / تشخيصية"}</div>
                  </div>
                  <div className="text-end">
                    <div className="font-black text-lg text-primary">
                      {formatCurrency(selectedTx.amount, selectedTx.paidCurrency || currency, isEn)}
                    </div>
                    {selectedTx.paidCurrency && selectedTx.paidCurrency !== "SAR" && (
                      <div className="text-[11px] text-muted-foreground">({selectedTx.amount.toFixed(2)} ر.س)</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{isEn ? "Subtotal:" : "المبلغ الأساسي (قبل الضريبة):"}</span>
                  <span>{formatCurrency(selectedTx.amount * 0.87, selectedTx.paidCurrency || currency, isEn)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{isEn ? "VAT (15% included):" : "ضريبة القيمة المضافة (15%):"}</span>
                  <span>{formatCurrency(selectedTx.amount * 0.13, selectedTx.paidCurrency || currency, isEn)}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-foreground pt-2 border-t">
                  <span>{isEn ? "Total Paid Amount:" : "الإجمالي المدفوع المعتمد:"}</span>
                  <span className="text-primary">{formatCurrency(selectedTx.amount, selectedTx.paidCurrency || currency, isEn)}</span>
                </div>
              </div>

              <DialogFooter className="flex sm:justify-between gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelectedTx(null)} className="rounded-xl px-5 h-11">
                  {isEn ? "Close" : "إغلاق الإيصال"}
                </Button>
                <Button onClick={() => window.print()} className="rounded-xl px-6 h-11 font-bold gap-2">
                  <Printer className="w-4 h-4" />
                  {isEn ? "Print Receipt" : "طباعة الإيصال"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =========================================================
   2. DOCTOR PAYMENTS VIEW (With Currency Support)
   ========================================================= */
function DoctorPaymentsView({ isEn, doctorName, currency, setCurrency }: { isEn: boolean; doctorName: string; currency: string; setCurrency: (c: string) => void }) {
  const { toast } = useToast();
  const currInfo = CURRENCIES[currency] || CURRENCIES.SAR;

  const { data: appointments = [] } = useAppointments();
  const { data: services = [] } = useServices();
  const { data: clinics = [] } = useClinics();

  const getApptPrice = (clinicId: number) => {
    const srv = services.find(s => s.clinicId === clinicId);
    return srv ? srv.price : 200;
  };

  const completedAppts = appointments.filter(a => a.status === 'completed' || a.status === 'confirmed');
  const totalConsultationsRevenue = completedAppts.reduce((sum, a) => sum + getApptPrice(a.clinicId), 0);
  const pendingTransfer = appointments.filter(a => a.status === 'pending').reduce((sum, a) => sum + getApptPrice(a.clinicId), 0);

  const earningsStats = [
    { label: isEn ? "Total Consultations Revenue" : "إجمالي إيرادات الكشوفات", baseVal: totalConsultationsRevenue, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
    { label: isEn ? "Pending Hospital Transfer" : "مستحقات قيد التحويل البنكي", baseVal: pendingTransfer, icon: History, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40" },
    { label: isEn ? "Consultations Completed" : "عدد الكشوفات المنجزة", textVal: String(completedAppts.length), icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40" }
  ];

  const doctorTransactions = appointments.map((appt) => {
    const srv = services.find(s => s.clinicId === appt.clinicId);
    const cln = clinics.find(c => c.id === appt.clinicId);
    const fee = getApptPrice(appt.clinicId);
    const netAmount = Math.round(fee * 0.8); // 80% doctor share
    const isPaid = appt.status === 'completed' || appt.status === 'confirmed';
    const dateStr = new Date(appt.datetime).toLocaleDateString(isEn ? "en-US" : "ar-SA");
    return {
      id: `INV-${appt.id + 2000}`,
      patient: `مريض #${appt.patientId}`,
      date: dateStr,
      service: srv?.name || cln?.name || (isEn ? "Clinic Consultation" : "كشف استشارة طبية"),
      fee: fee,
      netAmount: netAmount,
      status: isPaid ? (isEn ? "Transferred" : "تم التحويل") : (isEn ? "Pending Payout" : "قيد الصرف")
    };
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10" dir={isEn ? "ltr" : "rtl"}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary p-1 bg-primary/10 rounded-xl" />
            {isEn ? "Doctor Financial Dashboard" : "لوحة الإيرادات والمستحقات الخاصة بالطبيب"}
          </h1>
          <p className="text-muted-foreground">{isEn ? `Welcome Dr. ${doctorName}. Review your consultation revenue and upcoming hospital settlements.` : `مرحباً بك يا دكتور/ة ${doctorName || ""}. متابعة أرباح الكشوفات وجدول التحويلات البنكية من إدارة المستشفى.`}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-secondary/60 p-2 rounded-2xl border">
            <Globe className="w-4 h-4 text-primary ms-2" />
            <span className="text-xs font-bold text-muted-foreground">{isEn ? "Currency:" : "العملة:"}</span>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-36 h-9 rounded-xl bg-card border-2 font-bold text-primary text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CURRENCIES).map((c) => (
                  <SelectItem key={c.code} value={c.code} className="text-xs font-semibold">
                    {c.flag} {c.code} ({c.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant="outline" 
            onClick={() => toast({ title: isEn ? "Requested" : "تم إرسال الطلب", description: isEn ? "Your statement is being emailed to you." : "تم إرسال كشف الحساب الشهري إلى بريدك الإلكتروني." })}
            className="rounded-xl px-5 h-10 font-semibold text-xs"
          >
            <Printer className="w-4 h-4 me-1.5" />
            {isEn ? "Monthly Statement" : "كشف حساب شهري"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {earningsStats.map((stat, i) => (
          <Card key={i} className="rounded-2xl border-2 shadow-sm hover:shadow-md transition-all overflow-hidden">
            <CardContent className="p-6">
               <div className="flex items-center justify-between mb-4">
                 <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                   <stat.icon className="w-6 h-6" />
                 </div>
               </div>
               <h3 className="text-muted-foreground text-sm font-semibold mb-1">{stat.label}</h3>
               <div className="text-3xl font-black text-foreground">
                 {stat.baseVal !== undefined ? formatCurrency(stat.baseVal, currency, isEn) : stat.textVal}
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl shadow-sm border-2 overflow-hidden bg-card">
            <CardHeader className="bg-secondary/40 pb-4 border-b flex justify-between items-center flex-row">
              <CardTitle className="text-xl flex items-center gap-2">
                <History className="w-5 h-5 text-primary" /> 
                {isEn ? "Recent Consultations Payout Log" : "سجل مستحقات الكشوفات الأخيرة"}
              </CardTitle>
              <Badge variant="outline" className="text-xs font-bold">{currInfo.flag} {currency}</Badge>
            </CardHeader>
            <Table dir={isEn ? "ltr" : "rtl"}>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-secondary/20 text-xs">
                  <TableHead className="py-4 px-6">{isEn ? "Invoice" : "الفاتورة"}</TableHead>
                  <TableHead className="py-4 px-6">{isEn ? "Patient" : "المريض"}</TableHead>
                  <TableHead className="py-4 px-6">{isEn ? "Date" : "التاريخ"}</TableHead>
                  <TableHead className="py-4 px-6">{isEn ? "Fee" : "قيمة الكشف"}</TableHead>
                  <TableHead className="py-4 px-6">{isEn ? "Net Share" : "صافي مستحقك"}</TableHead>
                  <TableHead className="py-4 px-6">{isEn ? "Status" : "الحالة"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctorTransactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-secondary/20 transition-colors">
                    <TableCell className="font-bold px-6 py-4">{tx.id}</TableCell>
                    <TableCell className="font-medium px-6 py-4">{tx.patient}</TableCell>
                    <TableCell className="text-muted-foreground px-6 py-4 text-sm">{tx.date}</TableCell>
                    <TableCell className="px-6 py-4 font-semibold">{formatCurrency(tx.fee, currency, isEn)}</TableCell>
                    <TableCell className="font-black px-6 py-4 text-primary">{formatCurrency(tx.netAmount, currency, isEn)}</TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant="outline" className={tx.status === (isEn ? "Transferred" : "تم التحويل") ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 px-3 py-1 font-semibold" : "bg-amber-500/10 text-amber-600 border-amber-200 px-3 py-1 font-semibold"}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-2 border-border p-6 space-y-4 bg-card shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{isEn ? "Payout Account Details" : "حساب التحويل البنكي المعتمد"}</h3>
                <p className="text-xs text-muted-foreground">{isEn ? "Hospital monthly transfers target" : "يتم تحويل المستحقات شهرياً لهذا الحساب"}</p>
              </div>
            </div>
            <div className="bg-secondary/50 p-4 rounded-2xl border space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isEn ? "Bank Name:" : "البنك:"}</span>
                <span className="font-bold">{isEn ? "Saudi National Bank (SNB)" : "البنك الأهلي السعودي (SNB)"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isEn ? "Account Name:" : "اسم المستفيد:"}</span>
                <span className="font-semibold">{doctorName || "د. سارة أحمد"}</span>
              </div>
              <div className="flex justify-between font-mono pt-1 border-t">
                <span className="text-muted-foreground">{isEn ? "IBAN:" : "الآيبان (IBAN):"}</span>
                <span className="font-bold text-primary">SA83 1000 0004 9210 ****</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => toast({ title: isEn ? "Update Request" : "طلب تحديث الحساب", description: isEn ? "Please contact HR or Admin to modify bank accounts." : "لتغيير رقم الآيبان البنكي، يرجى التواصل مع إدارة الموارد البشرية بالمستشفى لدواعي الأمان." })}
              className="w-full rounded-xl py-5 text-sm"
            >
              {isEn ? "Update Bank Details" : "طلب تغيير الحساب البنكي"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   3. ADMIN PAYMENTS VIEW (With Currency Support)
   ========================================================= */
function AdminPaymentsView({ isEn, currency, setCurrency }: { isEn: boolean; currency: string; setCurrency: (c: string) => void }) {
  const { toast } = useToast();
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const currInfo = CURRENCIES[currency] || CURRENCIES.SAR;

  const { data: appointments = [] } = useAppointments();
  const { data: services = [] } = useServices();
  const { data: clinics = [] } = useClinics();

  const getApptPrice = (clinicId: number) => {
    const srv = services.find(s => s.clinicId === clinicId);
    return srv ? srv.price : 200;
  };

  const totalRevenue = appointments
    .filter(a => a.status === 'completed' || a.status === 'confirmed')
    .reduce((sum, a) => sum + getApptPrice(a.clinicId), 0);

  const pendingRevenue = appointments
    .filter(a => a.status === 'pending')
    .reduce((sum, a) => sum + getApptPrice(a.clinicId), 0);

  const successfulCount = appointments.filter(a => a.status === 'completed' || a.status === 'confirmed').length;

  const stats = [
    { label: isEn ? "Total Revenue" : "إجمالي إيرادات النظام", baseVal: totalRevenue, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
    { label: isEn ? "Pending Payments" : "مدفوعات قيد التحصيل", baseVal: pendingRevenue, icon: History, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40" },
    { label: isEn ? "Total Transactions" : "العمليات الناجحة", textVal: String(successfulCount), icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40" }
  ];

  const adminTransactions = appointments.map((appt) => {
    const srv = services.find(s => s.clinicId === appt.clinicId);
    const cln = clinics.find(c => c.id === appt.clinicId);
    const amount = getApptPrice(appt.clinicId);
    const isPaid = appt.status === 'completed' || appt.status === 'confirmed';
    const dateStr = new Date(appt.datetime).toLocaleDateString(isEn ? "en-US" : "ar-SA");
    return {
      id: `INV-${appt.id + 1000}`,
      patient: `مريض رقم ${appt.patientId}`,
      date: dateStr,
      service: srv?.name || cln?.name || (isEn ? "Clinic Consultation" : "كشف استشارة"),
      amount: amount,
      status: isPaid ? (isEn ? "Paid" : "مدفوع") : appt.status === 'cancelled' ? (isEn ? "Cancelled" : "ملغي") : (isEn ? "Pending" : "قيد الانتظار"),
      paidMethod: isPaid ? (isEn ? "Electronic Payment" : "دفع إلكتروني مٌؤكد") : (isEn ? "Pending" : "قيد الانتظار")
    };
  });

  const handleExport = () => {
    toast({
      title: isEn ? "Report Exported Successfully!" : "تم تصدير التقرير المالي بنجاح!",
      description: isEn ? `Hospital revenue spreadsheet (XLSX) downloaded in ${currency}.` : `تم تنزيل ملف التقرير المالي الشامل (XLSX) لإيرادات المستشفى بعملة (${currInfo.symbol}).`,
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10" dir={isEn ? "ltr" : "rtl"}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Wallet className="text-primary w-8 h-8 p-1 bg-primary/10 rounded-xl" />
            {isEn ? "Financial Dashboard" : "لوحة الرقابة المالية وإدارة الخزينة"}
          </h1>
          <p className="text-muted-foreground">{isEn ? "Track hospital financial performance and patient payments." : "متابعة الأداء المالي لمستشفاك وإجمالي مدفوعات المرضى ومستحقات الأطباء."}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-secondary/60 p-2 rounded-2xl border">
            <Globe className="w-4 h-4 text-primary ms-2" />
            <span className="text-xs font-bold text-muted-foreground">{isEn ? "Report Currency:" : "عملة التقرير:"}</span>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-36 h-9 rounded-xl bg-card border-2 font-bold text-primary text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CURRENCIES).map((c) => (
                  <SelectItem key={c.code} value={c.code} className="text-xs font-semibold">
                    {c.flag} {c.code} ({c.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleExport} className="rounded-xl px-6 h-10 font-bold shadow-lg gap-2 text-xs">
            <ArrowUpRight className="w-4 h-4" />
            {isEn ? "Export Excel Report" : "تصدير التقرير المالي (Excel)"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="rounded-3xl border-2 shadow-sm hover:shadow-md transition-all overflow-hidden">
            <CardContent className="p-6">
               <div className="flex items-center justify-between mb-4">
                 <div className={`p-3.5 rounded-2xl ${stat.bg} ${stat.color}`}>
                   <stat.icon className="w-7 h-7" />
                 </div>
               </div>
               <h3 className="text-muted-foreground text-sm font-semibold mb-1">{stat.label}</h3>
               <div className="text-3xl font-black text-foreground">
                 {stat.baseVal !== undefined ? formatCurrency(stat.baseVal, currency, isEn) : stat.textVal}
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl shadow-sm border-2 overflow-hidden bg-card">
        <CardHeader className="bg-secondary/40 pb-4 border-b flex flex-row justify-between items-center">
          <CardTitle className="text-xl flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> 
            {isEn ? "Recent System Transactions" : "أحدث العمليات في النظام"}
          </CardTitle>
          <span className="text-xs text-muted-foreground font-semibold">{isEn ? "All departments" : "جميع عيادات المستشفى"}</span>
        </CardHeader>
        <Table dir={isEn ? "ltr" : "rtl"}>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-secondary/20 text-xs">
              <TableHead className="py-4 px-6">{isEn ? "Invoice ID" : "رقم الفاتورة"}</TableHead>
              <TableHead className="py-4 px-6">{isEn ? "Patient Name" : "اسم المريض"}</TableHead>
              <TableHead className="py-4 px-6">{isEn ? "Date" : "التاريخ"}</TableHead>
              <TableHead className="py-4 px-6">{isEn ? "Service" : "الخدمة"}</TableHead>
              <TableHead className="py-4 px-6">{isEn ? "Amount" : "المبلغ المفترى"}</TableHead>
              <TableHead className="py-4 px-6">{isEn ? "Paid Via" : "وسيلة الدفع"}</TableHead>
              <TableHead className="py-4 px-6">{isEn ? "Status" : "الحالة"}</TableHead>
              <TableHead className={`py-4 px-6 ${isEn ? "text-right" : "text-left"}`}>{isEn ? "Action" : "الإيصال"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adminTransactions.map((tx) => (
              <TableRow key={tx.id} className="transition-colors hover:bg-secondary/20">
                <TableCell className="font-bold px-6 py-4">{tx.id}</TableCell>
                <TableCell className="font-medium px-6 py-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary shrink-0" />
                  {tx.patient}
                </TableCell>
                <TableCell className="text-muted-foreground px-6 py-4 text-sm">{tx.date}</TableCell>
                <TableCell className="font-medium px-6 py-4">{tx.service}</TableCell>
                <TableCell className="font-black px-6 py-4 text-primary">{formatCurrency(tx.amount, currency, isEn)}</TableCell>
                <TableCell className="px-6 py-4 text-xs text-muted-foreground font-semibold">
                  {tx.paidMethod || (isEn ? "Unpaid" : "غير مدفوع")}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge variant="outline" className={tx.status === (isEn ? "Paid" : "مدفوع") ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 px-3 py-1 font-semibold" : "bg-amber-500/10 text-amber-600 border-amber-200 px-3 py-1 font-semibold"}>
                    {tx.status}
                  </Badge>
                </TableCell>
                <TableCell className={`px-6 py-4 ${isEn ? "text-right" : "text-left"}`}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedTx(tx)}
                    className="h-8 px-3 rounded-lg text-primary hover:bg-primary/10 gap-1 font-bold text-xs"
                  >
                    <Receipt className="w-4 h-4" />
                    {isEn ? "Receipt" : "إيصال"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Admin Invoice Preview Modal */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          {selectedTx && (
            <div className="space-y-6">
              <div className="border-b pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl">
                    +
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-foreground">{isEn ? "Health First Hospital" : "مستشفى صحتك أولاً"}</h3>
                    <p className="text-xs text-muted-foreground">{isEn ? "Admin Audit Electronic Receipt" : "إيصال تدقيق مالي وإداري"}</p>
                  </div>
                </div>
                <Badge variant="outline" className={selectedTx.status === (isEn ? "Paid" : "مدفوع") ? "bg-emerald-50 text-emerald-600 border-emerald-200 px-3 py-1 font-bold" : "bg-amber-50 text-amber-600 border-amber-200 px-3 py-1 font-bold"}>
                  {selectedTx.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-secondary/30 p-4 rounded-2xl border">
                <div>
                  <span className="text-muted-foreground text-xs block">{isEn ? "Invoice Number" : "رقم الفاتورة"}</span>
                  <span className="font-bold font-mono text-foreground">{selectedTx.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">{isEn ? "Patient Name" : "المريض"}</span>
                  <span className="font-semibold text-foreground">{selectedTx.patient}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">{isEn ? "Service" : "الخدمة"}</span>
                  <span className="font-semibold text-foreground">{selectedTx.service}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">{isEn ? "Amount" : "المبلغ"}</span>
                  <span className="font-black text-primary">{formatCurrency(selectedTx.amount, currency, isEn)}</span>
                </div>
              </div>

              <DialogFooter className="flex sm:justify-between gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelectedTx(null)} className="rounded-xl px-5 h-11">
                  {isEn ? "Close" : "إغلاق"}
                </Button>
                <Button onClick={() => window.print()} className="rounded-xl px-6 h-11 font-bold gap-2">
                  <Printer className="w-4 h-4" />
                  {isEn ? "Print Receipt" : "طباعة الإيصال"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}