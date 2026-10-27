import { useEffect, useState } from "react";
import type { ElementType, ReactNode } from "react";
import {
  Settings,
  Hotel,
  Clock,
  Save,
  RotateCcw,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  Anchor,
  Shield,
  Award,
  Waves,
  FileText,
} from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

type ResortHighlight = {
  title: string;
  description: string;
};

type SystemSettingsData = {
  resortName: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  checkInTime: string;
  checkOutTime: string;
  frontDeskHours: string;
  highlights: ResortHighlight[];
};

const SETTINGS_REF = doc(db, "systemSettings", "general");
const PUBLIC_SETTINGS_REF = doc(db, "publicSettings", "general");

const DEFAULT_HIGHLIGHTS: ResortHighlight[] = [
  {
    title: "PADI-Certified Diving",
    description:
      "Expert dive masters with 15+ years guiding guests through 50+ local dive sites.",
  },
  {
    title: "Safety First",
    description:
      "International safety standards, first aid certified staff, and emergency protocols at every activity.",
  },
  {
    title: "Award-Winning Service",
    description:
      "TripAdvisor Certificate of Excellence for 5 consecutive years.",
  },
  {
    title: "Pristine Location",
    description:
      "Nestled in a protected marine sanctuary with unparalleled biodiversity.",
  },
];

const DEFAULT_SETTINGS: SystemSettingsData = {
  resortName: "Sabang Beach and Diving Resort",
  description:
    "A tropical getaway offering comfortable accommodations, beautiful beaches, and memorable resort activities.",
  address: "",
  phone: "",
  email: "",
  checkInTime: "14:00",
  checkOutTime: "11:00",
  frontDeskHours: "24/7",
  highlights: DEFAULT_HIGHLIGHTS,
};

const inputClass =
  "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:bg-gray-100";

const labelClass = "mb-1 block text-sm font-medium text-gray-700";

type SectionProps = {
  title: string;
  description: string;
  icon: ElementType;
  color: string;
  children: ReactNode;
};

function SettingsSection({
  title,
  description,
  icon: Icon,
  color,
  children,
}: SectionProps) {
  return (
    <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${color}`}
        >
          <Icon className="size-5" />
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
            {title}
          </h2>

          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
      </div>

      <div className="space-y-5">{children}</div>
    </section>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: FieldProps) {
  return (
    <div className="min-w-0">
      <label className={labelClass}>{label}</label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </div>
  );
}

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  rows?: number;
};

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  maxLength = 2000,
  rows = 4,
}: TextAreaFieldProps) {
  return (
    <div className="min-w-0">
      <label className={labelClass}>{label}</label>

      <textarea
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        maxLength={maxLength}
        className={`${inputClass} resize-y`}
      />

      <p className="mt-1 text-right text-xs text-gray-400">
        {value.length}/{maxLength} characters
      </p>
    </div>
  );
}

function getSettingsData(data: Record<string, unknown>): SystemSettingsData {
  const highlights = DEFAULT_HIGHLIGHTS.map((defaultHighlight, index) => {
    const featureNumber = index + 1;
    const arrayItem = Array.isArray(data.highlights)
      ? data.highlights[index]
      : undefined;

    const savedHighlight =
      typeof arrayItem === "object" &&
      arrayItem !== null &&
      !Array.isArray(arrayItem)
        ? (arrayItem as Record<string, unknown>)
        : {};

    const title = data[`feature${featureNumber}Title`];
    const description = data[`feature${featureNumber}Description`];

    return {
      title:
        typeof title === "string"
          ? title
          : typeof savedHighlight.title === "string"
            ? savedHighlight.title
            : defaultHighlight.title,

      description:
        typeof description === "string"
          ? description
          : typeof savedHighlight.description === "string"
            ? savedHighlight.description
            : defaultHighlight.description,
    };
  });

  return {
    resortName:
      typeof data.resortName === "string"
        ? data.resortName
        : DEFAULT_SETTINGS.resortName,

    description:
      typeof data.description === "string"
        ? data.description
        : DEFAULT_SETTINGS.description,

    address: typeof data.address === "string" ? data.address : "",

    phone: typeof data.phone === "string" ? data.phone : "",

    email: typeof data.email === "string" ? data.email : "",

    checkInTime:
      typeof data.checkInTime === "string"
        ? data.checkInTime
        : DEFAULT_SETTINGS.checkInTime,

    checkOutTime:
      typeof data.checkOutTime === "string"
        ? data.checkOutTime
        : DEFAULT_SETTINGS.checkOutTime,

    frontDeskHours:
      typeof data.frontDeskHours === "string"
        ? data.frontDeskHours
        : DEFAULT_SETTINGS.frontDeskHours,

    highlights,
  };
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettingsData>({
    ...DEFAULT_SETTINGS,
    highlights: DEFAULT_HIGHLIGHTS.map((item) => ({ ...item })),
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setLoading(true);
      setError("");

      try {
        const snapshot = await getDoc(SETTINGS_REF);

        if (!active) return;

        if (snapshot.exists()) {
          setSettings(getSettingsData(snapshot.data()));
        } else {
          const publicSnapshot = await getDoc(PUBLIC_SETTINGS_REF);

          if (!active) return;

          if (publicSnapshot.exists()) {
            setSettings(getSettingsData(publicSnapshot.data()));
          } else {
            setSettings({
              ...DEFAULT_SETTINGS,
              highlights: DEFAULT_HIGHLIGHTS.map((item) => ({
                ...item,
              })),
            });
          }
        }
      } catch (loadError) {
        console.error("Failed to load system settings:", loadError);

        if (active) {
          setError(
            "Unable to load settings. Check your Firebase connection and Firestore security rules.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function updateSetting<K extends keyof SystemSettingsData>(
    key: K,
    value: SystemSettingsData[K],
  ) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setSuccess("");
    setError("");
  }

  function updateHighlight(
    index: number,
    field: keyof ResortHighlight,
    value: string,
  ) {
    setSettings((previous) => ({
      ...previous,
      highlights: previous.highlights.map((highlight, i) =>
        i === index ? { ...highlight, [field]: value } : highlight,
      ),
    }));

    setSuccess("");
    setError("");
  }

  async function handleSave() {
    setError("");
    setSuccess("");

    if (!settings.resortName.trim()) {
      setError("Please enter the resort name.");
      return;
    }

    if (settings.description.length > 2000) {
      setError("The resort description cannot exceed 2000 characters.");
      return;
    }

    if (
      settings.highlights.length !== 4 ||
      settings.highlights.some(
        (item) =>
          !item.title.trim() ||
          !item.description.trim() ||
          item.description.length > 500,
      )
    ) {
      setError(
        "Please enter a title and description of no more than 500 characters for all four highlights.",
      );
      return;
    }

    if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      setError("Please enter a valid resort email address.");
      return;
    }

    if (
      settings.checkInTime &&
      settings.checkOutTime &&
      settings.checkInTime === settings.checkOutTime
    ) {
      setError("Check-in and check-out times cannot be the same.");
      return;
    }

    setSaving(true);

    const highlights = settings.highlights.map((item) => ({
      title: item.title.trim(),
      description: item.description.trim(),
    }));

    const settingsToSave = {
      resortName: settings.resortName.trim(),
      description: settings.description.trim(),
      address: settings.address.trim(),
      phone: settings.phone.trim(),
      email: settings.email.trim(),
      checkInTime: settings.checkInTime,
      checkOutTime: settings.checkOutTime,
      frontDeskHours: settings.frontDeskHours.trim(),

      feature1Title: highlights[0].title,
      feature1Description: highlights[0].description,

      feature2Title: highlights[1].title,
      feature2Description: highlights[1].description,

      feature3Title: highlights[2].title,
      feature3Description: highlights[2].description,

      feature4Title: highlights[3].title,
      feature4Description: highlights[3].description,

      highlights,

      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(SETTINGS_REF, settingsToSave, {
        merge: true,
      });

      await setDoc(PUBLIC_SETTINGS_REF, settingsToSave, {
        merge: true,
      });

      setSuccess(
        "Resort information, operating hours, and highlights saved successfully.",
      );
    } catch (saveError) {
      console.error("Failed to save system settings:", saveError);

      setError(
        "Unable to save settings. Check your Firebase connection and Firestore security rules.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    const confirmed = window.confirm(
      "Reset the form to its default values? Click Save Settings afterward to save these values to Firestore.",
    );

    if (!confirmed) return;

    setSettings({
      ...DEFAULT_SETTINGS,
      highlights: DEFAULT_HIGHLIGHTS.map((item) => ({
        ...item,
      })),
    });

    setError("");
    setSuccess(
      "Default values restored in the form. Click Save Settings to save them.",
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <LoaderCircle className="size-5 animate-spin text-cyan-600" />
          <span>Loading system settings...</span>
        </div>
      </div>
    );
  }

  const highlightIcons = [Anchor, Shield, Award, Waves];

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1500px] space-y-6 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="size-6 text-cyan-600" />

            <h1 className="text-2xl font-bold text-gray-900">
              System Settings
            </h1>
          </div>

          <p className="mt-2 text-sm text-gray-600">
            Manage resort information, operating hours, and website highlights.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <SettingsSection
        title="Resort Information"
        description="Manage your resort's name, description, address, contact details, and operating hours."
        icon={Hotel}
        color="bg-cyan-100 text-cyan-700"
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Field
            label="Resort Name"
            value={settings.resortName}
            onChange={(value) => updateSetting("resortName", value)}
            placeholder="Enter resort name"
            disabled={saving}
          />

          <Field
            label="Address"
            value={settings.address}
            onChange={(value) => updateSetting("address", value)}
            placeholder="Enter the resort address"
            disabled={saving}
          />
        </div>

        <TextAreaField
          label="Resort Description"
          value={settings.description}
          onChange={(value) => updateSetting("description", value)}
          placeholder="Describe your resort, location, facilities, and guest experience."
          disabled={saving}
          maxLength={2000}
          rows={4}
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            label="Phone"
            value={settings.phone}
            onChange={(value) => updateSetting("phone", value)}
            placeholder="Enter phone number"
            disabled={saving}
          />

          <Field
            label="Resort Email"
            type="email"
            value={settings.email}
            onChange={(value) => updateSetting("email", value)}
            placeholder="Enter contact email"
            disabled={saving}
          />
        </div>

        <div className="border-t border-gray-200 pt-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Clock className="size-5" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Operating Hours
              </h3>

              <p className="text-xs text-gray-500">
                Set standard check-in, check-out, and front desk hours.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Field
              label="Check-in Time"
              type="time"
              value={settings.checkInTime}
              onChange={(value) => updateSetting("checkInTime", value)}
              disabled={saving}
            />

            <Field
              label="Check-out Time"
              type="time"
              value={settings.checkOutTime}
              onChange={(value) => updateSetting("checkOutTime", value)}
              disabled={saving}
            />

            <Field
              label="Front Desk Hours"
              value={settings.frontDeskHours}
              onChange={(value) => updateSetting("frontDeskHours", value)}
              placeholder="e.g. 24/7"
              disabled={saving}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Resort Highlights"
        description="Edit the four feature cards displayed in the 'The Difference Is in the Details' section of your website."
        icon={FileText}
        color="bg-orange-100 text-orange-700"
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {settings.highlights.map((highlight, index) => {
            const HighlightIcon = highlightIcons[index];

            return (
              <div
                key={index}
                className="min-w-0 space-y-4 rounded-xl border border-gray-200 p-4 sm:p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-900">
                    <HighlightIcon className="size-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Highlight {index + 1}
                    </p>

                    <h3 className="break-words text-sm font-semibold text-gray-800">
                      {highlight.title || "Untitled Highlight"}
                    </h3>
                  </div>
                </div>

                <Field
                  label="Highlight Title"
                  value={highlight.title}
                  onChange={(value) => updateHighlight(index, "title", value)}
                  placeholder="Enter highlight title"
                  disabled={saving}
                />

                <TextAreaField
                  label="Highlight Description"
                  value={highlight.description}
                  onChange={(value) =>
                    updateHighlight(index, "description", value)
                  }
                  placeholder="Describe this resort feature"
                  disabled={saving}
                  maxLength={500}
                  rows={3}
                />
              </div>
            );
          })}
        </div>
      </SettingsSection>

      <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="size-4" />
          Reset to Defaults
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}

          {saving ? "Saving Settings..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
