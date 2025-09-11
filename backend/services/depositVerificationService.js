const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Verify USDT deposit by checking blockchain transaction
const verifyUsdtDeposit = async (depositId, transactionHash, network) => {
  try {
    console.log(`Verifying USDT deposit ${depositId} with hash ${transactionHash} on ${network}`);

    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    if (!deposit) {
      throw new Error(`Deposit ${depositId} not found`);
    }

    if (deposit.status !== 'PENDING') {
      return { verified: false, message: `Deposit already processed with status: ${deposit.status}` };
    }

    // Get system wallet addresses for the network
    const systemAddresses = await getSystemWalletAddresses(network);
    if (!systemAddresses || !systemAddresses.length) {
      throw new Error(`No system addresses configured for network: ${network}`);
    }

    // Verify transaction on blockchain
    const transactionDetails = await verifyTransactionOnBlockchain(
      transactionHash,
      network,
      systemAddresses,
      deposit.amount
    );

    if (!transactionDetails.verified) {
      return {
        verified: false,
        message: transactionDetails.message || 'Transaction verification failed'
      };
    }

    // Update deposit with verification details
    await prisma.deposit.update({
      where: { id: depositId },
      data: {
        status: 'CONFIRMED',
        transactionHash,
        webhookData: {
          verificationDetails: transactionDetails,
          verifiedAt: new Date().toISOString()
        },
        updatedAt: new Date()
      }
    });

    return {
      verified: true,
      message: 'Deposit verified successfully',
      transactionDetails
    };

  } catch (error) {
    console.error(`Error verifying USDT deposit ${depositId}:`, error);
    throw error;
  }
};

// Verify transaction on blockchain
const verifyTransactionOnBlockchain = async (transactionHash, network, systemAddresses, expectedAmount) => {
  try {
    let transactionDetails;

    switch (network) {
      case 'TRC20':
        transactionDetails = await verifyTronTransaction(transactionHash, systemAddresses, expectedAmount);
        break;
      case 'BEP20':
        transactionDetails = await verifyBscTransaction(transactionHash, systemAddresses, expectedAmount);
        break;
      case 'ERC20':
        transactionDetails = await verifyEthereumTransaction(transactionHash, systemAddresses, expectedAmount);
        break;
      case 'POLYGON':
        transactionDetails = await verifyPolygonTransaction(transactionHash, systemAddresses, expectedAmount);
        break;
      default:
        throw new Error(`Unsupported network: ${network}`);
    }

    return transactionDetails;

  } catch (error) {
    console.error(`Error verifying transaction on ${network}:`, error);
    return {
      verified: false,
      message: `Blockchain verification failed: ${error.message}`
    };
  }
};

// Verify TRON (TRC20) transaction
const verifyTronTransaction = async (transactionHash, systemAddresses, expectedAmount) => {
  try {
    // Use TRON API to verify transaction
    const response = await axios.get(`https://api.trongrid.io/v1/transactions/${transactionHash}`);
    
    if (response.data.success !== true) {
      return { verified: false, message: 'Transaction not found on TRON network' };
    }

    const tx = response.data.data[0];
    
    // Check if transaction is confirmed
    if (tx.ret[0].contractRet !== 'SUCCESS') {
      return { verified: false, message: 'Transaction failed on TRON network' };
    }

    // Check if recipient is our system address
    const recipient = tx.raw_data.contract[0].parameter.value.to_address;
    const recipientHex = Buffer.from(recipient, 'base64').toString('hex');
    const recipientAddress = 'T' + recipientHex.substring(2);

    if (!systemAddresses.includes(recipientAddress)) {
      return { verified: false, message: 'Transaction recipient is not a system address' };
    }

    // Check amount (convert from sun to USDT)
    const amount = parseFloat(tx.raw_data.contract[0].parameter.value.amount) / 1000000;
    
    if (Math.abs(amount - expectedAmount) > 0.01) { // Allow 0.01 USDT tolerance
      return { verified: false, message: `Amount mismatch. Expected: ${expectedAmount}, Received: ${amount}` };
    }

    return {
      verified: true,
      amount,
      recipient: recipientAddress,
      blockNumber: tx.blockNumber,
      timestamp: tx.blockTimeStamp
    };

  } catch (error) {
    console.error('Error verifying TRON transaction:', error);
    return { verified: false, message: 'Failed to verify TRON transaction' };
  }
};

// Verify BSC (BEP20) transaction - Using RPC instead of API
const verifyBscTransaction = async (transactionHash, systemAddresses, expectedAmount) => {
  try {
    console.log(`🔍 Verifying BSC token transaction: ${transactionHash}`);
    
    // BSC RPC endpoints (public, no API key required)
    const rpcEndpoints = [
      'https://bsc-dataseed.binance.org/',
      'https://bsc-dataseed1.defibit.io/',
      'https://bsc-dataseed1.ninicoin.io/',
      'https://bsc-dataseed2.defibit.io/',
      'https://bsc-dataseed3.defibit.io/'
    ];
    
    for (const endpoint of rpcEndpoints) {
      try {
        console.log(`🔍 Trying BSC RPC endpoint: ${endpoint}`);
        
        // Get transaction by hash
        const txResponse = await axios.post(endpoint, {
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [transactionHash],
          id: 1
        }, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!txResponse.data.result) {
          console.log(`❌ No transaction found on ${endpoint}`);
          continue;
        }
        
        const tx = txResponse.data.result;
        console.log(`🔍 BSC transaction data:`, tx);
        
        // Get transaction receipt for token transfer logs
        const receiptResponse = await axios.post(endpoint, {
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [transactionHash],
          id: 2
        }, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const receipt = receiptResponse.data.result;
        console.log(`🔍 BSC transaction receipt:`, receipt);
        
        // Check if this is a token transfer (ERC20/BEP20)
        if (receipt && receipt.logs && receipt.logs.length > 0) {
          // Look for Transfer event (topic: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef)
          const transferLog = receipt.logs.find(log => 
            log.topics && log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
          );
          
          if (transferLog) {
            // Decode token transfer data
            const fromAddress = '0x' + transferLog.topics[1].substring(26);
            const toAddress = '0x' + transferLog.topics[2].substring(26);
            const amount = BigInt(transferLog.data);
            
            // Check if recipient is our system address
            const recipient = toAddress.toLowerCase();
            const systemAddressesLower = systemAddresses.map(addr => addr.toLowerCase());
            
            if (!systemAddressesLower.includes(recipient)) {
              return { verified: false, message: 'Transaction recipient is not a system address' };
            }
            
            // Determine token type based on contract address
            const contractAddress = transferLog.address.toLowerCase();
            let tokenSymbol = 'UNKNOWN';
            let tokenDecimals = 18;
            
            if (contractAddress === '0x55d398326f99059ff775485246999027b3197955') {
              // This is USDT/BUSD contract on BSC
              tokenSymbol = 'BUSD'; // or USDT, both use same contract
              tokenDecimals = 18;
            } else if (contractAddress === '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d') {
              tokenSymbol = 'USDC';
              tokenDecimals = 18;
            }
            
            const actualAmount = Number(amount) / Math.pow(10, tokenDecimals);
            
            console.log(`🔍 Token transfer detected:`, {
              contractAddress: transferLog.address,
              tokenSymbol: tokenSymbol,
              fromAddress: fromAddress,
              toAddress: toAddress,
              amount: actualAmount
            });
            
            // Check if this is a supported token
            const supportedTokens = {
              'USDT': '0x55d398326f99059ff775485246999027b3197955',
              'BUSD': '0x55d398326f99059ff775485246999027b3197955',
              'USDC': '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'
            };
            
            if (!supportedTokens[tokenSymbol] || supportedTokens[tokenSymbol].toLowerCase() !== contractAddress) {
              return { verified: false, message: `Unsupported token: ${tokenSymbol} (${contractAddress})` };
            }
            
            console.log(`🔍 Amount verification: Expected: ${expectedAmount}, Actual: ${actualAmount}, Token: ${tokenSymbol}`);

            if (Math.abs(actualAmount - expectedAmount) > 0.01) {
              return { verified: false, message: `Amount mismatch. Expected: ${expectedAmount}, Received: ${actualAmount} ${tokenSymbol}` };
            }

            return {
              verified: true,
              amount: actualAmount,
              recipient: toAddress,
              blockNumber: parseInt(tx.blockNumber, 16),
              timestamp: new Date().toISOString(), // RPC doesn't provide timestamp
              tokenSymbol: tokenSymbol,
              tokenName: tokenSymbol,
              contractAddress: transferLog.address
            };
          }
        }
        
        // If no token transfer found, check if it's a regular ETH/BNB transfer
        if (tx.value && tx.value !== '0x0') {
          const recipient = tx.to.toLowerCase();
          const systemAddressesLower = systemAddresses.map(addr => addr.toLowerCase());
          
          if (!systemAddressesLower.includes(recipient)) {
            return { verified: false, message: 'Transaction recipient is not a system address' };
          }
          
          const actualAmount = parseInt(tx.value, 16) / Math.pow(10, 18); // BNB has 18 decimals
          
          if (Math.abs(actualAmount - expectedAmount) > 0.01) {
            return { verified: false, message: `Amount mismatch. Expected: ${expectedAmount}, Received: ${actualAmount} BNB` };
          }
          
          return {
            verified: true,
            amount: actualAmount,
            recipient: tx.to,
            blockNumber: parseInt(tx.blockNumber, 16),
            timestamp: new Date().toISOString(),
            tokenSymbol: 'BNB',
            tokenName: 'BNB',
            contractAddress: null
          };
        }
        
        return { verified: false, message: 'No token transfer or BNB transfer found in transaction' };
        
      } catch (error) {
        console.log(`❌ BSC RPC endpoint ${endpoint} failed: ${error.message}`);
        continue;
      }
    }
    
    return { verified: false, message: 'All BSC RPC endpoints failed' };

  } catch (error) {
    console.error('Error verifying BSC transaction:', error);
    return { verified: false, message: 'Failed to verify BSC transaction' };
  }
};

// Verify Ethereum (ERC20) transaction
const verifyEthereumTransaction = async (transactionHash, systemAddresses, expectedAmount) => {
  try {
    // Use Etherscan API to verify transaction
    const apiKey = process.env.ETHERSCAN_API_KEY;
    const response = await axios.get(
      `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${transactionHash}&apikey=${apiKey}`
    );

    if (response.data.error) {
      return { verified: false, message: 'Transaction not found on Ethereum network' };
    }

    const tx = response.data.result;
    
    // Check if transaction is confirmed
    if (!tx.blockNumber || tx.blockNumber === '0x0') {
      return { verified: false, message: 'Transaction not yet confirmed on Ethereum network' };
    }

    // Check if recipient is our system address
    const recipient = tx.to.toLowerCase();
    const systemAddressesLower = systemAddresses.map(addr => addr.toLowerCase());
    
    if (!systemAddressesLower.includes(recipient)) {
      return { verified: false, message: 'Transaction recipient is not a system address' };
    }

    // For ERC20 USDT, decode the input data
    const inputData = tx.input;
    if (!inputData.startsWith('0xa9059cbb')) {
      return { verified: false, message: 'Not a valid USDT transfer transaction' };
    }

    // Decode amount from input data
    const amountHex = inputData.substring(74, 138);
    const amount = parseInt(amountHex, 16) / Math.pow(10, 6); // USDT has 6 decimals on Ethereum

    if (Math.abs(amount - expectedAmount) > 0.01) {
      return { verified: false, message: `Amount mismatch. Expected: ${expectedAmount}, Received: ${amount}` };
    }

    return {
      verified: true,
      amount,
      recipient: tx.to,
      blockNumber: parseInt(tx.blockNumber, 16),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error verifying Ethereum transaction:', error);
    return { verified: false, message: 'Failed to verify Ethereum transaction' };
  }
};

// Verify Polygon transaction
const verifyPolygonTransaction = async (transactionHash, systemAddresses, expectedAmount) => {
  try {
    // Use PolygonScan API to verify transaction
    const apiKey = process.env.POLYGONSCAN_API_KEY;
    const response = await axios.get(
      `https://api.polygonscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${transactionHash}&apikey=${apiKey}`
    );

    if (response.data.error) {
      return { verified: false, message: 'Transaction not found on Polygon network' };
    }

    const tx = response.data.result;
    
    // Check if transaction is confirmed
    if (!tx.blockNumber || tx.blockNumber === '0x0') {
      return { verified: false, message: 'Transaction not yet confirmed on Polygon network' };
    }

    // Check if recipient is our system address
    const recipient = tx.to.toLowerCase();
    const systemAddressesLower = systemAddresses.map(addr => addr.toLowerCase());
    
    if (!systemAddressesLower.includes(recipient)) {
      return { verified: false, message: 'Transaction recipient is not a system address' };
    }

    // For Polygon USDT, decode the input data
    const inputData = tx.input;
    if (!inputData.startsWith('0xa9059cbb')) {
      return { verified: false, message: 'Not a valid USDT transfer transaction' };
    }

    // Decode amount from input data
    const amountHex = inputData.substring(74, 138);
    const amount = parseInt(amountHex, 16) / Math.pow(10, 6); // USDT has 6 decimals on Polygon

    if (Math.abs(amount - expectedAmount) > 0.01) {
      return { verified: false, message: `Amount mismatch. Expected: ${expectedAmount}, Received: ${amount}` };
    }

    return {
      verified: true,
      amount,
      recipient: tx.to,
      blockNumber: parseInt(tx.blockNumber, 16),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error verifying Polygon transaction:', error);
    return { verified: false, message: 'Failed to verify Polygon transaction' };
  }
};

// Get system wallet addresses for a network
const getSystemWalletAddresses = async (network) => {
  try {
    // First try to get addresses from user wallet addresses (which now contain company addresses)
    const userAddresses = await prisma.userWalletAddress.findMany({
      where: {
        network: network === 'TRC20' ? 'TRON' : 
                network === 'BEP20' ? 'BSC' : 
                network === 'ERC20' ? 'ETHEREUM' : 
                network === 'POLYGON' ? 'POLYGON' : network,
        isActive: true
      },
      select: { address: true }
    });

    if (userAddresses && userAddresses.length > 0) {
      // Extract addresses from user wallet addresses
      return userAddresses.map(addr => addr.address);
    }

    // Fallback to environment variables if no user addresses found
    const addresses = {
      'TRC20': process.env.TRON_WALLET_ADDRESS ? [process.env.TRON_WALLET_ADDRESS] : [],
      'BEP20': process.env.BSC_WALLET_ADDRESS ? [process.env.BSC_WALLET_ADDRESS] : [],
      'ERC20': process.env.ETH_WALLET_ADDRESS ? [process.env.ETH_WALLET_ADDRESS] : [],
      'POLYGON': process.env.POLYGON_WALLET_ADDRESS ? [process.env.POLYGON_WALLET_ADDRESS] : []
    };

    return addresses[network] || [];
  } catch (error) {
    console.error('Error getting system wallet addresses:', error);
    // Fallback to environment variables on error
    const addresses = {
      'TRC20': process.env.TRON_WALLET_ADDRESS ? [process.env.TRON_WALLET_ADDRESS] : [],
      'BEP20': process.env.BSC_WALLET_ADDRESS ? [process.env.BSC_WALLET_ADDRESS] : [],
      'ERC20': process.env.ETH_WALLET_ADDRESS ? [process.env.ETH_WALLET_ADDRESS] : [],
      'POLYGON': process.env.POLYGON_WALLET_ADDRESS ? [process.env.POLYGON_WALLET_ADDRESS] : []
    };

    return addresses[network] || [];
  }
};

// Get token contract addresses
const getTokenContractAddresses = async () => {
  try {
    const contracts = {
      'USDT': {
        'TRC20': process.env.USDT_TRC20_CONTRACT || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        'BEP20': process.env.USDT_BEP20_CONTRACT || '0x55d398326f99059fF775485246999027B3197955',
        'ERC20': process.env.USDT_ERC20_CONTRACT || '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'POLYGON': process.env.USDT_POLYGON_CONTRACT || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
      },
      'USDC': {
        'BEP20': process.env.USDC_BEP20_CONTRACT || '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        'ERC20': process.env.USDC_ERC20_CONTRACT || '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C',
        'POLYGON': process.env.USDC_POLYGON_CONTRACT || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
      },
      'BUSD': {
        'BEP20': process.env.BUSD_BEP20_CONTRACT || '0x55d398326f99059fF775485246999027B3197955',
        'ERC20': process.env.BUSD_ERC20_CONTRACT || '0x4Fabb145d64652a948d72533023f6E7A623C7C53'
      }
    };

    return contracts;
  } catch (error) {
    console.error('Error getting token contract addresses:', error);
    return {};
  }
};

// Manual verification by admin
const manualVerifyDeposit = async (depositId, adminId, verificationNotes) => {
  try {
    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    if (!deposit) {
      throw new Error(`Deposit ${depositId} not found`);
    }

    if (deposit.status !== 'PENDING') {
      throw new Error(`Deposit already processed with status: ${deposit.status}`);
    }

    // Update deposit with manual verification
    await prisma.deposit.update({
      where: { id: depositId },
      data: {
        status: 'CONFIRMED',
        adminNotes: verificationNotes,
        webhookData: {
          manualVerification: {
            verifiedBy: adminId,
            verifiedAt: new Date().toISOString(),
            notes: verificationNotes
          }
        },
        updatedAt: new Date()
      }
    });

    return {
      verified: true,
      message: 'Deposit manually verified by admin',
      depositId
    };

  } catch (error) {
    console.error(`Error manually verifying deposit ${depositId}:`, error);
    throw error;
  }
};

// Get pending deposits that need verification
const getPendingDepositsForVerification = async () => {
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

    return deposits;
  } catch (error) {
    console.error('Error fetching pending deposits for verification:', error);
    throw error;
  }
};

// Batch verify deposits
const batchVerifyDeposits = async (depositIds) => {
  try {
    const results = [];
    
    for (const depositId of depositIds) {
      try {
        const deposit = await prisma.deposit.findUnique({
          where: { id: depositId }
        });

        if (!deposit || deposit.status !== 'PENDING') {
          results.push({
            depositId,
            verified: false,
            message: 'Deposit not found or already processed'
          });
          continue;
        }

        if (deposit.transactionHash && deposit.network) {
          const verificationResult = await verifyUsdtDeposit(
            depositId,
            deposit.transactionHash,
            deposit.network
          );
          results.push({ depositId, ...verificationResult });
        } else {
          results.push({
            depositId,
            verified: false,
            message: 'Missing transaction hash or network information'
          });
        }
      } catch (error) {
        results.push({
          depositId,
          verified: false,
          message: `Verification failed: ${error.message}`
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error in batch verification:', error);
    throw error;
  }
};

module.exports = {
  verifyUsdtDeposit,
  verifyTransactionOnBlockchain,
  manualVerifyDeposit,
  getPendingDepositsForVerification,
  batchVerifyDeposits,
  getSystemWalletAddresses,
  getTokenContractAddresses
};
