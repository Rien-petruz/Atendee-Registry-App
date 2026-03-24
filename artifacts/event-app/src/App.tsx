import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Register from "@/pages/register";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Settings from "@/pages/settings";
import Email from "@/pages/email";
import NotFound from "@/pages/not-found";

import { AdminLayout } from "@/components/layout/admin-layout";
import { useAuth } from "@/hooks/use-auth";

const queryClient = new QueryClient();

// Protected Route Wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <AdminLayout>
      <Component />
    </AdminLayout>
  );
}

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Register} />
      <Route path="/register" component={Register} />
      
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}
      </Route>

      {/* Admin Protected Routes */}
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/email">
        <ProtectedRoute component={Email} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>

      {/* Fallback */}
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
