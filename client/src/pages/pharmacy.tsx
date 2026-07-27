import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { usePrescriptions } from "@/hooks/use-records";
import { useServices, useCreateService, useUpdateService, useDeleteService } from "@/hooks/use-clinics";
import { Pill, CheckCircle2, Clock, Printer, Settings2, Plus, Trash2, Edit3, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { arEG } from "date-fns/locale";
import { useLocation } from "wouter";

export default function PharmacyPage() {
  const { data: user } = useUser();
  const { data: prescriptions, isLoading } = usePrescriptions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  // Manage Services Dialog
  const [isServiceOpen, setServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const { data: services, isLoading: isLoadingServices } = useServices(null, "pharmacy");
  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();

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

  const updateMutation = useMutation({
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
      updateMutation.mutate({ id, status: 'dispensed' });
    }
  };

  if (isLoading) return <div className="p-8 text-center">{isEn ? "Loading..." : "جاري التحميل..."}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" dir={isEn ? "ltr" : "rtl"}>
      <div className="space-y-2 border-b pb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-lg">
            <Pill className="w-6 h-6" />
          </div>
          {isEn ? "Pharmacy & Medications" : "الصيدلية والأدوية"}
        </h1>
        <p className="text-muted-foreground text-lg">
          {user?.role === 'admin' 
            ? (isEn ? "Manage and dispense prescriptions." : "إدارة وصرف الروشتات الطبية.")
            : (isEn ? "View your prescriptions and dispensing status." : "استعرض أدويتك وحالة صرفها من الصيدلية.")}
        </p>
      </div>

      {user?.role === 'admin' && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => setServiceOpen(true)} className="bg-primary text-primary-foreground gap-2 rounded-xl">
            <Settings2 className="w-4 h-4" />
            {isEn ? "Manage Medication Prices" : "إدارة تسعير الأدوية"}
          </Button>
        </div>
      )}

      {/* Services Dialog */}
      <Dialog open={isServiceOpen} onOpenChange={setServiceOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              {isEn ? "Medication Pricing & Management" : "إدارة أسعار الأدوية"}
            </DialogTitle>
            <DialogDescription>
              {isEn ? "Add or remove medications and their prices." : "أضف الأدوية التي ستظهر للطبيب عند كتابة الروشتة، مع تحديد سعر الدواء للفاتورة."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-secondary/30 p-4 rounded-xl border">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">{isEn ? "Medication Name" : "اسم الدواء"}</Label>
              <Input value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="e.g. Panadol 500mg" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isEn ? "Price (SAR)" : "السعر (ر.س)"}</Label>
              <Input type="number" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} placeholder="15" className="h-9 text-sm" />
            </div>
            <div className="flex items-end gap-2">
              {editingService && (
                <Button type="button" variant="outline" onClick={() => { setEditingService(null); setNewServiceName(""); setNewServicePrice(""); }} className="h-9">
                  {isEn ? "Cancel" : "إلغاء"}
                </Button>
              )}
              <Button type="submit" disabled={createServiceMutation.isPending || updateServiceMutation.isPending} className="w-full h-9 gap-1 text-xs">
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
                    <div className="p-2 bg-primary/10 rounded-md">
                      <Pill className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{srv.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> {srv.price} {isEn ? "SAR" : "ر.س"}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {prescriptions?.map((p: any) => (
          <Card key={p.id} className={`border-2 shadow-sm transition-all ${p.status === 'dispensed' ? 'border-emerald-100 dark:border-emerald-900/40 opacity-75' : 'border-blue-100 dark:border-blue-900/40'}`}>
            <CardHeader className={`${p.status === 'dispensed' ? 'bg-emerald-50/50' : 'bg-blue-50/50'} pb-4`}>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Pill className="w-5 h-5 text-primary" />
                    {p.medicationName}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {format(new Date(p.date), 'dd MMMM yyyy', { locale: isEn ? undefined : arEG })}
                  </CardDescription>
                </div>
                {p.status === 'dispensed' ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {isEn ? "Dispensed" : "تم الصرف"}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {isEn ? "Pending" : "في الانتظار"}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">{isEn ? "Dosage" : "الجرعة"}</span>
                  <span className="font-medium">{p.dosage}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{isEn ? "Frequency" : "التكرار"}</span>
                  <span className="font-medium">{p.frequency}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block">{isEn ? "Duration" : "المدة"}</span>
                  <span className="font-medium">{p.duration}</span>
                </div>
                {p.notes && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block">{isEn ? "Notes" : "ملاحظات"}</span>
                    <span className="font-medium">{p.notes}</span>
                  </div>
                )}
              </div>

              {/* Patient Pay Button for Pending Invoices */}
              {user?.role === 'patient' && p.status === 'active' && (
                <div className="pt-2 border-t mt-4">
                  <Button onClick={() => setLocation("/payments")} className="w-full bg-primary text-primary-foreground font-bold rounded-xl gap-2 h-10 shadow-md transition-transform hover:scale-[1.02]">
                    <DollarSign className="w-4 h-4" />
                    {isEn ? "Pay Invoice" : "دفع الفاتورة"}
                  </Button>
                </div>
              )}
              
              {user?.role === 'admin' && p.status === 'active' && (
                <div className="pt-4 border-t flex gap-2">
                  <Button onClick={() => handleDispense(p.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold h-11 rounded-xl shadow-md transition-all">
                    <CheckCircle2 className="w-5 h-5" />
                    {isEn ? "Dispense" : "تأكيد الصرف"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {prescriptions?.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl text-muted-foreground">
            <Pill className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>{isEn ? "No prescriptions found." : "لا توجد روشتات مسجلة."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
