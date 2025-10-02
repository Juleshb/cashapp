import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { referralAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import InvitedFriendsList from '../components/InvitedFriendsList';
import toast from 'react-hot-toast';

const Invite = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch referral statistics including invited friends
  const { data: referralStats, isLoading: referralLoading } = useQuery({
    queryKey: ['referralStats'],
    queryFn: () => referralAPI.getStats(),


  });



  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/register?ref=${user?.referralCode || 'user'}`;
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied to clipboard!');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
        {/* Modern Page Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-500/30 mb-6">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
            <span className="text-blue-300 text-sm font-medium">Referral System</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Invite Friends
          </h1>
          <p className="text-gray-300 text-base max-w-2xl mx-auto">
            Share the opportunity and earn rewards for every successful referral
          </p>
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Referral Link - Redesigned */}
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
              <div className="bg-gradient-to-r from-blue-600/80 via-purple-600/80 to-indigo-600/80 backdrop-blur-sm p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Your Referral Link</h3>
                      <p className="text-blue-100 text-sm">Share and earn rewards together</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">🎯</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {/* Referral Code Display */}
                <div className="mb-6">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl border border-blue-400/30">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-300 mb-1">Your Referral Code</div>
                      <div className="text-lg font-mono font-bold text-white bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
                        {user?.referralCode || 'USER123'}
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(user?.referralCode || 'USER123');
                        toast.success('Referral code copied!');
                      }}
                      className="ml-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy Code</span>
                    </Button>
                  </div>
                </div>

                {/* Full Referral Link */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">Complete Referral Link</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={`${window.location.origin}/register?ref=${user?.referralCode || 'user'}`}
                      readOnly
                      className="w-full px-4 py-3 pr-24 border border-white/20 rounded-xl bg-white/10 backdrop-blur-sm text-sm font-mono text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Button
                      onClick={copyReferralLink}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy Link</span>
                    </Button>
                  </div>
                </div>

                {/* Quick Share Options */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">Quick Share</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => {
                        const text = `Join B-Bike and start earning with daily task sessions! Use my referral link: ${window.location.origin}/register?ref=${user?.referralCode || 'user'}`;
                        navigator.clipboard.writeText(text);
                        toast.success('Message copied to clipboard!');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>Copy Message</span>
                    </Button>
                    <Button
                      onClick={() => {
                        const url = `${window.location.origin}/register?ref=${user?.referralCode || 'user'}`;
                        if (navigator.share) {
                          navigator.share({
                            title: 'Join B-Bike',
                            text: 'Start earning with daily task sessions!',
                            url: url
                          });
                        } else {
                          navigator.clipboard.writeText(url);
                          toast.success('Link copied to clipboard!');
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                      <span>Share</span>
                    </Button>
                  </div>
                </div>

                {/* Benefits Section */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-green-800">Referral Benefits</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-700">You earn <strong>5% commission</strong> on referrals</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-700">Both earn from <strong>Daily Task Earnings</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Invited Friends Section */}
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
              <div className="bg-gradient-to-r from-green-600/80 via-emerald-600/80 to-teal-600/80 backdrop-blur-sm p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Your Invited Friends</h3>
                      <p className="text-green-100 text-sm">Track your referrals and their VIP levels</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">👥</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {referralLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-slate-700/50 rounded-xl"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <InvitedFriendsList referralStats={referralStats} />
                )}
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Referral Statistics */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-3xl"></div>
              <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-2xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white">Your Referral Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {referralLoading ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-8 bg-slate-700/50 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <span className="text-gray-300 text-sm">Direct Referrals</span>
                        <span className="text-white font-bold text-lg">{referralStats?.data?.directReferrals || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <span className="text-gray-300 text-sm">Indirect Referrals</span>
                        <span className="text-white font-bold text-lg">{referralStats?.data?.indirectReferrals || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <span className="text-gray-300 text-sm">Total Bonuses</span>
                        <span className="text-green-400 font-bold text-lg">
                          ${(referralStats?.data?.totalBonuses || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <span className="text-gray-300 text-sm">Level 1 Bonuses</span>
                        <span className="text-blue-400 font-bold text-lg">
                          ${(referralStats?.data?.level1Bonuses || 0).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* How It Works */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl blur-3xl"></div>
              <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-2xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Share Your Link</h4>
                      <p className="text-sm text-gray-300">Send your referral link to friends</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Friend Joins</h4>
                      <p className="text-sm text-gray-300">They sign up using your link</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Earn Daily Rewards</h4>
                      <p className="text-sm text-gray-300">Both earn from daily task sessions</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Get Commission</h4>
                      <p className="text-sm text-gray-300">You earn 5% on their earnings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Rewards Info */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl blur-3xl"></div>
              <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-2xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white">Earning System</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <span className="text-sm text-gray-300">Daily Task Earnings</span>
                    <span className="font-medium text-green-400">24h Sessions</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <span className="text-sm text-gray-300">Direct Commission</span>
                    <span className="font-medium text-blue-400">5%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <span className="text-sm text-gray-300">Indirect Commission</span>
                    <span className="font-medium text-green-400">3%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <span className="text-sm text-gray-300">VIP Level Bonus</span>
                    <span className="font-medium text-purple-400">Higher Rates</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invite;
