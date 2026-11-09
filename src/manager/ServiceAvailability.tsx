import ServiceAvailabilityPanel from "../app/components/ServiceAvailabilityPanel";

export default function ServiceAvailability() {
  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Service Availability
        </h1>
        <p className="mt-2 text-gray-500">
          Check available service units and sessions for a selected date.
        </p>
      </div>
      <ServiceAvailabilityPanel title="Availability by service" standalone />
    </main>
  );
}
