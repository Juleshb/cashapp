const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { updateWalletBalance } = require('../services/walletService');
const { sendEmail } = require('../services/emailService');

const prisma = new PrismaClient();
const router = express.Router();

// Apply admin authentication to all routes
router.use(authenticateToken, requireAdmin);

// Get all users for manual deposit selection
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ max: 100 }).withMessage('Search term too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    // Build search conditions
    const whereConditions = {
      isActive: true
    };

    if (search) {
      whereConditions.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereConditions,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          wallet: {
            select: {
              balance: true,
              totalDeposits: true,
              totalWithdrawals: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.user.count({ where: whereConditions })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching users for manual deposit:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

// Get user details for manual deposit
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        wallet: {
          select: {
            balance: true,
            totalDeposits: true,
            totalWithdrawals: true
          }
        },
        deposits: {
          select: {
            id: true,
            amount: true,
            currency: true,
            network: true,
            status: true,
            depositType: true,
            createdAt: true,
            adminNotes: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      error: 'Failed to fetch user details',
      message: error.message
    });
  }
});

// Create manual deposit for user
router.post('/manual-deposit', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('currency').isIn(['USDT', 'USDC', 'BUSD', 'BNB', 'ETH', 'MATIC']).withMessage('Invalid currency'),
  body('network').isIn(['BEP20', 'TRC20', 'ERC20', 'POLYGON']).withMessage('Invalid network'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long'),
  body('sendEmail').optional().isBoolean().withMessage('Send email must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, amount, currency, network, notes, sendEmail = true } = req.body;
    const adminId = req.user.id;

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        wallet: {
          select: {
            balance: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        error: 'User inactive',
        message: 'Cannot deposit to inactive user'
      });
    }

    // Create manual deposit in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create deposit record
      const deposit = await tx.deposit.create({
        data: {
          userId,
          amount: parseFloat(amount),
          currency,
          network,
          depositType: 'MANUAL_ADMIN',
          status: 'CONFIRMED', // Manual deposits are immediately confirmed
          adminNotes: notes || `Manual deposit by admin ${req.user.email}`,
          webhookData: {
            manualDeposit: true,
            adminId: adminId,
            adminEmail: req.user.email,
            processedAt: new Date().toISOString()
          }
        }
      });

      // Update user wallet balance
      const walletUpdate = await updateWalletBalance(
        userId,
        parseFloat(amount),
        'DEPOSIT',
        `Manual deposit: ${amount} ${currency} via ${network}`,
        deposit.id
      );

      return { deposit, walletUpdate };
    });

    // Send email notification if requested
    if (sendEmail) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Manual Deposit Confirmed - Trinity Metro Bike',
          template: 'manual-deposit-confirmation',
          data: {
            fullName: user.fullName,
            amount: amount,
            currency: currency,
            network: network,
            newBalance: user.wallet.balance + parseFloat(amount),
            adminNotes: notes || 'Manual deposit processed by administrator'
          }
        });
        console.log(`✅ Email sent to ${user.email} for manual deposit`);
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the deposit if email fails
      }
    }

    // Log admin action
    console.log(`✅ Manual deposit created by admin ${req.user.email}:`, {
      userId,
      amount,
      currency,
      network,
      depositId: result.deposit.id
    });

    res.json({
      success: true,
      message: 'Manual deposit created successfully',
      data: {
        deposit: result.deposit,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          newBalance: user.wallet.balance + parseFloat(amount)
        }
      }
    });

  } catch (error) {
    console.error('Error creating manual deposit:', error);
    res.status(500).json({
      error: 'Failed to create manual deposit',
      message: error.message
    });
  }
});

// Get manual deposit history
router.get('/manual-deposits', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('userId').optional().isUUID().withMessage('Invalid user ID'),
  query('dateFrom').optional().isISO8601().withMessage('Invalid date format'),
  query('dateTo').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Build filter conditions
    const whereConditions = {
      depositType: 'MANUAL_ADMIN'
    };

    if (req.query.userId) {
      whereConditions.userId = req.query.userId;
    }

    if (req.query.dateFrom || req.query.dateTo) {
      whereConditions.createdAt = {};
      if (req.query.dateFrom) {
        whereConditions.createdAt.gte = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        whereConditions.createdAt.lte = new Date(req.query.dateTo);
      }
    }

    // Get manual deposits with pagination
    const [deposits, totalCount] = await Promise.all([
      prisma.deposit.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.deposit.count({ where: whereConditions })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: deposits,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching manual deposits:', error);
    res.status(500).json({
      error: 'Failed to fetch manual deposits',
      message: error.message
    });
  }
});

// Get manual deposit statistics
router.get('/manual-deposits/stats', async (req, res) => {
  try {
    const stats = await prisma.deposit.aggregate({
      where: {
        depositType: 'MANUAL_ADMIN'
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    // Get stats by currency
    const currencyStats = await prisma.deposit.groupBy({
      by: ['currency'],
      where: {
        depositType: 'MANUAL_ADMIN'
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    // Get stats by network
    const networkStats = await prisma.deposit.groupBy({
      by: ['network'],
      where: {
        depositType: 'MANUAL_ADMIN'
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    res.json({
      success: true,
      data: {
        total: {
          amount: stats._sum.amount || 0,
          count: stats._count.id || 0
        },
        byCurrency: currencyStats,
        byNetwork: networkStats
      }
    });

  } catch (error) {
    console.error('Error fetching manual deposit stats:', error);
    res.status(500).json({
      error: 'Failed to fetch manual deposit statistics',
      message: error.message
    });
  }
});

// Cancel/refund a manual deposit (admin only)
router.put('/manual-deposits/:depositId/cancel', [
  body('reason').notEmpty().withMessage('Cancellation reason is required'),
  body('refundAmount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { depositId } = req.params;
    const { reason, refundAmount } = req.body;

    // Get deposit details
    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            wallet: {
              select: {
                balance: true
              }
            }
          }
        }
      }
    });

    if (!deposit) {
      return res.status(404).json({
        error: 'Deposit not found',
        message: 'The specified deposit does not exist'
      });
    }

    if (deposit.depositType !== 'MANUAL_ADMIN') {
      return res.status(400).json({
        error: 'Invalid deposit type',
        message: 'Only manual admin deposits can be cancelled'
      });
    }

    if (deposit.status === 'CANCELLED') {
      return res.status(400).json({
        error: 'Already cancelled',
        message: 'This deposit has already been cancelled'
      });
    }

    // Process cancellation in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update deposit status
      const updatedDeposit = await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: 'CANCELLED',
          adminNotes: `${deposit.adminNotes || ''}\n\nCANCELLED: ${reason} (by admin ${req.user.email})`,
          webhookData: {
            ...deposit.webhookData,
            cancelled: true,
            cancellationReason: reason,
            cancelledBy: req.user.email,
            cancelledAt: new Date().toISOString(),
            refundAmount: refundAmount || deposit.amount
          }
        }
      });

      // Refund amount to user wallet (if specified)
      if (refundAmount && refundAmount > 0) {
        await updateWalletBalance(
          deposit.userId,
          parseFloat(refundAmount),
          'REFUND',
          `Refund for cancelled manual deposit: ${reason}`,
          depositId
        );
      }

      return updatedDeposit;
    });

    // Send email notification
    try {
      await sendEmail({
        to: deposit.user.email,
        subject: 'Deposit Cancelled - Trinity Metro Bike',
        template: 'deposit-cancelled',
        data: {
          fullName: deposit.user.fullName,
          amount: deposit.amount,
          currency: deposit.currency,
          reason: reason,
          refundAmount: refundAmount || 0,
          newBalance: deposit.user.wallet.balance + (refundAmount || 0)
        }
      });
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
    }

    res.json({
      success: true,
      message: 'Manual deposit cancelled successfully',
      data: result
    });

  } catch (error) {
    console.error('Error cancelling manual deposit:', error);
    res.status(500).json({
      error: 'Failed to cancel manual deposit',
      message: error.message
    });
  }
});

module.exports = router;

