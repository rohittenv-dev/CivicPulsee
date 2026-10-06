import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { authority, categories, departments, type CategorySlug } from "@/config/authority";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createNewIssue, addVoiceSupport, fetchAllIssues, type IssueItem } from "@/lib/services/issue-service";
import { uploadIssuePhoto } from "@/lib/services/photo-upload";
import { searchPlaces, reverseGeocode, defaultCentre, type PlaceResult } from "@/lib/geocode";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthDialog } from "@/components/auth/auth-dialog";
import type { IssueSeverity } from "@/lib/lifecycle";
import { toast } from "sonner";
import {
  Upload,
  MapPin,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  ArrowRight,
  TriangleAlert,
  Lightbulb,
  Trash2,
  Droplets,
  Waves,
  Zap,
  Fence,
  CircleHelp,
  LocateFixed,
  Lock,
  Loader2,
  Map as MapIcon,
} from "lucide-react";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: `Report a civic issue — ${authority.productName}` },
      {
        name: "description",
        content: `Report a pothole, streetlight, garbage or water problem in ${authority.city} in under a minute and get a tracking ID instantly.`,
      },
      { property: "og:title", content: `Report a civic issue — ${authority.productName}` },
      {
        property: "og:description",
        content: `File a complaint with ${authority.authorityName} and get a tracking ID in under a minute.`,
      },
    ],
  }),
  component: ReportPage,
});

const LocationPicker = lazy(() => import("@/components/map/location-picker"));

const ICON_MAP: Record<string, React.ReactNode> = {
  TriangleAlert: <TriangleAlert className="size-5" />,
  Lightbulb: <Lightbulb className="size-5" />,
  Trash2: <Trash2 className="size-5" />,
  Droplets: <Droplets className="size-5" />,
  Waves: <Waves className="size-5" />,
  Zap: <Zap className="size-5" />,
  Fence: <Fence className="size-5" />,
  CircleHelp: <CircleHelp className="size-5" />,
};

/** Rough metres between two coordinates — good enough for duplicate detection. */
function distanceMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function ReportPage() {
  const { user, ready, isCitizen } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<CategorySlug>("pothole");
  const [severity, setSeverity] = useState<IssueSeverity>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [submittedIssue, setSubmittedIssue] = useState<{ trackingId: string; id: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address autocomplete
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Nearby duplicates, from real data
  const [nearby, setNearby] = useState<IssueItem | null>(null);
  const [nearbySupported, setNearbySupported] = useState(false);
  const [allIssues, setAllIssues] = useState<IssueItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAllIssues()
      .then(setAllIssues)
      .catch(() => setAllIssues([]));
  }, []);

  // Recompute the nearby duplicate whenever the pin moves.
  useEffect(() => {
    if (!coords) {
      setNearby(null);
      return;
    }
    const match = allIssues
      .filter((i) => i.status !== "confirmed")
      .map((i) => ({ issue: i, d: distanceMetres(coords, { lat: i.latitude, lng: i.longitude }) }))
      .filter((x) => x.d <= 250)
      .sort((a, b) => a.d - b.d)[0];
    setNearby(match?.issue ?? null);
    setNearbySupported(false);
  }, [coords, allIssues]);

  // Debounced address search — behaves like typing into a maps search box.
  useEffect(() => {
    if (!showSuggestions || address.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchingPlace(true);
      try {
        setSuggestions(await searchPlaces(address));
      } catch {
        setSuggestions([]);
      } finally {
        setSearchingPlace(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [address, showSuggestions]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo is larger than 10 MB. Please pick a smaller image.");
      return;
    }

    setUploadingPhoto(true);
    setIsAiAnalyzing(true);
    try {
      const publicUrl = await uploadIssuePhoto(file);
      setPhotoUrl(publicUrl);
      toast.success("Photo uploaded and attached to your complaint.");

      const name = file.name.toLowerCase();
      if (name.includes("wire") || name.includes("light")) {
        setSelectedCategory("live_wire");
        setSeverity("urgent");
        toast.info("Smart triage: exposed wire hazard detected — severity set to URGENT.");
      } else if (name.includes("waste") || name.includes("garbage")) {
        setSelectedCategory("garbage");
        setSeverity("high");
        toast.info("Smart triage: sanitation issue detected — routed to Waste & Sanitation.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Photo upload failed. You can still submit without a photo.");
    } finally {
      setUploadingPhoto(false);
      setIsAiAnalyzing(false);
    }
  };

  const handleLocateMe = () => {
    if (!("geolocation" in navigator)) {
      toast.error("This device does not support GPS location.");
      return;
    }
    toast.info("Fetching GPS coordinates…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setShowSuggestions(false);
        const label = await reverseGeocode(lat, lng);
        setAddress(label);
        toast.success("GPS location attached.");
      },
      () => toast.warning("Could not fetch GPS. Type the location instead.")
    );
  };

  /** Drop-a-pin on the map: store coordinates and resolve a real address label. */
  const handleMapPick = async (lat: number, lng: number) => {
    setCoords({ lat, lng });
    setShowSuggestions(false);
    setSuggestions([]);
    const label = await reverseGeocode(lat, lng);
    setAddress(label);
    toast.success("Location pinned from the map.");
  };

  const pickSuggestion = (place: PlaceResult) => {
    setCoords({ lat: place.lat, lng: place.lng });
    setAddress(place.label);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.phone) {
      toast.error("Sign in with your mobile number to file a complaint.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a short headline for the issue");
      return;
    }
    if (!address.trim()) {
      toast.error("Add a location — use GPS or type the address.");
      return;
    }

    setIsSubmitting(true);
    const selectedCatObj = categories.find((c) => c.slug === selectedCategory);
    const deptId = selectedCatObj?.department || "roads";
    const point = coords ?? defaultCentre;

    try {
      const issue = await createNewIssue({
        category: selectedCategory,
        severity,
        title,
        description: description || "No detailed description provided.",
        photo_url: photoUrl,
        latitude: point.lat,
        longitude: point.lng,
        address,
        department_id: deptId,
        reporter_phone: user.phone,
      });

      setSubmittedIssue({ trackingId: issue.tracking_id, id: issue.id });
      toast.success(`Complaint registered! Tracking ID: ${issue.tracking_id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit issue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only a signed-in citizen may file — the phone number is the ownership key
  // that later lets exactly one person confirm or reopen the complaint.
  if (ready && !isCitizen) {
    return (
      <PageShell
        eyebrow="Citizens"
        title="Sign in with your mobile number to report"
        lede="Your number is the key that lets only you confirm or reopen this complaint later — nobody else can close your case."
      >
        <Card className="mx-auto max-w-xl space-y-4 border-border bg-card p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary">
            <Lock className="size-5 text-muted-foreground" />
          </span>
          <h2 className="font-display text-lg font-bold">
            {user ? "Municipal staff cannot file citizen complaints" : "One quick step first"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {user
              ? "You're signed in with an employee code. Sign out and sign in with a mobile number to report an issue as a resident."
              : "Complaints are tied to a mobile number so status updates reach you and only you can close the case."}
          </p>
          {!user && (
            <div className="flex justify-center">
              <AuthDialog trigger={<Button size="lg">Sign in with mobile number</Button>} />
            </div>
          )}
        </Card>
      </PageShell>
    );
  }

  if (submittedIssue) {
    return (
      <PageShell
        eyebrow="Submission Successful"
        title="Your report is live on the system"
        lede="You can watch it move step-by-step in real time."
      >
        <Card className="mx-auto max-w-2xl border-primary/20 bg-card p-6 shadow-lift">
          <div className="flex flex-col items-center text-center">
            <div className="grid size-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>

            <span className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Official Tracking ID
            </span>
            <div className="mt-1 font-mono text-3xl font-bold tracking-wider text-primary">
              {submittedIssue.trackingId}
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Your report has been routed to the{" "}
              <strong className="text-foreground">
                {departments.find((d) => d.slug === categories.find((c) => c.slug === selectedCategory)?.department)?.name}
              </strong>{" "}
              department. SLA resolution target is {authority.slaDays} working days.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/track" search={{ q: submittedIssue.trackingId }}>
                  Track complaint live <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setSubmittedIssue(null);
                  setTitle("");
                  setDescription("");
                  setPhotoUrl(null);
                }}
              >
                File another report
              </Button>
            </div>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Citizens"
      title="Report a municipal issue"
      lede="Pick a category, confirm location, attach a photo. Under a minute, start to finish."
    >
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Nearby duplicate detection, from live data */}
        {nearby && (
          <Card className="border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <h4 className="font-display text-sm font-semibold text-foreground">
                    A nearby report already exists within 250 metres
                  </h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    "{nearby.title}" ({nearby.tracking_id}) · Status: {nearby.status.replace("_", " ")}
                  </p>
                </div>
              </div>
              <Button
                variant={nearbySupported ? "secondary" : "outline"}
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={nearbySupported}
                onClick={async () => {
                  const count = await addVoiceSupport(nearby.id);
                  setNearbySupported(true);
                  toast.success(`Added your voice — this issue now has ${count} citizen voices.`);
                }}
              >
                <ThumbsUp className="size-3.5" />
                {nearbySupported ? "Supported!" : "Add my voice"}
              </Button>
            </div>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Picker */}
          <div className="space-y-3">
            <Label className="font-display text-base font-semibold">1. Select Issue Category</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-secondary"
                    }`}
                  >
                    <div className="mb-1.5">{ICON_MAP[cat.icon] || <CircleHelp className="size-5" />}</div>
                    <span className="text-xs font-medium leading-tight">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-display text-base font-semibold">2. Photo Proof</Label>
              {isAiAnalyzing && (
                <Badge variant="secondary" className="gap-1.5 text-xs text-primary animate-pulse">
                  <Sparkles className="size-3" /> Uploading & triaging…
                </Badge>
              )}
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-6 text-center transition-colors hover:border-primary/60 hover:bg-secondary/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />

              {uploadingPhoto ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Uploading photo…
                </div>
              ) : photoUrl ? (
                <div className="relative w-full max-w-xs overflow-hidden rounded-lg border border-border">
                  <img src={photoUrl} alt="Complaint preview" className="h-40 w-full object-cover" />
                  <div className="absolute bottom-2 right-2 rounded bg-background/80 px-2 py-1 text-[10px] font-medium backdrop-blur">
                    Change photo
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="grid size-12 place-items-center rounded-full bg-secondary text-primary">
                    <Upload className="size-6" />
                  </div>
                  <span className="mt-2 text-sm font-medium">Click to upload photo</span>
                  <span className="mt-0.5 text-xs text-muted-foreground">
                    Stored securely, visible on every device
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-display text-base font-semibold">3. Location</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={showPicker ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowPicker((v) => !v)}
                  className="gap-1.5"
                >
                  <MapIcon className="size-3.5" /> {showPicker ? "Hide map" : "Pin on map"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleLocateMe} className="gap-1.5">
                  <LocateFixed className="size-3.5" /> Use my GPS
                </Button>
              </div>
            </div>

            <div className="relative">
              <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Search an address or landmark, e.g. Linking Road, Bandra West"
                autoComplete="off"
              />
              {searchingPlace && (
                <Loader2 className="absolute right-3 top-3 size-4 animate-spin text-muted-foreground" />
              )}

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lift">
                  {suggestions.map((s) => (
                    <button
                      key={`${s.lat}-${s.lng}-${s.label}`}
                      type="button"
                      onClick={() => pickSuggestion(s)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-secondary"
                    >
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {showPicker && (
              <div className="overflow-hidden rounded-xl border border-border">
                <ClientOnly
                  fallback={
                    <div className="flex h-[320px] items-center justify-center text-xs text-muted-foreground">
                      Loading map…
                    </div>
                  }
                >
                  <Suspense
                    fallback={
                      <div className="flex h-[320px] items-center justify-center text-xs text-muted-foreground">
                        Loading map…
                      </div>
                    }
                  >
                    <LocationPicker
                      value={coords}
                      centre={[authority.centre.lat, authority.centre.lng]}
                      onPick={handleMapPick}
                    />
                  </Suspense>
                </ClientOnly>
                <p className="border-t border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                  Tap anywhere on the map to drop your pin. The address updates automatically.
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {coords
                ? `Pinned at ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : "No pin yet — tap “Use my GPS”, drop a pin on the map, or pick a search result."}
            </p>
          </div>

          {/* Title & Description */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="issue-title" className="font-display text-base font-semibold">
                4. One-line Headline
              </Label>
              <Input
                id="issue-title"
                placeholder="e.g. Deep pothole near Bus Stop #3 causing traffic slowdown"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue-desc" className="font-display text-sm font-medium">
                Additional context (optional)
              </Label>
              <Textarea
                id="issue-desc"
                rows={3}
                placeholder="Any specific landmark, risk to pedestrians, or time of day details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Severity & Submit */}
          <div className="flex flex-col items-center justify-between gap-4 pt-4 border-t border-border sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Severity Level:</span>
              {(["low", "medium", "high", "urgent"] as IssueSeverity[]).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverity(sev)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                    severity === sev
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <Button type="submit" size="lg" disabled={isSubmitting || uploadingPhoto} className="w-full sm:w-auto">
              {isSubmitting ? "Generating Tracking ID..." : "Submit Complaint"}
            </Button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
