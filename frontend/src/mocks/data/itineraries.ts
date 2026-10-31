import type { ItineraryDetail } from "@/lib/api/itineraries";

// What the fake generator returns, as compositions over the activities table
export const generatedTemplate = {
  days: [
    {
      day: 1,
      date: "2026-10-13",
      stops: [
        { activity_id: 1, start_time: "09:00:00" },
        { activity_id: 2, start_time: "10:30:00" },
        { activity_id: 3, start_time: "13:00:00" },
        { activity_id: 7, start_time: "16:00:00" },
      ],
    },
    {
      day: 2,
      date: "2026-10-14",
      stops: [
        { activity_id: 8, start_time: "09:00:00" },
        { activity_id: 5, start_time: "11:30:00" },
        { activity_id: 6, start_time: "15:00:00" },
        { activity_id: 9, start_time: "20:30:00" },
      ],
    },
  ],
  typeProportionActual: "50 / 25 / 25 %",
  discarded: [
    { activity_id: 4, reason: "esfuerzo alto a las 15:00 del día 2 rompía «Evitar esfuerzo alto al final del día»." },
  ],
};

// Itineraries created during the session; ids continue after the existing ones
export const itineraries: ItineraryDetail[] = [];

export const nextItineraryId = { value: 156 };
