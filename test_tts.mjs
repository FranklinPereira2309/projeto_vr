import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
(async () => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: ["Say clearly: hello"],
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            }
        });
        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData) {
            console.log("MIME TYPE:", part.inlineData.mimeType);
            console.log("DATA LENGTH:", part.inlineData.data?.length);
        } else {
            console.log("NO INLINE DATA:", JSON.stringify(part));
        }
    } catch (e) {
        console.error(e);
    }
})();
