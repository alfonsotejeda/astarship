import type { ItineraryReview } from "@/lib/api/itineraries";
import { itineraries, reviews } from "../data/itineraries";
import { findPackage } from "../data/packages";
import { findUser } from "../data/users";
import type { MockRoute } from "../types";

export const reviewRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/reviews",
    handler: ({ query, userId }): ItineraryReview[] => {
      const reviewer = query.get("reviewer") === "me" ? userId : Number(query.get("reviewer"));
      const since = new Date();
      since.setDate(since.getDate() - Number(query.get("days") ?? 3650));
      const sinceDate = since.toISOString().slice(0, 10);

      return reviews
        .filter(review => !reviewer || review.reviewer_id === reviewer)
        .filter(review => review.review_date >= sinceDate)
        .map(review => {
          const itinerary = itineraries.find(item => item.id === review.itinerary_id);
          return {
            itinerary_id: review.itinerary_id,
            package_name: findPackage(itinerary?.package_id ?? 0)?.name ?? "",
            guide_name: findUser(itinerary?.guide_id ?? 0)?.name ?? "",
            review_date: review.review_date,
            result: review.result,
            observations: review.observations,
          };
        });
    },
  },
];
