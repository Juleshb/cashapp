import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import toast from 'react-hot-toast';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { user, verifyEmail, resendVerification, isLoading } = useAuth();
  const [countdown, setCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const otpValue = watch('otp', '');

  // Countdown timer for resend button
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Redirect if already verified or if user has no email
  useEffect(() => {
    if (user?.isEmailVerified) {
      navigate('/dashboard');
    }
    
    // If user has no email, redirect to dashboard (no need to verify)
    if (user && !user.email) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Auto-submit when OTP is complete (6 digits)
  useEffect(() => {
    if (otpValue && otpValue.length === 6 && /^\d{6}$/.test(otpValue)) {
      handleSubmit(onSubmit)();
    }
  }, [otpValue, handleSubmit]);

  const onSubmit = async (data) => {
    const result = await verifyEmail(data.otp);
    if (result.success) {
      toast.success('Email verified successfully!');
      navigate('/dashboard');
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setIsResending(true);
    const result = await resendVerification();
    setIsResending(false);
    
    if (result.success) {
      setCountdown(60); // 60 second cooldown
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-8">
            <p className="text-gray-600">Please log in to verify your email.</p>
            <Button 
              onClick={() => navigate('/login')} 
              className="mt-4"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">B-Bike</h1>
          <p className="text-gray-600 mt-2">Verify your email address</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Check Your Email</CardTitle>
            <CardDescription className="text-center">
              We've sent a 6-digit verification code to
              <br />
              <strong>{user.email || 'your email address'}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Verification Code
                </label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-widest"
                  error={errors.otp?.message}
                  {...register('otp', {
                    required: 'Verification code is required',
                    pattern: {
                      value: /^\d{6}$/,
                      message: 'Please enter a valid 6-digit code'
                    }
                  })}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/\D/g, '');
                    e.target.value = value;
                  }}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={isLoading || !otpValue || otpValue.length !== 6}
              >
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-4">
              <p className="text-sm text-gray-600">
                Didn't receive the code?
              </p>
              
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={countdown > 0 || isResending}
                loading={isResending}
                className="w-full"
              >
                {countdown > 0 
                  ? `Resend in ${formatTime(countdown)}`
                  : isResending 
                    ? 'Sending...' 
                    : 'Resend Code'
                }
              </Button>

              <div className="text-xs text-gray-500 space-y-2">
                <p>
                  • Check your spam/junk folder
                </p>
                <p>
                  • Make sure {user.email} is correct
                </p>
                <p>
                  • The code expires in 10 minutes
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600 mb-3">
                Need to use a different email?
              </p>
              <Button
                variant="ghost"
                onClick={() => navigate('/profile')}
                size="sm"
              >
                Update Email Address
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                Security Notice
              </h3>
              <p className="text-xs text-blue-700 mt-1">
                For your security, you must verify your email before accessing your wallet and making transactions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
