import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Plus, Edit, Trash2, X } from "lucide-react";

import { useState, useEffect } from "react";
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

type RoomType = {
  id: string;
  name: string;
  count: number;
  amenities: string[];
  maxGuests: number;
  basePrice: number;
  image: string;
};

type Room = {
  id: string;
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
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  useEffect(() => {
    loadRoomTypes();
    loadRooms();
  }, []);
  const loadRoomTypes = async () => {
    try {
      const snapshot = await getDocs(collection(db, "roomTypes"));

      const data: RoomType[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as RoomType[];

      setRoomTypes(data);
    } catch (error) {
      console.error("Error loading room types:", error);
    }
  };

  const loadRooms = async () => {
    try {
      const snapshot = await getDocs(collection(db, "rooms"));

      const data: Room[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Room[];

      setRooms(data);
    } catch (error) {
      console.error("Error loading rooms:", error);
    }
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

  // Room Type CRUD
  const handleDeleteRoomType = async (id: string) => {
    if (!window.confirm("Delete this room type?")) return;

    try {
      await deleteDoc(doc(db, "roomTypes", id));

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

      const name = String(data.get("name") || "");
      const basePrice = Number(data.get("basePrice") || 0);
      const maxGuests = Number(data.get("maxGuests") || 0);
      const count = Number(data.get("count") || 0);

      const amenities = String(data.get("amenities") || "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      const file = data.get("image") as File | null;

      let imageUrl = "";

      // Upload image to Firebase Storage
      // if (file && file.size > 0) {
      // const imageRef = ref(storage, `roomTypes/${Date.now()}-${file.name}`);

      // await uploadBytes(imageRef, file);

      // imageUrl = await getDownloadURL(imageRef);
      // }

      // Save room type to Firestore
      await addDoc(collection(db, "roomTypes"), {
        name,
        basePrice,
        maxGuests,
        count,
        amenities,
        image: imageUrl,
        createdAt: serverTimestamp(),
      });

      await loadRoomTypes();

      closeForm();

      alert("Room type added successfully!");
    } catch (error) {
      console.error("Error adding room type:", error);
      alert("Failed to add room type.");
    }
  };

  const handleAddRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const form = e.currentTarget;
      const data = new FormData(form);

      const newRoom = {
        roomNumber: Number(data.get("roomNumber")),
        type: String(data.get("roomType") || ""),
        floor: Number(data.get("floor")),
        condition: String(data.get("condition") || "good"),
        status: "available",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "rooms"), newRoom);

      await loadRooms();

      closeForm();

      alert("Room added successfully!");
    } catch (error) {
      console.error("Error adding room:", error);
      alert("Failed to add room.");
    }
  };

  // Room CRUD
  const handleDeleteRoom = async (id: string) => {
    if (!window.confirm("Delete this room?")) return;

    try {
      await deleteDoc(doc(db, "rooms", id));

      await loadRooms();

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

      const updatedRoom = {
        roomNumber: Number(data.get("roomNumber")),
        type: String(data.get("type") || ""),
        floor: Number(data.get("floor")),
        condition: String(data.get("condition") || ""),
        status: String(data.get("status") || ""),
      };

      await updateDoc(doc(db, "rooms", editingRoom.id), updatedRoom);

      await loadRooms();

      setEditingRoom(null);

      alert("Room updated successfully.");
    } catch (error) {
      console.error("Error updating room:", error);
      alert("Failed to update room.");
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
          className="fixed bottom-6 right-6 md:hidden z-40 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white px-5 py-6 "
        >
          <Plus className="w-5 h-5 " />
          Add {activeTab === "types" ? "Room Type" : "Room"}
        </Button>
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {activeTab === "types" ? "Add New Room Type" : "Add New Room"}
              </h2>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Penthouse Suite"
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Total Rooms
                  </label>
                  <input
                    name="count"
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
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
                    variant="outline"
                    className="flex-1"
                    onClick={closeForm}
                  >
                    Cancel
                  </Button>

                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    type="submit"
                  >
                    Add Room Type
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddRoom} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Room Number
                    </label>
                    <input
                      name="roomNumber"
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 501"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Floor
                    </label>
                    <input
                      name="floor"
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="5"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Room Type
                  </label>
                  <select
                    name="roomType"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roomTypes.map((rt) => (
                      <option key={rt.id}>{rt.name}</option>
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
                    <option>Excellent</option>
                    <option>Good</option>
                    <option>Fair</option>
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

      {/* Edit Room Type Modal */}
      {editingRoomType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Room Type
              </h2>
              <button
                onClick={() => setEditingRoomType(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddRoomType} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Name
                </label>
                <input
                  name="name"
                  defaultValue={editingRoomType.name}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    defaultValue={editingRoomType.basePrice}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Max Guests
                  </label>
                  <input
                    name="maxGuests"
                    type="number"
                    defaultValue={editingRoomType.maxGuests}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Total Rooms
                </label>
                <input
                  name="count"
                  type="number"
                  defaultValue={editingRoomType.count}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Amenities (comma-separated)
                </label>
                <input
                  name="amenities"
                  defaultValue={editingRoomType.amenities.join(", ")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Edit Room #{editingRoom.id}
                </h2>
                <button
                  onClick={() => setEditingRoom(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveRoom} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Room Number
                  </label>
                  <input
                    type="number"
                    name="roomNumber"
                    defaultValue={editingRoom.roomNumber}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Room Type
                  </label>
                  <select
                    name="type"
                    defaultValue={editingRoom.type}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.name}>
                        {rt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Floor
                  </label>
                  <input
                    name="floor"
                    type="number"
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

      {/* Tabs */}
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

      {/* Room Types */}
      {activeTab === "types" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {roomTypes.map((roomType) => (
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
                  <p className="text-sm text-gray-500 mt-1">
                    {roomType.count} rooms available
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
                        key={index}
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* All Rooms */}
      {activeTab === "rooms" && (
        <Card className="p-6">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[700px] w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Room Number
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
                {rooms.map((room) => (
                  <tr
                    key={room.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      #{room.id}
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
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
