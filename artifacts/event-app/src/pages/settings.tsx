import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Server, ShieldCheck, Mail, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useGetSmtpSettings, useSaveSmtpSettings, useTestSmtpSettings } from "@workspace/api-client-react";
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
      className="max-w-4xl mx-auto space-y-8"
    >
      <div>
        <h1 className="text-3xl font-display font-bold">Email Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your SMTP server to enable bulk emailing.</p>
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
    </motion.div>
  );
}
