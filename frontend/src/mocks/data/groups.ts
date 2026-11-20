export interface TravelGroupRecord {
  id: number;
  name: string;
  guide_id: number;
  package_id: number;
  start_date: string;
  end_date: string;
}

export interface MembershipRecord {
  tourist_id: number;
  travel_group_id: number;
}

export const travelGroups: TravelGroupRecord[] = [
  { id: 1, name: "Habana Octubre A", guide_id: 1, package_id: 1, start_date: "2026-10-13", end_date: "2026-10-15" },
  { id: 2, name: "Habana Septiembre B", guide_id: 3, package_id: 1, start_date: "2026-09-22", end_date: "2026-09-24" },
  { id: 3, name: "Viñales Septiembre", guide_id: 2, package_id: 2, start_date: "2026-09-15", end_date: "2026-09-17" },
  { id: 4, name: "Trinidad Agosto", guide_id: 2, package_id: 3, start_date: "2026-08-18", end_date: "2026-08-20" },
];

export const memberships: MembershipRecord[] = [
  { tourist_id: 6, travel_group_id: 1 },
  { tourist_id: 7, travel_group_id: 1 },
  { tourist_id: 8, travel_group_id: 1 },
  { tourist_id: 9, travel_group_id: 1 },
  { tourist_id: 10, travel_group_id: 1 },
  { tourist_id: 11, travel_group_id: 1 },
  { tourist_id: 12, travel_group_id: 2 },
  { tourist_id: 13, travel_group_id: 3 },
  { tourist_id: 14, travel_group_id: 3 },
  { tourist_id: 15, travel_group_id: 4 },
];
