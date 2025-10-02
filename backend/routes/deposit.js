const express = require('express');
const { body, query, validationResult } = require('express-validator');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { updateWalletBalance } = require('../services/walletService');
const { sendEmail } = require('../services/emailService');
const { 
  verifyUsdtDeposit, 
  manualVerifyDeposit, 
  getPendingDepositsForVerification,
  batchVerifyDeposits 
} = require('../services/depositVerificationService');
const TransactionVerificationService = require('../services/transactionVerificationService');

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to get company wallet addresses
const getCompanyAddresses = () => {
  const addresses = {
    BSC: process.env.BSC_WALLET_ADDRESS || "0x9d78BbBF2808fc88De78cd5c9021A01f897DAb09",
    TRON: process.env.TRON_WALLET_ADDRESS || "TUF38LTyPaqfdanHBpGMs5Xid6heLcxxpK",
    POLYGON: process.env.POLYGON_WALLET_ADDRESS || "0x9d78BbBF2808fc88De78cd5c9021A01f897DAb09",
    ETHEREUM: process.env.ETH_WALLET_ADDRESS || "0x9d78BbBF2808fc88De78cd5c9021A01f897DAb09"
  };
  
  console.log('🔧 Company addresses loaded:', {
    BSC: addresses.BSC ? `${addresses.BSC.substring(0, 10)}...` : 'NOT_SET',
    TRON: addresses.TRON ? `${addresses.TRON.substring(0, 10)}...` : 'NOT_SET',
    POLYGON: addresses.POLYGON ? `${addresses.POLYGON.substring(0, 10)}...` : 'NOT_SET',
    ETHEREUM: addresses.ETHEREUM ? `${addresses.ETHEREUM.substring(0, 10)}...` : 'NOT_SET'
  });
  
  return addresses;
};

// Helper function to verify transaction before creating deposit
const verifyTransactionBeforeDeposit = async (transactionHash, network, expectedAmount) => {
  try {
    console.log(`🔍 Pre-verifying transaction: ${transactionHash} for ${network} network`);
    
    // First, check transaction across all networks to find where it exists
    const crossNetworkResult = await TransactionVerificationService.checkTransactionAcrossAllNetworks(
      transactionHash
    );
    
    if (!crossNetworkResult.found) {
      return {
        isValid: false,
        error: 'Transaction not found on any supported blockchain',
        details: null
      };
    }
    
    console.log(`✅ Transaction found on ${crossNetworkResult.foundOnNetwork} network`);
    
    // Get the transaction details from the network where it was found
    const foundNetwork = crossNetworkResult.foundOnNetwork;
    const transactionDetails = crossNetworkResult.results.find(
      result => result.network === foundNetwork && result.found
    );
    
    if (!transactionDetails || !transactionDetails.details) {
      return {
        isValid: false,
        error: 'Transaction found but details are incomplete',
        details: null
      };
    }
    
    // Get company addresses
    const companyAddresses = getCompanyAddresses();
    
    // Map network names to company address keys
    const networkToAddressKey = {
      'Ethereum': 'ETHEREUM',
      'BSC': 'BSC',
      'TRON': 'TRON',
      'Polygon': 'POLYGON'
    };
    
    const addressKey = networkToAddressKey[foundNetwork] || foundNetwork;
    const expectedAddress = companyAddresses[addressKey];
    
    console.log(`🔍 Address verification for ${foundNetwork}:`, {
      foundNetwork: foundNetwork,
      expectedAddress: expectedAddress,
      recipientAddress: transactionDetails.details.recipientAddress,
      addressesAvailable: Object.keys(companyAddresses),
      allAddresses: companyAddresses,
      directLookup: companyAddresses[foundNetwork],
      caseInsensitiveLookup: companyAddresses[foundNetwork.toUpperCase()] || companyAddresses[foundNetwork.toLowerCase()]
    });
    
    // Try different case variations if direct lookup fails
    let finalExpectedAddress = expectedAddress;
    if (!finalExpectedAddress) {
      finalExpectedAddress = companyAddresses[foundNetwork.toUpperCase()] || 
                            companyAddresses[foundNetwork.toLowerCase()] ||
                            companyAddresses[foundNetwork.charAt(0).toUpperCase() + foundNetwork.slice(1).toLowerCase()];
    }
    
    if (!finalExpectedAddress) {
      console.log(`❌ Company address not found for network: ${foundNetwork}`);
      console.log(`Available networks:`, Object.keys(companyAddresses));
      console.log(`All addresses:`, companyAddresses);
      return {
        isValid: false,
        error: `Company wallet address not configured for ${foundNetwork} network`,
        details: {
          foundNetwork: foundNetwork,
          availableNetworks: Object.keys(companyAddresses),
          allAddresses: companyAddresses
        }
      };
    }
    
    // Check if this is a contract interaction with token transfers
    let actualRecipientAddress = transactionDetails.details.recipientAddress;
    let actualAmount = parseFloat(transactionDetails.details.amount);
    let tokenSymbol = 'ETH';
    
    if (transactionDetails.details.tokenTransfers && transactionDetails.details.tokenTransfers.length > 0) {
      console.log(`🔍 Found ${transactionDetails.details.tokenTransfers.length} token transfers, analyzing for matching recipient...`);
      
      // Look for token transfers to our company address
      const matchingTransfer = transactionDetails.details.tokenTransfers.find(transfer => 
        transfer.to.toLowerCase() === finalExpectedAddress.toLowerCase()
      );
      
      if (matchingTransfer) {
        actualRecipientAddress = matchingTransfer.to;
        actualAmount = matchingTransfer.amount;
        tokenSymbol = matchingTransfer.tokenSymbol;
        console.log(`✅ Found matching token transfer: ${actualAmount} ${tokenSymbol} to ${actualRecipientAddress}`);
      } else {
        console.log(`⚠️ No token transfer found to our company address ${finalExpectedAddress}`);
        console.log(`Available transfers:`, transactionDetails.details.tokenTransfers.map(t => ({
          to: t.to,
          amount: t.amount,
          token: t.tokenSymbol
        })));
      }
    }
    
    // Verify recipient address
    if (!actualRecipientAddress || actualRecipientAddress.toLowerCase() !== finalExpectedAddress.toLowerCase()) {
      return {
        isValid: false,
        error: `Transaction recipient does not match our ${foundNetwork} wallet address`,
        details: {
          expected: finalExpectedAddress,
          received: actualRecipientAddress,
          foundOnNetwork: foundNetwork,
          requestedNetwork: network,
          tokenTransfers: transactionDetails.details.tokenTransfers || []
        }
      };
    }
    
    // Verify amount (allow small difference for decimals)
    const depositAmount = parseFloat(expectedAmount);
    const difference = Math.abs(actualAmount - depositAmount);
    
    if (difference > 0.01) {
      return {
        isValid: false,
        error: `Transaction amount does not match deposit amount`,
        details: {
          expected: depositAmount,
          received: actualAmount,
          difference: difference,
          foundOnNetwork: foundNetwork,
          requestedNetwork: network,
          tokenSymbol: tokenSymbol
        }
      };
    }
    
    // Check if the found network matches the requested network
    const networkMapping = {
      'TRC20': 'TRON',
      'BEP20': 'BSC',
      'ERC20': 'ETHEREUM',
      'POLYGON': 'POLYGON'
    };
    
    const requestedNetworkMapped = networkMapping[network];
    const networkMatches = foundNetwork === requestedNetworkMapped;
    
    return {
      isValid: true,
      error: null,
      details: {
        ...transactionDetails.details,
        recipientAddress: actualRecipientAddress,
        amount: actualAmount.toString(),
        tokenSymbol: tokenSymbol,
        foundOnNetwork: foundNetwork,
        requestedNetwork: network,
        networkMatches: networkMatches,
        networkWarning: networkMatches ? null : `Transaction found on ${foundNetwork} but you selected ${network}`
      }
    };
    
  } catch (error) {
    console.error('Error pre-verifying transaction:', error);
    return {
      isValid: false,
      error: `Verification failed: ${error.message}`,
      details: null
    };
  }
};

// Create deposit request
router.post('/create', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0.01'),
  body('currency').isIn(['BTC', 'ETH', 'USDT']).withMessage('Invalid currency')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { amount, currency } = req.body;
    const userId = req.user.id;

    // Check admin settings
    const settings = await prisma.adminSettings.findFirst();
    if (!settings || !settings.isDepositEnabled) {
      return res.status(400).json({
        error: 'Deposits are currently disabled',
        message: 'Please try again later'
      });
    }

    if (parseFloat(amount) < parseFloat(settings.minDepositAmount)) {
      return res.status(400).json({
        error: 'Amount too low',
        message: `Minimum deposit amount is ${settings.minDepositAmount}`
      });
    }

    // Create Coinbase Commerce charge
    const coinbaseResponse = await axios.post('https://api.commerce.coinbase.com/charges', {
      name: 'B-Bike Deposit',
      description: `Deposit ${amount} ${currency} to B-Bike wallet`,
      local_price: {
        amount: amount.toString(),
        currency: currency
      },
      pricing_type: 'fixed_price',
      metadata: {
        user_id: userId,
        platform: 'trinity-metro-bike'
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': process.env.COINBASE_COMMERCE_API_KEY,
        'X-CC-Version': '2018-03-22'
      }
    });

    const charge = coinbaseResponse.data.data;

    // Create deposit record
    const deposit = await prisma.deposit.create({
      data: {
        userId,
        amount: parseFloat(amount),
        currency,
        coinbaseChargeId: charge.id,
        coinbaseCode: charge.code,
        depositType: 'COINBASE',
        status: 'PENDING'
      }
    });

    res.json({
      success: true,
      message: 'Deposit request created successfully',
      data: {
        depositId: deposit.id,
        coinbaseUrl: charge.hosted_url,
        chargeCode: charge.code,
        amount: deposit.amount,
        currency: deposit.currency,
        expiresAt: charge.expires_at
      }
    });

  } catch (error) {
    console.error('Error creating deposit:', error);
    
    if (error.response?.status === 401) {
      return res.status(500).json({
        error: 'Payment service configuration error',
        message: 'Please contact support'
      });
    }

    res.status(500).json({
      error: 'Failed to create deposit',
      message: error.message
    });
  }
});

// Get user's deposit history
router.get('/my-deposits', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('status').optional().isIn(['PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED']).withMessage('Invalid status')
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
    const status = req.query.status;

    const skip = (page - 1) * limit;
    
    const whereClause = {
      userId,
      ...(status && { status })
    };

    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      
      prisma.deposit.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: deposits,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Error fetching deposit history:', error);
    res.status(500).json({
      error: 'Failed to fetch deposit history',
      message: error.message
    });
  }
});

// Get USDT deposit addresses
router.get('/usdt/addresses', authenticateToken, async (req, res) => {
  try {
    // In a real implementation, these would be fetched from a secure configuration
    // or generated dynamically based on user preferences
    const addresses = {
      TRC20: process.env.USDT_TRC20_ADDRESS || 'TJwzxqg5FbGRibyMRArrnSo828WppqvQjd',
      BEP20: process.env.USDT_BEP20_ADDRESS || '0x1016f7DAF8b1816C0979992Ab3c8C8D8D8D8D8D8D',
      ERC20: process.env.USDT_ERC20_ADDRESS || '0x9d78BbBF2808fc88De78cd5c9021A01f897DAb09',
      POLYGON: process.env.USDT_POLYGON_ADDRESS || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
    };

    res.json({
      success: true,
      data: addresses
    });

  } catch (error) {
    console.error('Error fetching USDT addresses:', error);
    res.status(500).json({
      error: 'Failed to fetch USDT addresses',
      message: error.message
    });
  }
});

// Get company wallet addresses for manual deposits
router.get('/company-addresses', authenticateToken, async (req, res) => {
  try {
    // Get company wallet addresses from environment variables
    const addresses = {
      TRC20: process.env.TRON_WALLET_ADDRESS || 'TUF38LTyPaqfdanHBpGMs5Xid6heLcxxpK',
      BEP20: process.env.BSC_WALLET_ADDRESS || '0x9d78BbBF2808fc88De78cd5c9021A01f897DAb09',
      ERC20: process.env.ETH_WALLET_ADDRESS || '0x9d78BbBF2808fc88De78cd5c9021A01f897DAb09',
      POLYGON: process.env.POLYGON_WALLET_ADDRESS || '0x9d78BbBF2808fc88De78cd5c9021A01f897DAb09'
    };

    // Add network information and fees
    const networkInfo = {
      TRC20: { name: 'Tron TRC20', fee: '~$1', minAmount: 0.000001, supportedTokens: ['USDT'] },
      BEP20: { name: 'BSC BEP20', fee: '~$0.5', minAmount: 0.000001, supportedTokens: ['USDT', 'USDC'] },
      ERC20: { name: 'Ethereum ERC20', fee: '~$10-50', minAmount: 0.000001, supportedTokens: ['USDT', 'USDC'] },
      POLYGON: { name: 'Polygon MATIC', fee: '~$0.01', minAmount: 0.000001, supportedTokens: ['USDT', 'USDC'] }
    };

    const result = {};
    Object.keys(addresses).forEach(network => {
      result[network] = {
        address: addresses[network],
        ...networkInfo[network]
      };
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching company wallet addresses:', error);
    res.status(500).json({
      error: 'Failed to fetch company wallet addresses',
      message: error.message
    });
  }
});

// Auto-fill transaction details when hash is pasted
router.post('/auto-fill-transaction', [
  body('transactionHash').notEmpty().withMessage('Transaction hash is required')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { transactionHash } = req.body;
    const userId = req.user.id;

    console.log(`🔍 Auto-filling transaction details for user ${userId}:`, {
      transactionHash: transactionHash.substring(0, 10) + '...'
    });

    // Check transaction across all networks
    const crossNetworkResult = await TransactionVerificationService.checkTransactionAcrossAllNetworks(
      transactionHash
    );

    if (!crossNetworkResult.found) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'Transaction not found on any supported blockchain',
        data: {
          found: false,
          transactionHash: transactionHash
        }
      });
    }

    // Get the transaction details from the network where it was found
    const foundNetwork = crossNetworkResult.foundOnNetwork;
    const transactionDetails = crossNetworkResult.results.find(
      result => result.network === foundNetwork && result.found
    );

    if (!transactionDetails || !transactionDetails.details) {
      return res.status(400).json({
        error: 'Transaction details incomplete',
        message: 'Transaction found but details are incomplete',
        data: {
          found: true,
          foundOnNetwork: foundNetwork,
          details: null
        }
      });
    }

    // Get company addresses
    const companyAddresses = getCompanyAddresses();
    
    // Map network names to company address keys
    const networkToAddressKey = {
      'Ethereum': 'ETHEREUM',
      'BSC': 'BSC',
      'TRON': 'TRON',
      'Polygon': 'POLYGON'
    };
    
    const addressKey = networkToAddressKey[foundNetwork] || foundNetwork;
    const expectedAddress = companyAddresses[addressKey];

    // Map verification network names back to deposit network names
    const reverseNetworkMapping = {
      'TRON': 'TRC20',
      'BSC': 'BEP20',
      'ETHEREUM': 'ERC20',
      'POLYGON': 'POLYGON'
    };

    const suggestedNetwork = reverseNetworkMapping[foundNetwork] || foundNetwork;

    // Check if this is a contract interaction with token transfers
    let actualRecipientAddress = transactionDetails.details.recipientAddress;
    let actualAmount = parseFloat(transactionDetails.details.amount);
    let tokenSymbol = 'ETH';
    
    if (transactionDetails.details.tokenTransfers && transactionDetails.details.tokenTransfers.length > 0) {
      console.log(`🔍 Found ${transactionDetails.details.tokenTransfers.length} token transfers, analyzing for matching recipient...`);
      
      // Look for token transfers to our company address
      const matchingTransfer = transactionDetails.details.tokenTransfers.find(transfer => 
        transfer.to.toLowerCase() === expectedAddress.toLowerCase()
      );
      
      if (matchingTransfer) {
        actualRecipientAddress = matchingTransfer.to;
        actualAmount = matchingTransfer.amount;
        tokenSymbol = matchingTransfer.tokenSymbol;
        console.log(`✅ Found matching token transfer: ${actualAmount} ${tokenSymbol} to ${actualRecipientAddress}`);
      } else {
        console.log(`⚠️ No token transfer found to our company address ${expectedAddress}`);
        console.log(`Available transfers:`, transactionDetails.details.tokenTransfers.map(t => ({
          to: t.to,
          amount: t.amount,
          token: t.tokenSymbol
        })));
      }
    }

    // Check if recipient matches our address
    const isRecipientMatching = actualRecipientAddress && expectedAddress && 
      actualRecipientAddress.toLowerCase() === expectedAddress.toLowerCase();

    // Get transaction amount
    const transactionAmount = actualAmount;

    res.json({
      success: true,
      message: 'Transaction details retrieved successfully',
      data: {
        found: true,
        transactionHash: transactionHash,
        foundOnNetwork: foundNetwork,
        suggestedNetwork: suggestedNetwork,
        suggestedAmount: actualAmount, // Use enhanced amount
        recipientAddress: actualRecipientAddress, // Use enhanced recipient
        senderAddress: transactionDetails.details.senderAddress,
        blockNumber: transactionDetails.details.blockNumber,
        isConfirmed: transactionDetails.details.isConfirmed,
        isTokenTransfer: transactionDetails.details.tokenTransfers && transactionDetails.details.tokenTransfers.length > 0,
        tokenSymbol: tokenSymbol,
        isRecipientMatching: isRecipientMatching,
        expectedCompanyAddress: expectedAddress,
        companyAddresses: companyAddresses,
        tokenTransfers: transactionDetails.details.tokenTransfers || [],
        verificationStatus: {
          networkFound: true,
          recipientMatches: isRecipientMatching,
          amountAvailable: !isNaN(actualAmount),
          canAutoFill: isRecipientMatching && !isNaN(actualAmount)
        }
      }
    });

  } catch (error) {
    console.error('Error auto-filling transaction details:', error);
    res.status(500).json({
      error: 'Failed to get transaction details',
      message: error.message
    });
  }
});

// Get transaction details without verification (for debugging)
router.post('/transaction-details', [
  body('transactionHash').notEmpty().withMessage('Transaction hash is required')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { transactionHash } = req.body;
    const userId = req.user.id;

    console.log(`🔍 Getting transaction details for user ${userId}:`, {
      transactionHash: transactionHash.substring(0, 10) + '...'
    });

    // Check transaction across all networks
    const crossNetworkResult = await TransactionVerificationService.checkTransactionAcrossAllNetworks(
      transactionHash
    );

    // Get company addresses for reference
    const companyAddresses = getCompanyAddresses();
    
    // Enhanced processing for found transactions
    let enhancedResults = crossNetworkResult.results;
    
    if (crossNetworkResult.found && crossNetworkResult.foundOnNetwork) {
      const foundNetwork = crossNetworkResult.foundOnNetwork;
      const transactionDetails = crossNetworkResult.results.find(
        result => result.network === foundNetwork && result.found
      );
      
      if (transactionDetails && transactionDetails.details) {
        // Map network names to company address keys
        const networkToAddressKey = {
          'Ethereum': 'ETHEREUM',
          'BSC': 'BSC',
          'TRON': 'TRON',
          'Polygon': 'POLYGON'
        };
        
        const addressKey = networkToAddressKey[foundNetwork] || foundNetwork;
        const expectedAddress = companyAddresses[addressKey];
        
        // Check if this is a contract interaction with token transfers
        let actualRecipientAddress = transactionDetails.details.recipientAddress;
        let actualAmount = parseFloat(transactionDetails.details.amount);
        let tokenSymbol = 'ETH';
        
        if (transactionDetails.details.tokenTransfers && transactionDetails.details.tokenTransfers.length > 0) {
          console.log(`🔍 Found ${transactionDetails.details.tokenTransfers.length} token transfers, analyzing for matching recipient...`);
          
          // Look for token transfers to our company address
          const matchingTransfer = transactionDetails.details.tokenTransfers.find(transfer => 
            expectedAddress && transfer.to.toLowerCase() === expectedAddress.toLowerCase()
          );
          
          if (matchingTransfer) {
            actualRecipientAddress = matchingTransfer.to;
            actualAmount = matchingTransfer.amount;
            tokenSymbol = matchingTransfer.tokenSymbol;
            console.log(`✅ Found matching token transfer: ${actualAmount} ${tokenSymbol} to ${actualRecipientAddress}`);
          }
        }
        
        // Update the transaction details with enhanced data
        transactionDetails.details.recipientAddress = actualRecipientAddress;
        transactionDetails.details.amount = actualAmount.toString();
        transactionDetails.details.tokenSymbol = tokenSymbol;
        transactionDetails.details.enhancedRecipientAddress = actualRecipientAddress;
        transactionDetails.details.enhancedAmount = actualAmount;
        transactionDetails.details.enhancedTokenSymbol = tokenSymbol;
        transactionDetails.details.expectedCompanyAddress = expectedAddress;
        transactionDetails.details.isRecipientMatching = expectedAddress && 
          actualRecipientAddress.toLowerCase() === expectedAddress.toLowerCase();
      }
    }

    res.json({
      success: true,
      message: 'Transaction details retrieved',
      data: {
        transactionHash: transactionHash,
        found: crossNetworkResult.found,
        foundOnNetwork: crossNetworkResult.foundOnNetwork,
        totalNetworksChecked: crossNetworkResult.totalNetworksChecked,
        results: enhancedResults,
        companyAddresses: companyAddresses,
        debug: {
          foundNetwork: crossNetworkResult.foundOnNetwork,
          companyAddressForNetwork: companyAddresses[crossNetworkResult.foundOnNetwork] || 'NOT_CONFIGURED'
        }
      }
    });

  } catch (error) {
    console.error('Error getting transaction details:', error);
    res.status(500).json({
      error: 'Failed to get transaction details',
      message: error.message
    });
  }
});

// Pre-verify transaction before creating deposit (for frontend validation)
router.post('/pre-verify', [
  body('transactionHash').notEmpty().withMessage('Transaction hash is required'),
  body('network').isIn(['BEP20', 'TRC20', 'ERC20', 'POLYGON']).withMessage('Invalid network'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1 USDT')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { transactionHash, network, amount } = req.body;
    const userId = req.user.id;

    console.log(`🔍 Pre-verification request from user ${userId}:`, {
      transactionHash: transactionHash.substring(0, 10) + '...',
      network,
      amount
    });

    // Check admin settings
    const settings = await prisma.adminSettings.findFirst();
    if (!settings || !settings.isDepositEnabled) {
      return res.status(400).json({
        error: 'Deposits are currently disabled',
        message: 'Please try again later'
      });
    }

    // Check minimum amount (any amount greater than 0 is accepted for verified transactions)
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be greater than 0'
      });
    }

    // Pre-verify the transaction
    const preVerificationResult = await verifyTransactionBeforeDeposit(transactionHash, network, amount);

    if (!preVerificationResult.isValid) {
      console.log(`❌ Pre-verification failed:`, {
        transactionHash: transactionHash.substring(0, 10) + '...',
        network,
        amount,
        error: preVerificationResult.error
      });
      return res.status(400).json({
        error: 'Transaction verification failed',
        message: preVerificationResult.error,
        details: preVerificationResult.details
      });
    }

    console.log(`✅ Pre-verification successful:`, {
      transactionHash: transactionHash.substring(0, 10) + '...',
      network,
      amount,
      recipientAddress: preVerificationResult.details.recipientAddress,
      transactionAmount: preVerificationResult.details.amount
    });

    res.json({
      success: true,
      message: 'Transaction verified successfully',
      data: {
        isValid: true,
        network,
        amount: preVerificationResult.details.amount,
        recipientAddress: preVerificationResult.details.recipientAddress,
        senderAddress: preVerificationResult.details.senderAddress,
        blockNumber: preVerificationResult.details.blockNumber,
        isConfirmed: preVerificationResult.details.isConfirmed,
        isTokenTransfer: preVerificationResult.details.isTokenTransfer,
        foundOnNetwork: preVerificationResult.details.foundOnNetwork,
        requestedNetwork: preVerificationResult.details.requestedNetwork,
        networkMatches: preVerificationResult.details.networkMatches,
        networkWarning: preVerificationResult.details.networkWarning
      }
    });

  } catch (error) {
    console.error('Error pre-verifying transaction:', error);
    res.status(500).json({
      error: 'Failed to verify transaction',
      message: error.message
    });
  }
});

// Create USDT deposit record
router.post('/usdt/create', [
  body('amount').isFloat({ min: 0.000001 }).withMessage('Amount must be greater than 0'),
  body('network').isIn(['BEP20', 'TRC20', 'ERC20', 'POLYGON']).withMessage('Invalid network'),
  body('transactionHash').notEmpty().withMessage('Transaction hash is required'),
  body('status').optional().isIn(['PENDING', 'CONFIRMED']).withMessage('Invalid status'),
  body('autoConfirmed').optional().isBoolean().withMessage('autoConfirmed must be boolean')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { amount, network, transactionHash, status, autoConfirmed } = req.body;
    const userId = req.user.id;

    console.log(`📦 Full request body:`, req.body);
    console.log(`Creating USDT deposit:`, {
      userId,
      amount,
      network,
      transactionHash: transactionHash ? `${transactionHash.substring(0, 10)}...` : 'null',
      status,
      autoConfirmed,
      statusType: typeof status,
      autoConfirmedType: typeof autoConfirmed
    });

    // Check admin settings
    const settings = await prisma.adminSettings.findFirst();
    if (!settings || !settings.isDepositEnabled) {
      return res.status(400).json({
        error: 'Deposits are currently disabled',
        message: 'Please try again later'
      });
    }

    // For USDT deposits, accept any amount greater than 0 (verified transactions)
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be greater than 0'
      });
    }

    // Pre-verify the transaction before creating deposit
    console.log(`🔍 Starting pre-verification for USDT deposit:`, {
      transactionHash: transactionHash.substring(0, 10) + '...',
      network,
      amount
    });

    const preVerificationResult = await verifyTransactionBeforeDeposit(transactionHash, network, amount);

    if (!preVerificationResult.isValid) {
      console.log(`❌ Pre-verification failed for USDT deposit:`, {
        transactionHash: transactionHash.substring(0, 10) + '...',
        network,
        amount,
        error: preVerificationResult.error,
        details: preVerificationResult.details
      });
      return res.status(400).json({
        error: 'Transaction verification failed',
        message: preVerificationResult.error,
        details: preVerificationResult.details
      });
    }

    console.log(`✅ Pre-verification successful for USDT deposit:`, {
      transactionHash: transactionHash.substring(0, 10) + '...',
      network,
      amount,
      recipientAddress: preVerificationResult.details.recipientAddress,
      transactionAmount: preVerificationResult.details.amount
    });

    // Check if transaction hash already exists in database
    console.log(`🔍 Checking for duplicate transaction hash:`, {
      transactionHash: transactionHash.substring(0, 10) + '...'
    });

    const existingDeposit = await prisma.deposit.findFirst({
      where: {
        transactionHash: transactionHash.trim(),
        currency: 'USDT'
      },
      select: {
        id: true,
        status: true,
        amount: true,
        network: true,
        createdAt: true,
        userId: true
      }
    });

    if (existingDeposit) {
      console.log(`❌ Duplicate transaction hash found:`, {
        transactionHash: transactionHash.substring(0, 10) + '...',
        existingDepositId: existingDeposit.id,
        existingStatus: existingDeposit.status,
        existingAmount: existingDeposit.amount,
        existingNetwork: existingDeposit.network,
        existingUserId: existingDeposit.userId,
        currentUserId: userId,
        isSameUser: existingDeposit.userId === userId
      });

      return res.status(400).json({
        error: 'Transaction already processed',
        message: existingDeposit.userId === userId 
          ? 'This transaction has already been deposited to your account'
          : 'This transaction has already been processed by another user',
        details: {
          depositId: existingDeposit.id,
          status: existingDeposit.status,
          amount: existingDeposit.amount,
          network: existingDeposit.network,
          createdAt: existingDeposit.createdAt
        }
      });
    }

    console.log(`✅ No duplicate transaction hash found, proceeding with deposit creation`);

    // Determine deposit status based on auto-confirmation
    console.log('🔍 Auto-confirmation check:', {
      autoConfirmed,
      status,
      willBeConfirmed: (autoConfirmed && status === 'CONFIRMED')
    });
    
    const depositStatus = (autoConfirmed && status === 'CONFIRMED') ? 'CONFIRMED' : 'PENDING';
    console.log('📊 Final deposit status:', depositStatus);
    
    // Create USDT deposit record
    const deposit = await prisma.deposit.create({
      data: {
        userId,
        amount: parseFloat(amount),
        currency: 'USDT',
        network: network,
        transactionHash: transactionHash.trim(),
        status: depositStatus,
        depositType: 'USDT_DIRECT'
      }
    });

    console.log(`✅ USDT deposit created successfully:`, {
      depositId: deposit.id,
      userId: deposit.userId,
      amount: deposit.amount,
      network: deposit.network,
      transactionHash: deposit.transactionHash ? `${deposit.transactionHash.substring(0, 10)}...` : 'null',
      status: deposit.status,
      depositType: deposit.depositType,
      createdAt: deposit.createdAt
    });

    // Verify the deposit was actually saved by querying it back
    const verifyDeposit = await prisma.deposit.findUnique({
      where: { id: deposit.id }
    });

    if (verifyDeposit) {
      console.log(`✅ Deposit verification query successful:`, {
        id: verifyDeposit.id,
        userId: verifyDeposit.userId,
        status: verifyDeposit.status
      });
    } else {
      console.log(`❌ Deposit verification query failed - deposit not found after creation!`);
    }

    // If deposit is confirmed, automatically credit user's wallet
    if (depositStatus === 'CONFIRMED') {
      try {
        console.log(`💰 Starting wallet credit process:`, {
          userId,
          amount: parseFloat(amount),
          depositStatus
        });

        // First, get current wallet balance for logging
        const currentWallet = await prisma.wallet.findUnique({
          where: { userId: userId },
          select: { balance: true, totalDeposits: true }
        });

        console.log(`📊 Current wallet balance before credit:`, {
          userId,
          currentBalance: currentWallet?.balance || 0,
          currentTotalDeposits: currentWallet?.totalDeposits || 0
        });

        // Update user's wallet balance using upsert to create wallet if it doesn't exist
        const updatedWallet = await prisma.wallet.upsert({
          where: { userId: userId },
          update: {
            balance: {
              increment: parseFloat(amount)
            },
            totalDeposits: {
              increment: parseFloat(amount)
            }
          },
          create: {
            userId: userId,
            balance: parseFloat(amount),
            totalDeposits: parseFloat(amount)
          }
        });

        console.log(`✅ User wallet credited successfully:`, {
          userId: updatedWallet.userId,
          oldBalance: currentWallet?.balance || 0,
          newBalance: updatedWallet.balance,
          amountAdded: parseFloat(amount),
          expectedNewBalance: (currentWallet?.balance || 0) + parseFloat(amount),
          oldTotalDeposits: currentWallet?.totalDeposits || 0,
          newTotalDeposits: updatedWallet.totalDeposits
        });

        // Verify the update worked
        if (updatedWallet.balance !== (currentWallet?.balance || 0) + parseFloat(amount)) {
          console.error(`❌ Wallet balance mismatch! Expected: ${(currentWallet?.balance || 0) + parseFloat(amount)}, Got: ${updatedWallet.balance}`);
        }
      } catch (walletError) {
        console.error('❌ Error crediting user wallet:', walletError);
        console.error('❌ Wallet error details:', {
          error: walletError.message,
          stack: walletError.stack
        });
        // Don't fail the deposit creation if wallet update fails
      }
    } else {
      console.log(`⏳ Deposit not confirmed, skipping wallet credit. Status: ${depositStatus}`);
    }

    res.json({
      success: true,
      message: depositStatus === 'CONFIRMED' ? 'USDT deposit automatically confirmed!' : 'USDT deposit record created successfully',
      data: {
        depositId: deposit.id,
        amount: deposit.amount,
        currency: deposit.currency,
        network: deposit.network,
        status: deposit.status,
        createdAt: deposit.createdAt,
        autoConfirmed: autoConfirmed || false
      }
    });

  } catch (error) {
    console.error('Error creating USDT deposit:', error);
    res.status(500).json({
      error: 'Failed to create USDT deposit',
      message: error.message
    });
  }
});

// Get pending deposits count for user
router.get('/pending-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const pendingCount = await prisma.deposit.count({
      where: {
        userId,
        status: 'PENDING'
      }
    });

    res.json({
      success: true,
      data: {
        pendingCount
      }
    });

  } catch (error) {
    console.error('Error fetching pending deposits count:', error);
    res.status(500).json({
      error: 'Failed to fetch pending deposits count',
      message: error.message
    });
  }
});

// Check automatic detection status
router.get('/automatic-detection-status', authenticateToken, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const statusFilePath = path.join(__dirname, '../automatic_detection_status.json');
    
    let isRunning = false;
    let message = 'Automatic detection is not running';
    
    // Try to read status from file
    if (fs.existsSync(statusFilePath)) {
      try {
        const statusData = JSON.parse(fs.readFileSync(statusFilePath, 'utf8'));
        isRunning = statusData.isRunning || false;
        message = statusData.message || (isRunning ? 'Automatic detection is active' : 'Automatic detection is not running');
      } catch (fileError) {
        console.error('Error reading status file:', fileError);
        // Fallback to global variable
        isRunning = global.automaticDetectionRunning || false;
        message = isRunning ? 'Automatic detection is active' : 'Automatic detection is not running';
      }
    } else {
      // Fallback to global variable if file doesn't exist
      isRunning = global.automaticDetectionRunning || false;
      message = isRunning ? 'Automatic detection is active' : 'Automatic detection is not running';
    }
    
    res.json({ 
      success: true, 
      data: { 
        isRunning,
        message
      } 
    });
  } catch (error) {
    console.error('Error checking automatic detection status:', error);
    res.status(500).json({ error: 'Failed to check status', message: error.message });
  }
});

// Get deposit details
router.get('/:depositId', authenticateToken, async (req, res) => {
  try {
    const { depositId } = req.params;
    const userId = req.user.id;

    const deposit = await prisma.deposit.findFirst({
      where: {
        id: depositId,
        userId
      }
    });

    if (!deposit) {
      return res.status(404).json({
        error: 'Deposit not found'
      });
    }

    res.json({
      success: true,
      data: deposit
    });

  } catch (error) {
    console.error('Error fetching deposit details:', error);
    res.status(500).json({
      error: 'Failed to fetch deposit details',
      message: error.message
    });
  }
});

// Update transaction hash for a deposit
router.patch('/:depositId/transaction-hash', [
  body('transactionHash').notEmpty().withMessage('Transaction hash is required')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { depositId } = req.params;
    const { transactionHash } = req.body;
    const userId = req.user.id;

    // Check if deposit exists and belongs to user
    const deposit = await prisma.deposit.findFirst({
      where: {
        id: depositId,
        userId
      }
    });

    if (!deposit) {
      return res.status(404).json({
        error: 'Deposit not found',
        message: 'The specified deposit does not exist or does not belong to you'
      });
    }

    // Only allow updates for pending deposits
    if (deposit.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Cannot update transaction hash',
        message: 'Transaction hash can only be updated for pending deposits'
      });
    }

    // Update the transaction hash
    const updatedDeposit = await prisma.deposit.update({
      where: {
        id: depositId
      },
      data: {
        transactionHash,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Transaction hash updated successfully',
      data: {
        depositId: updatedDeposit.id,
        transactionHash: updatedDeposit.transactionHash,
        status: updatedDeposit.status
      }
    });

  } catch (error) {
    console.error('Error updating transaction hash:', error);
    res.status(500).json({
      error: 'Failed to update transaction hash',
      message: error.message
    });
  }
});

// Verify deposit transaction (for users)
router.post('/:depositId/verify', authenticateToken, async (req, res) => {
  try {
    const { depositId } = req.params;
    const userId = req.user.id;

    console.log(`🔍 Verification request for deposit ${depositId} by user ${userId}`);
    console.log(`   User email: ${req.user.email}`);
    console.log(`   User phone: ${req.user.phone}`);
    console.log(`   User isEmailVerified: ${req.user.isEmailVerified}`);

    // Check if deposit exists and belongs to user
    const deposit = await prisma.deposit.findFirst({
      where: {
        id: depositId,
        userId
      }
    });

    if (!deposit) {
      console.log(`❌ Deposit ${depositId} not found for user ${userId}`);
      
      // Let's also check if the deposit exists at all (for debugging)
      const anyDeposit = await prisma.deposit.findUnique({
        where: { id: depositId }
      });
      
      if (anyDeposit) {
        console.log(`⚠️  Deposit ${depositId} exists but belongs to user ${anyDeposit.userId} (not ${userId})`);
        console.log(`   This suggests a user context mismatch`);
      } else {
        console.log(`⚠️  Deposit ${depositId} doesn't exist in database at all`);
      }
      
      return res.status(404).json({
        error: 'Deposit not found',
        message: 'The specified deposit does not belong to you'
      });
    }

    console.log(`✅ Found deposit:`, {
      id: deposit.id,
      userId: deposit.userId,
      status: deposit.status,
      transactionHash: deposit.transactionHash,
      network: deposit.network,
      amount: deposit.amount,
      currency: deposit.currency
    });

    if (deposit.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Cannot verify deposit',
        message: `Deposit is already ${deposit.status.toLowerCase()}`
      });
    }

    if (!deposit.transactionHash || !deposit.network) {
      console.log(`❌ Missing required fields for deposit ${depositId}:`, {
        transactionHash: deposit.transactionHash,
        network: deposit.network
      });
      return res.status(400).json({
        error: 'Missing information',
        message: 'Transaction hash and network are required for verification'
      });
    }

    // Verify the deposit
    const verificationResult = await verifyUsdtDeposit(
      depositId,
      deposit.transactionHash,
      deposit.network
    );

    if (verificationResult.verified) {
      // Process the deposit confirmation
      const { processUsdtDepositConfirmation } = require('../services/depositService');
      await processUsdtDepositConfirmation(depositId, deposit.transactionHash);
    }

    res.json({
      success: true,
      message: verificationResult.message,
      data: verificationResult
    });

  } catch (error) {
    console.error('❌ Error verifying deposit:', error);
    res.status(500).json({
      error: 'Failed to verify deposit',
      message: error.message
    });
  }
});

// Admin: Get pending deposits for verification
router.get('/admin/pending-verification', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const deposits = await getPendingDepositsForVerification();

    res.json({
      success: true,
      data: deposits
    });

  } catch (error) {
    console.error('Error fetching pending deposits for verification:', error);
    res.status(500).json({
      error: 'Failed to fetch pending deposits',
      message: error.message
    });
  }
});

// Admin: Manually verify deposit
router.post('/admin/:depositId/manual-verify', [
  body('verificationNotes').optional().isLength({ max: 500 }).withMessage('Verification notes too long')
], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { depositId } = req.params;
    const { verificationNotes } = req.body;
    const adminId = req.user.id;

    // Manually verify the deposit
    const verificationResult = await manualVerifyDeposit(depositId, adminId, verificationNotes);

    if (verificationResult.verified) {
      // Process the deposit confirmation
      const { processUsdtDepositConfirmation } = require('../services/depositService');
      await processUsdtDepositConfirmation(depositId, null);
    }

    res.json({
      success: true,
      message: verificationResult.message,
      data: verificationResult
    });

  } catch (error) {
    console.error('Error manually verifying deposit:', error);
    res.status(500).json({
      error: 'Failed to manually verify deposit',
      message: error.message
    });
  }
});

// Admin: Batch verify deposits
router.post('/admin/batch-verify', [
  body('depositIds').isArray({ min: 1 }).withMessage('At least one deposit ID is required'),
  body('depositIds.*').isUUID().withMessage('Invalid deposit ID format')
], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { depositIds } = req.body;

    // Batch verify deposits
    const results = await batchVerifyDeposits(depositIds);

    // Process successful verifications
    const successfulVerifications = results.filter(result => result.verified);
    for (const verification of successfulVerifications) {
      try {
        const { processUsdtDepositConfirmation } = require('../services/depositService');
        await processUsdtDepositConfirmation(verification.depositId, null);
      } catch (error) {
        console.error(`Error processing deposit ${verification.depositId}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Batch verification completed. ${successfulVerifications.length} deposits verified successfully.`,
      data: {
        total: depositIds.length,
        successful: successfulVerifications.length,
        failed: results.length - successfulVerifications.length,
        results
      }
    });

  } catch (error) {
    console.error('Error in batch verification:', error);
    res.status(500).json({
      error: 'Failed to batch verify deposits',
      message: error.message
    });
  }
});

module.exports = router;