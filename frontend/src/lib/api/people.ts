import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "./client";

export interface Guide {
  id: number;
  name: string;
  specialty: string | null;
}

// Shape of GET /users in the backend; only the fields this page reads
interface GuideUser {
  id: number;
  name: string;
  role: string;
  guide: { specialty: string } | null;
}

// A guide's permissions on a package (#15, #25); a guide without a row has neither
export interface Authorization {
  guide_id: number;
  package_id: number;
  can_generate: boolean;
  can_validate: boolean;
}

export interface TravelGroup {
  id: number;
  name: string;
  guide_id: number;
  guide_name: string;
  package_id: number;
  package_name: string;
  start_date: string;
  end_date: string;
  tourist_count: number;
}

export interface EnrolledPackage {
  id: number;
  name: string;
}

export interface GroupTourist {
  id: number;
  name: string;
  email: string;
  age: number;
  packages: EnrolledPackage[];
  // Assigned in the group's package; null while unassigned
  itinerary_id: number | null;
}

export interface GuideForm {
  name: string;
  email: string;
  password: string;
  specialty: string;
}

// The backend keeps only name and guide (#3); package and dates come with the group's trip
export interface GroupForm {
  name: string;
  guide_id: number;
  package_id: number;
  start_date: string;
  end_date: string;
}

export interface TouristForm {
  name: string;
  email: string;
  // Only sent when creating the tourist
  password: string;
  age: number;
  travel_group_id: number;
  package_ids: number[];
}

// What saving a tourist needs to know about how it was before; null when creating one
export interface TouristBefore {
  tourist: GroupTourist;
  travel_group_id: number;
}

export async function getGuides(): Promise<Guide[]> {
  const users = await request<GuideUser[]>("/users?role=guide");
  // Filtered here too: the backend does not apply ?role yet
  return users
    .filter(user => user.role === "guide")
    .map(user => ({ id: user.id, name: user.name, specialty: user.guide?.specialty ?? null }));
}

export async function getAuthorizations(packageIds: number[]) {
  const lists = await Promise.all(
    packageIds.map(id => request<Authorization[]>(`/authorizations/packages/${id}`)),
  );
  return lists.flat();
}

// A guide left with no permission on a package loses the row instead of keeping one with both off
export function saveAuthorizations(changes: Authorization[]) {
  return Promise.all(
    changes.map(({ guide_id, package_id, can_generate, can_validate }) => {
      const path = `/authorizations/packages/${package_id}/guides/${guide_id}`;
      return can_generate || can_validate
        ? request<Authorization>(path, "PUT", { can_generate, can_validate })
        : request<void>(path, "DELETE");
    }),
  );
}

export function getTravelGroups() {
  return request<TravelGroup[]>("/travel-groups");
}

export function getGroupTourists(groupId: number) {
  return request<GroupTourist[]>(`/travel-groups/${groupId}/tourists`);
}

export function createGuide(form: GuideForm) {
  return request<{ id: number; name: string }>("/users", "POST", { role: "guide", ...form });
}

export function createGroup(form: GroupForm) {
  return request<TravelGroup>("/travel-groups", "POST", form);
}

// Bookings (#12): a tourist enrolled in a package
function setBookings(touristId: number, add: number[], remove: number[]) {
  return Promise.all([
    ...add.map(id => request(`/packages/${id}/bookings`, "POST", { tourist_id: touristId })),
    ...remove.map(id => request<void>(`/packages/${id}/bookings/${touristId}`, "DELETE")),
  ]);
}

export async function createTourist({ password, travel_group_id, package_ids, age, ...fields }: TouristForm) {
  const user = await request<{ id: number; name: string }>("/users", "POST", {
    role: "tourist",
    ...fields,
    password,
    age,
  });
  await request(`/travel-groups/${travel_group_id}/tourists/${user.id}`, "POST");
  await setBookings(user.id, package_ids, []);
  return user;
}

// A tourist belongs to one group (#193): moving it leaves the old group first
export async function updateTourist(
  { tourist, travel_group_id: fromGroup }: TouristBefore,
  { name, email, age, travel_group_id: toGroup, package_ids }: TouristForm,
) {
  const user = await request<{ id: number; name: string }>(`/users/${tourist.id}`, "PATCH", {
    name,
    email,
    tourist: { age },
  });
  if (toGroup !== fromGroup) {
    await request<void>(`/travel-groups/${fromGroup}/tourists/${tourist.id}`, "DELETE");
    await request(`/travel-groups/${toGroup}/tourists/${tourist.id}`, "POST");
  }

  const enrolled = tourist.packages.map(pkg => pkg.id);
  await setBookings(
    tourist.id,
    package_ids.filter(id => !enrolled.includes(id)),
    enrolled.filter(id => !package_ids.includes(id)),
  );
  return user;
}

export function useGuides() {
  return useQuery({ queryKey: ["users", { role: "guide" }], queryFn: getGuides });
}

export function useAuthorizations(packageIds: number[] | undefined) {
  return useQuery({
    queryKey: ["authorizations", packageIds],
    queryFn: () => getAuthorizations(packageIds ?? []),
    enabled: packageIds !== undefined,
  });
}

export function useSaveAuthorizations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveAuthorizations,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authorizations"] });
      // The packages list shows who holds permissions
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

export function useTravelGroups() {
  return useQuery({ queryKey: ["travel-groups"], queryFn: getTravelGroups });
}

export function useGroupTourists(groupId: number | null) {
  return useQuery({
    queryKey: ["travel-groups", groupId, "tourists"],
    queryFn: () => getGroupTourists(groupId!),
    enabled: groupId !== null,
  });
}

export function useCreateGuide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGuide,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["travel-groups"] }),
  });
}

export function useSaveTourist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ before, form }: { before: TouristBefore | null; form: TouristForm }) =>
      before ? updateTourist(before, form) : createTourist(form),
    // Also on error: saving takes several requests and the first ones may have gone through
    onSettled: () => {
      // Group counts and member lists, and the enrolled count of each package
      queryClient.invalidateQueries({ queryKey: ["travel-groups"] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}
