import { getTenantUrl } from "../../lib/utils";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Save,
  Loader2,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SelectServiceModal } from "../modals/SelectServiceModal";
import { ALL_INDUSTRY_CONFIGS } from "../../lib/industryConfig";
import {
  INDUSTRY_GROUPS,
  type IndustryGroup,
  type SubIndustry,
} from "../../lib/subIndustries";
import { Dialog, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import PhoneInput from "../PhoneInput";

export default function WorkspaceSettingsPage() {
  const { user, refetch } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [tenantSubdomain, setTenantSubdomain] = useState("");
  const [selfServeModeEnabled, setSelfServeModeEnabled] = useState(false);
  const [selfServeOtpEnabled, setSelfServeOtpEnabled] = useState(false);
  const [subdomainError, setSubdomainError] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);
  const [businessType, setBusinessType] = useState("general");
  const [savingIndustry, setSavingIndustry] = useState(false);

  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [showSupportInfo, setShowSupportInfo] = useState(true);

  const isAdmin =
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    user?.role === "TENANT_ADMIN";

  const { data: queues = [] } = useQuery({
    queryKey: ["queues"],
    queryFn: () => fetchApi("/queue").catch(() => []),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (user?.tenantId && isAdmin) {
      // Use /tenant/me to get planFeatures correctly
      fetchApi("/tenant/me")
        .then((currentTenant: AnyFixMe) => {
          if (currentTenant) {
            setTenantName(currentTenant.name || "");
            setTenantSubdomain(currentTenant.subdomain || "");
            setSelfServeModeEnabled(
              currentTenant.selfServeModeEnabled || false,
            );
            setSelfServeOtpEnabled(currentTenant.selfServeOtpEnabled || false);
            setSupportEmail(currentTenant.supportEmail || "");
            setSupportPhone(currentTenant.supportPhone || "");
            setShowSupportInfo(currentTenant.showSupportInfo ?? true);
            setTenantId(currentTenant.id);
            setBusinessType(currentTenant.businessType || "general");
          }
        })
        .catch((err) => console.warn("Failed to fetch tenant details:", err));
    }
  }, [user, isAdmin]);

  const saveWorkspaceSettings = async () => {
    setSaving(true);
    setSubdomainError("");
    try {
      if (user?.tenantId) {
        await fetchApi(`/tenant/${user.tenantId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: tenantName,
            subdomain: tenantSubdomain,
            selfServeModeEnabled,
            selfServeOtpEnabled,
            supportEmail: supportEmail || null,
            supportPhone: supportPhone || null,
            showSupportInfo,
          }),
        });
        await refetch();
        toast.success("Workspace settings saved successfully");
      }
    } catch (err: AnyFixMe) {
      if (err?.status === 409 || err?.message?.includes("taken")) {
        setSubdomainError(
          err.message ||
            "This subdomain is already taken. Please choose another.",
        );
      } else {
        toast.error(err.message || "Failed to save settings");
      }
    } finally {
      setSaving(false);
    }
  };

  const copyLink = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast.success(`${label} copied!`);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-outline">
        You do not have permission to view workspace settings.
      </div>
    );
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const currentTenantId = tenantId || user?.tenantId || "";
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("localhost") ||
      window.location.hostname.includes("127.0.0.1"));
  const portalUrl = tenantSubdomain ? getTenantUrl(tenantSubdomain) : "";

  return (
    <div className="space-y-8">
      {/* Workspace config card */}
      <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden">
        {/* Decorative left edge accent */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary"></div>

        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                domain
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">
                Workspace Configuration
              </h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">
              Manage your organization's core details and branding.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">
                Workspace Name
              </label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="w-full h-[44px] bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-shadow text-on-surface dark:text-white"
                placeholder="E.g. Acme Corp"
              />
              <p className="text-[12px] text-outline mt-2">
                This is the name your customers will see on the queue portal.
              </p>
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">
                Customer Portal URL
              </label>
              <div className="flex items-center h-[44px] bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 gap-0 overflow-hidden">
                <span className="text-on-surface-variant dark:text-zinc-500 text-sm font-data-mono whitespace-nowrap shrink-0">
                  {isLocal ? "" : "https://"}
                </span>
                <input
                  type="text"
                  value={tenantSubdomain}
                  onChange={(e) => {
                    setTenantSubdomain(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    );
                    setSubdomainError("");
                  }}
                  className="flex-1 h-full bg-transparent font-data-mono text-body-md outline-none text-on-surface dark:text-white"
                  placeholder="your-company"
                />
                <span className="text-on-surface-variant dark:text-zinc-500 text-sm font-data-mono whitespace-nowrap shrink-0"></span>
              </div>
              {subdomainError ? (
                <p className="text-[12px] text-red-500 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    error
                  </span>
                  {subdomainError}
                </p>
              ) : tenantSubdomain ? (
                <p className="text-[12px] text-emerald-500 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    link
                  </span>
                  Customers visit: {portalUrl}
                </p>
              ) : (
                <p className="text-[12px] text-outline mt-2">
                  Used in the customer-facing booking page URL.
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-border dark:border-dark-border mt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selfServeModeEnabled}
                  onChange={(e) => setSelfServeModeEnabled(e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-primary bg-surface-container-low dark:bg-black/50"
                />
                <div>
                  <span className="text-body-md font-semibold text-on-surface dark:text-white block">
                    Enable Self-Serve Mode (No Receptionist)
                  </span>
                  <span className="text-body-sm text-on-surface-variant dark:text-outline block mt-0.5">
                    Allow customers to check in to their appointments directly
                    from their phones or lobby tablet without speaking to staff.
                  </span>
                </div>
              </label>

              {selfServeModeEnabled && (
                <label className="flex items-start gap-3 cursor-pointer mt-4 pl-7">
                  <input
                    type="checkbox"
                    checked={selfServeOtpEnabled}
                    onChange={(e) => setSelfServeOtpEnabled(e.target.checked)}
                    className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-primary bg-surface-container-low dark:bg-black/50"
                  />
                  <div>
                    <span className="text-body-sm font-semibold text-on-surface dark:text-white block">
                      Require WhatsApp OTP for Check-in
                    </span>
                    <span className="text-xs text-on-surface-variant dark:text-outline block mt-0.5">
                      Send a 6-digit verification code to the customer's phone
                      to confirm they are physically present.
                    </span>
                  </div>
                </label>
              )}
            </div>

            <div className="pt-4 border-t border-border dark:border-dark-border mt-4">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-4 uppercase tracking-wide">
                Customer Support Settings
              </h3>

              <label className="flex items-start gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={showSupportInfo}
                  onChange={(e) => setShowSupportInfo(e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-primary bg-surface-container-low dark:bg-black/50"
                />
                <div>
                  <span className="text-body-md font-semibold text-on-surface dark:text-white block">
                    Show Support Info to Customers
                  </span>
                  <span className="text-body-sm text-on-surface-variant dark:text-outline block mt-0.5">
                    Display a support footer with contact details on
                    customer-facing pages.
                  </span>
                </div>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-body-sm text-on-surface-variant dark:text-outline mb-1">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full h-[40px] bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-3 font-body-sm text-body-md focus:ring-1 focus:ring-primary outline-none text-on-surface dark:text-white"
                    placeholder="help@example.com"
                  />
                </div>
                <div>
                  <label className="block text-body-sm text-on-surface-variant dark:text-outline mb-1">
                    Support Phone
                  </label>
                  <div className="h-[40px] rounded-lg bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                    <PhoneInput
                      value={supportPhone}
                      onChange={setSupportPhone}
                      className="w-full h-full !border-none !bg-transparent px-3 text-sm text-on-surface dark:text-white"
                      placeholder="234 567 8900"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border dark:border-dark-border flex justify-end">
          <button
            onClick={saveWorkspaceSettings}
            disabled={saving}
            className="h-[44px] px-6 bg-primary hover:bg-primary-container text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" />
            ) : (
              <Save strokeWidth={1.5} className="w-5 h-5" />
            )}
            Save Configuration
          </button>
        </div>
      </div>

      {/* Customer-Facing Links */}
      <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-500" />
        <div className="flex items-center gap-3 mb-2">
          <span
            className="material-symbols-outlined text-emerald-500"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            link
          </span>
          <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">
            Customer-Facing Pages
          </h2>
        </div>
        <p className="font-body-md text-on-surface-variant dark:text-outline mb-6">
          Share these links with customers or display them on screens.
        </p>

        <div className="space-y-3">
          {/* TV Display */}
          <LinkRow
            icon="monitor"
            title="TV Lobby Display"
            description="Open a live calling board on your lobby TV or screen share."
            url={
              tenantSubdomain
                ? `${portalUrl}/tv/${currentTenantId}`
                : `${baseUrl}/tv/${currentTenantId}`
            }
            onCopy={() => setIsTvModalOpen(true)}
            onCustomClick={() => setIsTvModalOpen(true)}
          />

          {/* Customer portal */}
          {portalUrl && (
            <LinkRow
              icon="smartphone"
              title="Customer Booking Portal"
              description="Customers scan a QR or visit this URL to select a service and join the queue."
              url={portalUrl}
              onCopy={() => copyLink(portalUrl, "Customer portal link")}
            />
          )}
        </div>
      </div>

      <SelectServiceModal
        isOpen={isTvModalOpen}
        onClose={() => setIsTvModalOpen(false)}
        tenantId={currentTenantId || ""}
        baseUrl={baseUrl}
        portalUrl={portalUrl || baseUrl}
        isCustomDomain={!!tenantSubdomain}
        onSelect={(url) => {
          window.open(url, "_blank");
          setIsTvModalOpen(false);
        }}
        onCopy={(url) => {
          copyLink(url, "TV display link");
          setIsTvModalOpen(false);
        }}
      />

      {/* Business Category / Industry Template Selector */}
      <IndustryTemplateCard
        businessType={businessType}
        setBusinessType={setBusinessType}
        tenantId={tenantId || user?.tenantId || ""}
        queryClient={queryClient}
      />
    </div>
  );
}

// ── Industry & Sub-Industry Selector ─────────────────────────────────────────
// Removed COLOR_MAP to keep design neutral
function IndustryTemplateCard({
  businessType,
  setBusinessType,
  tenantId,
  queryClient,
}: {
  businessType: string;
  setBusinessType: (v: string) => void;
  tenantId: string;
  queryClient: any;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedGroup, setSelectedGroup] = useState<IndustryGroup | null>(
    null,
  );
  const [pendingSub, setPendingSub] = useState<SubIndustry | null>(null);
  const [provisionServices, setProvisionServices] = useState(true);

  const handleGroupClick = (group: IndustryGroup) => {
    setSelectedGroup(group);
    setStep(2);
    setPendingSub(null);
  };

  const handleSubClick = (sub: SubIndustry) => {
    setPendingSub(sub);
  };

  const handleConfirm = async () => {
    if (!pendingSub || !tenantId) return;
    setSaving(true);
    try {
      await fetchApi(`/tenant/${tenantId}`, {
        method: "PATCH",
        body: JSON.stringify({ businessType: pendingSub.id }),
      });

      if (provisionServices) {
        const locations = await fetchApi("/location").catch(() => []);
        const locationId =
          Array.isArray(locations) && locations.length > 0
            ? locations[0].id
            : null;
        if (locationId) {
          const service = await fetchApi("/service", {
            method: "POST",
            body: JSON.stringify({
              name: `${pendingSub.label} Service`,
              locationId,
              description: `Auto-provisioned for ${pendingSub.label}`,
              allowAppointments: true,
            }),
          }).catch(() => null);

          if (service?.id) {
            await fetchApi(
              `/service-flows/templates/${pendingSub.blueprintKey}/apply?serviceId=${service.id}`,
              {
                method: "POST",
              },
            ).catch((err: any) => console.warn("Blueprint apply failed:", err));
            queryClient.invalidateQueries({ queryKey: ["services"] });
          }
        }
        toast.success(
          `✅ ${pendingSub.label} set up with services & flow blueprint!`,
        );
      } else {
        toast.success(`✅ Business type updated to ${pendingSub.label}`);
      }

      setBusinessType(pendingSub.id);
      queryClient.invalidateQueries({ queryKey: ["tenant", "me"] });
      setStep(1);
      setSelectedGroup(null);
      setPendingSub(null);

      // Automatically navigate to flows page to configure
      router.push("/dashboard/settings/flows");
    } catch (err: any) {
      toast.error(err.message || "Failed to update business type");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-500" />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="material-symbols-outlined text-emerald-500 text-[22px]">
            category
          </span>
          <div className="flex items-center gap-2 flex-1">
            <h2 className="text-lg font-bold text-on-surface dark:text-white">
              Business Category
            </h2>
            {saving && (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            )}
          </div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-500">
            <button
              onClick={() => {
                setStep(1);
                setSelectedGroup(null);
                setPendingSub(null);
              }}
              className={`font-semibold transition-colors ${step === 1 ? "text-emerald-600 dark:text-emerald-400" : "hover:text-on-surface dark:hover:text-white cursor-pointer"}`}
            >
              Industry
            </button>
            {step === 2 && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-on-surface dark:text-white font-semibold">
                  {selectedGroup?.label}
                </span>
              </>
            )}
          </div>
        </div>
        <p className="text-sm text-on-surface-variant dark:text-zinc-400">
          {step === 1
            ? "Step 1: Choose your industry. This adapts your dashboard, terminology, and service desk to fit your business."
            : `Step 2: Choose the exact type of ${selectedGroup?.label} business you run to get a pre-configured flow blueprint.`}
        </p>
      </div>

      {/* Step 1 — Industry Groups */}
      {step === 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {INDUSTRY_GROUPS.map((group) => {
            const isActive = group.subIndustries.some(
              (s) => s.id === businessType || s.businessType === businessType,
            );
            return (
              <button
                key={group.id}
                onClick={() => handleGroupClick(group)}
                disabled={saving}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center group hover:-translate-y-0.5 hover:shadow-md ${
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border dark:border-dark-border hover:border-zinc-300 dark:hover:border-zinc-600 bg-surface-container-low dark:bg-black/50"
                }`}
              >
                <span className="text-2xl">{group.icon}</span>
                <span
                  className={`text-[11px] font-bold leading-tight ${isActive ? "text-primary" : "text-on-surface dark:text-white"}`}
                >
                  {group.label}
                </span>
                {isActive && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full bg-primary text-white font-bold`}
                  >
                    Active
                  </span>
                )}
                <span className="text-[9px] text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors">
                  {group.subIndustries.length} types
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Step 2 — Sub-Industries */}
      {step === 2 &&
        selectedGroup &&
        (() => {
          return (
            <div>
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedGroup(null);
                  setPendingSub(null);
                }}
                className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-on-surface dark:hover:text-white mb-5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back to all industries
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {selectedGroup.subIndustries.map((sub) => {
                  const isSelected = pendingSub?.id === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleSubClick(sub)}
                      className={`flex flex-col gap-2 p-4 rounded-2xl border text-left transition-all group ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border dark:border-dark-border hover:border-zinc-300 dark:hover:border-zinc-600 bg-surface-container-low dark:bg-black/50 hover:-translate-y-0.5 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{sub.icon}</span>
                        {isSelected && (
                          <CheckCircle2 className={`w-4 h-4 text-primary`} />
                        )}
                      </div>
                      <div>
                        <div
                          className={`font-bold text-sm ${isSelected ? "text-primary" : "text-on-surface dark:text-white"}`}
                        >
                          {sub.label}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5 leading-relaxed">
                          {sub.description}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sub.whatYouGet.slice(0, 3).map((step, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                          >
                            {step}
                          </span>
                        ))}
                        {sub.whatYouGet.length > 3 && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            +{sub.whatYouGet.length - 3} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Confirm Panel */}
              {pendingSub && (
                <div
                  className={`p-5 rounded-2xl border border-primary bg-primary/5`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className={`w-4 h-4 text-primary`} />
                        <span className={`font-bold text-sm text-primary`}>
                          Ready to configure: {pendingSub.icon}{" "}
                          {pendingSub.label}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                        Your flow blueprint will include:
                      </div>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {pendingSub.whatYouGet.map((step, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                            {step}
                          </span>
                        ))}
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                        <input
                          type="checkbox"
                          checked={provisionServices}
                          onChange={(e) =>
                            setProvisionServices(e.target.checked)
                          }
                          className="w-4 h-4 rounded text-emerald-600"
                        />
                        <div>
                          <div className="text-sm font-semibold text-on-surface dark:text-white">
                            Auto-create a service & apply the flow blueprint
                          </div>
                          <div className="text-xs text-zinc-500">
                            Creates a ready-to-use service and configures the
                            customer journey stages automatically. Existing
                            services stay untouched.
                          </div>
                        </div>
                      </label>
                    </div>
                    <button
                      onClick={handleConfirm}
                      disabled={saving}
                      className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg disabled:opacity-60 bg-primary hover:opacity-90`}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}

function LinkRow({
  icon,
  title,
  description,
  url,
  onCopy,
  onCustomClick,
}: {
  icon: string;
  title: string;
  description: string;
  url: string;
  onCopy: () => void;
  onCustomClick?: () => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-surface-container-low dark:bg-white/[0.02] border border-border dark:border-dark-border rounded-xl">
      <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-primary text-[18px]">
          {icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface dark:text-white">
          {title}
        </p>
        <p className="text-xs text-on-surface-variant dark:text-zinc-400 mb-1">
          {description}
        </p>
        <code className="text-[11px] font-mono text-on-surface-variant dark:text-zinc-400 truncate block">
          {url}
        </code>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onCopy}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container dark:bg-white/5 hover:bg-surface-container-high dark:hover:bg-white/10 border border-border dark:border-dark-border transition-colors text-on-surface-variant"
          title="Copy Link"
        >
          <Copy strokeWidth={1.5} className="w-4 h-4" />
        </button>
        {onCustomClick ? (
          <button
            type="button"
            onClick={onCustomClick}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 border border-primary/20 transition-colors text-primary"
            title="Open Options"
          >
            <ExternalLink strokeWidth={1.5} className="w-4 h-4" />
          </button>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 border border-primary/20 transition-colors text-primary"
            title="Open"
          >
            <ExternalLink strokeWidth={1.5} className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
