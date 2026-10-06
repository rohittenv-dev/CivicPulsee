import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, ShieldCheck } from "lucide-react";
import { authority } from "@/config/authority";
import { useAuth } from "@/lib/auth/auth-context";

export function AuthDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { signInCitizen, signInOfficial } = useAuth();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"citizen" | "official">("citizen");
  const [phone, setPhone] = useState("");
  const [officialId, setOfficialId] = useState("");
  const [pin, setPin] = useState("");

  const handleCitizen = (e: React.FormEvent) => {
    e.preventDefault();
    const result = signInCitizen(phone);
    if (!result.ok) {
      toast.error(result.error ?? "Sign in failed");
      return;
    }
    toast.success(`Signed in as citizen +91 ${phone}`);
    setOpen(false);
  };

  const handleOfficial = (e: React.FormEvent) => {
    e.preventDefault();
    const result = signInOfficial(officialId, pin);
    if (!result.ok) {
      toast.error(result.error ?? "Sign in failed");
      return;
    }
    toast.success(`Authenticated as ${authority.authorityShortName} official ${officialId.toUpperCase()}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            Sign in
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Sign in to {authority.productName}
          </DialogTitle>
          <DialogDescription>
            Citizens sign in with a mobile number. Officials must present an employee code issued
            by {authority.authorityShortName} — the code is what grants queue access, not a
            self-selected role.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={role} onValueChange={(v) => setRole(v as "citizen" | "official")} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="citizen" className="gap-2">
              <User className="size-4" /> Citizen
            </TabsTrigger>
            <TabsTrigger value="official" className="gap-2">
              <ShieldCheck className="size-4" /> Municipal Official
            </TabsTrigger>
          </TabsList>

          <TabsContent value="citizen">
            <form onSubmit={handleCitizen} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="citizen-phone">Mobile number</Label>
                <div className="flex items-stretch overflow-hidden rounded-md border border-input focus-within:ring-1 focus-within:ring-ring">
                  <span className="flex select-none items-center gap-1 border-r border-input bg-secondary px-3 font-mono text-sm text-muted-foreground">
                    🇮🇳 +91
                  </span>
                  <Input
                    id="citizen-phone"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="rounded-none border-0 font-mono tracking-wider focus-visible:ring-0"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  10 digits only — the +91 country code is added for you. We use it to SMS you
                  whenever your complaint status changes.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={phone.length !== 10}>
                Continue as Citizen
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="official">
            <form onSubmit={handleOfficial} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="official-code">Employee code</Label>
                <Input
                  id="official-code"
                  placeholder="BMC-EMP-8842"
                  value={officialId}
                  onChange={(e) => setOfficialId(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="official-pin">Department access PIN</Label>
                <Input
                  id="official-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="font-mono tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Only codes on the {authority.authorityShortName} register can open the triage
                  queue, update statuses, or upload proof of resolution. Demo code:{" "}
                  <span className="font-mono">BMC-EMP-8842</span> / PIN{" "}
                  <span className="font-mono">8842</span>.
                </p>
              </div>
              <Button type="submit" className="w-full">
                Access Department Portal
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
