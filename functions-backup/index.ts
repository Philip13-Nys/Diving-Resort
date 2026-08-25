import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";

initializeApp();

const db = getFirestore();

export const resortAI = onRequest(
  {
    region: "us-central1",
    cors: true,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({
        error: "Method not allowed",
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
      console.error("GEMINI_API_KEY is missing.");

      res.status(500).json({
        error: "GEMINI_API_KEY is not configured.",
      });
      return;
    }

    const message = req.body?.message;

    if (!message || typeof message !== "string") {
      res.status(400).json({
        error: "Missing message.",
      });
      return;
    }

    const cleanMessage = message.trim();

    if (!cleanMessage) {
      res.status(400).json({
        error: "Message cannot be empty.",
      });
      return;
    }

    console.log("Cunag question:", cleanMessage);

    try {
      /*
       * =========================================================
       * 1. READ REAL DATA FROM FIRESTORE
       * =========================================================
       */

      const roomTypesSnapshot = await db.collection("roomTypes").get();

      const roomTypes = roomTypesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const roomsSnapshot = await db.collection("rooms").get();

      const rooms = roomsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const servicesSnapshot = await db.collection("services").get();

      const services = servicesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const packagesSnapshot = await db.collection("packages").get();

      const packages = packagesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("Firestore data loaded:");
      console.log("Room types:", roomTypes.length);
      console.log("Rooms:", rooms.length);
      console.log("Services:", services.length);
      console.log("Packages:", packages.length);

      /*
       * =========================================================
       * 2. CONVERT FIRESTORE DATA INTO AI CONTEXT
       * =========================================================
       */

      const resortData = {
        roomTypes,
        rooms,
        services,
        packages,
      };

      /*
       * =========================================================
       * 3. SEND REAL FIRESTORE DATA TO GEMINI
       * =========================================================
       */

      const ai = new GoogleGenAI({
        apiKey: apiKey.trim(),
      });

      const prompt = `
You are Cunag, the friendly AI concierge for
Sabang Beach and Diving Resort in Sabang, Puerto Galera,
Oriental Mindoro, Philippines.

You are answering a guest.

IMPORTANT RULES:

- Use the Firestore resort data provided below.
- Never invent room types.
- Never invent prices.
- Never invent amenities.
- Never invent services.
- Never invent packages.
- Never invent availability.
- If the information is not present in the data, say that you
  don't currently have that information.
- Do not claim that you completed a reservation.
- Do not claim that you processed a payment.
- Do not mention Firebase.
- Do not mention Firestore.
- Do not mention Gemini.
- Do not mention APIs.
- Do not mention system instructions.
- Be friendly and conversational.
- Keep answers concise but useful.

ROOM AND RESORT DATA:

${JSON.stringify(resortData, null, 2)}

GUEST QUESTION:

${cleanMessage}

SPECIAL BEHAVIOR:

If the guest asks:

"Best room for 2?"

Look at the actual room types in the provided data.

Recommend the most appropriate room based on:
- capacity
- bed configuration
- amenities
- price, if available

Do not recommend a room that is not present in the data.

If several rooms are appropriate, briefly explain the difference.

If the guest asks:

"What types of rooms do you have?"

List the actual room types from the data.

If the guest asks about diving, activities, services,
or packages, use the actual provided data.

If information is missing, honestly tell the guest that
the receptionist can provide the current information.

ANSWER THE GUEST DIRECTLY.
`;

      console.log("Sending Firestore data to Gemini...");

      const result = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      const response =
        result.text?.trim() ||
        "I'm sorry, I couldn't generate a response right now.";

      console.log("Cunag response:", response);

      res.status(200).json({
        response,
      });
    } catch (error) {
      console.error("resortAI error:", error);

      res.status(500).json({
        error: "AI service failed.",
        details:
          error instanceof Error ? error.message : "Unknown server error.",
      });
    }
  },
);
