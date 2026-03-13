const FINANCIAL_ROLES = ['Admin', 'PMO', 'Executive'];

export function getUserRole() {
  try { return JSON.parse(localStorage.getItem('user'))?.role || 'Viewer'; } catch { return 'Viewer'; }
}

export function canViewFinancials() {
  return FINANCIAL_ROLES.includes(getUserRole());
}
