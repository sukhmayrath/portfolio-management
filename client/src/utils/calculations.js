export function calculateResourceCost(hourlyRate, allocatedHours) {
  return (hourlyRate || 0) * (allocatedHours || 0);
}

export function calculateOverheadCost(resourceCost, overheadPercentage) {
  return (resourceCost || 0) * ((overheadPercentage || 0) / 100);
}

export function calculateTotalCompanyCost(resourceCost, totalFacility, overheadCost) {
  return (resourceCost || 0) + (totalFacility || 0) + (overheadCost || 0);
}

export function calculateClientRevenue(allocatedHours, billingRate) {
  return (allocatedHours || 0) * (billingRate || 0);
}

export function calculateMargin(revenue, cost) {
  return (revenue || 0) - (cost || 0);
}

export function calculateMarginPercentage(revenue, cost) {
  if (!revenue || revenue === 0) return 0;
  return ((revenue - cost) / revenue) * 100;
}
