import express from "express";
import { SYSTEM_PROMPT } from "../ai/prompt.js";
import { executeAiQuery } from "../ai/actionHandler.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();


router.get("/", (req, res) => {
    res.json({
        message: "AI route is working"
    });
});

router.post("/query", async (req, res) => {
    try {
        const { query } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "GEMINI_API_KEY is not configured in .env" });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Use gemini-1.5-flash as it supports system instructions and is extremely fast for function calling/json
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const result = await model.generateContent(query);
        const aiText = result.response.text();

        // Parse the JSON directly (responseMimeType guarantees JSON)
        const resultJson = JSON.parse(aiText);

        if (!resultJson.sql) {
            throw new Error("AI did not return a valid SQL query.");
        }

        const actionResult = await executeAiQuery(resultJson.sql);

        res.json(actionResult);
    } catch (error: any) {
        console.error("AI Route Error:", error);
        res.status(500).json({ error: error.message || "An error occurred while processing the AI query" });
    }
});

export default router;