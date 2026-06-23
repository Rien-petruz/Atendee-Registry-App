import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader } from "lucide-react";
import { useRegisterAttendee } from "@workspace/api-client-react";
import { getApiOptions } from "@/lib/utils";

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(7, "Phone number is required"),
  isNewcomer: z.boolean().default(false),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [emailValidation, setEmailValidation] = React.useState<{ status?: string; isValid?: boolean; validating?: boolean }>({});
  const validationTimeoutRef = React.useRef<NodeJS.Timeout>();

  const { mutate: register, isPending, error } = useRegisterAttendee();

  const {
    register: registerField,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const watchEmail = watch("email");

  const validateEmailAsync = async (emailValue: string) => {
    if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setEmailValidation({});
      return;
    }

    setEmailValidation({ validating: true });
    try {
      const response = await fetch(`${getApiOptions().baseURL}/attendees/validate-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      });
      const result = await response.json();
      setEmailValidation({
        isValid: result.isValid,
        status: result.status,
        validating: false,
      });
    } catch (err) {
      setEmailValidation({ validating: false });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    validationTimeoutRef.current = setTimeout(() => validateEmailAsync(value), 500);
  };

  React.useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    };
  }, []);

  const onSubmit = (data: RegisterFormValues) => {
    register(
      { data },
      {
        onSuccess: () => {
          setIsSuccess(true);
        },
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden">
      {/* Background Image Area */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src={`${import.meta.env.BASE_URL}images/register-hero.png`}
          alt="Event atmosphere"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent" />
        
        <div className="absolute bottom-12 left-12 max-w-md">
          <img src="/logo.png" alt="The Newwine Place Logo" className="w-12 h-12 rounded-xl mb-6 shadow-xl shadow-primary/20 object-cover" />
          <h2 className="text-4xl font-display font-bold text-white mb-4">Welcome to TNP Registry.</h2>
          <p className="text-lg text-white/70">Register today to be part of our church program. We're glad you're here.</p>
        </div>
      </div>

      {/* Form Area */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {isSuccess ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-10 pb-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <CardTitle className="text-3xl mb-3">You Are Welcome!</CardTitle>
                <CardDescription className="text-base text-zinc-400 max-w-xs mx-auto">
                  Your attendance has been recorded for this month. Enjoy God's presence!
                </CardDescription>
                <Button 
                  variant="outline" 
                  className="mt-8"
                  onClick={() => { setIsSuccess(false); reset(); }}
                >
                  Register Another Guest
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-8 lg:hidden flex items-center gap-3">
                <img src="/logo.png" alt="The Newwine Place Logo" className="w-10 h-10 rounded-xl shadow-lg shadow-primary/20 object-cover" />
                <h1 className="font-display font-bold text-2xl text-foreground">TNP<span className="text-primary"> Registry</span></h1>
              </div>

              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="text-3xl">Get your ticket</CardTitle>
                  <CardDescription>Fill out the details below to complete your registration.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        placeholder="John Doe"
                        {...registerField("fullName")}
                        className={errors.fullName ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          {...registerField("email")}
                          onChange={(e) => { registerField("email").onChange(e); handleEmailChange(e); }}
                          className={`${errors.email ? "border-destructive focus-visible:ring-destructive" : emailValidation.isValid === true ? "border-emerald-500" : emailValidation.isValid === false ? "border-destructive" : ""} pr-10`}
                        />
                        {emailValidation.validating && (
                          <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                        )}
                        {emailValidation.isValid === true && !emailValidation.validating && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        )}
                        {emailValidation.isValid === false && !emailValidation.validating && (
                          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                        )}
                      </div>
                      {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                      {emailValidation.isValid === false && <p className="text-sm text-destructive">Email appears invalid ({emailValidation.status})</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        placeholder="+1 (555) 000-0000"
                        {...registerField("phoneNumber")}
                        className={errors.phoneNumber ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>}
                    </div>

                    <div className="flex items-center space-x-3 bg-black/20 p-4 rounded-xl border border-white/5">
                      <input
                        type="checkbox"
                        id="isNewcomer"
                        className="w-5 h-5 rounded border-white/20 bg-black/40 text-primary focus:ring-primary focus:ring-offset-background"
                        {...registerField("isNewcomer")}
                      />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="isNewcomer" className="text-base cursor-pointer">I am a newcomer</Label>
                        <p className="text-xs text-muted-foreground">Check this if it's your first time attending.</p>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm text-destructive text-center">
                          {/* @ts-ignore - The error object shape might vary based on customFetch */}
                          {error.message || "Registration failed. Please check your details and try again."}
                        </p>
                      </div>
                    )}

                    <Button type="submit" className="w-full" size="lg" variant="gradient" isLoading={isPending}>
                      Submit
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
