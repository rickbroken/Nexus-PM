/**
 * Formatea un número a formato colombiano (COP)
 * - Separador de miles: punto (.)
 * - Sin decimales
 * - Ejemplo: 10000000 -> "10.000.000"
 * - Ejemplo: 5000 -> "5.000"
 */
export function formatCurrency(amount: number): string {
  // Redondear para quitar decimales
  const roundedAmount = Math.round(amount);
  
  // Formatear con separador de miles (punto)
  return roundedAmount.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Formatea un número a formato colombiano con símbolo de pesos
 * - Ejemplo: 10000000 -> "$10.000.000"
 */
export function formatCurrencyWithSymbol(amount: number): string {
  return `$${formatCurrency(amount)}`;
}

/**
 * Parsea un string en formato colombiano a número
 * - Ejemplo: "10.000.000" -> 10000000
 * - Ejemplo: "$5.000" -> 5000
 */
export function parseCurrency(value: string): number {
  // Remover símbolo de pesos y espacios
  const cleaned = value.replace(/[$\s]/g, '');
  
  // Remover puntos (separadores de miles)
  const withoutDots = cleaned.replace(/\./g, '');
  
  // Convertir a número
  const number = parseFloat(withoutDots);
  
  return isNaN(number) ? 0 : number;
}

/**
 * Formatea un input mientras el usuario escribe
 * - Mantiene el cursor en la posición correcta
 * - Agrega puntos como separadores de miles automáticamente
 */
export function formatCurrencyInput(value: string): string {
  // Remover todo excepto números
  const numbers = value.replace(/\D/g, '');
  
  // Si está vacío, retornar vacío
  if (!numbers) return '';
  
  // Convertir a número y formatear
  const number = parseInt(numbers, 10);
  return formatCurrency(number);
}
