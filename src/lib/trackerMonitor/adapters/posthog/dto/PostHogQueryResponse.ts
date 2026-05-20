export interface PostHogQueryResponseDto {
  results: Array<Array<number | string | null>>;
  columns?: string[];
  types?: string[];
}
