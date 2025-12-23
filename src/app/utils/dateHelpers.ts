/**
 * Parsea una fecha en formato YYYY-MM-DD correctamente en la zona horaria local
 * Evita problemas de timezone donde "2025-12-20" se convierte a "2025-12-19"
 */
export function parseLocalDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  // Separar la fecha en componentes
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Crear fecha en zona horaria local (mes es 0-indexed)
  return new Date(year, month - 1, day);
}

/**
 * Compara si una fecha está vencida (solo compara días, ignora horas)
 */
export function isDateOverdue(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  
  const dueDate = parseLocalDate(dateString);
  if (!dueDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Resetear a medianoche
  dueDate.setHours(0, 0, 0, 0); // Resetear a medianoche
  
  return dueDate < today;
}
