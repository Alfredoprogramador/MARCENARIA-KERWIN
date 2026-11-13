import React, { useState } from 'react';
import { FinancialEntry, Project } from '../../types/marcenaria';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Calendar,
  Filter,
  CheckCircle,
  Clock,
  Printer,
} from 'lucide-react';

interface FinanceProps {
  entries: FinancialEntry[];
  projects: Project[];
  onAddEntry: (entry: FinancialEntry) => void;
}

export const Finance: React.FC<FinanceProps> = ({
  entries,
  projects,
  onAddEntry,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New Entry Form State
  const [newEntry, setNewEntry] = useState<Partial<FinancialEntry>>({
    type: 'income',
    category: 'Entrada de Cliente',
    amount: 1500,
    description: '',
    paymentMethod: 'PIX',
    status: 'Confirmado',
    date: new Date().toISOString().split('T')[0],
  });

  // Calculate totals
  const totalIncome = entries
    .filter((e) => e.type === 'income' && e.status === 'Confirmado')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalExpense = entries
    .filter((e) => e.type === 'expense' && e.status === 'Confirmado')
    .reduce((acc, e) => acc + e.amount, 0);

  const netBalance = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;

  // Filtered list
  const filteredEntries = entries.filter((e) => {
    if (filterType === 'all') return true;
    return e.type === filterType;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.amount || !newEntry.description) return;

    const created: FinancialEntry = {
      id: `fin-${Date.now()}`,
      type: newEntry.type || 'income',
      category: newEntry.category as any,
      amount: Number(newEntry.amount),
      date: newEntry.date || new Date().toISOString().split('T')[0],
      description: newEntry.description,
      paymentMethod: newEntry.paymentMethod as any,
      status: 'Confirmado',
    };

    onAddEntry(created);
    setShowAddModal(false);
    setNewEntry({
      type: 'income',
      category: 'Entrada de Cliente',
      amount: 1500,
      description: '',
      paymentMethod: 'PIX',
      status: 'Confirmado',
      date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Financial Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Receita Mensal (Entradas)</span>
            <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500">Sinais e parcelas de clientes</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Despesas do Mês (Saídas)</span>
            <div className="p-1.5 rounded-lg bg-red-950/80 text-red-400 border border-red-800">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">
            R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500">MDF, ferragens, pessoal e fretes</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Saldo Líquido</span>
            <div className="p-1.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono ${netBalance >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
            R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500">Caixa operacional livre</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Margem Líquida</span>
            <div className="p-1.5 rounded-lg bg-blue-950/80 text-blue-400 border border-blue-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono">
            {profitMargin.toFixed(1)}%
          </div>
          <span className="text-[11px] text-slate-500">Saúde financeira do negócio</span>
        </div>
      </div>

      {/* Main Flow Table & Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition ${
                filterType === 'all'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos os Lançamentos ({entries.length})
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition ${
                filterType === 'income'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition ${
                filterType === 'expense'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              Saídas
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-slate-700 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Relatório</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-semibold shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Lançamento</span>
            </button>
          </div>
        </div>

        {/* Entries Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Descrição</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3">Forma de Pagamento</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEntries.map((e) => {
                const isIncome = e.type === 'income';
                return (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {new Date(e.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-200">{e.description}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-slate-800 text-[10px] px-2 py-0.5 rounded text-slate-300">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{e.paymentMethod}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> {e.status}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        isIncome ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {isIncome ? '+ ' : '- '}R$ {e.amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-200">
            <h3 className="font-semibold text-base mb-4 text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-500" /> Adicionar Movimentação Financeira
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewEntry({ ...newEntry, type: 'income', category: 'Entrada de Cliente' })}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    newEntry.type === 'income'
                      ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  + Entrada (Receita)
                </button>
                <button
                  type="button"
                  onClick={() => setNewEntry({ ...newEntry, type: 'expense', category: 'Compra MDF' })}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    newEntry.type === 'expense'
                      ? 'bg-red-600/30 text-red-400 border-red-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  - Saída (Despesa)
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sinal de 50% Cozinha Freijó"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="1"
                    value={newEntry.amount}
                    onChange={(e) => setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Categoria</label>
                  <select
                    value={newEntry.category}
                    onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    {newEntry.type === 'income' ? (
                      <>
                        <option value="Entrada de Cliente">Entrada de Cliente</option>
                        <option value="Parcela Obra">Parcela Obra</option>
                        <option value="Outros">Outros</option>
                      </>
                    ) : (
                      <>
                        <option value="Compra MDF">Compra MDF</option>
                        <option value="Ferragens">Ferragens</option>
                        <option value="Salários/Mão de Obra">Salários/Mão de Obra</option>
                        <option value="Ferramentas">Ferramentas</option>
                        <option value="Combustível/Frete">Combustível/Frete</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Forma de Pagamento</label>
                  <select
                    value={newEntry.paymentMethod}
                    onChange={(e) => setNewEntry({ ...newEntry, paymentMethod: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão Crédito">Cartão de Crédito</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
