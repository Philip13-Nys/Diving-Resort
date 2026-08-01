import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import {
  Plus,
  Edit,
  Trash2,
  Waves,
  UtensilsCrossed,
  Dumbbell,
  X,
} from "lucide-react";
import { useState } from "react";

type Service = {
  id: number;
  name: string;
  category: string;
  description: string;
  duration: string;
  price: number;
  maxParticipants: number;
  status: string;
  image: string;
};

type Package = {
  id: number;
  name: string;
  description: string;
  services: string[];
  originalPrice: number;
  packagePrice: number;
  discount: number;
  status: string;
};

export default function ServicesManagement() {
  const [activeTab, setActiveTab] = useState<"services" | "packages">(
    "services",
  );
  const [showForm, setShowForm] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);

  const categoryIcons: Record<string, any> = {
    Diving: Waves,
    "Water Activities": Waves,
    Tours: UtensilsCrossed,
    Wellness: Dumbbell,
  };

  // Service CRUD
  const handleDeleteService = (id: number) => {
    if (window.confirm("Delete this service?")) {
      setServices((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleAddService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const data = new FormData(form);

    const file = data.get("image") as File;

    const imageUrl =
      file && file.size > 0
        ? URL.createObjectURL(file)
        : editingService?.image || "";

    const service: Service = {
      id: editingService ? editingService.id : Date.now(),
      name: data.get("name") as string,
      category: data.get("category") as string,
      description: data.get("description") as string,
      price: Number(data.get("price")),
      maxParticipants: Number(data.get("maxParticipants")),
      duration: data.get("duration") as string,
      status: data.get("status") as string,
      image: imageUrl,
    };

    {
      setServices((prev) => [...prev, service]);

      setShowForm(false);
    }
  };

  const handleSaveService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const updated: Service = {
      id: editingService!.id,
      name: data.get("name") as string,
      category: data.get("category") as string,
      description: data.get("description") as string,
      price: Number(data.get("price")),
      maxParticipants: Number(data.get("maxParticipants")),
      duration: data.get("duration") as string,
      status: data.get("status") as string,
      image: editingService!.image,
    };
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEditingService(null);
  };

  // Package CRUD
  const handleDeletePackage = (id: number) => {
    if (window.confirm("Delete this package?")) {
      setPackages((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleSavePackage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const updated: Package = {
      id: editingPackage!.id,
      name: data.get("name") as string,
      description: data.get("description") as string,
      services: (data.get("services") as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      originalPrice: Number(data.get("originalPrice")),
      packagePrice: Number(data.get("packagePrice")),
      discount: Number(data.get("discount")),
      status: editingPackage!.status,
    };
    setPackages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditingPackage(null);
  };

  const handleAddPackage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = new FormData(e.currentTarget);

    const newPackage: Package = {
      id: Date.now(),
      name: data.get("name") as string,
      description: data.get("description") as string,
      services: (data.get("services") as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      originalPrice: Number(data.get("originalPrice")),
      packagePrice: Number(data.get("packagePrice")),
      discount: Number(data.get("discount")),
      status: "active",
    };

    setPackages((prev) => [...prev, newPackage]);

    setShowForm(false);
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Services Management
          </h1>
          <p className="text-gray-500 mt-2">
            Manage resort activities, services, and packages
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New {activeTab === "services" ? "Service" : "Package"}
        </Button>
      </div>

      {/* Add Service / Package Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {activeTab === "services"
                  ? "Add New Service"
                  : "Add New Package"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {activeTab === "services" ? (
              <form onSubmit={handleAddService} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Service Name
                  </label>
                  <input
                    name="name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Night Dive Experience"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Diving</option>
                    <option>Water Activities</option>
                    <option>Tours</option>
                    <option>Wellness</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Service Image
                  </label>

                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of the service..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Price ($)
                    </label>
                    <input
                      name="price"
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Max Participants
                    </label>
                    <input
                      name="maxParticipants"
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="4"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Duration
                  </label>
                  <input
                    name="duration"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 2 hours"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add Service
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddPackage} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Package Name
                  </label>
                  <input
                    name="name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Family Fun Package"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What's included in this package..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Included Services (comma-separated)
                  </label>
                  <input
                    name="services"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Snorkeling Tour, Island Hopping"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Original Price ($)
                    </label>
                    <input
                      name="originalPrice"
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Package Price ($)
                    </label>
                    <input
                      name="packagePrice"
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Discount (%)
                  </label>
                  <input
                    name="discount"
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add Package
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Service
              </h2>
              <button
                onClick={() => setEditingService(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Name
                </label>
                <input
                  name="name"
                  defaultValue={editingService.name}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Category
                </label>
                <select
                  name="category"
                  defaultValue={editingService.category}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Diving">Diving</option>
                  <option value="Water Activities">Water Activities</option>
                  <option value="Tours">Tours</option>
                  <option value="Wellness">Wellness</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={editingService.description}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Price ($)
                  </label>
                  <input
                    name="price"
                    type="number"
                    defaultValue={editingService.price}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Max Participants
                  </label>
                  <input
                    name="maxParticipants"
                    type="number"
                    defaultValue={editingService.maxParticipants}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Duration
                </label>
                <input
                  name="duration"
                  defaultValue={editingService.duration}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={editingService.status}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingService(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Package Modal */}
      {editingPackage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Package
              </h2>
              <button
                onClick={() => setEditingPackage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePackage} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Name
                </label>
                <input
                  name="name"
                  defaultValue={editingPackage.name}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={editingPackage.description}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Included Services (comma-separated)
                </label>
                <input
                  name="services"
                  defaultValue={editingPackage.services.join(", ")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Original Price ($)
                  </label>
                  <input
                    name="originalPrice"
                    type="number"
                    defaultValue={editingPackage.originalPrice}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Package Price ($)
                  </label>
                  <input
                    name="packagePrice"
                    type="number"
                    defaultValue={editingPackage.packagePrice}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Discount (%)
                </label>
                <input
                  name="discount"
                  type="number"
                  defaultValue={editingPackage.discount}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingPackage(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("services")}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === "services"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Individual Services
        </button>
        <button
          onClick={() => setActiveTab("packages")}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === "packages"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Service Packages
        </button>
      </div>

      {/* Services Tab */}
      {activeTab === "services" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const Icon = categoryIcons[service.category] || Waves;
            return (
              <Card key={service.id} className="p-6">
                <div className="mb-6">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-56 object-cover rounded-lg"
                  />
                </div>

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {service.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {service.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingService(service)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteService(service.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Category</span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                      {service.category}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Duration</span>
                    <span className="text-gray-900">{service.duration}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Max Participants</span>
                    <span className="text-gray-900">
                      {service.maxParticipants} people
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-900">
                      Price
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      ${service.price}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Packages Tab */}
      {activeTab === "packages" && (
        <div className="space-y-6">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {pkg.name}
                    </h3>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      Save {pkg.discount}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {pkg.description}
                  </p>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Included Services:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pkg.services.map((service, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm text-gray-500 line-through">
                        ${pkg.originalPrice}
                      </span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-blue-600">
                        ${pkg.packagePrice}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        per person
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPackage(pkg)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDeletePackage(pkg.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
