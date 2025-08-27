import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/auth/login";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import Services from "@/pages/services";
import Calendar from "@/pages/calendar";
import CalendarSettings from "@/pages/calendar-settings";
import Availability from "@/pages/availability";
import TeamMembers from "@/pages/team-members";
import PublicBooking from "@/pages/public-booking";
import BookingManage from "@/pages/booking-manage";
import BookingsPage from "@/pages/bookings";
import TeamSettingsPage from "@/pages/team-settings";
import ApiKeysPage from "@/pages/settings/api-keys";
import SwaggerPage from "@/pages/admin/swagger";
import AppLayout from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";

function Router() {
  const { user, isLoading, login } = useAuth();

  return (
    <Switch>
      {/* Public routes - no authentication required */}
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/book/:teamSlug/:serviceSlug" component={PublicBooking} />
      <Route path="/booking/:manageToken" component={() => <BookingManage />} />
      <Route path="/booking/:manageToken/:action" component={() => <BookingManage />} />

      {/* Login route - redirect to dashboard if already authenticated */}
      <Route path="/login">
        {() => {
          if (isLoading) {
            return (
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
              </div>
            );
          }

          if (!user) {
            return <LoginPage onSuccess={login} />;
          }

          // User is authenticated, redirect immediately without showing any UI
          window.location.href = '/';
          return null;
        }}
      </Route>

      {/* Authenticated routes */}
      <Route>
        {() => {
          if (isLoading) {
            return (
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
              </div>
            );
          }

          if (!user) {
            return <LoginPage onSuccess={login} />;
          }

          return (
            <AppLayout>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/services" component={Services} />
                <Route path="/calendar" component={Calendar} />
                <Route path="/calendar-settings" component={CalendarSettings} />
                <Route path="/bookings" component={BookingsPage} />
                <Route path="/availability" component={Availability} />
                <Route path="/team-members" component={TeamMembers} />
                <Route path="/team-settings" component={TeamSettingsPage} />
                <Route path="/settings/api-keys" component={ApiKeysPage} />
                <Route path="/admin/swagger" component={SwaggerPage} />
                <Route component={NotFound} />
              </Switch>
            </AppLayout>
          );
        }}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
