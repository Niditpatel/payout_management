"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, ENDPOINTS } from "@/api/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck, Fingerprint } from "lucide-react";

/**
 * PayFlow Login — Premium Minimalist
 * Adhering to strict "no border" and "compact" instructions.
 */

const signInSchema = z.object({
  username: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Key is required"),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInForm) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.post<{
        token?: string;
        user?: Record<string, unknown>;
        error?: string;
      }>(ENDPOINTS.AUTH.LOGIN, data, { encrypt: true, decrypt: true });

      if (res?.token && res.user) {
        login(res.token, res.user as any);
        toast.success("Identity verified");
        router.push("/dashboard");
      } else {
        const msg = res?.error ?? "Invalid credentials";
        setError(msg);
        toast.error(msg);
      }
    } catch (e: any) {
      setError("Network or DB bridge failure");
      toast.error("Bridge Error: Check MongoDB Connectivity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background">
      <div className="w-full max-w-[280px] space-y-10 animate-in fade-in duration-700">
        
        {/* minimal brand header */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="p-2 rounded-xl bg-primary/5">
            <ShieldCheck className="h-6 w-6 text-primary" strokeWidth={2.5} />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold tracking-tighter text-primary uppercase italic">PayFlow</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-40">Secure Payout Node</p>
          </div>
        </div>

        {/* core form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identity Key</Label>
            <Input
              {...register("username")}
              placeholder="user@example.com"
              autoComplete="username"
              className="h-9 text-[11px] font-bold bg-muted/50 border-none rounded-lg focus-visible:ring-1 focus-visible:ring-primary/20 transition-all shadow-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Security Hash</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pr-9 h-9 text-[11px] font-bold bg-muted/50 border-none rounded-lg focus-visible:ring-1 focus-visible:ring-primary/20 transition-all shadow-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2 rounded bg-destructive/5 animate-shiver">
               <Fingerprint className="h-3 w-3 text-destructive" />
               <p className="text-[9px] font-bold text-destructive uppercase tracking-tight">{error}</p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-9 text-[10px] font-black uppercase tracking-[0.3em] rounded-lg shadow-none" 
            disabled={loading}
          >
            {loading ? "Decrypting..." : "Access Node"}
          </Button>
        </form>

        {/* demo credentials - compact card */}
        <div className="p-3 bg-muted/20 rounded-xl space-y-2">
           <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] text-center">Auth Simulation Data</p>
           <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex flex-col items-center p-1.5 rounded-lg bg-background/50 border border-transparent hover:border-primary/20 transition-all group cursor-default">
                 <span className="text-[8px] font-black text-primary/50 uppercase tracking-tighter">OPS</span>
                 <span className="font-bold opacity-60 leading-tight">ops@demo.com</span>
                 <span className="text-[8px] font-bold opacity-30 uppercase mt-0.5">ops123</span>
              </div>
              <div className="flex flex-col items-center p-1.5 rounded-lg bg-background/50 border border-transparent hover:border-primary/20 transition-all group cursor-default">
                 <span className="text-[8px] font-black text-primary/50 uppercase tracking-tighter">FINANCE</span>
                 <span className="font-bold opacity-60 leading-tight">finance@demo.com</span>
                 <span className="text-[8px] font-bold opacity-30 uppercase mt-0.5">fin123</span>
              </div>
           </div>
        </div>

        <p className="text-center text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em]">
          AES-256-GCM / RBAC 1.0 / NO SHADOW
        </p>
      </div>
    </div>
  );
}
