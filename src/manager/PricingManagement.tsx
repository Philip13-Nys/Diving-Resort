import { displayRecordId } from "../app/bookingAvailability";
import { ensureRecordReferences } from "../app/bookingStore";
import { useRecordRevision } from "../app/useBookingInventory";
import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Edit, TrendingUp, X, Save, AlertCircle } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../app/firebase";
import { createActivityLog } from "../app/activitylogss";
import { packageDiscountPercent, packagePriceFromDiscount } from "../app/serviceConfiguration";

type RoomType = {
  id: string;
  name: string;
  basePrice: number;
  count: number;
  maxGuests: number;
  amenities: string[];
  image: string;
};

type PricedItem = {
  id: string;
  name: string;
  price: number;
  kind: "service" | "package";
  description: string;
  originalPrice?: number;
  discount?: number;
};

export default function PricingManagement() {
  const recordRevision = useRecordRevision(
    "admin:roomTypes,admin:settings,admin:services,admin:packages",
  );
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomError, setRoomError] = useState("");
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>("");
  const [savingRoomPrice, setSavingRoomPrice] = useState(false);
  const [pricedItems, setPricedItems] = useState<PricedItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemError, setItemError] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemPrice, setItemPrice] = useState("");
  const [itemOriginalPrice, setItemOriginalPrice] = useState("");
  const [itemDiscount, setItemDiscount] = useState("");
  const [savingItemPrice, setSavingItemPrice] = useState(false);

  const [reservationFee, setReservationFee] = useState("5");
  const [loadingFee, setLoadingFee] = useState(true);
  const [savingFee, setSavingFee] = useState(false);
  const [feeError, setFeeError] = useState("");
  const [feeMessage, setFeeMessage] = useState("");

  useEffect(() => {
    const loadRoomTypes = async () => {
      try {
        setLoadingRooms(true);
        setRoomError("");

        console.log("Loading room types...");

        const snapshot = await getDocs(collection(db, "roomTypes"));

        console.log("Room types found:", snapshot.size);

        const data: RoomType[] = snapshot.docs.map((roomDoc) => {
          const room = roomDoc.data();
          console.log("Room type:", roomDoc.id, room);

          return {
            id: roomDoc.id,
            name: typeof room.name === "string" ? room.name : "Unnamed Room",
            basePrice: Number(room.basePrice ?? 0),
            count: Number(room.count ?? 0),
            maxGuests: Number(room.maxGuests ?? 1),
            amenities: Array.isArray(room.amenities) ? room.amenities : [],
            image: typeof room.image === "string" ? room.image : "",
          };
        });

        await ensureRecordReferences("RT", data.map(room => room.id));
        setRoomTypes(data);
      } catch (error) {
        console.error("Error loading room types:", error);

        setRoomError("Failed to load room types.");
      } finally {
        setLoadingRooms(false);
      }
    };

    loadRoomTypes();
  }, [recordRevision]);

  useEffect(() => {
    const loadReservationFee = async () => {
      try {
        setLoadingFee(true);
        setFeeError("");

        const snapshot = await getDoc(doc(db, "settings", "reservationFee"));

        if (snapshot.exists()) {
          setReservationFee(String(snapshot.data().percent ?? 5));
        }
      } catch (error) {
        console.error("Error loading reservation fee:", error);
        setFeeError("Failed to load reservation fee settings.");
      } finally {
        setLoadingFee(false);
      }
    };

    loadReservationFee();
  }, [recordRevision]);

  useEffect(() => {
    let active = true;
    const loadItems = async () => {
      setLoadingItems(true);
      setItemError("");
      try {
        const [serviceSnapshot, packageSnapshot] = await Promise.all([
          getDocs(collection(db, "services")),
          getDocs(collection(db, "packages")),
        ]);
        if (!active) return;
        setPricedItems([
          ...serviceSnapshot.docs.map((item): PricedItem => ({
            id: item.id,
            name: String(item.data().name || "Unnamed Service"),
            price: Number(item.data().price || 0),
            kind: "service",
            description: String(item.data().category || ""),
          })),
          ...packageSnapshot.docs.map((item): PricedItem => ({
            id: item.id,
            name: String(item.data().name || "Unnamed Package"),
            price: Number(item.data().packagePrice || 0),
            kind: "package",
            description: Array.isArray(item.data().services)
              ? item.data().services.join(", ")
              : "",
            originalPrice: Number(item.data().originalPrice || 0),
            discount: Number(item.data().discount || 0),
          })),
        ]);
      } catch (error) {
        console.error("Error loading service and package prices:", error);
        if (active) setItemError("Failed to load service and package prices.");
      } finally {
        if (active) setLoadingItems(false);
      }
    };
    void loadItems();
    return () => { active = false; };
  }, [recordRevision]);

  const saveReservationFee = async () => {
    const percent = Number(reservationFee);

    if (
      reservationFee.trim() === "" ||
      !Number.isFinite(percent) ||
      percent < 0 ||
      percent > 100
    ) {
      setFeeError("Enter a valid percentage between 0 and 100.");
      setFeeMessage("");
      return;
    }

    try {
      setSavingFee(true);
      setFeeError("");
      setFeeMessage("");

      await setDoc(
        doc(db, "settings", "reservationFee"),
        {
          percent,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await createActivityLog({
        action: "Updated Reservation Fee",
        details: `Changed the reservation fee to ${percent}%.`,
        status: "success",
      });

      setFeeMessage("Reservation fee updated successfully.");
    } catch (error) {
      console.error("Error saving reservation fee:", error);
      setFeeError("Failed to save reservation fee. Check Firestore rules.");
    } finally {
      setSavingFee(false);
    }
  };

  const startEditingRoom = (room: RoomType) => {
    setEditingRate(room.id);
    setEditingPrice(String(room.basePrice));
  };

  const cancelEditingRoom = () => {
    setEditingRate(null);
    setEditingPrice("");
  };

  const saveRoomPrice = async (roomId: string) => {
    const newPrice = Number(editingPrice);

    if (!editingPrice || Number.isNaN(newPrice) || newPrice <= 0) {
      alert("Please enter a valid room price.");
      return;
    }

    try {
      setSavingRoomPrice(true);

      console.log("Updating room price:", roomId, newPrice);

      await updateDoc(doc(db, "roomTypes", roomId), {
        basePrice: newPrice,
      });

      const room = roomTypes.find((item) => item.id === roomId);

      await createActivityLog({
        action: "Updated Room Price",
        details: room
          ? `Updated the price of "${room.name}" from ₱${room.basePrice.toLocaleString()} to ₱${newPrice.toLocaleString()} per night.`
          : `Updated room price to ₱${newPrice.toLocaleString()} per night.`,
        status: "success",
      });

      setRoomTypes((previous) =>
        previous.map((room) =>
          room.id === roomId
            ? {
                ...room,
                basePrice: newPrice,
              }
            : room,
        ),
      );
      alert("Room price updated successfully.");

      cancelEditingRoom();
    } catch (error) {
      console.error("Error updating room price:", error);

      alert("Failed to update room price. Check your Firestore rules.");
    } finally {
      setSavingRoomPrice(false);
    }
  };

  const saveItemPrice = async (item: PricedItem) => {
    const originalPrice = Number(itemOriginalPrice);
    const discount = Number(itemDiscount);
    const newPrice = item.kind === "package"
      ? packagePriceFromDiscount(originalPrice, discount)
      : Number(itemPrice);
    if ((item.kind === "service" && (itemPrice.trim() === "" || !Number.isFinite(newPrice) || newPrice < 0)) ||
      (item.kind === "package" && (itemOriginalPrice.trim() === "" || !Number.isFinite(originalPrice) || originalPrice < 0 ||
        itemDiscount.trim() === "" || !Number.isFinite(discount) || discount < 0 || discount > 100))) {
      alert("Enter a valid price and a package discount from 0 to 100%.");
      return;
    }

    setSavingItemPrice(true);
    try {
      await updateDoc(doc(db, item.kind === "service" ? "services" : "packages", item.id),
        item.kind === "service"
          ? { price: newPrice }
          : { originalPrice, packagePrice: newPrice, discount },
      );
      setPricedItems((current) => current.map((entry) =>
        entry.id === item.id && entry.kind === item.kind
          ? { ...entry, price: newPrice, originalPrice: item.kind === "package" ? originalPrice : entry.originalPrice, discount: item.kind === "package" ? discount : entry.discount }
          : entry,
      ));
      setEditingItem(null);
      setItemPrice("");
      setItemOriginalPrice("");
      setItemDiscount("");
      void createActivityLog({
        action: item.kind === "service" ? "Updated Service Price" : "Updated Package Price",
        details: item.kind === "package"
          ? `Updated package "${item.name}": original ₱${originalPrice.toLocaleString()}, package ₱${newPrice.toLocaleString()}, ${discount}% off.`
          : `Updated service "${item.name}" from ₱${item.price.toLocaleString()} to ₱${newPrice.toLocaleString()}.`,
        status: "success",
      }).catch((error) => console.error("Failed to record price change:", error));
    } catch (error) {
      console.error("Error updating service or package price:", error);
      alert("Failed to update price. Check your Firestore rules.");
    } finally {
      setSavingItemPrice(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Pricing / Rate Management
          </h1>

          <p className="text-gray-500 mt-2">
            Set and manage room, service, and package rates
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <Edit className="w-4 h-4 text-blue-600" />

          <span>
            Click <span className="font-medium text-blue-600">Edit</span> on any
            row to update rates
          </span>
        </div>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />

          <h2 className="text-lg font-semibold text-gray-900">
            Current Room Rates
          </h2>
        </div>

        {loadingRooms && (
          <div className="py-10 text-center text-gray-500">
            Loading room types...
          </div>
        )}

        {!loadingRooms && roomError && (
          <div className="py-10 flex flex-col items-center justify-center text-red-500">
            <AlertCircle className="w-6 h-6 mb-2" />

            <p>{roomError}</p>
          </div>
        )}

        {!loadingRooms && !roomError && roomTypes.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            No room types found.
          </div>
        )}

        {!loadingRooms && !roomError && roomTypes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Room Type
                  </th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Current Price
                  </th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Available Rooms
                  </th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Max Guests
                  </th>

                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {roomTypes.map((room, index) => (
                  <Fragment key={room.id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {room.image ? (
                            <img
                              src={room.image}
                              alt={room.name}
                              className="w-12 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <span className="text-xs text-gray-400">
                                No image
                              </span>
                            </div>
                          )}

                          <div>
                            <p className="font-medium text-gray-900">
                              {room.name}
                            </p>

                            <p className="text-xs text-gray-500">
                              ID: {displayRecordId(room.id, "RT")}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-blue-600 font-semibold">
                          ₱{room.basePrice.toLocaleString()}
                        </span>

                        <span className="text-xs text-gray-500 ml-1">
                          /night
                        </span>
                      </td>

                      <td className="py-3 px-4 text-gray-700">{room.count}</td>

                      <td className="py-3 px-4 text-gray-700">
                        {room.maxGuests}
                      </td>

                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit room price"
                          onClick={() =>
                            editingRate === room.id
                              ? cancelEditingRoom()
                              : startEditingRoom(room)
                          }
                        >
                          {editingRate === room.id ? (
                            <X className="w-4 h-4" />
                          ) : (
                            <Edit className="w-4 h-4" />
                          )}
                        </Button>
                      </td>
                    </tr>

                    {editingRate === room.id && (
                      <tr className="bg-blue-50 border-b border-blue-100">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="max-w-md">
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              Current Price (₱/night)
                            </label>

                            <input
                              type="number"
                              min="0"
                              value={editingPrice}
                              onChange={(e) => setEditingPrice(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              disabled={savingRoomPrice}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => saveRoomPrice(room.id)}
                            >
                              <Save className="w-3 h-3 mr-1" />

                              {savingRoomPrice ? "Saving..." : "Save Changes"}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={savingRoomPrice}
                              onClick={cancelEditingRoom}
                            >
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {(["service", "package"] as const).map((kind) => {
        const items = pricedItems.filter((item) => item.kind === kind);
        return (
          <Card key={kind} className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Current {kind === "service" ? "Service" : "Package"} Prices
              </h2>
            </div>

            {loadingItems ? (
              <div className="py-10 text-center text-gray-500">Loading prices...</div>
            ) : itemError ? (
              <div className="py-10 text-center text-red-500">{itemError}</div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                No {kind === "service" ? "services" : "packages"} found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                        {kind === "service" ? "Service" : "Package"}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                        {kind === "service" ? "Category" : "Included Services"}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Current Price</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const editKey = `${item.kind}:${item.id}`;
                      return (
                        <Fragment key={editKey}>
                          <tr className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{item.description || "—"}</td>
                            <td className="py-3 px-4">
                              <span className="text-blue-600 font-semibold">₱{item.price.toLocaleString()}</span>
                              {kind === "package" && item.originalPrice ? (
                                <span className="ml-2 text-xs text-gray-500">
                                  Original ₱{item.originalPrice.toLocaleString()} · {packageDiscountPercent(item.originalPrice, item.price)}% off
                                </span>
                              ) : null}
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                title={`Edit ${kind} price`}
                                disabled={savingItemPrice}
                                onClick={() => {
                                  if (editingItem === editKey) {
                                    setEditingItem(null);
                                    setItemPrice("");
                                    setItemOriginalPrice("");
                                    setItemDiscount("");
                                  } else {
                                    setEditingItem(editKey);
                                    setItemPrice(String(item.price));
                                    setItemOriginalPrice(String(item.originalPrice ?? 0));
                                    setItemDiscount(String(packageDiscountPercent(item.originalPrice ?? 0, item.price)));
                                  }
                                }}
                              >
                                {editingItem === editKey ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                              </Button>
                            </td>
                          </tr>
                          {editingItem === editKey && (
                            <tr className="bg-blue-50 border-b border-blue-100">
                              <td colSpan={4} className="px-4 py-4">
                                {kind === "package" && (
                                  <div className="max-w-md mb-3">
                                    <label className="text-xs font-medium text-gray-600 block mb-1">Original Price (₱)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={itemOriginalPrice}
                                      onChange={(event) => setItemOriginalPrice(event.target.value)}
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                )}
                                {kind === "package" && (
                                  <div className="max-w-md mb-3">
                                    <label className="text-xs font-medium text-gray-600 block mb-1">Discount (%)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      value={itemDiscount}
                                      onChange={(event) => setItemDiscount(event.target.value)}
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                )}
                                <div className="max-w-md">
                                  <label className="text-xs font-medium text-gray-600 block mb-1">
                                    {kind === "service" ? "Service Price (₱)" : "Package Price (₱)"}
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={kind === "package"
                                      ? itemOriginalPrice !== "" && itemDiscount !== ""
                                        ? packagePriceFromDiscount(Number(itemOriginalPrice), Number(itemDiscount)) : ""
                                      : itemPrice}
                                    onChange={kind === "service" ? (event) => setItemPrice(event.target.value) : undefined}
                                    readOnly={kind === "package"}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                {kind === "package" && <p className="mt-2 text-xs text-gray-600">Package price is calculated from the original price and discount.</p>}
                                <div className="flex gap-2 mt-4">
                                  <Button
                                    size="sm"
                                    disabled={savingItemPrice}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => void saveItemPrice(item)}
                                  >
                                    <Save className="w-3 h-3 mr-1" />
                                    {savingItemPrice ? "Saving..." : "Save Changes"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={savingItemPrice}
                                    onClick={() => { setEditingItem(null); setItemPrice(""); setItemOriginalPrice(""); setItemDiscount(""); }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Reservation Fee Configuration
          </h2>
        </div>

        <p className="text-sm text-gray-500 mb-5">
          Set the percentage added to the customer's booking subtotal.
        </p>

        {loadingFee ? (
          <p className="text-sm text-gray-500 py-4">
            Loading reservation fee...
          </p>
        ) : (
          <div className="max-w-lg">
            <label
              htmlFor="reservationFee"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Reservation Fee (%)
            </label>

            <div className="flex items-center gap-3">
              <input
                id="reservationFee"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={reservationFee}
                onChange={(e) => {
                  setReservationFee(e.target.value);
                  setFeeError("");
                  setFeeMessage("");
                }}
                disabled={savingFee}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter percentage"
              />
              <span className="font-semibold text-gray-700">%</span>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Example: 5 means a 5% reservation fee. Set to 0 to disable it.
            </p>

            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs text-blue-700 mb-1">
                Example on a ₱9,111 subtotal
              </p>
              <p className="text-sm text-gray-700">
                Reservation fee:{" "}
                <strong>
                  ₱
                  {Math.ceil(
                    (9111 * (Number(reservationFee) || 0)) / 100,
                  ).toLocaleString("en-PH")}
                </strong>
              </p>
              <p className="text-sm text-gray-700 mt-1">
                Estimated total:{" "}
                <strong>
                  ₱
                  {(
                    9111 +
                    Math.ceil((9111 * (Number(reservationFee) || 0)) / 100)
                  ).toLocaleString("en-PH")}
                </strong>
              </p>
            </div>

            {feeError && (
              <p className="text-sm text-red-600 mt-3">{feeError}</p>
            )}

            {feeMessage && (
              <p className="text-sm text-green-600 mt-3">{feeMessage}</p>
            )}

            <div className="mt-4">
              <Button
                disabled={savingFee || loadingFee}
                onClick={saveReservationFee}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {savingFee ? "Saving..." : "Save Reservation Fee"}
              </Button>
            </div>
          </div>
        )}
      </Card>


    </div>
  );
}
