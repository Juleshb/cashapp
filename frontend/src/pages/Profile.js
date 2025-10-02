import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { walletAPI, vipAPI, taskAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import UsdtDeposit from '../components/UsdtDeposit';
import UsdtWithdrawal from '../components/UsdtWithdrawal';
import DepositHistory from '../components/DepositHistory';
import WithdrawalHistory from '../components/WithdrawalHistory';
import WithdrawalHistoryPreview from '../components/WithdrawalHistoryPreview';
import ChangePassword from '../components/ChangePassword';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showDepositHistory, setShowDepositHistory] = useState(false);
  const [showWithdrawalHistory, setShowWithdrawalHistory] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Fetch user wallet stats
  const { data: walletStats, isLoading: walletLoading } = useQuery({
    queryKey: ['walletStats'],
    queryFn: () => {
      console.log('Profile: Executing wallet stats query...');
      return walletAPI.getStats();
    },
    onSuccess: (data) => {
      console.log('Profile: Wallet stats loaded:', data);
      console.log('Profile: Balance from wallet stats:', data?.data?.data?.balance);
    },
    onError: (error) => {
      console.error('Profile: Error loading wallet stats:', error);
    },
  });

  // Fetch user transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', { limit: 10 }],
    queryFn: () => walletAPI.getTransactions({ limit: 10, page: 1 }),
  });

  // Fetch earning session status
  const { data: earningStatus, isLoading: earningStatusLoading } = useQuery({
    queryKey: ['earningStatus'],
    queryFn: taskAPI.getEarningStatus,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });



  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTransactionIcon = (type) => {
    const icons = {
      'DEPOSIT': '💰',
      'WITHDRAWAL': '💸',
      'VIP_EARNINGS': '🚴',
      'REFERRAL_BONUS': '👥',
      'VIP_PAYMENT': '👑',
      'TASK_REWARD': '🎯'
    };
    return icons[type] || '📊';
  };

  const getTransactionColor = (type) => {
    const colors = {
      'DEPOSIT': 'text-green-500 bg-green-100',
      'WITHDRAWAL': 'text-red-500 bg-red-100',
      'VIP_EARNINGS': 'text-blue-500 bg-blue-100',
      'REFERRAL_BONUS': 'text-purple-500 bg-purple-100',
      'VIP_PAYMENT': 'text-yellow-500 bg-yellow-100',
      'TASK_REWARD': 'text-indigo-500 bg-indigo-100'
    };
    return colors[type] || 'text-gray-500 bg-gray-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-20 md:pb-0">
      {/* Modern Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">B-Bike</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-300">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        {/* Modern Profile Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-500/30 mb-6">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
            <span className="text-blue-300 text-sm font-medium">Profile Dashboard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            My Profile
          </h1>
          <p className="text-gray-300 text-base max-w-2xl mx-auto">
            Manage your account, view earnings, and track your progress
          </p>
        </div>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Account Balance */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <div className="relative backdrop-blur-xl bg-white/10 rounded-2xl p-6 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-300">Account Balance</div>
                  <div className="text-2xl font-bold text-white">
                    {walletLoading ? (
                      <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
                    ) : (
                      formatCurrency(walletStats?.data?.data?.balance || 0)
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={() => setShowDepositModal(true)}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm py-2 rounded-xl"
                >
                  💰 Deposit
                </Button>
                <Button
                  onClick={() => setShowWithdrawalModal(true)}
                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white text-sm py-2 rounded-xl"
                >
                  💸 Withdraw
                </Button>
              </div>
            </div>
          </div>

          {/* Total Deposits */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <div className="relative backdrop-blur-xl bg-white/10 rounded-2xl p-6 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-300">Total Deposits</div>
                  <div className="text-2xl font-bold text-white">
                    {walletLoading ? (
                      <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
                    ) : (
                      formatCurrency(walletStats?.data?.data?.totalDeposits || 0)
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  onClick={() => setShowDepositHistory(true)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm py-2 rounded-xl"
                >
                  📊 View History
                </Button>
              </div>
            </div>
          </div>

          {/* VIP Task Earnings */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <div className="relative backdrop-blur-xl bg-white/10 rounded-2xl p-6 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🚴</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-300">Daily Task Earnings</div>
                  <div className="text-2xl font-bold text-white">
                    {walletLoading ? (
                      <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
                    ) : (
                      formatCurrency(walletStats?.data?.data?.totalEarnings || 0)
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">From VIP tasks</div>
                </div>
              </div>
              
              {/* Earnings Progress - Show when task is active */}
              {earningStatus?.data?.data?.hasActiveSession && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-300">Session Progress</span>
                    <span className="text-xs text-green-400 font-medium">
                      {earningStatus.data.data.progress || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700/50 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${earningStatus.data.data.progress || 0}%`,
                        animation: 'pulse 2s infinite'
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                    <span>Started: {earningStatus.data.data.startTime ? new Date(earningStatus.data.data.startTime).toLocaleTimeString() : 'N/A'}</span>
                    <span>Ends: {earningStatus.data.data.endTime ? new Date(earningStatus.data.data.endTime).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                  <div className="mt-2 text-center">
                    <span className="text-xs text-green-400 font-medium">
                      Earning: {formatCurrency(earningStatus.data.data.currentEarnings || 0)}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <Button
                  onClick={() => window.location.href = '/tasks'}
                  className={`w-full text-sm py-2 rounded-xl ${
                    earningStatus?.data?.data?.hasActiveSession 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                      : 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white'
                  }`}
                >
                  {earningStatus?.data?.data?.hasActiveSession ? '🔄 View Progress' : '🎯 Start Task'}
                </Button>
              </div>
            </div>
          </div>

          {/* Referral Bonus */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <div className="relative backdrop-blur-xl bg-white/10 rounded-2xl p-6 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-300">Referral Bonus</div>
                  <div className="text-2xl font-bold text-white">
                    {walletLoading ? (
                      <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
                    ) : (
                      formatCurrency(walletStats?.data?.data?.totalReferralBonus || 0)
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">VIP commissions only</div>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  onClick={() => window.location.href = '/invite'}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white text-sm py-2 rounded-xl"
                >
                  👥 Invite Friends
                </Button>
              </div>
            </div>
          </div>

          {/* Withdrawal Statistics */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <div className="relative backdrop-blur-xl bg-white/10 rounded-2xl p-6 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">💸</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-300">Total Withdrawn</div>
                  <div className="text-2xl font-bold text-white">
                    {walletLoading ? (
                      <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
                    ) : (
                      formatCurrency(walletStats?.data?.data?.totalWithdrawn || 0)
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">All time</div>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  onClick={() => setShowWithdrawalHistory(true)}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-sm py-2 rounded-xl"
                >
                  📊 View History
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Transactions */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-3xl"></div>
              <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-2xl backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-white">Recent Transactions</CardTitle>
                      <CardDescription className="text-gray-300">
                        Your latest account activity and earnings
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setShowDepositModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded-lg"
                      >
                        💰 Deposit
                      </Button>
                      <Button
                        onClick={() => setShowWithdrawalModal(true)}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded-lg"
                      >
                        💸 Withdraw
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-16 bg-slate-700/50 rounded-xl"></div>
                        </div>
                      ))}
                    </div>
                  ) : transactions?.data?.transactions?.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.data.transactions.slice(0, 8).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:bg-slate-700/50 transition-all duration-200">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getTransactionColor(transaction.type)}`}>
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div>
                              <div className="font-medium text-white">{transaction.description}</div>
                              <div className="text-sm text-gray-400">{formatDate(transaction.createdAt)}</div>
                            </div>
                          </div>
                          <div className={`font-semibold text-lg ${
                            transaction.type === 'DEPOSIT' || transaction.type === 'VIP_EARNINGS' || transaction.type === 'REFERRAL_BONUS' 
                              ? 'text-green-400' 
                              : 'text-red-400'
                          }`}>
                            {transaction.type === 'DEPOSIT' || transaction.type === 'VIP_EARNINGS' || transaction.type === 'REFERRAL_BONUS' ? '+' : ''}{formatCurrency(transaction.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            {/* Recent Withdrawals */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-2xl blur-3xl"></div>
              <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-2xl backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-white">Recent Withdrawals</CardTitle>
                      <CardDescription className="text-gray-300">
                        Your latest withdrawal requests and their status
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => setShowWithdrawalHistory(true)}
                      className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-3 py-1 rounded-lg"
                    >
                      💸 View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <WithdrawalHistoryPreview />
                </CardContent>
              </Card>
            </div>

            {/* Account Statistics */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl blur-3xl"></div>
              <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-2xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white">Account Statistics</CardTitle>
                  <CardDescription className="text-gray-300">
                    Overview of your account activity and performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-center p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
                      <div className="text-3xl font-bold text-white mb-2">
                        {walletLoading ? '...' : formatCurrency(walletStats?.data?.data?.balance || 0)}
                      </div>
                      <div className="text-sm text-gray-300">Current Balance</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
                      <div className="text-3xl font-bold text-white mb-2">
                        {formatDate(user?.createdAt || new Date())}
                      </div>
                      <div className="text-sm text-gray-300">Member Since</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Profile */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-3xl"></div>
              <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-2xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white">Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                    <div className="p-3 bg-slate-700/30 rounded-lg text-white border border-slate-600/30">
                      {user?.fullName || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <div className="p-3 bg-slate-700/30 rounded-lg text-white border border-slate-600/30">
                      {user?.email || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                    <div className="p-3 bg-slate-700/30 rounded-lg text-white border border-slate-600/30">
                      {user?.phone || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Referral Code</label>
                    <div className="p-3 bg-slate-700/30 rounded-lg text-white font-mono border border-slate-600/30">
                      {user?.referralCode || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Member Since</label>
                    <div className="p-3 bg-slate-700/30 rounded-lg text-white border border-slate-600/30">
                      {formatDate(user?.createdAt || new Date())}
                    </div>
                  </div>
                  
                  {/* Change Password Button */}
                  <div className="pt-4">
                    <Button
                      onClick={() => setShowChangePassword(true)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white rounded-xl"
                    >
                      🔐 Change Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>



            {/* Withdrawal History */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-2xl blur-3xl"></div>
              <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-2xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white">Withdrawal History</CardTitle>
                  <CardDescription className="text-gray-300">
                    View your withdrawal requests and status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setShowWithdrawalHistory(true)}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl"
                  >
                    💸 View Withdrawals
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Admin Access */}
            {user?.isAdmin && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-2xl blur-3xl"></div>
                <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-2xl backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <Button
                      onClick={() => window.location.href = '/admin'}
                      className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl"
                    >
                      🔐 Admin Panel
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Logout */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-2xl blur-3xl"></div>
              <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-2xl backdrop-blur-sm">
                <CardContent className="pt-6">
                  <Button
                    onClick={handleLogout}
                    className="w-full bg-gradient-to-r from-gray-600 to-slate-700 hover:from-gray-700 hover:to-slate-800 text-white rounded-xl"
                  >
                    🚪 Logout
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showDepositModal && (
        <UsdtDeposit
          onClose={() => setShowDepositModal(false)}
        />
      )}

      {showWithdrawalModal && (
        <UsdtWithdrawal
          onClose={() => setShowWithdrawalModal(false)}
        />
      )}

      {showDepositHistory && (
        <DepositHistory
          onClose={() => setShowDepositHistory(false)}
        />
      )}

      {showWithdrawalHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/20 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Withdrawal History</h3>
                <Button
                  onClick={() => setShowWithdrawalHistory(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white"
                >
                  ✕
                </Button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                <WithdrawalHistory />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
};

export default Profile;
