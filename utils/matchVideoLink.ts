export const hasYoutubeLink = (value?: string | null): boolean => {
  if (typeof value !== 'string') return false;
  return value.trim().length > 0;
};
