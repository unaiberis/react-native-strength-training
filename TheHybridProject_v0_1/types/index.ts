export type WorkoutStatus = "pending" | "completed";

export type Exercise = {
  id: string;
  name: string;
  videoUrl?: string;
  prescription: string;
  notes?: string;
};

export type Workout = {
  id: string;
  title: string;
  date: string;
  duration: string;
  status: WorkoutStatus;
  exercises: Exercise[];
};
