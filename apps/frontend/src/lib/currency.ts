// Função para formatar valores monetários no padrão brasileiro (R$ 1.000,00)
export function fmtCurrency(value: number): string {
  // Verifica se o valor é válido
  if (isNaN(value) || value === null || value === undefined) {
    value = 0;
  }
  
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Função para formatar entrada de valores monetários no padrão de caixa eletrônico
export function formatCurrencyInput(value: string): string {
  // Remove tudo que não for número
  const digits = value.replace(/\D/g, '');
  
  // Se não tiver dígitos, retorna vazio
  if (digits.length === 0) return '';
  
  // Se tiver apenas um dígito, adiciona zero à esquerda e vírgula
  if (digits.length === 1) return '0,0' + digits;
  
  // Se tiver dois dígitos, adiciona zero à esquerda
  if (digits.length === 2) return '0,' + digits;
  
  // Para três ou mais dígitos, insere a vírgula antes dos últimos 2 dígitos (centavos)
  const integerPart = digits.slice(0, -2);
  const decimalPart = digits.slice(-2);
  
  // Formata a parte inteira com separador de milhar
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${formattedInteger},${decimalPart}`;
}

// Função para converter string formatada para número
export function parseCurrency(value: string): number {
  // Remove tudo que não for número ou vírgula
  const normalized = value.replace(/[^0-9,]/g, '').replace(',', '.');
  
  // Converte para número e arredonda para 2 casas decimais
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

// Componente de input monetário movido para currency-input.tsx