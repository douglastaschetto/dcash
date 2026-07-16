'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrencyInput, parseCurrency } from './currency';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  [key: string]: any;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = '0,00',
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState('');

  // Atualiza o valor exibido quando o valor muda
  useEffect(() => {
    setDisplayValue(formatCurrencyInput(value.toFixed(2).replace('.', ',')));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setDisplayValue(formatted);
    onChange(parseCurrency(formatted));
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      {...props}
    />
  );
};