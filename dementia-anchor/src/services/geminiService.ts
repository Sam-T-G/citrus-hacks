import { GoogleGenAI } from "@google/genai";
import { SocialState } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface RobotInsight {
  moodAssessment: string;
  recommendedActivity: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export const analyzeInteractionLog = async (log: string[]): Promise<RobotInsight> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `You are the diagnostic module for the "Dementia Anchor" robot.
              Analyze the following log of visual cues and social states detected from the patient:
              
              LOG:
              ${log.join('\n')}
              
              Based on these cues, provide a JSON response with:
              1. moodAssessment: A 1-sentence assessment of the patient's emotional state.
              2. recommendedActivity: A suggestion for what the robot should do next (e.g., play music, suggest a walk).
              3. riskLevel: 'low', 'medium', or 'high' based on signs of distress.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      moodAssessment: result.moodAssessment || "Patient seems stable.",
      recommendedActivity: result.recommendedActivity || "Continue routine monitoring.",
      riskLevel: result.riskLevel || "low"
    };
  } catch (error) {
    console.error("Interaction Log Analysis Error:", error);
    return {
      moodAssessment: "Unable to assess mood accurately.",
      recommendedActivity: "Seek human caregiver oversight.",
      riskLevel: "medium"
    };
  }
};
