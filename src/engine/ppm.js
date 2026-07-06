// Fixed ppm convention: (measured − theoretical) / theoretical × 1e6.
export function computePpm(measured, theoretical) {
  if (!theoretical) return 0;
  return ((measured - theoretical) / theoretical) * 1e6;
}
