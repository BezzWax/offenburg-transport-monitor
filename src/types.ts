export type SourceKind = "city-bus" | "regional-transport";

export interface TransportSource {
  id: string;
  name: string;
  url: string;
  kind: SourceKind;
}

export type NoticeStatus =
  | "major-disruption"
  | "partial-disruption"
  | "cancelled"
  | "information";

export interface TransportNotice {
  sourceId: string;
  sourceName: string;
  title: string;
  text: string;
  url: string;
  status: NoticeStatus;
}

export interface SourceResult {
  source: TransportSource;
  checkedAt: Date;
  notices: TransportNotice[];
  error?: string;
}
