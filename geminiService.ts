
import { GoogleGenAI } from "@google/genai";
import { UserProfile, FoodLog, ExerciseLog, HealthStats } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getHealthInsights = async (
  profile: UserProfile,
  stats: HealthStats,
  recentFood: FoodLog[],
  recentExercise: ExerciseLog[],
  dailySteps: number
) => {
  const prompt = `
    Act as a professional nutritionist and fitness coach. Analyze this user data:
    
    Profile: ${JSON.stringify(profile)}
    Targets: ${JSON.stringify(stats)}
    Recent Meals: ${recentFood.map(f => `${f.name} (${f.calories}kcal)`).join(', ')}
    Recent Exercise: ${recentExercise.map(e => `${e.type} for ${e.duration}mins`).join(', ')}
    Today's Steps: ${dailySteps} (Goal: ${profile.stepGoal})

    Provide 3 short, actionable insights for today. 
    Focus on:
    1. Caloric balance.
    2. Macro distribution improvement.
    3. Activity level and steps.
    Keep it concise and supportive. Format as a bulleted list.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 250,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Keep up the great work! Focus on staying hydrated and hitting your protein targets.";
  }
};

export const askHealthQuestion = async (
  question: string,
  profile: UserProfile,
  stats: HealthStats,
  dailyTotals: any,
  history: { role: 'user' | 'model', text: string }[]
) => {
  const systemInstruction = `
    You are VitalTrack AI, a professional health, nutrition, and fitness assistant.
    User Profile: ${profile.name}, Age ${profile.age}, ${profile.gender}, Goal: ${profile.goal}.
    Current Stats: BMI ${stats.bmi}, Target Cal: ${stats.dailyCalorieTarget}kcal, Step Goal: ${profile.stepGoal}.
    Today's Progress: ${dailyTotals.caloriesIn}kcal consumed, ${dailyTotals.caloriesOut}kcal burned, ${dailyTotals.steps} steps taken.

    Rules:
    1. Provide evidence-based health and fitness advice.
    2. Be encouraging and concise.
    3. DISCLAIMER: Always remind the user that you are an AI and not a doctor if they ask about medical symptoms. Do not provide medical diagnoses.
    4. Use the user's specific data (calories, goals, steps) to personalize answers.
  `;

  try {
    const chatHistory = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { role: 'user', parts: [{ text: `System Context: ${systemInstruction}` }] },
        ...chatHistory,
        { role: 'user', parts: [{ text: question }] }
      ],
      config: {
        temperature: 0.8,
        maxOutputTokens: 500,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I'm having trouble connecting to my health database right now. Please try again in a moment!";
  }
};
