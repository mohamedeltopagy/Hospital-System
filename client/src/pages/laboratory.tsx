import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { useLabRequests } from "@/hooks/use-records";
import { useServices, useCreateService, useUpdateService, useDeleteService } from "@/hooks/use-clinics";
import { Microscope, CheckCircle2, Clock, UploadCloud, TestTube, Settings2, Plus, Trash2, Edit3, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { arEG } from "date-fns/locale";
import { useLocation } from "wouter";

export default function LaboratoryPage() {
  const { data: user } = useUser();
  const { data: labRequests, isLoading } = useLabRequests();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  const [activeUploadId, setActiveUploadId] = useState<number | null>(null);
  const [resultText, setResultText] = useState("");

  // Manage Services Dialog
  const [isServiceOpen, setServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const { data: services, isLoading: isLoadingServices } = useServices(null, "lab");
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
        toast({ title: isEn ? "Updated" : "تم التحديث", description: isEn ? "Test updated" : "تم تحديث التحليل" });
        setEditingService(null);
      } else {
        await createServiceMutation.mutateAsync({
          category: "lab",
          name: newServiceName,
          price: Number(newServicePrice),
          description: newServiceDesc || undefined,
        } as any);
        toast({ title: isEn ? "Added" : "تمت الإضافة", description: isEn ? "Lab test added" : "تم إضافة التحليل للقائمة" });
      }
      setNewServiceName("");
      setNewServicePrice("");
      setNewServiceDesc("");
    } catch (err) {
      toast({ title: "Error", description: "Failed to save service", variant: "destructive" });
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm(isEn ? "Delete this test?" : "حذف هذا التحليل من القائمة؟")) return;
    try {
      await deleteServiceMutation.mutateAsync(id);
      toast({ title: isEn ? "Deleted" : "تم الحذف", description: isEn ? "Test removed" : "تم حذف التحليل" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, result }: { id: number; status: string; result?: string }) => {
      const res = await fetch(`/api/lab-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, result })
      });
      if (!res.ok) throw new Error("Failed to update lab request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-requests"] });
      toast({
        title: isEn ? "Status Updated" : "تم التحديث",
        description: isEn ? "Lab result updated successfully." : "تم تحديث نتيجة الفحص بنجاح."
      });
      setActiveUploadId(null);
      setResultText("");
    }
  });

  const handleUploadResult = (id: number) => {
    if (!resultText.trim()) return;
    updateMutation.mutate({ id, status: 'completed', result: resultText });
  };

  const handleProcess = (id: number) => {
    updateMutation.mutate({ id, status: 'processing' });
  };

  if (isLoading) return <div className="p-8 text-center">{isEn ? "Loading..." : "جاري التحميل..."}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" dir={isEn ? "ltr" : "rtl"}>
      <div className="space-y-2 border-b pb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 rounded-lg">
            <Microscope className="w-6 h-6" />
          </div>
          {isEn ? "Laboratory & Imaging" : "المعمل والأشعة"}
        </h1>
        <p className="text-muted-foreground text-lg">
          {user?.role === 'admin' 
            ? (isEn ? "Manage lab tests and upload results." : "إدارة الفحوصات الطبية ورفع النتائج.")
            : (isEn ? "View your requested lab tests and results." : "استعرض التحاليل والأشعة المطلوبة ونتائجها.")}
        </p>
      </div>

      {user?.role === 'admin' && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => setServiceOpen(true)} className="bg-primary text-primary-foreground gap-2 rounded-xl">
            <Settings2 className="w-4 h-4" />
            {isEn ? "Manage Lab Prices & Tests" : "إدارة تسعير التحاليل والفحوصات"}
          </Button>
        </div>
      )}

      {/* Services Dialog */}
      <Dialog open={isServiceOpen} onOpenChange={setServiceOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Microscope className="w-5 h-5 text-primary" />
              {isEn ? "Lab Tests Pricing & Management" : "إدارة أسعار التحاليل والفحوصات المعملية"}
            </DialogTitle>
            <DialogDescription>
              {isEn ? "Add or remove lab tests and their prices." : "أضف التحاليل المعملية التي ستظهر للطبيب عند الطلب، مع تحديد سعر الفاتورة."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-secondary/30 p-4 rounded-xl border">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">{isEn ? "Test Name" : "اسم التحليل/الفحص"}</Label>
              <Input value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="e.g. CBC, MRI" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isEn ? "Price (EGP)" : "السعر (ج.م)"}</Label>
              <Input type="number" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} placeholder="150" className="h-9 text-sm" />
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
                  <><Plus className="w-3 h-3" /> {isEn ? "Add Test" : "إضافة للائحة"}</>
                )}
              </Button>
            </div>
          </form>

          <div className="max-h-60 overflow-y-auto space-y-2 mt-2 pe-2">
            {isLoadingServices ? (
              <div className="text-center text-sm py-4">{isEn ? "Loading tests..." : "جاري تحميل قائمة التحاليل..."}</div>
            ) : services?.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">{isEn ? "No lab tests configured yet." : "لم يتم إضافة أي تحاليل للائحة بعد."}</div>
            ) : (
              services?.map((srv) => (
                <div key={srv.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <TestTube className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{srv.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {labRequests?.map((req: any) => (
          <Card key={req.id} className={`border-2 shadow-sm transition-all ${req.status === 'completed' ? 'border-emerald-100 dark:border-emerald-900/40' : 'border-blue-100 dark:border-blue-900/40'}`}>
            <CardHeader className={`${req.status === 'completed' ? 'bg-emerald-50/50' : req.status === 'processing' ? 'bg-amber-50/50' : 'bg-blue-50/50'} pb-4`}>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <TestTube className="w-5 h-5 text-primary" />
                    {req.testName} <span className="text-sm font-normal text-muted-foreground">({req.testType})</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {format(new Date(req.date), 'dd MMMM yyyy', { locale: isEn ? undefined : arEG })}
                  </CardDescription>
                </div>
                {req.status === 'completed' ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {isEn ? "Completed" : "مكتمل"}
                  </span>
                ) : req.status === 'processing' ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {isEn ? "Processing" : "قيد الإجراء"}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {isEn ? "Pending" : "في الانتظار"}
                  </span>
                )}
              </div>
              {user?.role === 'patient' && req.status === 'pending' && (
                <div className="pt-2 border-t mt-4">
                  <Button onClick={() => setLocation("/payments")} className="w-full bg-primary text-primary-foreground font-bold rounded-xl gap-2 h-10 shadow-md transition-transform hover:scale-[1.02]">
                    <DollarSign className="w-4 h-4" />
                    {isEn ? "Pay Invoice" : "دفع الفاتورة"}
                  </Button>
                </div>
              )}

              {user?.role === 'admin' && (
                <div className="pt-4 border-t flex gap-2">
                  {req.status === 'pending' && (
                    <Button onClick={() => handleProcess(req.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold h-11 rounded-xl shadow-md transition-all">
                      <Clock className="w-5 h-5" />
                      {isEn ? "Start Process" : "بدء الفحص"}
                    </Button>
                  )}
                  {req.status === 'processing' && (
                    <Button onClick={() => setActiveUploadId(req.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold h-11 rounded-xl shadow-md transition-all">
                      <UploadCloud className="w-5 h-5" />
                      {isEn ? "Upload Result" : "رفع النتيجة"}
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {req.instructions && (
                <div className="bg-muted/50 p-3 rounded-lg border">
                  <span className="text-muted-foreground block text-sm font-medium mb-1">{isEn ? "Doctor Instructions" : "تعليمات الطبيب"}</span>
                  <span className="font-medium text-sm">{req.instructions}</span>
                </div>
              )}

              {req.status === 'completed' && req.result && (
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30">
                  <span className="text-emerald-700 block text-sm font-medium mb-1">{isEn ? "Result" : "النتيجة"}</span>
                  <span className="font-medium text-sm text-emerald-900 dark:text-emerald-300">{req.result}</span>
                </div>
              )}

              {user?.role === 'admin' && req.status === 'pending' && (
                <Button onClick={() => handleProcess(req.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {isEn ? "Start Processing" : "البدء في الفحص"}
                </Button>
              )}

              {user?.role === 'admin' && req.status === 'processing' && (
                <div className="space-y-3 pt-3 border-t">
                  <Input 
                    placeholder={isEn ? "Enter test result / findings..." : "أدخل نتيجة الفحص..."} 
                    value={activeUploadId === req.id ? resultText : ""}
                    onChange={(e) => {
                      setActiveUploadId(req.id);
                      setResultText(e.target.value);
                    }}
                  />
                  <Button 
                    onClick={() => handleUploadResult(req.id)} 
                    disabled={activeUploadId !== req.id || !resultText.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <UploadCloud className="w-4 h-4 mr-2 ml-2" />
                    {isEn ? "Upload Result" : "رفع النتيجة"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {labRequests?.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl text-muted-foreground">
            <Microscope className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>{isEn ? "No lab requests found." : "لا توجد فحوصات مطلوبة."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
