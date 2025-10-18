import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { toast } from 'react-hot-toast';

const AdminUserManagement = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const {
    data: usersData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['adminUsers', page, searchTerm],
    queryFn: async () => {
      const params = { 
        page, 
        limit: 20
      };
      
      if (searchTerm) params.search = searchTerm;
      
      const response = await adminAPI.getUsers(params);
      return response;
    },
    keepPreviousData: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // Extract data from API response with robust handling
  const users = useMemo(() => {
    if (!usersData) return [];
    
    // Handle different possible response structures
    if (Array.isArray(usersData)) {
      return usersData;
    }
    
    if (usersData.data && Array.isArray(usersData.data)) {
      return usersData.data;
    }
    
    if (usersData.data && usersData.data.data && Array.isArray(usersData.data.data)) {
      return usersData.data.data;
    }
    
    return [];
  }, [usersData]);
  
  const pagination = usersData?.data?.pagination || usersData?.pagination || null;

  const toggleUserStatusMutation = useMutation({
    mutationFn: (userId) => adminAPI.toggleUserStatus(userId),
    onSuccess: (data) => {
      toast.success(data?.data?.message || 'User status updated successfully!');
      queryClient.invalidateQueries(['adminUsers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update user status');
      console.error('Error toggling user status:', error);
    },
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-green-500/20 text-green-400' 
      : 'bg-red-500/20 text-red-400';
  };

  const getVerificationStatus = (user) => {
    const emailVerified = user.isEmailVerified ? '✅' : '❌';
    const phoneVerified = user.isPhoneVerified ? '✅' : '❌';
    return { emailVerified, phoneVerified };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="h-4 bg-white/20 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-white/20 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 mb-4">Failed to load users</div>
        <div className="text-gray-400 text-sm mb-4">
          Error: {error.message || 'Unknown error occurred'}
        </div>
        <Button onClick={() => window.location.reload()} className="bg-blue-500 hover:bg-blue-600">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <Button
            onClick={() => {
              queryClient.invalidateQueries(['adminUsers']);
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1"
          >
            🔄 Refresh
          </Button>
        </div>
        
        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search users by ID, name, email, phone, or referral code..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0 flex-1"
          />
        </div>
      </div>

      {/* Summary Stats */}
      {pagination && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white/10 rounded-lg p-3 md:p-4">
            <div className="text-xs md:text-sm text-gray-300">Total Users</div>
            <div className="text-lg md:text-2xl font-bold text-white">{pagination.totalItems}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 md:p-4">
            <div className="text-xs md:text-sm text-gray-300">Current Page</div>
            <div className="text-lg md:text-2xl font-bold text-white">{pagination.currentPage}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 md:p-4">
            <div className="text-xs md:text-sm text-gray-300">Total Pages</div>
            <div className="text-lg md:text-2xl font-bold text-white">{pagination.totalPages}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 md:p-4">
            <div className="text-xs md:text-sm text-gray-300">Items Per Page</div>
            <div className="text-lg md:text-2xl font-bold text-white">{pagination.itemsPerPage}</div>
          </div>
        </div>
      )}

      {/* Users List */}
      {!Array.isArray(users) || users.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <p className="text-gray-400">
            {!Array.isArray(users) ? 'Loading users...' : 'No users found'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => {
            const { emailVerified, phoneVerified } = getVerificationStatus(user);
            return (
              <Card key={user.id} className="backdrop-blur-xl bg-white/10 border border-white/20">
                <div className="p-4 md:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {user.fullName || user.email || user.phone || 'User'}
                        </h3>
                        <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(user.isActive)}`}>
                          {user.isActive ? 'Active' : 'Suspended'}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-300">Email:</span>
                          <span className="text-white ml-2">{user.email || 'N/A'}</span>
                          <span className="ml-2">{emailVerified}</span>
                        </div>
                        <div>
                          <span className="text-gray-300">Phone:</span>
                          <span className="text-white ml-2">{user.phone || 'N/A'}</span>
                          <span className="ml-2">{phoneVerified}</span>
                        </div>
                        <div>
                          <span className="text-gray-300">Referral Code:</span>
                          <span className="text-white font-mono ml-2">{user.referralCode}</span>
                        </div>
                        <div>
                          <span className="text-gray-300">Joined:</span>
                          <span className="text-white ml-2">{formatDate(user.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <div className="text-sm text-gray-300">Balance</div>
                        <div className="text-xl font-bold text-white">
                          {formatCurrency(user.wallet?.balance || 0)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          <div>Deposits: {formatCurrency(user.financialData?.totalDeposits || 0)}</div>
                          <div>Earnings: {formatCurrency(user.financialData?.dailyEarnings || 0)}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => toggleUserStatusMutation.mutate(user.id)}
                          disabled={toggleUserStatusMutation.isLoading}
                          className={`${
                            user.isActive 
                              ? 'bg-red-500 hover:bg-red-600 text-white' 
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          } text-sm px-3 py-1`}
                        >
                          {user.isActive ? 'Suspend' : 'Activate'}
                        </Button>
                        
                        <Button
                          onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1"
                        >
                          {selectedUser?.id === user.id ? 'Hide Details' : 'View Details'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* User Details (Expandable) */}
                  {selectedUser?.id === user.id && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                          <div className="text-xs text-green-400">Total Deposits</div>
                          <div className="text-lg font-bold text-green-400">
                            {formatCurrency(user.financialData?.totalDeposits || 0)}
                          </div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                          <div className="text-xs text-red-400">Total Withdrawals</div>
                          <div className="text-lg font-bold text-red-400">
                            {formatCurrency(user.financialData?.totalWithdrawals || 0)}
                          </div>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                          <div className="text-xs text-blue-400">Daily Earnings</div>
                          <div className="text-lg font-bold text-blue-400">
                            {formatCurrency(user.financialData?.dailyEarnings || 0)}
                          </div>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                          <div className="text-xs text-purple-400">Referral Earnings</div>
                          <div className="text-lg font-bold text-purple-400">
                            {formatCurrency(user.financialData?.referralEarnings || 0)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Financial Summary */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Financial Summary</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Total Deposits:</span>
                              <span className="text-green-400 font-semibold">
                                {formatCurrency(user.financialData?.totalDeposits || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Total Withdrawals:</span>
                              <span className="text-red-400 font-semibold">
                                {formatCurrency(user.financialData?.totalWithdrawals || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Daily Earnings:</span>
                              <span className="text-blue-400 font-semibold">
                                {formatCurrency(user.financialData?.dailyEarnings || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Referral Earnings:</span>
                              <span className="text-purple-400 font-semibold">
                                {formatCurrency(user.financialData?.referralEarnings || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Transaction Counts */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Transaction Counts</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Deposits:</span>
                              <span className="text-white font-semibold">
                                {user.financialData?.totalDepositsCount || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Withdrawals:</span>
                              <span className="text-white font-semibold">
                                {user.financialData?.totalWithdrawalsCount || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Referrals:</span>
                              <span className="text-white font-semibold">
                                {user._count?.referrals || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Net Profit:</span>
                              <span className={`font-semibold ${
                                (user.financialData?.totalDeposits || 0) - (user.financialData?.totalWithdrawals || 0) >= 0 
                                  ? 'text-green-400' 
                                  : 'text-red-400'
                              }`}>
                                {formatCurrency((user.financialData?.totalDeposits || 0) - (user.financialData?.totalWithdrawals || 0))}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Referral Information */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Referral Info</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Referral Code:</span>
                              <span className="text-white font-mono text-xs">{user.referralCode}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Referred By:</span>
                              <span className="text-white">
                                {user.referrer ? (
                                  <div className="text-right">
                                    <div>{user.referrer.fullName || 'N/A'}</div>
                                    <div className="text-xs text-gray-400">
                                      {user.referrer.email || user.referrer.phone || 'N/A'}
                                    </div>
                                  </div>
                                ) : (
                                  'None'
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Referrer ID:</span>
                              <span className="text-white font-mono text-xs">
                                {user.referrer?.id || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Account Details */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Account Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">User ID:</span>
                              <span className="text-white font-mono text-xs">{user.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Wallet ID:</span>
                              <span className="text-white font-mono text-xs">{user.wallet?.id || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Joined:</span>
                              <span className="text-white">{formatDate(user.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Last Updated:</span>
                              <span className="text-white">{formatDate(user.updatedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recent Activity Section */}
                      <div className="mt-6 pt-4 border-t border-white/20">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Activity Summary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-gray-400 mb-2">Transaction Summary</div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Total Transactions:</span>
                                <span className="text-white">
                                  {(user.financialData?.totalDepositsCount || 0) + (user.financialData?.totalWithdrawalsCount || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Success Rate:</span>
                                <span className="text-green-400">
                                  {(() => {
                                    const totalDeposits = user.financialData?.totalDepositsCount || 0;
                                    const totalWithdrawals = user.financialData?.totalWithdrawalsCount || 0;
                                    const totalTransactions = totalDeposits + totalWithdrawals;
                                    if (totalTransactions === 0) return 'N/A';
                                    const successRate = Math.round((totalDeposits / totalTransactions) * 100);
                                    return `${successRate}%`;
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-gray-400 mb-2">Earnings Summary</div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Total Earnings:</span>
                                <span className="text-blue-400">
                                  {formatCurrency((user.financialData?.dailyEarnings || 0) + (user.financialData?.referralEarnings || 0))}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Avg Daily:</span>
                                <span className="text-green-400">
                                  {formatCurrency((user.financialData?.dailyEarnings || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-gray-400 mb-2">Account Health</div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Status:</span>
                                <span className={`${user.isActive ? 'text-green-400' : 'text-red-400'}`}>
                                  {user.isActive ? 'Active' : 'Suspended'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Verification:</span>
                                <span className={`${user.isEmailVerified && user.isPhoneVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {user.isEmailVerified && user.isPhoneVerified ? 'Complete' : 'Pending'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded"
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, page - 2)) + i;
              return (
                <Button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-2 rounded ${
                    pageNum === page
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
            disabled={page === pagination.totalPages}
            className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
