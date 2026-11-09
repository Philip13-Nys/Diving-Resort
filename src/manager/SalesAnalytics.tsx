import SalesReportsDetail from "./SalesReportsDetail";

export default function SalesAnalytics() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sales Analytics</h1>
        <p className="mt-2 text-gray-500">
          Review sales reports and export booking data
        </p>
      </div>
      <SalesReportsDetail />
    </div>
  );
}
