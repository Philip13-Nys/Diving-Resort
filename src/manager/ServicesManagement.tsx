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
import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { createActivityLog } from "../app/activitylogss";
import { db } from "../app/firebase";

type Service = {
  id: string;
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
  id: string;
  name: string;
  description: string;
  services: string[];
  originalPrice: number;
  packagePrice: number;
  discount: number;
  status: string;
};

const CLOUDINARY_CLOUD_NAME = "vw7ntuy4";
const CLOUDINARY_UPLOAD_PRESET = "resort_Image_upload";

const uploadToCloudinary = async (file: File): Promise<string> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || "Cloudinary image upload failed.");
  }

  return result.secure_url;
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

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);

  const categoryIcons: Record<string, any> = {
    Diving: Waves,
    "Water Activities": Waves,
    Tours: UtensilsCrossed,
    Wellness: Dumbbell,
  };

  const loadServices = async () => {
    try {
      const snapshot = await getDocs(collection(db, "services"));

      const serviceData: Service[] = snapshot.docs.map((item) => {
        const data = item.data();

        return {
          id: item.id,
          name: data.name || "",
          category: data.category || "",
          description: data.description || "",
          duration: data.duration || "",
          price: Number(data.price || 0),
          maxParticipants: Number(data.maxParticipants || 0),
          status: data.status || "active",
          image: data.image || "",
        };
      });

      setServices(serviceData);
    } catch (error) {
      console.error("Error loading services:", error);
    }
  };

  const loadPackages = async () => {
    try {
      const snapshot = await getDocs(collection(db, "packages"));

      const packageData: Package[] = snapshot.docs.map((item) => {
        const data = item.data();

        return {
          id: item.id,
          name: data.name || "",
          description: data.description || "",
          services: Array.isArray(data.services) ? data.services : [],
          originalPrice: Number(data.originalPrice || 0),
          packagePrice: Number(data.packagePrice || 0),
          discount: Number(data.discount || 0),
          status: data.status || "active",
        };
      });

      setPackages(packageData);
    } catch (error) {
      console.error("Error loading packages:", error);
    }
  };

  useEffect(() => {
    loadServices();
    loadPackages();
  }, []);

  const resetImageSelection = () => {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview("");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Please select an image smaller than 10 MB.");
      e.target.value = "";
      return;
    }

    resetImageSelection();

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Service CRUD
  const handleDeleteService = async (id: string) => {
    if (!window.confirm("Delete this service?")) {
      return;
    }

    try {
      const service = services.find((item) => item.id === id);

      await deleteDoc(doc(db, "services", id));

      if (service) {
        await createActivityLog({
          action: "Deleted Service",
          details: `Deleted service "${service.name}" from the ${service.category} category.`,
        });
      }

      await loadServices();
      console.log("Service deleted successfully");
    } catch (error) {
      console.error("Error deleting service:", error);
      alert("Failed to delete service.");
    }
  };

  const handleAddService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setUploading(true);

      const form = e.currentTarget;
      const data = new FormData(form);

      const serviceName = (data.get("name") as string).trim();
      const category = data.get("category") as string;
      const price = Number(data.get("price"));
      const maxParticipants = Number(data.get("maxParticipants"));
      const duration = (data.get("duration") as string).trim();
      const status = (data.get("status") as string).toLowerCase();
      const description = (data.get("description") as string).trim();

      if (!serviceName) {
        alert("Please enter a service name.");
        return;
      }

      let imageUrl = "";

      if (selectedImage) {
        imageUrl = await uploadToCloudinary(selectedImage);
      }

      await addDoc(collection(db, "services"), {
        name: serviceName,
        category,
        description,
        price,
        maxParticipants,
        duration,
        status,
        image: imageUrl,
        createdAt: serverTimestamp(),
      });

      await createActivityLog({
        action: "Added Service",
        details: `Added service "${serviceName}" under ${category} with a price of ₱${price.toLocaleString()} and duration of ${duration}.`,
        status: "success",
      });

      await loadServices();

      setShowForm(false);
      resetImageSelection();

      console.log("Service added successfully");
    } catch (error) {
      console.error("Error adding service:", error);
      alert(error instanceof Error ? error.message : "Failed to add service.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!editingService) return;

    try {
      setUploading(true);

      const form = e.currentTarget;
      const data = new FormData(form);

      const name = (data.get("name") as string).trim();
      const category = data.get("category") as string;
      const description = (data.get("description") as string).trim();
      const price = Number(data.get("price"));
      const maxParticipants = Number(data.get("maxParticipants"));
      const duration = (data.get("duration") as string).trim();
      const status = (data.get("status") as string).toLowerCase();

      if (!name) {
        alert("Please enter a service name.");
        return;
      }

      // Keep the old image unless a replacement is selected.
      let imageUrl = editingService.image || "";

      if (selectedImage) {
        imageUrl = await uploadToCloudinary(selectedImage);
      }

      await updateDoc(doc(db, "services", editingService.id), {
        name,
        category,
        description,
        price,
        maxParticipants,
        duration,
        status,
        image: imageUrl,
      });

      await createActivityLog({
        action: "Updated Service",
        details: `Updated service "${name}" under ${category}. Price: ₱${price.toLocaleString()}, Duration: ${duration}.`,
        status: "success",
      });

      await loadServices();

      setEditingService(null);
      resetImageSelection();

      console.log("Service updated successfully");
    } catch (error) {
      console.error("Error updating service:", error);
      alert(
        error instanceof Error ? error.message : "Failed to update service.",
      );
    } finally {
      setUploading(false);
    }
  };

  // Package CRUD
  const handleDeletePackage = async (id: string) => {
    if (!window.confirm("Delete this package?")) {
      return;
    }

    try {
      const pkg = packages.find((item) => item.id === id);

      await deleteDoc(doc(db, "packages", id));

      if (pkg) {
        await createActivityLog({
          action: "Deleted Package",
          details: `Deleted package "${pkg.name}".`,
        });
      }

      await loadPackages();
      console.log("Package deleted successfully");
    } catch (error) {
      console.error("Error deleting package:", error);
      alert("Failed to delete package.");
    }
  };

  const handleSavePackage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!editingPackage) return;

    try {
      const form = e.currentTarget;
      const data = new FormData(form);

      const packageName = (data.get("name") as string).trim();
      const packagePrice = Number(data.get("packagePrice"));
      const discount = Number(data.get("discount"));

      await updateDoc(doc(db, "packages", editingPackage.id), {
        name: packageName,
        description: data.get("description") as string,
        services: (data.get("services") as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        originalPrice: Number(data.get("originalPrice")),
        packagePrice,
        discount,
      });

      await createActivityLog({
        action: "Updated Package",
        details: `Updated package "${packageName}". Package price: ₱${packagePrice.toLocaleString()}, Discount: ${discount}%.`,
        status: "success",
      });

      await loadPackages();
      setEditingPackage(null);

      console.log("Package updated successfully");
    } catch (error) {
      console.error("Error updating package:", error);
      alert("Failed to update package.");
    }
  };

  const handleAddPackage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const data = new FormData(e.currentTarget);

      const packageName = (data.get("name") as string).trim();
      const packagePrice = Number(data.get("packagePrice"));
      const discount = Number(data.get("discount"));

      await addDoc(collection(db, "packages"), {
        name: packageName,
        description: data.get("description") as string,
        services: (data.get("services") as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        originalPrice: Number(data.get("originalPrice")),
        packagePrice,
        discount,
        status: "active",
        createdAt: serverTimestamp(),
      });

      await createActivityLog({
        action: "Added Package",
        details: `Added package "${packageName}" with a package price of ₱${packagePrice.toLocaleString()} and ${discount}% discount.`,
        status: "success",
      });

      await loadPackages();
      setShowForm(false);

      console.log("Package added successfully");
    } catch (error) {
      console.error("Error adding package:", error);
      alert("Failed to add package.");
    }
  };

  const closeAddModal = () => {
    setShowForm(false);
    resetImageSelection();
  };

  const openEditService = (service: Service) => {
    resetImageSelection();
    setEditingService(service);
  };

  const closeEditService = () => {
    setEditingService(null);
    resetImageSelection();
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
          onClick={() => {
            resetImageSelection();
            setShowForm(true);
          }}
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
                type="button"
                onClick={closeAddModal}
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
                    required
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

                {/* Add Service Image */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Service Image
                  </label>
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />

                  {imagePreview && (
                    <div className="mt-3">
                      <img
                        src={imagePreview}
                        alt="Selected service"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={resetImageSelection}
                        className="mt-2 text-sm text-red-600 hover:text-red-700"
                      >
                        Remove image
                      </button>
                    </div>
                  )}
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
                      Price (₱)
                    </label>
                    <input
                      name="price"
                      type="number"
                      min="0"
                      required
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
                      min="1"
                      required
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
                    required
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
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={uploading}
                    onClick={closeAddModal}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {uploading ? "Uploading..." : "Add Service"}
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
                    required
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
                      Original Price (₱)
                    </label>
                    <input
                      name="originalPrice"
                      type="number"
                      min="0"
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Package Price (₱)
                    </label>
                    <input
                      name="packagePrice"
                      type="number"
                      min="0"
                      required
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
                    min="0"
                    max="100"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={closeAddModal}
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
                type="button"
                onClick={closeEditService}
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

              {/* Edit Service Image */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Service Image
                </label>

                {imagePreview || editingService.image ? (
                  <img
                    src={imagePreview || editingService.image}
                    alt="Service preview"
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 mb-3">
                    No Image
                  </div>
                )}

                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />

                <p className="text-xs text-gray-500 mt-1">
                  Select a new image to replace the current one. Leave empty to
                  keep it.
                </p>

                {imagePreview && (
                  <button
                    type="button"
                    onClick={resetImageSelection}
                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Cancel image change
                  </button>
                )}
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
                    Price (₱)
                  </label>
                  <input
                    name="price"
                    type="number"
                    min="0"
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
                    min="1"
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
                  disabled={uploading}
                  onClick={closeEditService}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {uploading ? "Uploading..." : "Save Changes"}
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
                type="button"
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
                    Original Price (₱)
                  </label>
                  <input
                    name="originalPrice"
                    type="number"
                    min="0"
                    defaultValue={editingPackage.originalPrice}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Package Price (₱)
                  </label>
                  <input
                    name="packagePrice"
                    type="number"
                    min="0"
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
                  min="0"
                  max="100"
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
                  {service.image ? (
                    <img
                      src={service.image}
                      alt={service.name}
                      className="w-full h-56 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-56 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
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
                      onClick={() => openEditService(service)}
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
                      ₱
                      {service.price.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
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
                        ₱
                        {pkg.originalPrice.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div>
                      <span className="text-2xl font-bold text-blue-600">
                        ₱
                        {pkg.packagePrice.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
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
