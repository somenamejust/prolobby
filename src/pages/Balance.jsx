import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function BalancePage() {
  const { user, depositBalance, withdrawBalance } = useAuth();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [error, setError] = useState('');

  const handleDeposit = (e) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) { setError('Введите корректную сумму'); return; }
    depositBalance(amount);
    setDepositAmount('');
    setError('');
  };

  const handleWithdraw = (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) { setError('Введите корректную сумму'); return; }
    if (amount > (user.balance || 0)) { setError('Недостаточно средств'); return; }
    withdrawBalance(amount);
    setWithdrawAmount('');
    setError('');
  };

  if (!user) return <p>Загрузка...</p>;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto bg-dark-surface rounded-lg shadow-lg border border-gray-700 p-6">
        <h1 className="text-3xl font-bold text-white mb-2">Balance</h1>
        <p className="text-4xl font-bold text-brand-green mb-6">
          ${user.balance ? user.balance.toFixed(2) : '0.00'}
        </p>
        {error && <p className="text-brand-red text-center mb-4">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <form onSubmit={handleDeposit} className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Add funds</h2>
            <div>
              <label htmlFor="deposit" className="block text-sm font-medium text-gray-300">Sum</label>
              <input type="number" id="deposit" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="10.00"
                className="mt-1 block w-full px-3 py-2 bg-dark-bg border border-gray-600 rounded-md shadow-sm text-gray-200 ..."/>
            </div>
            <button type="submit" className="w-full bg-brand-green hover:bg-green-400 text-white font-bold py-2 px-4 rounded">Add funds</button>
          </form>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Withdraw funds</h2>
            <div>
              <label htmlFor="withdraw" className="block text-sm font-medium text-gray-300">Sum</label>
              <input type="number" id="withdraw" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="5.00"
                className="mt-1 block w-full px-3 py-2 bg-dark-bg border border-gray-600 rounded-md shadow-sm text-gray-200 ..."/>
            </div>
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-2 px-4 rounded">Withdraw</button>
          </form>
        </div>
      </div>
    </div>
  );
}