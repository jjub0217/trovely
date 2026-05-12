export type ReelWithRelations = {
  id: string;
  url: string;
  thumbnail: string | null;
  memo: string | null;
  review: string | null;
  visited: boolean;
  source: "instagram" | "youtube";
  categories: { category: { id: string; name: string } }[];
  tags: { tag: { id: string; name: string } }[];
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryOption = {
  id: string;
  name: string;
};

export type TagOption = {
  id: string;
  name: string;
  reelCount?: number;
};
