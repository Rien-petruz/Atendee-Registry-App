import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Server, ShieldCheck, Mail, Key, Users, UserPlus, Trash2, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import {
  useGetSmtpSettings, useSaveSmtpSettings, useTestSmtpSettings,
  useGetSmsSettings, useSaveSmsSettings, useTestSmsSettings,
  useListAdmins, useCreateAdmin, useDeleteAdmin, useGetMe,
  getListAdminsQueryKey,
  getGetSmsSettingsQueryKey,
  AdminUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiOptions } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const smtpSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().min(1).max(65535),
  username: z.string().email("Must be a valid email"),
  password: z.string().min(1, "Password is required"),
  encryption: z.enum(["tls", "ssl", "none"]),
});

type SmtpFormValues = z.infer<typeof smtpSchema>;

export default function Settings() {
  const { toast } = useToast();
  const apiOpts = getApiOptions();
  
  const { data: settings, isLoading } = useGetSmtpSettings(apiOpts);
  const { mutate: saveSettings, isPending: isSaving } = useSaveSmtpSettings(apiOpts);
  const { mutate: testConnection, isPending: isTesting } = useTestSmtpSettings(apiOpts);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SmtpFormValues>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      host: "smtp.gmail.com",
      port: 587,
      encryption: "tls",
    }
  });

  React.useEffect(() => {
    if (settings) {
      reset({
        host: settings.host,
        port: settings.port,
        username: settings.username,
        encryption: settings.encryption as any,
        password: "", // intentionally left blank for security
      });
    }
  }, [settings, reset]);

  const onSubmit = (data: SmtpFormValues) => {
    saveSettings(
      { data },
      {
        onSuccess: () => {
          toast({
            title: "Settings Saved",
            description: "Your SMTP configuration has been updated successfully.",
          });
        },
        onError: (err: any) => {
          toast({
            title: "Error",
            description: err.message || "Failed to save settings.",
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleTest = () => {
    testConnection(undefined, {
      onSuccess: () => {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to the SMTP server.",
        });
      },
      onError: (err: any) => {
        toast({
          title: "Test Failed",
          description: err.message || "Could not connect to SMTP server. Check your credentials.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-6 sm:space-y-8"
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage SMTP, admin accounts, and other configuration.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-panel border-white/5">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                SMTP Configuration
              </CardTitle>
              <CardDescription>
                We recommend using Gmail with an App Password for reliable delivery.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse">Loading settings...</div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="host">SMTP Host</Label>
                      <Input
                        id="host"
                        placeholder="smtp.gmail.com"
                        {...register("host")}
                        className={errors.host ? "border-destructive" : ""}
                      />
                      {errors.host && <p className="text-sm text-destructive">{errors.host.message}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="port">SMTP Port</Label>
                      <Input
                        id="port"
                        type="number"
                        placeholder="587"
                        {...register("port")}
                        className={errors.port ? "border-destructive" : ""}
                      />
                      {errors.port && <p className="text-sm text-destructive">{errors.port.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="username">Email Username</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="username"
                          placeholder="your-email@gmail.com"
                          className={`pl-10 ${errors.username ? "border-destructive" : ""}`}
                          {...register("username")}
                        />
                      </div>
                      {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">App Password</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••••••••••"
                          className={`pl-10 ${errors.password ? "border-destructive" : ""}`}
                          {...register("password")}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Use a generated App Password, not your real password.</p>
                      {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="encryption">Encryption</Label>
                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 w-fit">
                      {(["tls", "ssl", "none"] as const).map((type) => (
                        <label key={type} className="cursor-pointer">
                          <input 
                            type="radio" 
                            value={type} 
                            className="sr-only peer"
                            {...register("encryption")} 
                          />
                          <div className="px-4 py-2 rounded-md text-sm font-medium uppercase peer-checked:bg-primary peer-checked:text-white text-muted-foreground hover:text-white transition-all">
                            {type}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Credentials are encrypted securely.
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleTest}
                        isLoading={isTesting}
                        className="w-full sm:w-auto border-white/10 hover:bg-white/5"
                      >
                        Test Connection
                      </Button>
                      <Button 
                        type="submit" 
                        variant="gradient"
                        isLoading={isSaving}
                        className="w-full sm:w-auto"
                      >
                        Save Settings
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-panel border-white/5 bg-gradient-to-b from-card/40 to-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Gmail Setup Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>To use Gmail as your SMTP provider, you must create an App Password:</p>
              <ol className="list-decimal pl-4 space-y-2">
                <li>Go to your Google Account settings.</li>
                <li>Navigate to <strong>Security</strong>.</li>
                <li>Ensure <strong>2-Step Verification</strong> is enabled.</li>
                <li>Search for <strong>App Passwords</strong>.</li>
                <li>Create a new app password and paste the 16-character code here.</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      <SmsSection />
      <AdminsSection />
    </motion.div>
  );
}

const smsSchema = z.object({
  token: z.string().min(1, "Token is required"),
  senderId: z.string().min(1, "Sender ID required").max(11, "Max 11 characters"),
});
type SmsFormValues = z.infer<typeof smsSchema>;

function SmsSection() {
  const { toast } = useToast();
  const apiOpts = getApiOptions();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useGetSmsSettings(apiOpts);
  const { mutate: save, isPending: isSaving } = useSaveSmsSettings(apiOpts);
  const { mutate: test, isPending: isTesting } = useTestSmsSettings(apiOpts);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SmsFormValues>({
    resolver: zodResolver(smsSchema),
    defaultValues: { token: "", senderId: "" },
  });

  React.useEffect(() => {
    if (settings) {
      reset({ token: "", senderId: settings.senderId });
    }
  }, [settings, reset]);

  const onSubmit = (data: SmsFormValues) => {
    save(
      { data },
      {
        onSuccess: () => {
          toast({ title: "SMS settings saved", description: "Your KudiSMS credentials are ready." });
          queryClient.invalidateQueries({ queryKey: getGetSmsSettingsQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.message || "Failed to save SMS settings.", variant: "destructive" });
        },
      }
    );
  };

  const handleTest = () => {
    test(undefined, {
      onSuccess: (r: any) => {
        toast({
          title: "KudiSMS connection successful",
          description: `Balance: ${r?.balance ?? "?"}`,
        });
      },
      onError: (err: any) => {
        toast({ title: "Test failed", description: err?.message || "Could not connect to KudiSMS.", variant: "destructive" });
      },
    });
  };

  return (
    <Card className="glass-panel border-white/5">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          SMS Provider (KudiSMS)
        </CardTitle>
        <CardDescription>
          Get your API token from <a href="https://my.kudisms.net" target="_blank" rel="noopener" className="text-primary underline">my.kudisms.net</a> → API. Sender ID must be pre-approved by KudiSMS (max 11 chars).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-24 flex items-center justify-center text-muted-foreground animate-pulse">Loading SMS settings...</div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="sms-token">API Token <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="sms-token"
                    type="password"
                    placeholder="Paste your KudiSMS token to save or update"
                    {...register("token")}
                    className={`pl-10 bg-black/30 border-white/10 ${errors.token ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.token && <p className="text-xs text-destructive">{errors.token.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms-sender">Sender ID <span className="text-destructive">*</span></Label>
                <Input
                  id="sms-sender"
                  placeholder="e.g. NEWWINE"
                  maxLength={11}
                  {...register("senderId")}
                  className={`bg-black/30 border-white/10 ${errors.senderId ? "border-destructive" : ""}`}
                />
                {errors.senderId && <p className="text-xs text-destructive">{errors.senderId.message}</p>}
                <p className="text-xs text-muted-foreground">Shown as the sender on recipients' phones. Must be approved by KudiSMS.</p>
              </div>
            </div>
            <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                {settings?.isConfigured ? "Token saved & encrypted." : "Not configured yet."}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTest}
                  isLoading={isTesting}
                  disabled={!settings?.isConfigured}
                  className="flex-1 sm:flex-initial border-white/10 hover:bg-white/5"
                >
                  Test &amp; Check Balance
                </Button>
                <Button type="submit" variant="gradient" isLoading={isSaving} className="flex-1 sm:flex-initial">
                  Save SMS Settings
                </Button>
              </div>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

const createAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Must be at least 8 characters"),
});
type CreateAdminValues = z.infer<typeof createAdminSchema>;

function CreateAdminDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const { mutate: createAdmin, isPending } = useCreateAdmin(getApiOptions());

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateAdminValues>({
    resolver: zodResolver(createAdminSchema),
  });

  const onSubmit = (data: CreateAdminValues) => {
    createAdmin(
      { data },
      {
        onSuccess: () => {
          toast({ title: "Administrator added", description: `${data.email} can now log in.` });
          reset();
          onSuccess();
          onClose();
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.message || "Failed to add admin.", variant: "destructive" });
        },
      }
    );
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-card border-white/10 max-w-md w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            Add Administrator
          </DialogTitle>
          <DialogDescription>
            They'll be able to sign in immediately and have the same access as you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="new-admin-email">Email Address <span className="text-destructive">*</span></Label>
            <Input
              id="new-admin-email"
              type="email"
              placeholder="newadmin@example.com"
              {...register("email")}
              className={`bg-black/30 border-white/10 ${errors.email ? "border-destructive" : ""}`}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-admin-password">Password <span className="text-destructive">*</span></Label>
            <Input
              id="new-admin-password"
              type="password"
              placeholder="At least 8 characters"
              {...register("password")}
              className={`bg-black/30 border-white/10 ${errors.password ? "border-destructive" : ""}`}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            <p className="text-xs text-muted-foreground">Share this with them directly. They can change it later.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 border-white/10" onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="gradient" className="flex-1" isLoading={isPending}>Add admin</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminsSection() {
  const { toast } = useToast();
  const apiOpts = getApiOptions();
  const queryClient = useQueryClient();

  const { data: meData } = useGetMe(apiOpts);
  const { data: adminsData, isLoading } = useListAdmins(apiOpts);
  const { mutate: deleteAdmin, isPending: isDeleting } = useDeleteAdmin(apiOpts);

  const [showCreate, setShowCreate] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);

  const refetchAdmins = () => {
    queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteAdmin(
      { id: pendingDelete.id },
      {
        onSuccess: () => {
          toast({ title: "Administrator removed", description: `${pendingDelete.email} no longer has access.` });
          setPendingDelete(null);
          refetchAdmins();
        },
        onError: (err: any) => {
          toast({ title: "Delete failed", description: err?.message || "Could not remove admin.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Card className="glass-panel border-white/5">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Administrators
            </CardTitle>
            <CardDescription>People who can sign in and manage the registry.</CardDescription>
          </div>
          <Button onClick={() => setShowCreate(true)} variant="gradient" size="sm" className="gap-2 w-full sm:w-auto">
            <UserPlus className="w-4 h-4" /> Add Administrator
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground animate-pulse">Loading admins...</div>
        ) : (
          <div className="divide-y divide-white/5">
            {adminsData?.admins.map((admin) => {
              const isSelf = meData?.id === admin.id;
              return (
                <div key={admin.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{admin.email}{isSelf && <span className="ml-2 text-xs text-primary">(you)</span>}</p>
                    <p className="text-xs text-muted-foreground">Added {format(new Date(admin.createdAt), "MMM d, yyyy")}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 self-start sm:self-auto"
                    disabled={isSelf}
                    onClick={() => setPendingDelete(admin)}
                  >
                    <Trash2 className="w-4 h-4" />
                    {isSelf ? "Can't remove self" : "Remove"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <CreateAdminDialog open={showCreate} onClose={() => setShowCreate(false)} onSuccess={refetchAdmins} />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && !isDeleting && setPendingDelete(null)}>
        <AlertDialogContent className="bg-card border-white/10 w-[95vw] sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingDelete?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll lose access immediately. You can re-add them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Removing..." : "Remove admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
