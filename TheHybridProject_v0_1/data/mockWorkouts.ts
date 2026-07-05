import { Workout } from "@/types";

export const todayWorkout: Workout = {
  id: "w01",
  title: "Fuerza tren inferior",
  date: "Hoy",
  duration: "55 min",
  status: "pending",
  exercises: [
    {
      id: "e01",
      name: "Sentadilla trasera",
      prescription: "4 x 6 · RIR 2",
      notes: "Controla la bajada y evita perder tensión lumbar."
    },
    {
      id: "e02",
      name: "Peso muerto rumano",
      prescription: "3 x 8 · RIR 2-3"
    },
    {
      id: "e03",
      name: "Split squat",
      prescription: "3 x 10/lado · RIR 2"
    }
  ]
};

export const weekDays = [
  { day: "L", number: "15", active: false, hasWorkout: true },
  { day: "M", number: "16", active: false, hasWorkout: false },
  { day: "X", number: "17", active: true, hasWorkout: true },
  { day: "J", number: "18", active: false, hasWorkout: true },
  { day: "V", number: "19", active: false, hasWorkout: false },
  { day: "S", number: "20", active: false, hasWorkout: true },
  { day: "D", number: "21", active: false, hasWorkout: false }
];
