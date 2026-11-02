import { useCurrentUser } from "@/app/providers/auth/AuthContext";
import { GuideView } from "./GuideView";
import { TouristView } from "./TouristView";
import "./RatingsPage.css";

// The guide sees the ratings of their activities; the tourist, their own grouped by package
export function RatingsPage() {
  const user = useCurrentUser();
  return user.role === "guide" ? <GuideView /> : <TouristView />;
}
