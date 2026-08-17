import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Edit, TrendingUp, Calendar, X, Save, AlertCircle } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../app/firebase";

type RoomType = {
  id: string;
  name: string;
  basePrice: number;
  count: number;
  maxGuests: number;
  amenities: string[];
  image: string;
};

type PricingRule = {
  id: string;
  name: string;
  period: string;
  multiplier: string;
  status: string;
  affectedRooms: string;
};

export default function PricingManagement() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomError, setRoomError] = useState("");
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>("");
  const [savingRoomPrice, setSavingRoomPrice] = useState(false);

  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [ruleError, setRuleError] = useState("");

  const [editingRule, setEditingRule] = useState<string | null>(null);

  const [editingRuleData, setEditingRuleData] = useState<PricingRule | null>(
    null,
  );

  const [savingRule, setSavingRule] = useState(false);

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

        setRoomTypes(data);
      } catch (error) {
        console.error("Error loading room types:", error);

        setRoomError("Failed to load room types.");
      } finally {
        setLoadingRooms(false);
      }
    };

    loadRoomTypes();
  }, []);

  useEffect(() => {
    const loadPricingRules = async () => {
      try {
        setLoadingRules(true);
        setRuleError("");

        console.log("Loading pricing rules...");
        const snapshot = await getDocs(collection(db, "pricingRules"));
        console.log("Pricing rules found:", snapshot.size);
        const rules: PricingRule[] = snapshot.docs.map((ruleDoc) => {
          const data = ruleDoc.data();
          console.log("Pricing rule:", ruleDoc.id, data);
          return {
            id: ruleDoc.id,
            name: typeof data.name === "string" ? data.name : "Unnamed Rule",
            period: typeof data.period === "string" ? data.period : "",
            multiplier:
              typeof data.multiplier === "string"
                ? data.multiplier
                : String(data.multiplier ?? ""),
            status: typeof data.status === "string" ? data.status : "active",
            affectedRooms:
              typeof data.affectedRooms === "string" ? data.affectedRooms : "",
          };
        });

        setPricingRules(rules);
      } catch (error) {
        console.error("Error loading pricing rules:", error);

        setRuleError("Failed to load pricing rules.");
      } finally {
        setLoadingRules(false);
      }
    };

    loadPricingRules();
  }, []);

  /*ROOM PRICE EDIT*/

  const startEditingRoom = (room: RoomType) => {
    setEditingRate(room.id);
    setEditingPrice(String(room.basePrice));
  };

  const cancelEditingRoom = () => {
    setEditingRate(null);
    setEditingPrice("");
  };

  /*SAVE ROOM PRICE*/

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

  /*PRICING RULE EDIT*/

  const startEditingRule = (rule: PricingRule) => {
    setEditingRule(rule.id);

    setEditingRuleData({
      ...rule,
    });
  };

  const cancelEditingRule = () => {
    setEditingRule(null);
    setEditingRuleData(null);
  };

  /*UPDATE PRICING RULE FIELD*/

  const updateRuleField = (field: keyof PricingRule, value: string) => {
    setEditingRuleData((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        [field]: value,
      };
    });
  };

  /*SAVE PRICING RULE*/

  const savePricingRule = async () => {
    if (!editingRuleData) {
      return;
    }

    if (!editingRuleData.name.trim()) {
      alert("Please enter a rule name.");
      return;
    }

    if (!editingRuleData.period.trim()) {
      alert("Please enter a period.");
      return;
    }

    if (!editingRuleData.multiplier.trim()) {
      alert("Please enter a price multiplier.");
      return;
    }

    if (!editingRuleData.affectedRooms.trim()) {
      alert("Please enter the affected rooms.");
      return;
    }

    try {
      setSavingRule(true);

      console.log("Updating pricing rule:", editingRuleData.id);

      await updateDoc(doc(db, "pricingRules", editingRuleData.id), {
        name: editingRuleData.name,
        period: editingRuleData.period,
        multiplier: editingRuleData.multiplier,
        status: editingRuleData.status,
        affectedRooms: editingRuleData.affectedRooms,
      });

      setPricingRules((previous) =>
        previous.map((rule) =>
          rule.id === editingRuleData.id ? editingRuleData : rule,
        ),
      );

      alert("Pricing rule updated successfully.");

      cancelEditingRule();
    } catch (error) {
      console.error("Error updating pricing rule:", error);

      alert("Failed to update pricing rule. Check your Firestore rules.");
    } finally {
      setSavingRule(false);
    }
  };

  /*RENDER*/

  return (
    <div className="p-8">
      {/*HEADER*/}

      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Pricing / Rate Management
          </h1>

          <p className="text-gray-500 mt-2">
            Set and manage room rates and pricing policies
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <Edit className="w-4 h-4 text-blue-600" />

          <span>
            Click <span className="font-medium text-blue-600">Edit</span> on any
            row to update rates or rules
          </span>
        </div>
      </div>

      {/*CURRENT ROOM RATES*/}

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />

          <h2 className="text-lg font-semibold text-gray-900">
            Current Room Rates
          </h2>
        </div>

        {/* LOADING */}

        {loadingRooms && (
          <div className="py-10 text-center text-gray-500">
            Loading room types...
          </div>
        )}

        {/* ERROR */}

        {!loadingRooms && roomError && (
          <div className="py-10 flex flex-col items-center justify-center text-red-500">
            <AlertCircle className="w-6 h-6 mb-2" />

            <p>{roomError}</p>
          </div>
        )}

        {/* EMPTY */}

        {!loadingRooms && !roomError && roomTypes.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            No room types found.
          </div>
        )}

        {/* TABLE */}

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
                {roomTypes.map((room) => (
                  <Fragment key={room.id}>
                    {/* ROOM ROW */}

                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      {/* ROOM TYPE */}

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
                              ID: {room.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* PRICE */}

                      <td className="py-3 px-4">
                        <span className="text-blue-600 font-semibold">
                          ₱{room.basePrice.toLocaleString()}
                        </span>

                        <span className="text-xs text-gray-500 ml-1">
                          /night
                        </span>
                      </td>

                      {/* AVAILABLE ROOMS */}

                      <td className="py-3 px-4 text-gray-700">{room.count}</td>

                      {/* MAX GUESTS */}

                      <td className="py-3 px-4 text-gray-700">
                        {room.maxGuests}
                      </td>

                      {/* ACTION */}

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

                    {/* ROOM PRICE EDIT */}

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

      {/* PRICING RULES */}

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />

          <h2 className="text-lg font-semibold text-gray-900">
            Pricing Rules & Policies
          </h2>
        </div>

        {/* LOADING */}

        {loadingRules && (
          <div className="py-10 text-center text-gray-500">
            Loading pricing rules...
          </div>
        )}

        {/* ERROR */}

        {!loadingRules && ruleError && (
          <div className="py-10 flex flex-col items-center justify-center text-red-500">
            <AlertCircle className="w-6 h-6 mb-2" />

            <p>{ruleError}</p>
          </div>
        )}

        {/* EMPTY */}

        {!loadingRules && !ruleError && pricingRules.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            No pricing rules found.
          </div>
        )}

        {/* RULES */}

        {!loadingRules && !ruleError && pricingRules.length > 0 && (
          <div className="space-y-4">
            {pricingRules.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 border rounded-lg transition-colors ${
                  editingRule === rule.id
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                {/*EDITING RULE*/}

                {editingRule === rule.id ? (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* NAME */}

                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Rule Name
                        </label>

                        <input
                          value={editingRuleData?.name || ""}
                          onChange={(e) =>
                            updateRuleField("name", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* PERIOD */}

                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Period
                        </label>

                        <input
                          value={editingRuleData?.period || ""}
                          onChange={(e) =>
                            updateRuleField("period", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* MULTIPLIER */}

                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Price Multiplier
                        </label>

                        <input
                          value={editingRuleData?.multiplier || ""}
                          onChange={(e) =>
                            updateRuleField("multiplier", e.target.value)
                          }
                          placeholder="Example: 1.5x"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* AFFECTED ROOMS */}

                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Affected Rooms
                        </label>

                        <input
                          value={editingRuleData?.affectedRooms || ""}
                          onChange={(e) =>
                            updateRuleField("affectedRooms", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* STATUS */}

                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Status
                        </label>

                        <select
                          value={editingRuleData?.status || "active"}
                          onChange={(e) =>
                            updateRuleField("status", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="active">Active</option>

                          <option value="scheduled">Scheduled</option>

                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    {/* SAVE / CANCEL */}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={savingRule}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={savePricingRule}
                      >
                        <Save className="w-3 h-3 mr-1" />

                        {savingRule ? "Saving..." : "Save Changes"}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={savingRule}
                        onClick={cancelEditingRule}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {rule.name}
                        </h3>

                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            rule.status === "active"
                              ? "bg-green-100 text-green-800"
                              : rule.status === "scheduled"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {rule.status.charAt(0).toUpperCase() +
                            rule.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        {/* PERIOD */}

                        <div>
                          <p className="text-xs text-gray-500">Period</p>

                          <p className="text-sm text-gray-900 mt-1">
                            {rule.period}
                          </p>
                        </div>

                        {/* MULTIPLIER */}

                        <div>
                          <p className="text-xs text-gray-500">
                            Price Multiplier
                          </p>

                          <p className="text-sm font-semibold text-blue-600 mt-1">
                            {rule.multiplier}
                          </p>
                        </div>

                        {/* ROOMS */}

                        <div>
                          <p className="text-xs text-gray-500">
                            Affected Rooms
                          </p>

                          <p className="text-sm text-gray-900 mt-1">
                            {rule.affectedRooms}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* EDIT */}

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Edit pricing rule"
                        onClick={() => startEditingRule(rule)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
