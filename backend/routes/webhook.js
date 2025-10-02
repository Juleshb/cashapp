const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { processUsdtDepositConfirmation } = require('../services/depositService');
const { PrismaClient } = require('@prisma/client');

const { updateWalletBalance } = require('../services/walletService');
const { sendEmail } = require('../services/emailService');

const router = express.Router();
const prisma = new PrismaClient();

// Coinbase Commerce webhook handler
router.post('/coinbase', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-cc-webhook-signature'];
    const body = req.body;

    // Verify webhook signature
    if (!signature || !process.env.COINBASE_COMMERCE_WEBHOOK_SECRET) {
      console.error('Missing webhook signature or secret');
      return res.status(400).json({ error: 'Invalid webhook' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.COINBASE_COMMERCE_WEBHOOK_SECRET)
      .update(body, 'utf8')
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(body.toString());
    console.log('Coinbase webhook received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'charge:confirmed':
        await handleChargeConfirmed(event.data);
        break;
      case 'charge:failed':
        await handleChargeFailed(event.data);
        break;
      case 'charge:delayed':
        await handleChargeDelayed(event.data);
        break;
      case 'charge:pending':
        await handleChargePending(event.data);
        break;
      case 'charge:resolved':
        await handleChargeResolved(event.data);
        break;
      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// USDT Deposit Confirmation Webhook
router.post('/usdt/confirm', [
  body('depositId').isUUID().withMessage('Invalid deposit ID'),
  body('transactionHash').isLength({ min: 10, max: 100 }).withMessage('Invalid transaction hash'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Invalid amount'),
  body('network').isIn(['TRC20', 'BEP20', 'ERC20', 'POLYGON', 'ARBITRUM', 'OPTIMISM']).withMessage('Invalid network')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { depositId, transactionHash, amount, network } = req.body;

    // Verify webhook signature (in production, add proper signature verification)
    // const signature = req.headers['x-webhook-signature'];
    // if (!verifyWebhookSignature(req.body, signature)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    // Process the deposit confirmation
    const result = await processUsdtDepositConfirmation(depositId, transactionHash);

    res.json({
      success: true,
      message: 'Deposit confirmation processed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error processing USDT deposit webhook:', error);
    res.status(500).json({
      error: 'Failed to process deposit confirmation',
      message: error.message
    });
  }
});

// Manual Deposit Confirmation (for admin use)
router.post('/manual/confirm', [
  body('depositId').isUUID().withMessage('Invalid deposit ID'),
  body('transactionHash').optional().isLength({ min: 10, max: 100 }).withMessage('Invalid transaction hash')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { depositId, transactionHash } = req.body;

    // Get deposit to check if it exists and is pending
    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId }
    });

    if (!deposit) {
      return res.status(404).json({
        error: 'Deposit not found'
      });
    }

    if (deposit.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Deposit already processed',
        message: `Current status: ${deposit.status}`
      });
    }

    // Process the deposit confirmation
    const result = await processUsdtDepositConfirmation(depositId, transactionHash);

    res.json({
      success: true,
      message: 'Manual deposit confirmation processed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error processing manual deposit confirmation:', error);
    res.status(500).json({
      error: 'Failed to process manual deposit confirmation',
      message: error.message
    });
  }
});

// Get pending deposits (for admin monitoring)
router.get('/pending-deposits', async (req, res) => {
  try {
    const deposits = await prisma.deposit.findMany({
      where: {
        status: 'PENDING',
        depositType: 'USDT_DIRECT'
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: deposits
    });

  } catch (error) {
    console.error('Error fetching pending deposits:', error);
    res.status(500).json({
      error: 'Failed to fetch pending deposits',
      message: error.message
    });
  }
});

// Handle confirmed charge
const handleChargeConfirmed = async (charge) => {
  try {
    console.log('Processing confirmed charge:', charge.id);

    // Find the deposit record
    const deposit = await prisma.deposit.findUnique({
      where: { coinbaseChargeId: charge.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            referredBy: true
          }
        }
      }
    });

    if (!deposit) {
      console.error('Deposit not found for charge:', charge.id);
      return;
    }

    if (deposit.status === 'CONFIRMED') {
      console.log('Deposit already confirmed:', deposit.id);
      return;
    }

    // Update deposit status and process payment
    await prisma.$transaction(async (tx) => {
      // Update deposit record
      await tx.deposit.update({
        where: { id: deposit.id },
        data: {
          status: 'CONFIRMED',
          transactionHash: charge.payments?.[0]?.transaction_id,
          webhookData: charge
        }
      });

      // Update user's wallet balance
      await updateWalletBalance(
        deposit.userId,
        deposit.amount,
        'DEPOSIT',
        `Deposit confirmed - ${deposit.amount} ${deposit.currency}`,
        deposit.id
      );

      // Note: Referral bonuses are now only processed when users join VIP levels
      // Deposit-based referral bonuses have been removed
    });

    // Get updated wallet balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId: deposit.userId }
    });

    // Send confirmation email
    try {
      await sendEmail({
        to: deposit.user.email,
        template: 'depositConfirmation',
        data: {
          fullName: deposit.user.fullName,
          amount: deposit.amount.toFixed(8),
          currency: deposit.currency,
          transactionId: charge.payments?.[0]?.transaction_id || charge.id,
          newBalance: parseFloat(wallet.balance).toFixed(8)
        }
      });
    } catch (emailError) {
      console.error('Failed to send deposit confirmation email:', emailError);
    }

    console.log(`Deposit confirmed successfully: ${deposit.id}`);

  } catch (error) {
    console.error('Error handling confirmed charge:', error);
  }
};

// Handle failed charge
const handleChargeFailed = async (charge) => {
  try {
    console.log('Processing failed charge:', charge.id);

    const deposit = await prisma.deposit.findUnique({
      where: { coinbaseChargeId: charge.id }
    });

    if (!deposit) {
      console.error('Deposit not found for failed charge:', charge.id);
      return;
    }

    // Update deposit status
    await prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        status: 'FAILED',
        webhookData: charge
      }
    });

    console.log(`Deposit marked as failed: ${deposit.id}`);

  } catch (error) {
    console.error('Error handling failed charge:', error);
  }
};

// Handle delayed charge
const handleChargeDelayed = async (charge) => {
  try {
    console.log('Processing delayed charge:', charge.id);

    const deposit = await prisma.deposit.findUnique({
      where: { coinbaseChargeId: charge.id }
    });

    if (!deposit) {
      console.error('Deposit not found for delayed charge:', charge.id);
      return;
    }

    // Update webhook data but keep status as pending
    await prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        webhookData: charge
      }
    });

    console.log(`Deposit marked as delayed: ${deposit.id}`);

  } catch (error) {
    console.error('Error handling delayed charge:', error);
  }
};

// Handle pending charge
const handleChargePending = async (charge) => {
  try {
    console.log('Processing pending charge:', charge.id);

    const deposit = await prisma.deposit.findUnique({
      where: { coinbaseChargeId: charge.id }
    });

    if (!deposit) {
      console.error('Deposit not found for pending charge:', charge.id);
      return;
    }

    // Update webhook data
    await prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        webhookData: charge
      }
    });

    console.log(`Deposit updated with pending status: ${deposit.id}`);

  } catch (error) {
    console.error('Error handling pending charge:', error);
  }
};

// Handle resolved charge
const handleChargeResolved = async (charge) => {
  try {
    console.log('Processing resolved charge:', charge.id);

    // Check if this was previously confirmed
    if (charge.timeline.some(event => event.status === 'CONFIRMED')) {
      // This was already handled in charge:confirmed
      return;
    }

    // Handle as confirmed if resolved successfully
    if (charge.payments && charge.payments.length > 0) {
      await handleChargeConfirmed(charge);
    }

  } catch (error) {
    console.error('Error handling resolved charge:', error);
  }
};

// Health check for webhooks
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'B-Bike Webhooks',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
