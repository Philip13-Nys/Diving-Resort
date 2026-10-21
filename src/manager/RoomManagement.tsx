import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "../app/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { uploadToCloudinary } from "../services/cloudinary";
import { createActivityLog } from "../app/activitylogss";

type RoomType = {
  id: string;
  name: string;
  description?: string;
  count: number;
  amenities: string[];
  maxGuests: number;
  basePrice: number;
  image: string;
};

type Room = {
  id: string;
  roomId: string;
  roomNumber: number;
  type: string;
  floor: number;
  status: string;
  condition: string;
};

export default function RoomManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"types" | "rooms">("types");
  const [showForm, setShowForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [reservations, setReservations] = useState<any[]>([]);

  const normalizeName = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const mapRoomDocument = (roomDoc: any): Room => {
    const data = roomDoc.data();

    return {
      id: roomDoc.id,
      roomId: String(data.roomId || ""),
      roomNumber: Number(data.roomNumber || 0),
      type: String(data.type || ""),
      floor: Number(data.floor || 0),
      status: String(data.status || "available").toLowerCase(),
      condition: String(data.condition || "good").toLowerCase(),
    };
  };

  const loadRoomTypes = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, "roomTypes"));

      const data: RoomType[] = snapshot.docs.map((roomTypeDoc) => {
        const value = roomTypeDoc.data();

        return {
          id: roomTypeDoc.id,
          name: String(value.name || ""),
          description: String(value.description || ""),
          count: Number(value.count || 0),
          amenities: Array.isArray(value.amenities) ? value.amenities : [],
          maxGuests: Number(value.maxGuests || 0),
          basePrice: Number(value.basePrice || 0),
          image: String(value.image || ""),
        };
      });

      setRoomTypes(data);
    } catch (error) {
      console.error("Error loading room types:", error);
    }
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, "rooms"));
      setRooms(snapshot.docs.map(mapRoomDocument));
    } catch (error) {
      console.error("Error loading rooms:", error);
    }
  }, []);

  const loadReservations = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, "reservations"));

      setReservations(
        snapshot.docs.map((reservationDoc) => ({
          id: reservationDoc.id,
          ...reservationDoc.data(),
        })),
      );
    } catch (error) {
      console.error("Error loading reservations:", error);
    }
  }, []);

  useEffect(() => {
    void loadRoomTypes();
    void loadRooms();
    void loadReservations();
  }, [loadRoomTypes, loadRooms, loadReservations]);

  // Recalculate every room type's count using actual room documents.
  const syncRoomTypeCounts = async () => {
    const [roomsSnapshot, typesSnapshot] = await Promise.all([
      getDocs(collection(db, "rooms")),
      getDocs(collection(db, "roomTypes")),
    ]);

    const actualRoomTypes = roomsSnapshot.docs.map((roomDoc) =>
      normalizeName(roomDoc.data().type),
    );

    await Promise.all(
      typesSnapshot.docs.map((typeDoc) => {
        const typeName = normalizeName(typeDoc.data().name);

        const actualCount = actualRoomTypes.filter(
          (roomTypeName) => roomTypeName === typeName,
        ).length;

        return updateDoc(doc(db, "roomTypes", typeDoc.id), {
          count: actualCount,
          updatedAt: serverTimestamp(),
        });
      }),
    );
  };

  const refreshRoomData = async () => {
    await syncRoomTypeCounts();
    await Promise.all([loadRooms(), loadRoomTypes()]);
  };

  const generateRoomId = (existingRooms: Room[]) => {
    const numbers = existingRooms
      .map((room) => {
        const match = room.roomId?.match(/^R-(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .filter((number) => number > 0);

    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

    return `R-${String(nextNumber).padStart(3, "0")}`;
  };

  const getRoomAvailability = (
    roomTypeId: string,
    roomCount: number,
    selectedDate: string,
  ) => {
    const selected = new Date(`${selectedDate}T00:00:00`);

    const reservedCount = reservations.filter((reservation) => {
      if (reservation.roomTypeId !== roomTypeId) return false;

      if (String(reservation.status || "").toLowerCase() === "cancelled") {
        return false;
      }

      if (!reservation.checkIn || !reservation.checkOut) return false;

      const checkIn = new Date(`${reservation.checkIn}T00:00:00`);
      const checkOut = new Date(`${reservation.checkOut}T00:00:00`);

      return (
        !Number.isNaN(checkIn.getTime()) &&
        !Number.isNaN(checkOut.getTime()) &&
        selected >= checkIn &&
        selected < checkOut
      );
    }).length;

    return {
      reserved: reservedCount,
      available: Math.max(0, roomCount - reservedCount),
    };
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    const action = searchParams.get("action");

    if (tab === "rooms") setActiveTab("rooms");
    else if (tab === "types") setActiveTab("types");

    if (action === "add") setShowForm(true);
  }, [searchParams]);

  const closeForm = () => {
    setShowForm(false);
    setSearchParams({});
  };

  const handleDeleteRoomType = async (id: string) => {
    if (!window.confirm("Delete this room type?")) return;

    try {
      const roomType = roomTypes.find((item) => item.id === id);

      if (!roomType) {
        alert("Room type not found.");
        return;
      }

      const roomsSnapshot = await getDocs(collection(db, "rooms"));

      const assignedRooms = roomsSnapshot.docs.filter(
        (roomDoc) =>
          normalizeName(roomDoc.data().type) === normalizeName(roomType.name),
      );

      if (assignedRooms.length > 0) {
        alert(
          `Cannot delete "${roomType.name}" because ${assignedRooms.length} room(s) are still assigned to it. Delete or reassign those rooms first.`,
        );
        return;
      }

      await deleteDoc(doc(db, "roomTypes", id));

      await createActivityLog({
        action: "Deleted Room Type",
        details: `Deleted room type "${roomType.name}".`,
        status: "success",
      });

      await loadRoomTypes();

      alert("Room type deleted successfully.");
    } catch (error) {
      console.error("Error deleting room type:", error);
      alert("Failed to delete room type.");
    }
  };

  const handleAddRoomType = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const form = e.currentTarget;
      const data = new FormData(form);

      const name = String(data.get("name") || "").trim();
      const description = String(data.get("description") || "").trim();
      const basePrice = Number(data.get("basePrice") || 0);
      const maxGuests = Number(data.get("maxGuests") || 0);

      const amenities = String(data.get("amenities") || "")
        .split(",")
        .map((amenity) => amenity.trim())
        .filter(Boolean);

      if (!name) {
        alert("Please enter a room type name.");
        return;
      }

      if (
        roomTypes.some(
          (type) => normalizeName(type.name) === normalizeName(name),
        )
      ) {
        alert("A room type with this name already exists.");
        return;
      }

      if (basePrice < 0 || maxGuests < 1) {
        alert("Enter a valid base price and maximum guest count.");
        return;
      }

      const imageFile = data.get("image") as File | null;
      let imageUrl = "";

      if (imageFile && imageFile.size > 0) {
        setUploadingImage(true);

        try {
          imageUrl = await uploadToCloudinary(imageFile);
        } finally {
          setUploadingImage(false);
        }
      }

      await addDoc(collection(db, "roomTypes"), {
        name,
        description,
        basePrice,
        maxGuests,
        count: 0,
        amenities,
        image: imageUrl,
        createdAt: serverTimestamp(),
      });

      await createActivityLog({
        action: "Added Room Type",
        details: `Added room type "${name}" with a base price of ₱${basePrice} per night.`,
        status: "success",
      });

      await loadRoomTypes();
      closeForm();

      alert("Room type added successfully!");
    } catch (error) {
      console.error("Error adding room type:", error);
      alert(
        error instanceof Error ? error.message : "Failed to add room type.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveRoomType = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!editingRoomType) return;

    try {
      const form = e.currentTarget;
      const data = new FormData(form);

      const name = String(data.get("name") || "").trim();
      const description = String(data.get("description") || "").trim();
      const basePrice = Number(data.get("basePrice") || 0);
      const maxGuests = Number(data.get("maxGuests") || 0);

      const amenities = String(data.get("amenities") || "")
        .split(",")
        .map((amenity) => amenity.trim())
        .filter(Boolean);

      if (!name) {
        alert("Please enter a room type name.");
        return;
      }

      const duplicateType = roomTypes.find(
        (type) =>
          type.id !== editingRoomType.id &&
          normalizeName(type.name) === normalizeName(name),
      );

      if (duplicateType) {
        alert("Another room type already uses this name.");
        return;
      }

      if (basePrice < 0 || maxGuests < 1) {
        alert("Enter a valid base price and maximum guest count.");
        return;
      }

      let imageUrl = editingRoomType.image || "";
      const imageFile = data.get("image") as File | null;

      if (imageFile && imageFile.size > 0) {
        setUploadingImage(true);

        try {
          imageUrl = await uploadToCloudinary(imageFile);
        } finally {
          setUploadingImage(false);
        }
      }

      // Save the room type first.
      await updateDoc(doc(db, "roomTypes", editingRoomType.id), {
        name,
        description,
        basePrice,
        maxGuests,
        amenities,
        image: imageUrl,
        updatedAt: serverTimestamp(),
      });

      // If the name changed, update every room assigned to the old name.
      if (normalizeName(editingRoomType.name) !== normalizeName(name)) {
        const roomsSnapshot = await getDocs(collection(db, "rooms"));

        const matchingRooms = roomsSnapshot.docs.filter(
          (roomDoc) =>
            normalizeName(roomDoc.data().type) ===
            normalizeName(editingRoomType.name),
        );

        await Promise.all(
          matchingRooms.map((roomDoc) =>
            updateDoc(doc(db, "rooms", roomDoc.id), {
              type: name,
              updatedAt: serverTimestamp(),
            }),
          ),
        );
      }

      await syncRoomTypeCounts();

      await createActivityLog({
        action: "Updated Room Type",
        details: `Updated room type "${name}".`,
        status: "success",
      });

      await Promise.all([loadRooms(), loadRoomTypes()]);

      setEditingRoomType(null);

      alert("Room type updated successfully!");
    } catch (error) {
      console.error("Error updating room type:", error);

      alert(
        error instanceof Error ? error.message : "Failed to update room type.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const data = new FormData(form);

    const roomNumber = Number(data.get("roomNumber"));
    const floor = Number(data.get("floor"));
    const type = String(data.get("roomType") || "").trim();
    const condition = String(data.get("condition") || "good").toLowerCase();

    if (!type) {
      alert("Please select a room type.");
      return;
    }

    if (!Number.isInteger(roomNumber) || roomNumber < 1) {
      alert("Enter a valid room number.");
      return;
    }

    if (!Number.isInteger(floor) || floor < 1) {
      alert("Enter a valid floor number.");
      return;
    }

    try {
      const [roomsSnapshot, typesSnapshot] = await Promise.all([
        getDocs(collection(db, "rooms")),
        getDocs(collection(db, "roomTypes")),
      ]);

      const latestRooms = roomsSnapshot.docs.map(mapRoomDocument);

      const selectedRoomType = typesSnapshot.docs.find(
        (typeDoc) => normalizeName(typeDoc.data().name) === normalizeName(type),
      );

      if (!selectedRoomType) {
        alert(
          "The selected room type no longer exists. Refresh and try again.",
        );
        return;
      }

      const duplicateRoomNumber = latestRooms.some(
        (room) => room.roomNumber === roomNumber,
      );

      if (duplicateRoomNumber) {
        alert("A room with this room number already exists.");
        return;
      }

      const roomId = generateRoomId(latestRooms);

      await addDoc(collection(db, "rooms"), {
        roomId,
        roomNumber,
        type: String(selectedRoomType.data().name),
        floor,
        condition,
        status: "available",
        createdAt: serverTimestamp(),
      });

      await syncRoomTypeCounts();

      await createActivityLog({
        action: "Added Room",
        details: `Added Room ${roomId} as ${type} on Floor ${floor}.`,
        status: "success",
      });

      await Promise.all([loadRooms(), loadRoomTypes()]);

      closeForm();
      alert(`Room ${roomId} added successfully!`);
    } catch (error) {
      console.error("Error adding room:", error);

      alert(
        error instanceof Error
          ? `Failed to add room: ${error.message}`
          : "Failed to add room.",
      );
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!window.confirm("Delete this room?")) return;

    try {
      const roomToDelete = rooms.find((room) => room.id === id);

      if (!roomToDelete) {
        alert("Room not found.");
        return;
      }

      await deleteDoc(doc(db, "rooms", id));

      await syncRoomTypeCounts();

      await createActivityLog({
        action: "Deleted Room",
        details: `Deleted Room ${roomToDelete.roomId} (${roomToDelete.type}).`,
        status: "success",
      });

      await Promise.all([loadRooms(), loadRoomTypes()]);

      alert("Room deleted successfully.");
    } catch (error) {
      console.error("Error deleting room:", error);
      alert("Failed to delete room.");
    }
  };

  const handleSaveRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!editingRoom) return;

    try {
      const form = e.currentTarget;
      const data = new FormData(form);

      const newType = String(data.get("type") || "").trim();
      const oldType = editingRoom.type;

      if (!newType) {
        alert("Please select a room type.");
        return;
      }

      const roomNumber = Number(
        data.get("roomNumber") || editingRoom.roomNumber,
      );
      const floor = Number(data.get("floor"));
      const condition = String(data.get("condition") || "good").toLowerCase();
      const status = String(data.get("status") || "available").toLowerCase();

      if (!Number.isInteger(floor) || floor < 1) {
        alert("Enter a valid floor number.");
        return;
      }

      const typesSnapshot = await getDocs(collection(db, "roomTypes"));

      const validType = typesSnapshot.docs.some(
        (typeDoc) =>
          normalizeName(typeDoc.data().name) === normalizeName(newType),
      );

      if (!validType) {
        alert("The selected room type does not exist.");
        return;
      }

      const roomsSnapshot = await getDocs(collection(db, "rooms"));

      const duplicateRoomNumber = roomsSnapshot.docs.some((roomDoc) => {
        if (roomDoc.id === editingRoom.id) return false;

        return Number(roomDoc.data().roomNumber || 0) === roomNumber;
      });

      if (duplicateRoomNumber) {
        alert("Another room already uses this room number.");
        return;
      }

      await updateDoc(doc(db, "rooms", editingRoom.id), {
        roomNumber,
        type: newType,
        floor,
        condition,
        status,
        updatedAt: serverTimestamp(),
      });

      if (normalizeName(oldType) !== normalizeName(newType)) {
        await syncRoomTypeCounts();
      }

      await createActivityLog({
        action: "Updated Room",
        details: `Updated Room ${editingRoom.roomId}. Room type: ${newType}, Floor: ${floor}, Status: ${status}.`,
        status: "success",
      });

      await Promise.all([loadRooms(), loadRoomTypes()]);

      setEditingRoom(null);

      alert("Room updated successfully.");
    } catch (error) {
      console.error("Error updating room:", error);
      alert(error instanceof Error ? error.message : "Failed to update room.");
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Room Management</h1>
          <p className="text-gray-500 mt-2">
            Manage room types and individual rooms
          </p>
        </div>

        <Button
          className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New {activeTab === "types" ? "Room Type" : "Room"}
        </Button>

        <Button
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 md:hidden z-40 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white px-5 py-6"
        >
          <Plus className="w-5 h-5" />
          Add {activeTab === "types" ? "Room Type" : "Room"}
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {activeTab === "types" ? "Add New Room Type" : "Add New Room"}
              </h2>

              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeTab === "types" ? (
              <form onSubmit={handleAddRoomType} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Room Type Name
                  </label>
                  <input
                    name="name"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Penthouse Suite"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Room Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the room, its features, and what guests can expect..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Room Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    name="image"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Base Price / Night
                    </label>
                    <input
                      name="basePrice"
                      type="number"
                      min="0"
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Max Guests
                    </label>
                    <input
                      name="maxGuests"
                      type="number"
                      min="1"
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Amenities (comma-separated)
                  </label>
                  <input
                    name="amenities"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="AC, WiFi, TV"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={closeForm}
                  >
                    Cancel
                  </Button>

                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    type="submit"
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? "Uploading Image..." : "Add Room Type"}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddRoom} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Floor
                    </label>
                    <input
                      name="floor"
                      type="number"
                      min="1"
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="5"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Room Number
                    </label>
                    <input
                      name="roomNumber"
                      type="number"
                      min="1"
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Room Type
                  </label>
                  <select
                    name="roomType"
                    required
                    defaultValue=""
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>
                      Select a room type
                    </option>
                    {roomTypes.map((roomType) => (
                      <option key={roomType.id} value={roomType.name}>
                        {roomType.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Condition
                  </label>
                  <select
                    name="condition"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good" selected>
                      Good
                    </option>
                    <option value="fair">Fair</option>
                  </select>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={closeForm}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add Room
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}

      {editingRoomType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Room Type
              </h2>

              <button
                type="button"
                onClick={() => setEditingRoomType(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoomType} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Name
                </label>
                <input
                  name="name"
                  defaultValue={editingRoomType.name}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Room Description
                </label>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={editingRoomType.description || ""}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the room, its features, and what guests can expect..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Room Image
                </label>

                {editingRoomType.image && (
                  <img
                    src={editingRoomType.image}
                    alt={editingRoomType.name}
                    className="w-full h-40 object-cover rounded-lg mb-3"
                  />
                )}

                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />

                <p className="text-xs text-gray-500 mt-1">
                  Select a new image only if you want to replace the current
                  image.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Base Price / Night
                  </label>
                  <input
                    name="basePrice"
                    type="number"
                    min="0"
                    defaultValue={editingRoomType.basePrice}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Max Guests
                  </label>
                  <input
                    name="maxGuests"
                    type="number"
                    min="1"
                    defaultValue={editingRoomType.maxGuests}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Amenities (comma-separated)
                </label>
                <input
                  name="amenities"
                  defaultValue={editingRoomType.amenities.join(", ")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingRoomType(null)}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={uploadingImage}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {uploadingImage ? "Saving Changes..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Edit Room {editingRoom.roomId}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRoom} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Room Type
                  </label>
                  <select
                    name="type"
                    defaultValue={editingRoom.type}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roomTypes.map((roomType) => (
                      <option key={roomType.id} value={roomType.name}>
                        {roomType.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Room Number
                  </label>
                  <input
                    name="roomNumber"
                    type="number"
                    min="1"
                    defaultValue={editingRoom.roomNumber}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Floor
                  </label>
                  <input
                    name="floor"
                    type="number"
                    min="1"
                    defaultValue={editingRoom.floor}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Condition
                  </label>
                  <select
                    name="condition"
                    defaultValue={editingRoom.condition}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={editingRoom.status}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingRoom(null)}
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
        </div>
      )}

      <div className="mb-6 flex overflow-x-auto border-b border-gray-200">
        <button
          onClick={() => setActiveTab("types")}
          className={`whitespace-nowrap px-4 py-3 font-medium transition-colors ${
            activeTab === "types"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Room Types
        </button>

        <button
          onClick={() => setActiveTab("rooms")}
          className={`whitespace-nowrap px-4 py-3 font-medium transition-colors ${
            activeTab === "rooms"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          All Rooms
        </button>
      </div>

      {activeTab === "types" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {roomTypes.map((roomType) => {
            const actualCount = rooms.filter(
              (room) =>
                normalizeName(room.type) === normalizeName(roomType.name),
            ).length;

            return (
              <Card key={roomType.id} className="p-6">
                {roomType.image && (
                  <img
                    src={roomType.image}
                    alt={roomType.name}
                    className="w-full aspect-video object-cover rounded-lg mb-4"
                  />
                )}

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {roomType.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                      {roomType.description || "No description available."}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {actualCount} {actualCount === 1 ? "room" : "rooms"}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingRoomType(roomType)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteRoomType(roomType.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Base Price</span>
                    <span className="font-semibold text-gray-900">
                      ₱{roomType.basePrice}/night
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Max Guests</span>
                    <span className="font-medium text-gray-900">
                      {roomType.maxGuests} people
                    </span>
                  </div>

                  <div>
                    <span className="text-sm text-gray-600 block mb-2">
                      Amenities
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {roomType.amenities.map((amenity, index) => (
                        <span
                          key={`${roomType.id}-${index}`}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "rooms" && (
        <Card className="p-6">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[700px] w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Room ID
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Room Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Floor
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Condition
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {[...rooms]
                  .sort((a, b) => {
                    const numA = Number(a.roomId.match(/\d+/)?.[0] || 0);
                    const numB = Number(b.roomId.match(/\d+/)?.[0] || 0);
                    return numA - numB;
                  })
                  .map((room) => (
                    <tr
                      key={room.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {room.roomId}
                      </td>

                      <td className="py-3 px-4 text-sm text-gray-700">
                        {room.type}
                      </td>

                      <td className="py-3 px-4 text-sm text-gray-700">
                        Floor {room.floor}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            room.status === "available"
                              ? "bg-green-100 text-green-800"
                              : room.status === "occupied"
                                ? "bg-blue-100 text-blue-800"
                                : room.status === "reserved"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                          }`}
                        >
                          {room.status.charAt(0).toUpperCase() +
                            room.status.slice(1)}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            room.condition === "excellent"
                              ? "bg-green-100 text-green-800"
                              : room.condition === "good"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {room.condition.charAt(0).toUpperCase() +
                            room.condition.slice(1)}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRoom(room)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteRoom(room.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {rooms.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-sm text-gray-500"
                    >
                      No rooms found. Add a room to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
