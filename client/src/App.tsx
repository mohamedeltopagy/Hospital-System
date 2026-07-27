import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import NotFound from "@/pages/not-found";
import { useUser } from "@/hooks/use-auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";

// Pages
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import ClinicsPage from "@/pages/clinics";
import ClinicDetailPage from "@/pages/clinic-detail";
import AppointmentsPage from "@/pages/appointments";
import MedicalHistoryPage from "@/pages/medical-history";
import ReportsPage from "@/pages/reports";
import TreatmentPlansPage from "@/pages/treatment-plans";
import SettingsPage from "@/pages/settings";
import PaymentsPage from "@/pages/payments";
import PatientsDirectoryPage from "@/pages/patients-directory";
import PharmacyPage from "@/pages/pharmacy";
import LaboratoryPage from "@/pages/laboratory";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { data: user, isLoading } = useUser();

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-primary">جاري التحميل...</div>;
  if (!user) return <Redirect to="/login" />;

  return <Component {...rest} />;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  if (isLoading) return <div className="flex min-h-screen items-center justify-center">جاري التحميل...</div>;
  if (!user) return <Redirect to="/login" />;

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background overflow-hidden" dir={isEn ? "ltr" : "rtl"}>
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-transparent">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={AuthPage} />
      
      <Route path="/">
        <MainLayout><ProtectedRoute component={Dashboard} /></MainLayout>
      </Route>
      
      <Route path="/clinics">
        <MainLayout><ProtectedRoute component={ClinicsPage} /></MainLayout>
      </Route>
      
      <Route path="/clinics/:id">
        <MainLayout><ProtectedRoute component={ClinicDetailPage} /></MainLayout>
      </Route>
      
      <Route path="/appointments">
        <MainLayout><ProtectedRoute component={AppointmentsPage} /></MainLayout>
      </Route>

      <Route path="/medical-history">
        <MainLayout><ProtectedRoute component={MedicalHistoryPage} /></MainLayout>
      </Route>

      <Route path="/reports">
        <MainLayout><ProtectedRoute component={ReportsPage} /></MainLayout>
      </Route>

      <Route path="/treatment-plans">
        <MainLayout><ProtectedRoute component={TreatmentPlansPage} /></MainLayout>
      </Route>

      <Route path="/patients">
        <MainLayout><ProtectedRoute component={PatientsDirectoryPage} /></MainLayout>
      </Route>

      <Route path="/settings">
        <MainLayout><ProtectedRoute component={SettingsPage} /></MainLayout>
      </Route>

      <Route path="/payments">
        <MainLayout><ProtectedRoute component={PaymentsPage} /></MainLayout>
      </Route>

      <Route path="/pharmacy">
        <MainLayout><ProtectedRoute component={PharmacyPage} /></MainLayout>
      </Route>

      <Route path="/laboratory">
        <MainLayout><ProtectedRoute component={LaboratoryPage} /></MainLayout>
      </Route>

      <Route>
        <MainLayout><NotFound /></MainLayout>
      </Route>
    </Switch>
  );
}

import { ThemeProvider } from "next-themes";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider delayDuration={300}>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
