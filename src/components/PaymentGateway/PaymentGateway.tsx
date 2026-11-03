import React, { useState } from 'react';
import { Project, FinancialEntry } from '../../types/marcenaria';
import {
  CreditCard,
  QrCode,
  FileText,
  CheckCircle,
  Copy,
  Clock,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface PaymentGatewayProps {
  project: Project;
  onPaymentSuccess: (entry: FinancialEntry) => void;
}

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  project,
  onPaymentSuccess,
}) => {
  const [method, setMethod] = useState<'pix' | 'credit_card' | 'boleto'>('pix');
  const [installments, setInstallments] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentDone, setPaymentDone] = useState<boolean>(false);
  const [copiedPix, setCopiedPix] = useState<boolean>(false);

  // Card form state
  const [cardNumber, setCardNumber] = useState<string>('4532 •••• •••• 8891');
  const [cardHolder, setCardHolder] = useState<string>('MARIANA S ALENCAR');
  const [cardExpiry, setCardExpiry] = useState<string>('09/29');
  const [cardCvv, setCardCvv] = useState<string>('742');

  const totalAmount = project.budgetTotal;
  const pixDiscountAmount = totalAmount * 0.95; // 5% discount on PIX

  const pixKeyMock =
    '00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540' +
    pixDiscountAmount.toFixed(2) +
    '5802BR5925MARCENARIA PRO SISTEMAS6009SAO PAULO62070503***6304ABCD';

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKeyMock);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleConfirmPayment = () => {
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setPaymentDone(true);

      const amountPaid = method === 'pix' ? pixDiscountAmount : totalAmount;
      const entry: FinancialEntry = {
        id: `fin-${Date.now()}`,
        projectId: project.id,
        projectTitle: project.title,
        type: 'income',
        category: 'Entrada de Cliente',
        amount: amountPaid,
        date: new Date().toISOString().split('T')[0],
        description: `Pagamento recebido (${method === 'pix' ? 'PIX' : method === 'credit_card' ? `Cartão ${installments}x` : 'Boleto'}) - ${project.title}`,
        paymentMethod: method === 'pix' ? 'PIX' : method === 'credit_card' ? 'Cartão Crédito' : 'Boleto',
        status: 'Confirmado',
      };

      onPaymentSuccess(entry);
    }, 1800);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> Checkout Seguro & Gateway de Pagamentos
          </h3>
          <span className="text-xs text-slate-400">
            Projeto: {project.title} - Total: R$ {totalAmount.toFixed(2)}
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono">Ambiente Criptografado TLS 1.3</span>
      </div>

      {paymentDone ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-14 h-14 bg-emerald-950 border border-emerald-500 rounded-full flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-100">Pagamento Confirmado com Sucesso!</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            O valor foi registrado no Fluxo de Caixa da marcenaria e uma notificação push foi enviada
            para toda a equipe.
          </p>
          <button
            onClick={() => setPaymentDone(false)}
            className="text-xs text-amber-500 hover:underline pt-2"
          >
            Realizar outra transação de teste
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left: Method Selector */}
          <div className="md:col-span-5 space-y-3">
            <span className="text-xs text-slate-400 block font-medium">Selecione o Meio de Pagamento</span>

            <button
              onClick={() => setMethod('pix')}
              className={`w-full text-left p-3.5 rounded-xl border transition flex items-center gap-3 ${
                method === 'pix'
                  ? 'bg-amber-950/40 border-amber-500/80 text-slate-100 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
              }`}
            >
              <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                <QrCode className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-xs text-slate-200">PIX Instantâneo</div>
                <div className="text-[11px] text-emerald-400 font-medium">5% de Desconto à Vista</div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-100">
                R$ {pixDiscountAmount.toFixed(2)}
              </span>
            </button>

            <button
              onClick={() => setMethod('credit_card')}
              className={`w-full text-left p-3.5 rounded-xl border transition flex items-center gap-3 ${
                method === 'credit_card'
                  ? 'bg-amber-950/40 border-amber-500/80 text-slate-100 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
              }`}
            >
              <div className="p-2 rounded-lg bg-blue-950/80 text-blue-400 border border-blue-800">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-xs text-slate-200">Cartão de Crédito</div>
                <div className="text-[11px] text-slate-400">Em até 12x no cartão</div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-100">
                R$ {totalAmount.toFixed(2)}
              </span>
            </button>

            <button
              onClick={() => setMethod('boleto')}
              className={`w-full text-left p-3.5 rounded-xl border transition flex items-center gap-3 ${
                method === 'boleto'
                  ? 'bg-amber-950/40 border-amber-500/80 text-slate-100 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
              }`}
            >
              <div className="p-2 rounded-lg bg-purple-950/80 text-purple-400 border border-purple-800">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-xs text-slate-200">Boleto Bancário</div>
                <div className="text-[11px] text-slate-400">Vencimento em 3 dias úteis</div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-100">
                R$ {totalAmount.toFixed(2)}
              </span>
            </button>
          </div>

          {/* Right: Payment Details */}
          <div className="md:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            {method === 'pix' && (
              <div className="space-y-4 text-center">
                <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Código PIX válido por 30 minutos</span>
                </div>

                {/* QR Code Canvas */}
                <div className="mx-auto w-44 h-44 bg-white p-2 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                    <rect width="100" height="100" fill="white" />
                    <rect x="10" y="10" width="24" height="24" fill="black" />
                    <rect x="14" y="14" width="16" height="16" fill="white" />
                    <rect x="18" y="18" width="8" height="8" fill="black" />
                    <rect x="66" y="10" width="24" height="24" fill="black" />
                    <rect x="70" y="14" width="16" height="16" fill="white" />
                    <rect x="74" y="18" width="8" height="8" fill="black" />
                    <rect x="10" y="66" width="24" height="24" fill="black" />
                    <rect x="14" y="70" width="16" height="16" fill="white" />
                    <rect x="18" y="74" width="8" height="8" fill="black" />
                    <rect x="42" y="14" width="6" height="16" fill="black" />
                    <rect x="52" y="24" width="8" height="8" fill="black" />
                    <rect x="42" y="44" width="16" height="16" fill="black" />
                    <rect x="66" y="44" width="10" height="10" fill="black" />
                    <rect x="44" y="68" width="12" height="14" fill="black" />
                    <rect x="68" y="68" width="14" height="14" fill="black" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400">Valor com 5% de desconto à vista:</span>
                  <div className="text-2xl font-bold text-amber-400 font-mono">
                    R$ {pixDiscountAmount.toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixKeyMock}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[10px] text-slate-400 font-mono truncate"
                  />
                  <button
                    onClick={handleCopyPix}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                <button
                  disabled={isProcessing}
                  onClick={handleConfirmPayment}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                >
                  {isProcessing ? 'Confirmando no Banco Central...' : 'Simular Confirmação do PIX'}
                </button>
              </div>
            )}

            {method === 'credit_card' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Número do Cartão</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Nome Impresso no Cartão</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Validade (MM/AA)</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">CVV</label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Parcelamento</label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(parseInt(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    {[1, 2, 3, 4, 5, 6, 10, 12].map((i) => (
                      <option key={i} value={i}>
                        {i}x de R$ {(totalAmount / i).toFixed(2)} {i === 1 ? 'à vista' : 'sem juros'}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  disabled={isProcessing}
                  onClick={handleConfirmPayment}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 mt-2"
                >
                  {isProcessing ? 'Processando com a Operadora...' : `Pagar R$ ${totalAmount.toFixed(2)}`}
                </button>
              </div>
            )}

            {method === 'boleto' && (
              <div className="space-y-4 text-center">
                <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                <div>
                  <h5 className="text-xs font-semibold text-slate-200">Linha Digitável do Boleto</h5>
                  <p className="font-mono text-xs text-amber-400 select-all pt-1">
                    34191.79001 01043.510047 91020.150008 8 98450000{totalAmount.toFixed(0)}
                  </p>
                </div>

                <button
                  disabled={isProcessing}
                  onClick={handleConfirmPayment}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                >
                  {isProcessing ? 'Registrando Boleto...' : 'Simular Compensação do Boleto'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
