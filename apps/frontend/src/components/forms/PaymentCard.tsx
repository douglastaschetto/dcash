interface PaymentCardProps {
  name: string;
  type: 'CREDIT_CARD' | 'CASH';
  color?: string;
  limit?: number;
  closingDay?: number;
  dueDay?: number;
  description?: string;
  icon?: string;
}

export function PaymentCard({ name, type, color, limit, closingDay, dueDay, description, icon }: PaymentCardProps) {
  const isCredit = type === 'CREDIT_CARD';

  return (
    <div className="bg-[#191919] rounded-xl overflow-hidden border border-zinc-800 w-80 shadow-lg hover:border-zinc-600 transition-all">
      {/* Topo com Cor/Capa personalizada */}
      <div 
        className="h-24 p-4 flex items-center justify-center text-3xl" 
        style={{ backgroundColor: color || '#2f2f2f' }}
      >
        {icon || '💳'}
      </div>

      <div className="p-4 space-y-3">
        <h3 className="text-zinc-100 font-semibold text-lg">{name}</h3>
        
        {/* Tags de status (Igual ao Notion) */}
        <div className="flex gap-2">
          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">
            {isCredit ? 'Cartão de Crédito' : 'À Vista'}
          </span>
          {description && (
            <span className="text-[10px] bg-blue-900/20 text-blue-400 px-2 py-0.5 rounded border border-blue-800/50">
              {description}
            </span>
          )}
        </div>

        {/* Informações Condicionais */}
        {isCredit ? (
          <div className="text-xs text-zinc-400 space-y-1 pt-2 border-t border-zinc-800/50">
            <p>🎯 O limite desse cartão é: <span className="text-zinc-200">R$ {limit}</span></p>
            <p>🔒 O fechamento da fatura é dia: <span className="text-zinc-200">{closingDay}</span></p>
            <p>🗓️ O vencimento da fatura é dia: <span className="text-zinc-200">{dueDay}</span></p>
          </div>
        ) : (
          <div className="text-xs text-zinc-500 italic pt-2">
            Forma de pagamento direto/à vista.
          </div>
        )}
      </div>
    </div>
  );
}