export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  moodleToken?: string;
}
