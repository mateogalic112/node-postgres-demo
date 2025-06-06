export const formatPaginatedResponse = <T extends { id: number }>(
  data: Array<T>,
  limit: number
) => {
  return {
    data,
    nextCursor: data.length === limit ? { id: data[data.length - 1].id } : null
  };
};

export const formatResponse = <T>(data: T) => {
  return { data };
};
