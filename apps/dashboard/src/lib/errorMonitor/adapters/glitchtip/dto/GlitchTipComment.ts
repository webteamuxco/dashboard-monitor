export interface GlitchTipCommentDto {
  id: string;
  dateCreated: string;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  data?: {
    text?: string;
  } | null;
}
