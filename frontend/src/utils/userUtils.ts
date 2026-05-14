export const getUserRank = (points: number) => {
  if (points >= 100) return { title: "ЛЕГЕНДА", color: "text-yellow-500" };
  if (points >= 50) return { title: "ПЕРВООТКРЫВАТЕЛЬ", color: "text-blue-500" };
  if (points >= 10) return { title: "ИССЛЕДОВАТЕЛЬ", color: "text-gray-400" };
  return { title: "НОВИЧОК", color: "text-gray-300" };
};