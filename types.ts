
export enum Gender {
  MALE = 'male',
  FEMALE = 'female'
}

export enum ActivityLevel {
  SEDENTARY = 'sedentary',
  LIGHT = 'light',
  MODERATE = 'moderate',
  ACTIVE = 'active',
  VERY_ACTIVE = 'very_active'
}

export enum Goal {
  LOSE_WEIGHT = 'lose_weight',
  MAINTAIN = 'maintain',
  GAIN_MUSCLE = 'gain_muscle'
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  height: number;
  currentWeight: number;
  targetWeight: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  stepGoal: number;
}

export interface FoodLog {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: number;
}

export interface ExerciseLog {
  id: string;
  type: string;
  duration: number;
  caloriesBurned: number;
  timestamp: number;
}

export interface WeightLog {
  id: string;
  weight: number;
  timestamp: number;
}

export interface StepLog {
  id: string;
  steps: number;
  timestamp: number;
}

export interface HealthStats {
  bmi: number;
  bmr: number;
  tdee: number;
  dailyCalorieTarget: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
}
