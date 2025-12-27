
import { UserProfile, HealthStats, Gender, ActivityLevel, Goal } from '../types';

export const calculateHealthStats = (profile: UserProfile): HealthStats => {
  const { age, gender, height, currentWeight, activityLevel, goal } = profile;

  // 1. BMI Calculation
  const heightInMeters = height / 100;
  const bmi = currentWeight / (heightInMeters * heightInMeters);

  // 2. BMR Calculation (Mifflin-St Jeor Equation)
  let bmr = 10 * currentWeight + 6.25 * height - 5 * age;
  if (gender === Gender.MALE) {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  // 3. TDEE (Total Daily Energy Expenditure)
  const activityMultipliers = {
    [ActivityLevel.SEDENTARY]: 1.2,
    [ActivityLevel.LIGHT]: 1.375,
    [ActivityLevel.MODERATE]: 1.55,
    [ActivityLevel.ACTIVE]: 1.725,
    [ActivityLevel.VERY_ACTIVE]: 1.9,
  };
  const tdee = bmr * activityMultipliers[activityLevel];

  // 4. Daily Calorie Target based on Goal
  let dailyCalorieTarget = tdee;
  if (goal === Goal.LOSE_WEIGHT) {
    dailyCalorieTarget -= 500; // Standard 500 cal deficit
  } else if (goal === Goal.GAIN_MUSCLE) {
    dailyCalorieTarget += 300; // Lean bulk surplus
  }

  // 5. Macro Distribution (Generic Split: 30% P, 40% C, 30% F)
  // Adjusted for GAIN_MUSCLE (40% P) or LOSE_WEIGHT (40% P)
  const proteinRatio = goal !== Goal.MAINTAIN ? 0.35 : 0.25;
  const fatRatio = 0.25;
  const carbsRatio = 1 - proteinRatio - fatRatio;

  const macros = {
    protein: Math.round((dailyCalorieTarget * proteinRatio) / 4), // 4 cal per gram
    carbs: Math.round((dailyCalorieTarget * carbsRatio) / 4), // 4 cal per gram
    fat: Math.round((dailyCalorieTarget * fatRatio) / 9), // 9 cal per gram
  };

  return {
    bmi: parseFloat(bmi.toFixed(1)),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    dailyCalorieTarget: Math.round(dailyCalorieTarget),
    macros,
  };
};

export const formatTimestamp = (ts: number): string => {
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
