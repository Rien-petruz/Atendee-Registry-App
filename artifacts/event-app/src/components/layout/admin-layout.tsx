import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Mail, MessageSquare, Settings, LogOut, Hexagon, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [open, setOpen] = React.useState(false);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/attendees", label: "Attendees", icon: Users },
    { href: "/email", label: "Bulk Email", icon: Mail },
    { href: "/sms", label: "Bulk SMS", icon: MessageSquare },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  React.useEffect(() => { setOpen(false); }, [location]);

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Hexagon className="text-white w-5 h-5" />
          </div>
          <h1 className="font-display font-bold text-lg text-foreground">TNP<span className="text-primary"> Registry</span></h1>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        />
      )}

      {/* Sidebar — drawer on mobile, persistent on md+ */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-card/95 md:bg-card/30 border-r border-white/5 flex flex-col backdrop-blur-xl transition-transform duration-200",
          "md:sticky md:top-0 md:h-screen md:max-w-none md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="p-6 lg:p-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Hexagon className="text-white w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="font-display font-bold text-xl text-foreground">TNP<span className="text-primary"> Registry</span></h1>
            <p className="text-xs text-muted-foreground">Admin Portal</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-inner"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 border border-transparent transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden relative">
        {/* Ambient background glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

        <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 lg:p-10 z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
