export type Stream = "Science" | "Mathematics" | "TechnicalMath" | "Management" | "Literature" | "Languages";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  stream: Stream;
  createdAt: string;
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  stream: string;
  createdAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface CommunityPost {
  id?: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export const STREAMS_SUBJECTS: Record<Stream, string[]> = {
  Science: ["Mathematics", "Physics", "Natural Sciences", "Arabic", "Philosophy", "Islamic Education", "French", "English", "History and Geography"],
  Mathematics: ["Mathematics", "Physics", "Arabic", "Philosophy", "Islamic Education", "French", "English", "History and Geography", "Computer Science"],
  TechnicalMath: ["Mathematics", "Physics", "Technical Drawing", "Arabic", "Islamic Education", "French", "English", "History"],
  Management: ["Mathematics", "Economics", "Management", "Arabic", "Islamic Education", "French", "English", "History and Geography"],
  Literature: ["Arabic", "Philosophy", "Islamic Education", "French", "English", "History and Geography", "Foreign Language"],
  Languages: ["Arabic", "French", "English", "Foreign Language 2", "Philosophy", "Islamic Education", "History"]
};
