export interface IssueComment {
  id: string;
  dateCreated: string;
  text: string;
  authorName: string | null;
  authorEmail: string | null;
}
