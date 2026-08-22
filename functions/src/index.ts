import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import {GoogleGenAI} from "@google/genai";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

type GeminiError = {
  status?: number;
  message?: string;
  cause?: {
    code?: string;
  };
};

setGlobalOptions({
  maxInstances: 10,
});

initializeApp();

const db = getFirestore();

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  logger.error("GEMINI_API_KEY is not configured.");
}

const ai = geminiApiKey ?
  new GoogleGenAI({
    apiKey: geminiApiKey,
  }) :
  null;

export const resortAI = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({
      error: "Only POST requests are allowed.",
    });
    return;
  }

  try {
    const {message} = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({
        error: "Message is required.",
      });
      return;
    }

    logger.info("Starting Firestore query...");

    const [roomTypesSnapshot, servicesSnapshot, packagesSnapshot] =
      await Promise.all([
        db.collection("roomTypes").get(),
        db.collection("services").get(),
        db.collection("packages").get(),
      ]);

    logger.info("Firestore queries completed", {
      roomTypes: roomTypesSnapshot.size,
      services: servicesSnapshot.size,
      packages: packagesSnapshot.size,
    });

    const roomTypes = roomTypesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const services = servicesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const packages = packagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const resortData = `
REAL RESORT DATA FROM FIRESTORE

ROOM TYPES:
${JSON.stringify(roomTypes, null, 2)}

SERVICES:
${JSON.stringify(services, null, 2)}

PACKAGES:
${JSON.stringify(packages, null, 2)}
`;

    const prompt = `
You are Cunag, the AI concierge for Coral Bay Resort.

Answer the customer's question using the REAL resort data provided below.

IMPORTANT RULES:

1. Use the Firestore data as the source of truth.
2. Do not invent rooms, services, packages, prices, amenities, or availability.
3. If the requested information is 
not in the database, say that you do not have that information.
4. Give clear and friendly answers.
5. If prices exist in the database, include them when useful.
6. If the customer asks about rooms, use the roomTypes data.
7. If the customer asks about activities or services, use the services data.
8. If the customer asks about packages, use the packages data.
9. Do not expose database IDs unless necessary.
10. You are a resort concierge, so keep answers helpful and concise.

REAL DATABASE DATA:
${resortData}

CUSTOMER QUESTION:
${message}
`;
    if (!ai) {
      res.status(500).json({
        error: "Gemini API key is not configured.",
      });
      return;
    }

    let result;
    let lastError;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
        });

        break;
      } catch (error: unknown) {
        lastError = error;

        const geminiError = error as GeminiError;

        const status = geminiError.status;
        const errorCode = geminiError.cause?.code;

        logger.warn(`Gemini attempt ${attempt} failed`, {
          status,
          errorCode,
          message: geminiError.message,
        });

        if (
          status === 503 ||
          status === 429 ||
          errorCode === "ECONNRESET" ||
          errorCode === "ETIMEDOUT" ||
          errorCode === "ECONNREFUSED"
        ) {
          if (attempt < 3) {
            const delay = attempt * 1500;

            logger.info(`Retrying Gemini in ${delay}ms...`);

            await new Promise((resolve) => setTimeout(resolve, delay));

            continue;
          }
        }

        throw error;
      }
    }

    if (!result) {
      throw lastError || new Error("Gemini request failed.");
    }

    const response = result.text || "Sorry, I couldn't generate a response.";

    logger.info("Cunag AI response generated successfully.");

    res.status(200).json({
      response,
    });
  } catch (error) {
    logger.error("resortAI function error:", error);

    res.status(500).json({
      error: "Unable to process your request.",
    });
  }
});
