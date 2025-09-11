import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vipAPI, walletAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import UsdtDeposit from './UsdtDeposit';
import toast from 'react-hot-toast';

const VipLevelsDisplay = () => {
  const queryClient = useQueryClient();
  const [selectedVip, setSelectedVip] = useState(null);
  const [showUsdtDeposit, setShowUsdtDeposit] = useState(false);
  const [vipToJoin, setVipToJoin] = useState(null);

  // Fetch VIP levels
  const { data: vipLevels, isLoading: vipLoading } = useQuery({
    queryKey: ['vipLevels'],
    queryFn: () => vipAPI.getLevels(),
  });

  // Fetch wallet stats to check balance
  const { data: walletStats } = useQuery({
    queryKey: ['walletStats'],
    queryFn: () => walletAPI.getStats(),
  });

  // Fetch VIP status
  const { data: vipStatus } = useQuery({
    queryKey: ['vipStatus'],
    queryFn: () => vipAPI.getStatus(),
  });

  // Join VIP mutation
  const joinVipMutation = useMutation({
    mutationFn: (vipLevelId) => vipAPI.joinVip(vipLevelId),
    onSuccess: () => {
      toast.success('Successfully joined VIP level!');
      queryClient.invalidateQueries(['walletStats']);
      queryClient.invalidateQueries(['vipStatus']);
      setSelectedVip(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to join VIP level');
    },
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getVipColor = (amount) => {
    if (amount >= 25000) return 'from-purple-500 to-pink-500';
    if (amount >= 12000) return 'from-yellow-400 to-orange-500';
    if (amount >= 6000) return 'from-blue-500 to-purple-500';
    if (amount >= 5000) return 'from-green-500 to-blue-500';
    if (amount >= 2000) return 'from-gray-400 to-gray-600';
    if (amount >= 1500) return 'from-purple-400 to-blue-500';
    if (amount >= 1000) return 'from-yellow-500 to-orange-400';
    if (amount >= 400) return 'from-gray-300 to-gray-500';
    if (amount >= 180) return 'from-orange-400 to-red-500';
    return 'from-green-400 to-blue-400';
  };

  const getVipIcon = (amount) => {
    if (amount >= 25000) return '👑';
    if (amount >= 12000) return '🏆';
    if (amount >= 6000) return '💎';
    if (amount >= 5000) return '⭐';
    if (amount >= 2000) return '🥈';
    if (amount >= 1500) return '🥉';
    if (amount >= 1000) return '🏅';
    if (amount >= 400) return '🔥';
    if (amount >= 180) return '⚡';
    return '🚀';
  };

  const handleJoinVip = (vipLevel) => {
    if (vipStatus?.data?.data?.userVip) {
      toast.error('You already have a VIP membership');
      return;
    }
    
    if (walletStats?.data?.balance < vipLevel.amount) {
      // Show USDT deposit modal instead of error
      setVipToJoin(vipLevel);
      setShowUsdtDeposit(true);
      return;
    }
    
    setSelectedVip(vipLevel);
  };

  const confirmJoinVip = () => {
    if (selectedVip) {
      joinVipMutation.mutate(selectedVip.id);
    }
  };

  if (vipLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const userBalance = walletStats?.data?.balance || 0;
  const hasVip = vipStatus?.data?.data?.userVip;
  const userVipLevel = vipStatus?.data?.data?.userVip?.vipLevel;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>VIP Investment Levels</span>
            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Balance: {formatCurrency(userBalance)}
            </span>
          </CardTitle>
          <CardDescription>
            Choose your investment level to start earning daily income
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile Grid - 2 columns */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {vipLevels?.data?.map((vip) => {
              const canAfford = userBalance >= vip.amount;
              const isCurrentVip = hasVip && userVipLevel?.id === vip.id;
              const dailyReturn = ((vip.dailyEarning / vip.amount) * 100).toFixed(2);
              
              return (
                <div
                  key={vip.id}
                  className={`relative overflow-hidden rounded-lg border transition-all duration-300 ${
                    isCurrentVip 
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-200' 
                      : canAfford && !hasVip
                        ? 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
                        : 'border-gray-200 opacity-60'
                  }`}
                  onClick={() => !hasVip && handleJoinVip(vip)}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${getVipColor(vip.amount)} opacity-10`}></div>
                  
                  <div className="relative p-3">
                    {/* VIP Icon and Name */}
                    <div className="text-center mb-2">
                      <div className="text-2xl mb-1">{getVipIcon(vip.amount)}</div>
                      <h3 className="font-bold text-sm text-gray-900">{vip.name}</h3>
                    </div>

                    {/* Investment Amount */}
                    <div className="text-center mb-2">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(vip.amount)}
                      </div>
                    </div>

                    {/* Daily Earning */}
                    <div className="text-center mb-2">
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(vip.dailyEarning)}/day
                      </div>
                      <div className="text-xs text-gray-500">
                        {dailyReturn}% daily
                      </div>
                    </div>

                    {/* Card Image */}
                    <div className="text-center mb-2">
                      <div className="w-full h-20 overflow-hidden rounded-md mx-auto border-4 border-red-500 bg-red-100 flex items-center justify-center">
                        <img 
                          src="/card.png" 
                          alt="VIP Card" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.log('Image failed to load:', e.target.src);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                          onLoad={() => console.log('Image loaded successfully')}
                        />
                        <div className="text-sm text-red-600 font-bold" style={{display: 'none'}}>
                          VIP CARD IMAGE
                        </div>
                      </div>
                    </div>

                    {/* Status/Action */}
                    <div className="text-center">
                      {isCurrentVip ? (
                        <div className="bg-green-500 text-white text-xs py-1 px-2 rounded-full">
                          Current VIP
                        </div>
                      ) : hasVip ? (
                        <div className="text-xs text-gray-500">
                          Unavailable
                        </div>
                      ) : canAfford ? (
                        <div className="bg-blue-500 text-white text-xs py-1 px-2 rounded-full hover:bg-blue-600 transition-colors">
                          Join Now
                        </div>
                      ) : (
                        <div className="text-xs text-red-500">
                          Join and deposit money
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* VIP Benefits Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">VIP Benefits:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Daily guaranteed earnings</li>
              <li>• 24-hour earning cycles</li>
              <li>• Withdraw earnings daily (min $10)</li>
              <li>• Automatic income generation</li>
              <li>• 💳 Exclusive VIP card included with each level</li>
              <li>• Premium membership benefits and features</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {selectedVip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{getVipIcon(selectedVip.amount)}</div>
              <h3 className="text-xl font-bold">Join VIP {selectedVip.name}</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Investment:</span>
                <span className="font-semibold">{formatCurrency(selectedVip.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Daily Earning:</span>
                <span className="font-semibold text-green-600">{formatCurrency(selectedVip.dailyEarning)}</span>
              </div>
              <div className="flex justify-between">
                <span>Daily Return:</span>
                <span className="font-semibold text-blue-600">
                  {((selectedVip.dailyEarning / selectedVip.amount) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>💳 VIP Card:</span>
                <span className="font-semibold text-blue-600">Included</span>
              </div>
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <strong>Benefits:</strong> Premium membership card with exclusive features
              </div>
              <div className="flex justify-between">
                <span>Balance After:</span>
                <span className="font-semibold">
                  {formatCurrency(userBalance - selectedVip.amount)}
                </span>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setSelectedVip(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmJoinVip}
                disabled={joinVipMutation.isLoading}
                className="flex-1"
              >
                {joinVipMutation.isLoading ? 'Joining...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* USDT Deposit Modal */}
      {showUsdtDeposit && (
        <UsdtDeposit
          onClose={() => {
            setShowUsdtDeposit(false);
            setVipToJoin(null);
          }}
          vipLevel={vipToJoin}
        />
      )}
    </div>
  );
};

export default VipLevelsDisplay;
