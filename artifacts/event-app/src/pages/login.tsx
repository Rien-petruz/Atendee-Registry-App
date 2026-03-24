import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Hexagon, Lock } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { setAuthToken } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { mutate: login, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormValues) => {
    login(
      { data },
      {
        onSuccess: (res) => {
          setAuthToken(res.token);
          // Small delay for UX and to let state catch up
          setTimeout(() => setLocation("/dashboard"), 100);
        },
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-background overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt="Abstract Background"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md z-10 px-4"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-2xl shadow-primary/30">
            <Hexagon className="text-white w-8 h-8" />
          </div>
          <h1 className="font-display font-bold text-3xl text-foreground">Aura<span className="text-primary">Events</span></h1>
          <p className="text-muted-foreground mt-2">Admin Portal Login</p>
        </div>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Welcome Back
            </CardTitle>
            <CardDescription>Enter your admin credentials to access the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@auraevents.com"
                  {...register("email")}
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive text-center">
                    {/* @ts-ignore */}
                    {error.message || "Invalid credentials. Please try again."}
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" variant="gradient" isLoading={isPending}>
                Sign In to Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
