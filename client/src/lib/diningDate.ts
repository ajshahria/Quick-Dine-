export const diningToday = () => new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Dhaka", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
