import { useCurrentUser } from "@/app/providers/auth/AuthContext";
import { GuideView } from "./GuideView";
import { TouristView } from "./TouristView";
import "./RequestsPage.css";

// The guide attends the requests; the tourist sends them and follows them
export function RequestsPage() {
  const user = useCurrentUser();
  return user.role === "guide" ? <GuideView /> : <TouristView />;
}
