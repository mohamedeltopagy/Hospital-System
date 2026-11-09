import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { usePrescriptions } from "@/hooks/use-records";
import { useServices, useCreateService, useUpdateService, useDeleteService } from "@/hooks/use-clinics";
import { 
  Pill, CheckCircle2, Clock, Settings2, Plus, Trash2, Edit3, DollarSign, 
  Truck, MapPin, Phone, User, ShoppingBag, Send, AlertCircle, XCircle, 
  Package, ChevronRight, MessageSquare, Check, Bike
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { arEG } from "date-fns/locale";
import { useLocation } from "wouter";

interface PharmacyOrder {
  id: number;
  patientId: number;
  patientName: string;
  patientPhone: string;
  medicationNames: string;
  prescriptionId: number | null;
  deliveryAddress: string;
  deliveryNotes: string | null;
  paymentMethod: string;
  totalAmount: number;
  status: "pending" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
  orderDate: string;
}

export default function PharmacyPage() {
  const { data: user } = useUser();
  const { data: prescriptions, isLoading: isLoadingPrescriptions } = usePrescriptions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  const [activeTab, setActiveTab] = useState("prescriptions");

  // Fetch Pharmacy Delivery Orders
  const { data: pharmacyOrders, isLoading: isLoadingOrders } = useQuery<PharmacyOrder[]>({
    queryKey: ["/api/pharmacy/orders"],
    queryFn: async () => {
      const res = await fetch("/api/pharmacy/orders");
      if (!res.ok) throw new Error("Failed to fetch pharmacy orders");
      return res.json();
    }
  });

  // Services (Medications in Catalog)
  const { data: services, isLoading: isLoadingServices } = useServices(null, "pharmacy");
  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();

  // Manage Services Dialog (Admin)
  const [isServiceOpen, setServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");

  // Home Delivery Dialog State
  const [isDeliveryOpen, setDeliveryOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [orderMedication, setOrderMedication] = useState("");
  const [orderAddress, setOrderAddress] = useState("");
  const [orderPhone, setOrderPhone] = useState(user?.phone || "");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderPaymentMethod, setOrderPaymentMethod] = useState("cash_on_delivery");
  const [orderPrice, setOrderPrice] = useState<number>(0);
  const DELIVERY_FEE = 20;

  // Open delivery modal for a specific prescription
  const handleOpenDeliveryForPrescription = (prescription: any) => {
    setSelectedPrescription(prescription);
    setOrderMedication(`${prescription.medicationName} (${prescription.dosage} - ${prescription.frequency})`);
    setOrderAddress(user?.bio || "");
    setOrderPhone(user?.phone || "");
    setOrderNotes(prescription.notes || "");
    
    // Check if medication matches a service price, otherwise default to standard
    const matchedService = services?.find(s => s.name.toLowerCase().includes(prescription.medicationName.toLowerCase()));
    setOrderPrice(matchedService ? matchedService.price : 45);
    setDeliveryOpen(true);
  };

  // Open generic home delivery modal (any medication)
  const handleOpenGeneralDelivery = () => {
    setSelectedPrescription(null);
    setOrderMedication("");
    setOrderAddress("");
    setOrderPhone(user?.phone || "");
    setOrderNotes("");
    setOrderPrice(services && services.length > 0 ? services[0].price : 30);
    setDeliveryOpen(true);
  };

  // Mutation: Create Home Delivery Order
  const createOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/pharmacy/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create order");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      setDeliveryOpen(false);
      toast({
        title: isEn ? "Delivery Order Created! 🛵" : "تم استلام طلب التوصيل بنجاح! 🛵",
        description: isEn 
          ? `Order #${data.id} is confirmed. A WhatsApp notification was dispatched to ${data.patientPhone}.`
          : `تم تأكيد طلبك رقم #${data.id}. أرسلنا رسالة تفاصيل الحجز للمندوب على الواتساب.`
      });
      setActiveTab("orders");
    },
    onError: (err: any) => {
      toast({
        title: isEn ? "Order Error" : "خطأ في إنشاء الطلب",
        description: err.message,
        variant: "destructive"
      });
    }
  });

  // Mutation: Update Delivery Order Status (Admin)
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/pharmacy/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update order status");
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      const statusLabels: Record<string, string> = {
        preparing: isEn ? "Order is being prepared" : "جاري تحضير الأدوية من الصيدلية 📦",
        out_for_delivery: isEn ? "Out for delivery (WhatsApp sent!)" : "خرج مع المندوب وفي الطريق للعميل 🛵",
        delivered: isEn ? "Delivered successfully" : "تم تسليم الدواء للعميل بنجاح ✅",
        cancelled: isEn ? "Order cancelled" : "تم إلغاء الطلب ❌"
      };
      toast({
        title: isEn ? "Order Updated" : "تم تحديث حالة الطلب",
        description: statusLabels[updated.status] || isEn ? "Status updated" : "تم التحديث"
      });
    }
  });

  // Mutation: Cancel Order
  const cancelOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/pharmacy/orders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to cancel order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/orders"] });
      toast({
        title: isEn ? "Order Cancelled" : "تم إلغاء الطلب",
        description: isEn ? "Your delivery request was cancelled." : "تم إلغاء طلب التوصيل بنجاح."
      });
    }
  });

  // Submit Home Delivery Form
  const handleSubmitDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderMedication.trim() || !orderAddress.trim() || !orderPhone.trim()) {
      toast({
        title: isEn ? "Missing Information" : "بيانات ناقصة",
        description: isEn ? "Please fill medication name, delivery address, and phone number." : "يرجى كتابة اسم الدواء وعنوان التوصيل ورقم الهاتف بالكامل.",
        variant: "destructive"
      });
      return;
    }

    createOrderMutation.mutate({
      medicationNames: orderMedication,
      prescriptionId: selectedPrescription ? selectedPrescription.id : null,
      deliveryAddress: orderAddress,
      deliveryPhone: orderPhone,
      deliveryNotes: orderNotes,
      paymentMethod: orderPaymentMethod,
      totalAmount: orderPrice + DELIVERY_FEE
    });
  };

  // Prescription direct dispensing (Admin)
  const updatePrescriptionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/prescriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update prescription");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      toast({
        title: isEn ? "Status Updated" : "تم التحديث",
        description: isEn ? "Prescription status updated." : "تم تحديث حالة الروشتة بنجاح."
      });
    }
  });

  const handleDispense = (id: number) => {
    if (confirm(isEn ? "Mark this prescription as dispensed?" : "هل أنت متأكد من صرف هذا الدواء؟")) {
      updatePrescriptionMutation.mutate({ id, status: 'dispensed' });
    }
  };

  // Medication Catalog Add/Edit/Delete
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName || !newServicePrice) {
      toast({ title: isEn ? "Error" : "تنبيه", description: isEn ? "Please fill all fields" : "يرجى تعبئة الحقول", variant: "destructive" });
      return;
    }
    try {
      if (editingService) {
        await updateServiceMutation.mutateAsync({
          id: editingService.id,
          data: {
            name: newServiceName,
            price: Number(newServicePrice),
            description: newServiceDesc || undefined,
          }
        });
        toast({ title: isEn ? "Updated" : "تم التحديث", description: isEn ? "Medication updated" : "تم تحديث الدواء" });
        setEditingService(null);
      } else {
        await createServiceMutation.mutateAsync({
          category: "pharmacy",
          name: newServiceName,
          price: Number(newServicePrice),
          description: newServiceDesc || undefined,
        } as any);
        toast({ title: isEn ? "Added" : "تمت الإضافة", description: isEn ? "Medication added" : "تم إضافة الدواء للقائمة" });
      }
      setNewServiceName("");
      setNewServicePrice("");
      setNewServiceDesc("");
    } catch (err) {
      toast({ title: "Error", description: "Failed to save service", variant: "destructive" });
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm(isEn ? "Delete this medication?" : "حذف هذا الدواء من القائمة؟")) return;
    try {
      await deleteServiceMutation.mutateAsync(id);
      toast({ title: isEn ? "Deleted" : "تم الحذف", description: isEn ? "Medication removed" : "تم حذف الدواء" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const activeOrdersCount = pharmacyOrders?.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length || 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8" dir={isEn ? "ltr" : "rtl"}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-2xl shadow-sm">
              <Pill className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
                {isEn ? "Hospital Pharmacy & Home Delivery" : "صيدلية المستشفى وخدمة التوصيل المنزلي"}
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  <Truck className="w-3.5 h-3.5" /> 24/7 Delivery
                </span>
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                {user?.role === 'patient' 
                  ? (isEn ? "Order your prescribed medications directly to your home with real-time tracking." : "اطلب أدويتك والروشتات الطبية مباشرة إلى باب منزلك مع إشعارات الواتساب والمتابعة الفورية.")
                  : (isEn ? "Manage prescriptions, medicine catalog, and home delivery dispatch center." : "مركز إدارة الروشتات، تسعير الأدوية، ومتابعة مناديب التوصيل للمنازل.")}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {user?.role === 'patient' && (
            <Button 
              onClick={handleOpenGeneralDelivery} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
            >
              <Truck className="w-5 h-5" />
              {isEn ? "Order Medicine to Home" : "طلب علاج للبيت 🛵"}
            </Button>
          )}

          {user?.role === 'admin' && (
            <Button 
              onClick={() => setServiceOpen(true)} 
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/5 font-semibold gap-2 rounded-xl"
            >
              <Settings2 className="w-4 h-4" />
              {isEn ? "Manage Medication Prices" : "إدارة تسعير الأدوية"}
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/60 p-1.5 rounded-2xl w-full sm:w-auto grid grid-cols-2">
          <TabsTrigger value="prescriptions" className="rounded-xl font-bold py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-2">
            <Pill className="w-4 h-4 text-emerald-600" />
            {isEn ? "Prescriptions" : "الروشتات الطبية"}
            {prescriptions && prescriptions.length > 0 && (
              <Badge variant="secondary" className="text-xs px-2 py-0 h-5">
                {prescriptions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-xl font-bold py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            {isEn ? "Home Delivery Orders" : "طلبات التوصيل للمنازل"}
            {activeOrdersCount > 0 && (
              <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-xs px-2 py-0 h-5 animate-pulse">
                {activeOrdersCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* --- Tab 1: Prescriptions --- */}
        <TabsContent value="prescriptions" className="space-y-6 mt-0">
          {isLoadingPrescriptions ? (
            <div className="p-12 text-center text-muted-foreground">{isEn ? "Loading prescriptions..." : "جاري تحميل الروشتات الطبية..."}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {prescriptions?.map((p: any) => {
                const hasDeliveryRequested = p.deliveryStatus === 'requested' || p.deliveryStatus === 'out_for_delivery';
                const isDispensed = p.status === 'dispensed';

                return (
                  <Card key={p.id} className={`border-2 shadow-sm rounded-2xl transition-all hover:shadow-md ${isDispensed ? 'border-emerald-100 dark:border-emerald-950/40 opacity-80' : 'border-blue-100 dark:border-blue-900/40'}`}>
                    <CardHeader className={`${isDispensed ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : 'bg-blue-50/40 dark:bg-blue-950/20'} pb-4 rounded-t-2xl`}>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                            <Pill className="w-5 h-5 text-emerald-600" />
                            {p.medicationName}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {format(new Date(p.date), 'dd MMMM yyyy', { locale: isEn ? undefined : arEG })}
                          </CardDescription>
                        </div>

                        {isDispensed ? (
                          <Badge variant="outline" className="bg-emerald-100/80 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 font-semibold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isEn ? "Dispensed" : "تم الصرف"}
                          </Badge>
                        ) : hasDeliveryRequested ? (
                          <Badge className="bg-blue-600 text-white flex items-center gap-1 font-semibold text-xs animate-pulse">
                            <Bike className="w-3.5 h-3.5" />
                            {isEn ? "Out for Delivery" : "جاري التوصيل 🛵"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-100/80 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 font-semibold text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            {isEn ? "Prescribed" : "جاهز للصرف"}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm bg-secondary/30 p-3.5 rounded-xl border border-secondary">
                        <div>
                          <span className="text-muted-foreground text-xs block">{isEn ? "Dosage" : "الجرعة"}</span>
                          <span className="font-bold text-foreground">{p.dosage}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs block">{isEn ? "Frequency" : "التكرار"}</span>
                          <span className="font-bold text-foreground">{p.frequency}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground text-xs block">{isEn ? "Duration" : "مدة العلاج"}</span>
                          <span className="font-medium text-foreground">{p.duration}</span>
                        </div>
                        {p.notes && (
                          <div className="col-span-2 text-xs text-muted-foreground pt-1 border-t">
                            <span className="font-semibold block">{isEn ? "Notes" : "تعليمات الطبيب"}:</span>
                            {p.notes}
                          </div>
                        )}
                      </div>

                      {/* Delivery Address Tag if requested */}
                      {p.deliveryAddress && (
                        <div className="text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-lg flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                          <div>
                            <span className="font-bold block">{isEn ? "Delivery Address:" : "عنوان التوصيل المطلوب:"}</span>
                            <span>{p.deliveryAddress}</span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-2 border-t">
                        {user?.role === 'patient' && !isDispensed && (
                          <div className="flex flex-col gap-2">
                            <Button 
                              onClick={() => handleOpenDeliveryForPrescription(p)} 
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2 h-10 shadow-sm transition-transform hover:scale-[1.01]"
                            >
                              <Truck className="w-4 h-4" />
                              {hasDeliveryRequested 
                                ? (isEn ? "Update Delivery Address" : "تعديل طلب التوصيل 🛵") 
                                : (isEn ? "Order Delivery to Home" : "طلب توصيل هذه الروشتة للمنزل 🛵")}
                            </Button>
                            
                            <Button 
                              onClick={() => setLocation("/payments")} 
                              variant="outline" 
                              className="w-full border-primary/20 text-primary hover:bg-primary/5 rounded-xl h-9 text-xs font-semibold gap-1.5"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              {isEn ? "Pay Online" : "سداد القيمة أونلاين"}
                            </Button>
                          </div>
                        )}

                        {user?.role === 'admin' && !isDispensed && (
                          <Button 
                            onClick={() => handleDispense(p.id)} 
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold h-10 rounded-xl shadow-md transition-all"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {isEn ? "Confirm Dispensing" : "تأكيد الصرف المباشر"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {prescriptions?.length === 0 && (
                <div className="col-span-full py-16 text-center border-2 border-dashed rounded-3xl bg-card text-muted-foreground">
                  <Pill className="w-16 h-16 mx-auto mb-3 opacity-20 text-emerald-600" />
                  <p className="text-lg font-bold text-foreground">{isEn ? "No prescriptions found." : "لا توجد روشتات مسجلة حالياً."}</p>
                  <p className="text-sm mt-1">{isEn ? "When your doctor prescribes medications, they will appear here." : "ستظهر هنا الوصفات الدوائية بمجرد أن يحررها الطبيب في الكشف."}</p>
                  {user?.role === 'patient' && (
                    <Button onClick={handleOpenGeneralDelivery} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2">
                      <Truck className="w-4 h-4" />
                      {isEn ? "Order Any Medication to Home" : "طلب أي دواء وتوصيله للمنزل 🛵"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* --- Tab 2: Home Delivery Orders --- */}
        <TabsContent value="orders" className="space-y-6 mt-0">
          <div className="flex justify-between items-center bg-secondary/30 p-4 rounded-2xl border">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-foreground text-lg">
                {isEn ? "Active & Past Delivery Orders" : "سجل ومتابعة طلبات التوصيل المنزلي"}
              </h2>
            </div>
            {user?.role === 'patient' && (
              <Button onClick={handleOpenGeneralDelivery} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5">
                <Plus className="w-4 h-4" />
                {isEn ? "New Delivery Order" : "طلب جديد"}
              </Button>
            )}
          </div>

          {isLoadingOrders ? (
            <div className="p-12 text-center text-muted-foreground">{isEn ? "Loading orders..." : "جاري تحميل الطلبات..."}</div>
          ) : pharmacyOrders?.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed rounded-3xl bg-card text-muted-foreground">
              <Truck className="w-16 h-16 mx-auto mb-3 opacity-20 text-primary" />
              <p className="text-lg font-bold text-foreground">{isEn ? "No home delivery orders yet." : "لم يتم تقديم أي طلبات توصيل للمنزل بعد."}</p>
              <p className="text-sm mt-1">{isEn ? "Request your medicines and our delivery heroes will deliver to your doorstep." : "اطلب علاجك وسيقوم مندوب صيدلية المستشفى بتوصيله مباشرة لعنوانك."}</p>
              {user?.role === 'patient' && (
                <Button onClick={handleOpenGeneralDelivery} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2">
                  <Truck className="w-4 h-4" />
                  {isEn ? "Order Medicine Now" : "طلب دواء للبيت الآن 🛵"}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pharmacyOrders?.map((order) => {
                // Stepper index
                const statusStep = 
                  order.status === 'pending' ? 1 :
                  order.status === 'preparing' ? 2 :
                  order.status === 'out_for_delivery' ? 3 :
                  order.status === 'delivered' ? 4 : 0;

                return (
                  <Card key={order.id} className="border-2 border-border shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
                    {/* Header */}
                    <div className="p-4 bg-secondary/40 border-b flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-primary text-base">#{order.id}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(order.orderDate), 'dd/MM/yyyy - hh:mm a', { locale: isEn ? undefined : arEG })}
                        </span>
                      </div>
                      
                      {order.status === 'pending' && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 font-bold">
                          {isEn ? "Order Received" : "تم الاستلام 📝"}
                        </Badge>
                      )}
                      {order.status === 'preparing' && (
                        <Badge className="bg-blue-600 text-white font-bold animate-pulse">
                          {isEn ? "Preparing in Pharmacy" : "جاري التحضير 📦"}
                        </Badge>
                      )}
                      {order.status === 'out_for_delivery' && (
                        <Badge className="bg-purple-600 text-white font-bold animate-bounce">
                          {isEn ? "Out for Delivery" : "مع المندوب 🛵"}
                        </Badge>
                      )}
                      {order.status === 'delivered' && (
                        <Badge className="bg-emerald-600 text-white font-bold">
                          {isEn ? "Delivered" : "تم التسليم بنجاح ✅"}
                        </Badge>
                      )}
                      {order.status === 'cancelled' && (
                        <Badge variant="destructive">
                          {isEn ? "Cancelled" : "ملغي ❌"}
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-5 space-y-4">
                      {/* Customer & Medication Details */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                            <User className="w-4 h-4 text-primary" />
                            {order.patientName}
                          </div>
                          <a 
                            href={`https://wa.me/${order.patientPhone.replace(/[^\d]/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200"
                          >
                            <Phone className="w-3 h-3" />
                            {order.patientPhone}
                          </a>
                        </div>

                        <div className="p-3 bg-secondary/30 rounded-xl text-sm">
                          <span className="text-xs text-muted-foreground block font-semibold mb-1">{isEn ? "Medications:" : "الأدوية المطلوبة:"}</span>
                          <span className="font-bold text-foreground flex items-start gap-1.5">
                            <Pill className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            {order.medicationNames}
                          </span>
                        </div>

                        <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
                          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-foreground"><strong className="text-muted-foreground">{isEn ? "Address:" : "العنوان:"}</strong> {order.deliveryAddress}</span>
                        </div>

                        {order.deliveryNotes && (
                          <div className="text-xs bg-muted p-2 rounded-lg text-muted-foreground">
                            <strong className="text-foreground">{isEn ? "Notes:" : "ملاحظات:"}</strong> {order.deliveryNotes}
                          </div>
                        )}
                      </div>

                      {/* Live Tracking Stepper */}
                      {order.status !== 'cancelled' && (
                        <div className="pt-2 border-t">
                          <span className="text-xs font-bold text-muted-foreground block mb-2">{isEn ? "Delivery Progress" : "مراحل توصيل الطلب:"}</span>
                          <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-semibold">
                            <div className={`p-1.5 rounded-lg ${statusStep >= 1 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold' : 'bg-muted text-muted-foreground'}`}>
                              1. استلام 📝
                            </div>
                            <div className={`p-1.5 rounded-lg ${statusStep >= 2 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold' : 'bg-muted text-muted-foreground'}`}>
                              2. تحضير 📦
                            </div>
                            <div className={`p-1.5 rounded-lg ${statusStep >= 3 ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold' : 'bg-muted text-muted-foreground'}`}>
                              3. المندوب 🛵
                            </div>
                            <div className={`p-1.5 rounded-lg ${statusStep >= 4 ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                              4. تسليم ✅
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Price & Payment */}
                      <div className="flex justify-between items-center pt-3 border-t">
                        <div className="text-xs">
                          <span className="text-muted-foreground block">{isEn ? "Payment Method" : "طريقة الدفع"}</span>
                          <span className="font-bold text-foreground">
                            {order.paymentMethod === 'cash_on_delivery' 
                              ? (isEn ? "Cash on Delivery" : "كاش عند الاستلام 💵") 
                              : (isEn ? "Paid Online" : "مدفوع إلكترونياً 💳")}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">{isEn ? "Total" : "المبلغ الإجمالي"}</span>
                          <span className="text-lg font-black text-emerald-600">{order.totalAmount} ج.م</span>
                        </div>
                      </div>

                      {/* Admin Status Controls */}
                      {user?.role === 'admin' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <div className="pt-3 border-t space-y-2">
                          <span className="text-xs font-bold text-muted-foreground block">{isEn ? "Update Status (Auto-dispatches WhatsApp):" : "تحديث حالة التوصيل (يرسل إشعار واتساب تلقائي):"}</span>
                          <div className="grid grid-cols-3 gap-2">
                            {order.status === 'pending' && (
                              <Button 
                                size="sm" 
                                onClick={() => updateOrderStatusMutation.mutate({ id: order.id, status: 'preparing' })} 
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg h-8"
                              >
                                <Package className="w-3 h-3 mr-1" />
                                تحضير 📦
                              </Button>
                            )}
                            {(order.status === 'pending' || order.status === 'preparing') && (
                              <Button 
                                size="sm" 
                                onClick={() => updateOrderStatusMutation.mutate({ id: order.id, status: 'out_for_delivery' })} 
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg h-8"
                              >
                                <Bike className="w-3 h-3 mr-1" />
                                خروج للمندوب 🛵
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              onClick={() => updateOrderStatusMutation.mutate({ id: order.id, status: 'delivered' })} 
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg h-8"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              تم التسليم ✅
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Patient Cancel Button if still pending */}
                      {user?.role === 'patient' && order.status === 'pending' && (
                        <div className="pt-2 border-t">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => cancelOrderMutation.mutate(order.id)} 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full text-xs font-bold h-8"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            {isEn ? "Cancel Order" : "إلغاء الطلب"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* --- Home Delivery Dialog Modal --- */}
      <Dialog open={isDeliveryOpen} onOpenChange={setDeliveryOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader>
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-2">
              <Truck className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-black text-foreground">
              {isEn ? "Order Medicine Home Delivery" : "طلب توصيل الأدوية إلى باب المنزل 🛵"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {isEn 
                ? "Enter your address and contact details. We'll deliver within 45-60 minutes with WhatsApp tracking."
                : "اكتب عنوانك بالتفصيل، وسيتواصل معك مندوب صيدلية المستشفى خلال 45-60 دقيقة مع إرسال إشعار تأكيد على الواتساب."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitDelivery} className="space-y-4 mt-2">
            {/* Medication Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center justify-between">
                <span>{isEn ? "Required Medications" : "الأدوية المطلوبة"} *</span>
                {services && services.length > 0 && !selectedPrescription && (
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {isEn ? "Or choose from hospital pharmacy stock below" : "أو اختر من أدوية الصيدلية المتاحة"}
                  </span>
                )}
              </Label>
              <Input 
                value={orderMedication} 
                onChange={(e) => setOrderMedication(e.target.value)} 
                placeholder={isEn ? "e.g. Panadol 500mg, Augmentin 1g" : "مثال: بنادول 500 مجم، أوجمنتين 1 جم (علبتين)"} 
                className="rounded-xl h-10 font-medium"
                required
              />

              {/* Quick Select from Services if not prescription */}
              {!selectedPrescription && services && services.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {services.slice(0, 5).map((srv) => (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => {
                        setOrderMedication(prev => prev ? `${prev} + ${srv.name}` : srv.name);
                        setOrderPrice(prev => prev + srv.price);
                      }}
                      className="text-[11px] bg-secondary/80 hover:bg-secondary text-foreground px-2 py-1 rounded-md border transition-colors flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-2.5 h-2.5 text-emerald-600" />
                      {srv.name} ({srv.price} ج.م)
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recipient Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{isEn ? "Contact Phone & WhatsApp" : "رقم هاتف المستلم (لتلقي إشعار الواتساب)"} *</Label>
              <div className="relative">
                <Phone className="w-4 h-4 text-muted-foreground absolute left-3 rtl:right-3 rtl:left-auto top-3" />
                <Input 
                  value={orderPhone} 
                  onChange={(e) => setOrderPhone(e.target.value)} 
                  placeholder="+201012345678" 
                  className="rounded-xl h-10 ps-9 rtl:pe-9 rtl:ps-3 font-semibold"
                  required
                />
              </div>
            </div>

            {/* Delivery Address */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{isEn ? "Full Delivery Address" : "عنوان التوصيل بالتفصيل"} *</Label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 rtl:right-3 rtl:left-auto top-3" />
                <Input 
                  value={orderAddress} 
                  onChange={(e) => setOrderAddress(e.target.value)} 
                  placeholder={isEn ? "Street, Building #, Floor, Apartment #" : "اسم الشارع، رقم العمارة، الدور، رقم الشقة، علامة مميزة"} 
                  className="rounded-xl h-10 ps-9 rtl:pe-9 rtl:ps-3"
                  required
                />
              </div>
            </div>

            {/* Delivery Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{isEn ? "Delivery Instructions (Optional)" : "ملاحظات إضافية للمندوب (اختياري)"}</Label>
              <Input 
                value={orderNotes} 
                onChange={(e) => setOrderNotes(e.target.value)} 
                placeholder={isEn ? "e.g. Ring the doorbell, call before arrival" : "مثال: الاتصال قبل الوصول بـ 10 دقائق، رن جرس الشقة"} 
                className="rounded-xl h-10 text-xs"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold">{isEn ? "Payment Method" : "طريقة الدفع المفضلة"}</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderPaymentMethod("cash_on_delivery")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${orderPaymentMethod === 'cash_on_delivery' ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-sm' : 'border-border bg-card hover:bg-secondary/40 text-muted-foreground'}`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>كاش عند الاستلام</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderPaymentMethod("card")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${orderPaymentMethod === 'card' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-border bg-card hover:bg-secondary/40 text-muted-foreground'}`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>فيزا / ماستركارد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderPaymentMethod("wallet")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${orderPaymentMethod === 'wallet' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-border bg-card hover:bg-secondary/40 text-muted-foreground'}`}
                >
                  <Send className="w-4 h-4" />
                  <span>محفظة / إنستاباي</span>
                </button>
              </div>
            </div>

            {/* Bill Summary */}
            <div className="bg-secondary/50 p-3.5 rounded-2xl border text-xs space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>{isEn ? "Estimated Medication Cost:" : "سعر الأدوية التقديري:"}</span>
                <span className="font-bold text-foreground">{orderPrice} ج.م</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isEn ? "Express Delivery Fee:" : "خدمة التوصيل السريع للمنزل:"}</span>
                <span className="font-bold text-foreground">{DELIVERY_FEE} ج.م</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t text-sm font-extrabold text-foreground">
                <span>{isEn ? "Total Amount:" : "المبلغ الإجمالي المستحق:"}</span>
                <span className="text-emerald-600 text-base font-black">{orderPrice + DELIVERY_FEE} ج.م</span>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 sm:space-x-0">
              <Button type="button" variant="outline" onClick={() => setDeliveryOpen(false)} className="rounded-xl h-11">
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button 
                type="submit" 
                disabled={createOrderMutation.isPending} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl h-11 px-6 gap-2 shadow-lg shadow-emerald-600/20 flex-1"
              >
                <Truck className="w-4 h-4" />
                {createOrderMutation.isPending ? (isEn ? "Sending..." : "جاري إرسال الطلب...") : (isEn ? "Confirm Delivery Order" : "تأكيد وإرسال الطلب للمستشفى 🛵")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- Admin Medication Pricing Dialog --- */}
      <Dialog open={isServiceOpen} onOpenChange={setServiceOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              {isEn ? "Medication Pricing & Management" : "إدارة أسعار وأدوية الصيدلية"}
            </DialogTitle>
            <DialogDescription>
              {isEn ? "Add or edit medications in the hospital stock." : "أضف الأدوية التي ستظهر للأطباء في الروشتات، وللمرضى عند طلب التوصيل المنزلي."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-secondary/30 p-4 rounded-xl border">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">{isEn ? "Medication Name" : "اسم الدواء"}</Label>
              <Input value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="e.g. Panadol 500mg" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isEn ? "Price (EGP)" : "السعر (ج.م)"}</Label>
              <Input type="number" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} placeholder="15" className="h-9 text-sm" />
            </div>
            <div className="flex items-end gap-2">
              {editingService && (
                <Button type="button" variant="outline" onClick={() => { setEditingService(null); setNewServiceName(""); setNewServicePrice(""); }} className="h-9">
                  {isEn ? "Cancel" : "إلغاء"}
                </Button>
              )}
              <Button type="submit" disabled={createServiceMutation.isPending || updateServiceMutation.isPending} className="w-full h-9 gap-1 text-xs font-bold">
                {editingService ? (
                  <>{isEn ? "Save" : "حفظ التعديل"}</>
                ) : (
                  <><Plus className="w-3 h-3" /> {isEn ? "Add Med" : "إضافة للائحة"}</>
                )}
              </Button>
            </div>
          </form>

          <div className="max-h-60 overflow-y-auto space-y-2 mt-2 pe-2">
            {isLoadingServices ? (
              <div className="text-center text-sm py-4">{isEn ? "Loading medications..." : "جاري تحميل قائمة الأدوية..."}</div>
            ) : services?.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">{isEn ? "No medications configured yet." : "لم يتم إضافة أي أدوية للائحة بعد."}</div>
            ) : (
              services?.map((srv) => (
                <div key={srv.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-md">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{srv.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 font-semibold">
                        <DollarSign className="w-3 h-3" /> {srv.price} {isEn ? "EGP" : "ج.م"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingService(srv); setNewServiceName(srv.name); setNewServicePrice(srv.price.toString()); }} className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteService(srv.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
