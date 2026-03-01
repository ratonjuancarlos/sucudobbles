export interface DeckSummary {
  id: string;
  name: string;
  description: string | null;
  faceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FaceInfo {
  id: string;
  label: string;
  imageUrl: string;
  createdAt: string;
}

export interface DeckDetail extends DeckSummary {
  faces: FaceInfo[];
}
