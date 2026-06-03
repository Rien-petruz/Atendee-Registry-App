import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Register from "@/pages/register";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Attendees from "@/pages/attendees";
import Settings from "@/pages/settings";
import Email from "@/pages/email";
import Sms from "@/pages/sms";
import NotFound from "@/pages/not-found";

import { AdminLayout } from "@/components/layout/admin-layout";
import { useAuth } from "@/hooks/use-auth";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AdminLayout>
      <Component />
    </AdminLayout>
  );
}

function LoginRoute() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  if (isAuthenticated) {
    return null;
  }

  return <Login />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Register} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={LoginRoute} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/attendees">
        <ProtectedRoute component={Attendees} />
      </Route>
      <Route path="/email">
        <ProtectedRoute component={Email} />
      </Route>
      <Route path="/sms">
        <ProtectedRoute component={Sms} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
