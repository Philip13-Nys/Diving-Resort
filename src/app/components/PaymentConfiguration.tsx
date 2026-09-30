import { useEffect, useState } from "react";
import {
  CreditCard,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

type GcashSettings = {
  gcashNumber: string;
  accountName: string;
  qrImageUrl: string;
  downPaymentPercent: number;
  isEnabled: boolean;
};

const defaultSettings: GcashSettings = {
  gcashNumber: "",
  accountName: "",
  qrImageUrl: "",
  downPaymentPercent: 30,
  isEnabled: false,
};

export default function PaymentConfiguration() {
  const [settings, setSettings] = useState<GcashSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const settingsRef = doc(db, "paymentSettings", "gcash");

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const snapshot = await getDoc(settingsRef);

      if (snapshot.exists()) {
        const data = snapshot.data();

        setSettings({
          gcashNumber: data.gcashNumber ?? "",
          accountName: data.accountName ?? "",
          qrImageUrl: data.qrImageUrl ?? "",
          downPaymentPercent: Number(data.downPaymentPercent ?? 30),
          isEnabled: data.isEnabled ?? false,
        });
      } else {
        setSettings(defaultSettings);
      }
    } catch (err) {
      console.error("Error loading payment settings:", err);
      setError(
        "Unable to load payment settings. Check your Firebase connection and permissions.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateField = <K extends keyof GcashSettings>(
    field: K,
    value: GcashSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSuccess("");
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const percent = Number(settings.downPaymentPercent);

    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      setError(
        "Down payment percentage must be greater than 0 and at most 100.",
      );
      return;
    }

    if (settings.isEnabled) {
      if (!settings.gcashNumber.trim() || !settings.accountName.trim()) {
        setError(
          "Enter the GCash number and account name before enabling payments.",
        );
        return;
      }
    }

    if (settings.qrImageUrl.trim()) {
      try {
        const url = new URL(settings.qrImageUrl.trim());
        if (url.protocol !== "https:" && url.protocol !== "http:") {
          throw new Error("Invalid URL protocol");
        }
      } catch {
        setError("Enter a valid QR image URL, or leave it blank.");
        return;
      }
    }

    setSaving(true);

    try {
      await setDoc(
        settingsRef,
        {
          gcashNumber: settings.gcashNumber.trim(),
          accountName: settings.accountName.trim(),
          qrImageUrl: settings.qrImageUrl.trim(),
          downPaymentPercent: percent,
          isEnabled: settings.isEnabled,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setSuccess("GCash payment settings saved successfully.");
    } catch (err) {
      console.error("Error saving payment settings:", err);
      setError(
        "Could not save settings. Check your Firebase permissions and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "resort_Image_upload");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/vw7ntuy4/image/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Upload failed.");
      }

      updateField("qrImageUrl", data.secure_url);
    } catch (err) {
      console.error("QR upload error:", err);
      setUploadError(
        err instanceof Error ? err.message : "Could not upload QR image.",
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-gray-500">
        <RefreshCw className="mr-2 size-4 animate-spin" />
        Loading payment configuration...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Payment Configuration
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage the resort's GCash details and customer down payment settings.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-cyan-100">
              <CreditCard className="size-5 text-cyan-700" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                GCash Account Details
              </h2>
              <p className="text-sm text-gray-500">
                These details will be displayed to customers at checkout.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="gcashNumber"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                GCash Number
              </label>
              <input
                id="gcashNumber"
                type="text"
                inputMode="tel"
                value={settings.gcashNumber}
                onChange={(e) => updateField("gcashNumber", e.target.value)}
                placeholder="09XXXXXXXXX"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="accountName"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Account Name
              </label>
              <input
                id="accountName"
                type="text"
                value={settings.accountName}
                onChange={(e) => updateField("accountName", e.target.value)}
                placeholder="Name registered to the GCash account"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                GCash QR Code Image
              </label>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleQrUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0
                         file:bg-cyan-50 file:px-4 file:py-2 file:font-medium file:text-cyan-700 hover:file:bg-cyan-100"
              />

              {uploading && (
                <p className="mt-2 text-sm text-gray-500">
                  Uploading QR image...
                </p>
              )}

              {uploadError && (
                <p className="mt-2 text-sm text-red-600">{uploadError}</p>
              )}

              {settings.qrImageUrl && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-gray-600">
                    QR Preview
                  </p>
                  <img
                    src={settings.qrImageUrl}
                    alt="GCash QR code preview"
                    className="size-48 rounded-lg border border-gray-200 bg-white object-contain p-2"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="font-semibold text-gray-900">Down Payment Settings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Set the percentage customers must pay when submitting a booking.
          </p>

          <div className="mt-4 max-w-sm">
            <label
              htmlFor="downPaymentPercent"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Down Payment Percentage (%)
            </label>
            <div className="relative">
              <input
                id="downPaymentPercent"
                type="number"
                min="1"
                max="100"
                step="1"
                value={settings.downPaymentPercent}
                onChange={(e) =>
                  updateField("downPaymentPercent", Number(e.target.value))
                }
                className={`${inputClass} pr-10`}
              />
              <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                %
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Example: 30% of a ₱5,000 booking is ₱1,500.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                GCash Payment Availability
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Turn this off to temporarily prevent customers from submitting
                GCash payments.
              </p>
            </div>

            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={settings.isEnabled}
                onChange={(e) => updateField("isEnabled", e.target.checked)}
              />
              <span className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-cyan-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-100 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition peer-checked:after:translate-x-5 peer-checked:after:border-white" />
            </label>
          </div>

          <div className="mt-4">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                settings.isEnabled
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {settings.isEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </section>

        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={loadSettings}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Reload Settings
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
