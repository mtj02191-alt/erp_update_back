export const truncate = (value, limit = 15) => {
    if (!value) return '-';
    return value.length > limit ? value.slice(0, limit) + '...' : value;
  };
  