export function getAuthHeaders() {
  const userEmail = localStorage.getItem("user-email");
  const teamId = localStorage.getItem("current-team-id");
  
  return {
    ...(userEmail && { 'x-user-email': userEmail }),
    ...(teamId && { 'x-team-id': teamId }),
  };
}
