// GlitchTip's PostCommentSchema wraps the text in a `data` object whose only
// accepted key is `text` — the flat `{ text }` body Sentry's API accepts, and
// any extra key such as `email`, are both rejected with a 422. The author is
// resolved from the token's user.
export interface GlitchTipCommentPayloadDto {
  data: {
    text: string;
  };
}

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
