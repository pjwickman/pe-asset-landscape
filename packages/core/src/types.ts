/**
 * Domain model. Organizations only — no people. Keeping people out keeps the
 * public graph free of personal data and keeps the dataset simple.
 */

export type OrgKind =
  | "sponsor" // PE / growth equity / VC firm
  | "fund" // a specific fund vehicle of a sponsor
  | "company" // operating company (platform or add-on)
  | "strategic"; // corporate acquirer

export interface Organization {
  id: string; // stable slug, e.g. "warren-equity-partners"
  name: string;
  kind: OrgKind;
  aliases?: string[]; // used by entity resolution in the ingester
  website?: string;
  hqCountry?: string; // ISO 3166-1 alpha-2
  verticals?: string[]; // vertical ids, e.g. ["gis", "utilities"]
}

export type RelationshipType =
  | "owns" // sponsor/fund -> company (majority or control)
  | "minority_investment" // sponsor/fund -> company
  | "acquired" // company -> company (add-on / tuck-in)
  | "merged_into" // company -> company
  | "sold_to" // seller -> buyer (exit)
  | "fund_of"; // fund -> sponsor

export type RelationshipStatus = "approved" | "proposed" | "rejected";

export interface Relationship {
  id: string;
  from: string; // org id
  to: string; // org id
  type: RelationshipType;
  startDate?: string; // ISO date (YYYY, YYYY-MM or YYYY-MM-DD)
  endDate?: string; // set when ownership ended (exit)
  sourceUrl?: string; // public source the edge came from
  status: RelationshipStatus;
  note?: string;
}

export interface Vertical {
  id: string;
  name: string;
  parent?: string; // vertical id, for a simple taxonomy tree
}

export interface Graph {
  organizations: Organization[];
  relationships: Relationship[];
}

/** Query used by both the API and any future mobile client. */
export interface NeighborhoodQuery {
  root: string; // org id
  depth: number; // hop count, 1-3 in the UI
  verticals?: string[]; // keep company nodes tagged with any of these
  includeEnded?: boolean; // include relationships with an endDate (history)
  asOf?: string; // ISO date: only edges active on this date
}

export interface NeighborhoodResult extends Graph {
  /** hop distance from root for each returned org id */
  distance: Record<string, number>;
}
