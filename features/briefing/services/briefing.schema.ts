type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
};

export function isMissingColumnError(
  error: PostgrestLikeError | null | undefined,
  columnName: string,
) {
  const code = typeof error?.code === "string" ? error.code : "";
  const message = typeof error?.message === "string" ? error.message : "";

  return (
    message.includes(columnName) &&
    (
      code === "42703" ||
      code === "PGRST204" ||
      code === "PGRST200" ||
      code === ""
    )
  );
}

export function isMissingCoverImageUrlError(
  error: PostgrestLikeError | null | undefined,
) {
  return isMissingColumnError(error, "cover_image_url");
}
