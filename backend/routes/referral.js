const express = require('express');
const { query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const { authenticateToken } = require('../middleware/auth');
const { generateReferralLink } = require('../utils/helpers');
const { getReferralStats } = require('../services/vipReferralService');

const router = express.Router();
const prisma = new PrismaClient();

// Get referral statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get multi-level referral statistics
    const referralStats = await getReferralStats(userId);

    // Get direct referrals (Level 1)
    const directReferrals = await prisma.user.findMany({
      where: { referredBy: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        createdAt: true,
        userVip: {
          include: {
            vipLevel: true
          }
        },
        wallet: {
          select: {
            totalDeposits: true,
            balance: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get indirect referrals (Level 2)
    const level1UserIds = directReferrals.map(user => user.id);
    const indirectReferrals = await prisma.user.findMany({
      where: {
        referredBy: {
          in: level1UserIds
        }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        createdAt: true,
        userVip: {
          include: {
            vipLevel: true
          }
        },
        wallet: {
          select: {
            totalDeposits: true,
            balance: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get recent referral bonuses
    const recentBonuses = await prisma.referralBonus.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        referred: {
          select: {
            fullName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Get referral link
    const referralLink = generateReferralLink(
      process.env.FRONTEND_URL || 'https://www.tmb8080.online',
      req.user.referralCode
    );

    res.json({
      success: true,
      data: {
        referralCode: req.user.referralCode,
        referralLink,
        // Multi-level statistics
        directReferrals: referralStats.directReferrals,
        indirectReferrals: referralStats.indirectReferrals,
        totalReferrals: referralStats.totalReferrals,
        totalBonuses: referralStats.totalBonuses,
        level1Bonuses: referralStats.level1Bonuses,
        level2Bonuses: referralStats.level2Bonuses,
        // Detailed referral lists
        directReferralList: directReferrals,
        indirectReferralList: indirectReferrals,
        recentBonuses: recentBonuses,
        // VIP Commission rates (only triggered when users join VIP levels)
        level1Rate: 5, // 5% for direct referrals
        level2Rate: 3  // 3% for indirect referrals
      }
    });

  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({
      error: 'Failed to fetch referral statistics',
      message: error.message
    });
  }
});

// Get referral history with pagination
router.get('/history', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [referrals, total] = await Promise.all([
      prisma.user.findMany({
        where: { referredBy: userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
          isActive: true,
          wallet: {
            select: {
              totalDeposits: true,
              balance: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),

      prisma.user.count({
        where: { referredBy: userId }
      })
    ]);

    res.json({
      success: true,
      data: referrals,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Error fetching referral history:', error);
    res.status(500).json({
      error: 'Failed to fetch referral history',
      message: error.message
    });
  }
});

// Get referral bonuses history
router.get('/bonuses', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [bonuses, total] = await Promise.all([
      prisma.referralBonus.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),

      prisma.referralBonus.count({
        where: { referrerId: userId }
      })
    ]);

    res.json({
      success: true,
      data: bonuses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Error fetching referral bonuses:', error);
    res.status(500).json({
      error: 'Failed to fetch referral bonuses',
      message: error.message
    });
  }
});

// Get referral tree (downline structure)
router.get('/tree', [
  query('depth').optional().isInt({ min: 1, max: 5 }).withMessage('Depth must be between 1 and 5')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const depth = parseInt(req.query.depth) || 3;

    // Recursive function to build referral tree
    const buildReferralTree = async (parentId, currentDepth) => {
      if (currentDepth > depth) return [];

      const referrals = await prisma.user.findMany({
        where: { referredBy: parentId },
        select: {
          id: true,
          fullName: true,
          email: true,
          referralCode: true,
          createdAt: true,
          isActive: true,
          wallet: {
            select: {
              balance: true,
              totalDeposits: true
            }
          }
        }
      });

      const tree = [];
      for (const referral of referrals) {
        const children = await buildReferralTree(referral.id, currentDepth + 1);
        tree.push({
          ...referral,
          level: currentDepth,
          children,
          childrenCount: children.length
        });
      }

      return tree;
    };

    const tree = await buildReferralTree(userId, 1);

    // Calculate tree statistics
    const calculateTreeStats = (nodes) => {
      let totalNodes = 0;
      let totalDeposits = 0;

      const traverse = (nodeList) => {
        for (const node of nodeList) {
          totalNodes++;
          totalDeposits += parseFloat(node.wallet?.totalDeposits || 0);
          if (node.children && node.children.length > 0) {
            traverse(node.children);
          }
        }
      };

      traverse(nodes);
      return { totalNodes, totalDeposits };
    };

    const stats = calculateTreeStats(tree);

    res.json({
      success: true,
      data: {
        tree,
        stats: {
          totalReferrals: stats.totalNodes,
          totalDeposits: stats.totalDeposits,
          maxDepth: depth
        }
      }
    });

  } catch (error) {
    console.error('Error fetching referral tree:', error);
    res.status(500).json({
      error: 'Failed to fetch referral tree',
      message: error.message
    });
  }
});

// Validate referral code
router.get('/validate/:code', async (req, res) => {
  try {
    const { code } = req.params;

    if (!code || code.length !== 6) {
      return res.status(400).json({
        error: 'Invalid referral code format'
      });
    }

    const user = await prisma.user.findUnique({
      where: { referralCode: code },
      select: {
        id: true,
        fullName: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Referral code not found',
        valid: false
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        error: 'Referral code is inactive',
        valid: false
      });
    }

    res.json({
      success: true,
      valid: true,
      data: {
        referrerName: user.fullName || 'User',
        memberSince: user.createdAt
      }
    });

  } catch (error) {
    console.error('Error validating referral code:', error);
    res.status(500).json({
      error: 'Failed to validate referral code',
      message: error.message
    });
  }
});

module.exports = router;
