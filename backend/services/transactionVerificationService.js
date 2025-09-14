const axios = require('axios');

class TransactionVerificationService {
  constructor() {
    this.apiKeys = {
      bscscan: process.env.BSCSCAN_API_KEY,
      etherscan: process.env.ETHERSCAN_API_KEY,
      polygonscan: process.env.POLYGONSCAN_API_KEY,
      tron: process.env.TRON_API_KEY || null
    };
  }

  /**
   * Verify transaction hash against wallet address
   */
  async verifyTransaction(transactionHash, expectedAddress, expectedAmount, network) {
    try {
      console.log(`🔍 Verifying transaction: ${transactionHash} for network: ${network}`);
      
      let verificationResult;
      
      switch (network.toUpperCase()) {
        case 'TRC20':
        case 'TRON':
          verificationResult = await this.verifyTronTransaction(transactionHash, expectedAddress, expectedAmount);
          break;
        case 'BEP20':
        case 'BSC':
          verificationResult = await this.verifyBSCTransaction(transactionHash, expectedAddress, expectedAmount);
          break;
        case 'ERC20':
        case 'ETHEREUM':
          verificationResult = await this.verifyEthereumTransaction(transactionHash, expectedAddress, expectedAmount);
          break;
        case 'POLYGON':
          verificationResult = await this.verifyPolygonTransaction(transactionHash, expectedAddress, expectedAmount);
          break;
        default:
          throw new Error(`Unsupported network: ${network}`);
      }
      
      console.log(`✅ Transaction verification result:`, verificationResult);
      return verificationResult;
      
    } catch (error) {
      console.error(`❌ Transaction verification failed:`, error.message);
      return {
        isValid: false,
        error: error.message,
        details: null
      };
    }
  }

  /**
   * Check if transaction exists on blockchain (fallback verification)
   */
  async checkTransactionOnBlockchain(transactionHash, network) {
    try {
      console.log(`🔍 Checking transaction on blockchain: ${transactionHash} for network: ${network}`);
      
      // Basic validation for transaction hash format
      if (!this.isValidTransactionHash(transactionHash)) {
        return {
          exists: false,
          error: 'Invalid transaction hash format',
          details: null
        };
      }
      
      let blockchainInfo;
      
      switch (network.toUpperCase()) {
        case 'TRC20':
        case 'TRON':
          blockchainInfo = await this.getTronTransactionInfo(transactionHash);
          break;
        case 'BEP20':
        case 'BSC':
          blockchainInfo = await this.getBSCTransactionInfo(transactionHash);
          break;
        case 'ERC20':
        case 'ETHEREUM':
          blockchainInfo = await this.getEthereumTransactionInfo(transactionHash);
          break;
        case 'POLYGON':
          blockchainInfo = await this.getPolygonTransactionInfo(transactionHash);
          break;
        default:
          throw new Error(`Unsupported network: ${network}`);
      }
      
      console.log(`✅ Blockchain transaction info:`, blockchainInfo);
      return blockchainInfo;
      
    } catch (error) {
      console.error(`❌ Blockchain check failed:`, error.message);
      return {
        exists: false,
        error: error.message,
        details: null
      };
    }
  }

  /**
   * Check transaction hash across all supported networks
   */
  async checkTransactionAcrossAllNetworks(transactionHash) {
    try {
      console.log(`🔍 Checking transaction across all networks: ${transactionHash}`);
      
      // Basic validation for transaction hash format
      if (!this.isValidTransactionHash(transactionHash)) {
        return {
          transactionHash,
          found: false,
          foundOnNetwork: null,
          totalNetworksChecked: 0,
          error: 'Invalid transaction hash format',
          results: []
        };
      }
      
      const networks = [
        { name: 'BSC', method: 'getBSCTransactionInfo' },
        { name: 'Ethereum', method: 'getEthereumTransactionInfo' },
        { name: 'Polygon', method: 'getPolygonTransactionInfo' },
        { name: 'TRON', method: 'getTronTransactionInfo' }
      ];

      const results = [];
      let foundOnNetwork = null;

      // Check each network
      for (const network of networks) {
        try {
          console.log(`🔍 Checking ${network.name}...`);
          const result = await this[network.method](transactionHash);
          
          if (result.exists) {
            foundOnNetwork = network.name;
            results.push({
              network: network.name,
              found: true,
              details: result.details
            });
            console.log(`✅ Found on ${network.name}!`);
            break; // Found it, no need to check other networks
          } else {
            results.push({
              network: network.name,
              found: false,
              error: result.error
            });
          }
        } catch (error) {
          console.log(`❌ Error checking ${network.name}: ${error.message}`);
          results.push({
            network: network.name,
            found: false,
            error: error.message
          });
        }
      }

      const summary = {
        transactionHash,
        found: !!foundOnNetwork,
        foundOnNetwork,
        totalNetworksChecked: networks.length,
        results
      };

      console.log(`✅ Cross-network check complete:`, summary);
      return summary;
      
    } catch (error) {
      console.error(`❌ Cross-network check failed:`, error.message);
      return {
        transactionHash,
        found: false,
        foundOnNetwork: null,
        totalNetworksChecked: 0,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Validate transaction hash format
   */
  isValidTransactionHash(hash) {
    if (!hash || typeof hash !== 'string') {
      return false;
    }
    
    // Remove 0x prefix if present
    const cleanHash = hash.startsWith('0x') ? hash.slice(2) : hash;
    
    // Check length (most transaction hashes are 64 characters)
    if (cleanHash.length !== 64) {
      return false;
    }
    
    // Check if it's hexadecimal
    const hexRegex = /^[0-9a-fA-F]+$/;
    if (!hexRegex.test(cleanHash)) {
      return false;
    }
    
    return true;
  }

  /**
   * Verify BSC (Binance Smart Chain) transaction - Using RPC instead of API
   */
  async verifyBSCTransaction(transactionHash, expectedAddress, expectedAmount) {
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
        console.log(`🔍 Verifying BSC transaction via RPC: ${endpoint}`);
        
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
            
            // Verify recipient address
            const isRecipientValid = toAddress.toLowerCase() === expectedAddress.toLowerCase();
            
            // Determine token type and decimals
            const contractAddress = transferLog.address.toLowerCase();
            let tokenSymbol = 'UNKNOWN';
            let tokenDecimals = 18;
            
            if (contractAddress === '0x55d398326f99059ff775485246999027b3197955') {
              tokenSymbol = 'BUSD'; // or USDT, both use same contract
              tokenDecimals = 18;
            } else if (contractAddress === '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d') {
              tokenSymbol = 'USDC';
              tokenDecimals = 18;
            }
            
            const actualAmount = Number(amount) / Math.pow(10, tokenDecimals);
            const isAmountValid = Math.abs(actualAmount - expectedAmount) <= 0.01;
            
            // Check transaction status
            const isConfirmed = tx.blockNumber && tx.blockNumber !== '0x0';
            
            return {
              isValid: isRecipientValid && isAmountValid && isConfirmed,
              error: null,
              details: {
                recipientAddress: toAddress,
                actualAmount: actualAmount,
                expectedAmount,
                isRecipientValid,
                isAmountValid,
                isConfirmed,
                blockNumber: tx.blockNumber,
                gasUsed: receipt.gasUsed,
                network: 'BSC',
                tokenSymbol: tokenSymbol,
                contractAddress: transferLog.address,
                isTokenTransfer: true
              }
            };
          }
        }
        
        // If no token transfer found, check if it's a regular BNB transfer
        if (tx.value && tx.value !== '0x0') {
          const recipientAddress = tx.to;
          const isRecipientValid = recipientAddress && 
            recipientAddress.toLowerCase() === expectedAddress.toLowerCase();
          
          const actualAmountWei = tx.value;
          const expectedAmountWei = this.convertToWei(expectedAmount, 18);
          const isAmountValid = actualAmountWei === expectedAmountWei;
          
          const isConfirmed = tx.blockNumber && tx.blockNumber !== '0x0';
          
          return {
            isValid: isRecipientValid && isAmountValid && isConfirmed,
            error: null,
            details: {
              recipientAddress,
              actualAmount: this.convertFromWei(actualAmountWei, 18),
              expectedAmount,
              isRecipientValid,
              isAmountValid,
              isConfirmed,
              blockNumber: tx.blockNumber,
              gasUsed: tx.gas,
              network: 'BSC',
              tokenSymbol: 'BNB',
              isTokenTransfer: false
            }
          };
        }
        
        return {
          isValid: false,
          error: 'No token transfer or BNB transfer found in transaction',
          details: null
        };
        
      } catch (error) {
        console.log(`❌ BSC RPC endpoint ${endpoint} failed: ${error.message}`);
        continue;
      }
    }
    
    return {
      isValid: false,
      error: 'All BSC RPC endpoints failed',
      details: null
    };
  }

  /**
   * Verify Ethereum transaction
   */
  async verifyEthereumTransaction(transactionHash, expectedAddress, expectedAmount) {
    // Try multiple Ethereum API endpoints for better reliability
    const endpoints = [
      {
        name: 'Etherscan',
        url: 'https://api.etherscan.io/api',
        params: {
          module: 'proxy',
          action: 'eth_getTransactionByHash',
          txhash: transactionHash,
          apikey: this.apiKeys.etherscan || 'YourApiKeyToken'
        }
      },
      {
        name: 'Etherscan Public',
        url: 'https://api.etherscan.io/api',
        params: {
          module: 'proxy',
          action: 'eth_getTransactionByHash',
          txhash: transactionHash
        }
      },
      {
        name: 'Alchemy',
        url: 'https://eth-mainnet.g.alchemy.com/v2/demo',
        method: 'POST',
        data: {
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [transactionHash],
          id: 1
        }
      },
      {
        name: 'Infura',
        url: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        method: 'POST',
        data: {
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [transactionHash],
          id: 1
        }
      }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Verifying Ethereum transaction via ${endpoint.name}...`);
        
        let response;
        if (endpoint.method === 'POST') {
          response = await axios.post(endpoint.url, endpoint.data, {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        } else {
          response = await axios.get(endpoint.url, { 
            params: endpoint.params,
            timeout: 10000
          });
        }
        
        let tx;
        if (endpoint.name === 'Etherscan' || endpoint.name === 'Etherscan Public') {
          // Handle Etherscan response format
          if (response.data.error || (response.data.status === "0" && response.data.message === "NOTOK")) {
            if (response.data.error?.message?.includes('API key') || 
                response.data.result?.includes('Invalid API Key') ||
                response.data.status === "0") {
              console.log(`⚠️ ${endpoint.name} API key issue, trying next endpoint`);
              continue;
            }
            throw new Error(`${endpoint.name} API error: ${response.data.error?.message || response.data.result}`);
          }
          tx = response.data.result;
        } else {
          // Handle RPC response format (Alchemy, Infura)
          if (response.data.error) {
            throw new Error(`${endpoint.name} RPC error: ${response.data.error.message}`);
          }
          tx = response.data.result;
        }
        
        if (!tx || !tx.hash || tx.hash === '0x') {
          console.log(`🔍 No transaction found on ${endpoint.name}`);
          continue;
        }

        // Verify recipient address
        const recipientAddress = tx.to;
        const isRecipientValid = recipientAddress && 
          recipientAddress.toLowerCase() === expectedAddress.toLowerCase();

        // Verify amount (value field in wei)
        const actualAmountWei = tx.value;
        const expectedAmountWei = this.convertToWei(expectedAmount, 18);
        const isAmountValid = actualAmountWei === expectedAmountWei;

        // Check transaction status
        const isConfirmed = tx.blockNumber && tx.blockNumber !== '0x0';

        // Try to get transaction receipt for token transfer analysis
        let receipt = null;
        let tokenTransfers = [];
        let actualRecipientAddress = recipientAddress;
        let actualAmount = this.convertFromWei(actualAmountWei, 18);
        
        try {
          console.log(`🔍 Getting transaction receipt for token transfer analysis...`);
          let receiptResponse;
          if (endpoint.method === 'POST') {
            receiptResponse = await axios.post(endpoint.url, {
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
          } else {
            const receiptParams = {
              module: 'proxy',
              action: 'eth_getTransactionReceipt',
              txhash: transactionHash,
              apikey: endpoint.params.apikey || 'YourApiKeyToken'
            };
            receiptResponse = await axios.get(endpoint.url, { 
              params: receiptParams,
              timeout: 10000
            });
          }
          
          if (endpoint.name === 'Etherscan' || endpoint.name === 'Etherscan Public') {
            receipt = receiptResponse.data.result;
          } else {
            receipt = receiptResponse.data.result;
          }
          
          // Analyze logs for token transfers
          if (receipt && receipt.logs && receipt.logs.length > 0) {
            console.log(`🔍 Analyzing ${receipt.logs.length} log entries for token transfers...`);
            
            for (const log of receipt.logs) {
              // Look for ERC20 Transfer events
              if (log.topics && log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                const fromAddress = '0x' + log.topics[1].substring(26);
                const toAddress = '0x' + log.topics[2].substring(26);
                const amount = BigInt(log.data);
                
                // Determine token type and decimals
                const contractAddress = log.address.toLowerCase();
                let tokenSymbol = 'UNKNOWN';
                let tokenDecimals = 18;
                
                // Common token contracts on Ethereum
                if (contractAddress === '0xdac17f958d2ee523a2206206994597c13d831ec7') {
                  tokenSymbol = 'USDT';
                  tokenDecimals = 6;
                } else if (contractAddress === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') {
                  tokenSymbol = 'USDC';
                  tokenDecimals = 6;
                } else if (contractAddress === '0x6b175474e89094c44da98b954eedeac495271d0f') {
                  tokenSymbol = 'DAI';
                  tokenDecimals = 18;
                }
                
                const transferAmount = Number(amount) / Math.pow(10, tokenDecimals);
                
                tokenTransfers.push({
                  from: fromAddress,
                  to: toAddress,
                  amount: transferAmount,
                  tokenSymbol,
                  contractAddress,
                  decimals: tokenDecimals
                });
                
                console.log(`🔍 Token transfer detected: ${transferAmount} ${tokenSymbol} from ${fromAddress} to ${toAddress}`);
                
                // If this is a token transfer to our expected address, use this as the actual recipient and amount
                if (toAddress.toLowerCase() === expectedAddress.toLowerCase()) {
                  actualRecipientAddress = toAddress;
                  actualAmount = transferAmount;
                  console.log(`✅ Found matching token transfer to expected address: ${actualAmount} ${tokenSymbol}`);
                }
              }
            }
          }
        } catch (receiptError) {
          console.log(`⚠️ Could not get transaction receipt: ${receiptError.message}`);
        }
        
        // Update validation based on token transfers if found
        const finalIsRecipientValid = actualRecipientAddress && 
          actualRecipientAddress.toLowerCase() === expectedAddress.toLowerCase();
        const finalIsAmountValid = Math.abs(actualAmount - expectedAmount) < 0.01; // Allow small tolerance
        
        console.log(`✅ Ethereum transaction verified via ${endpoint.name}!`);
        return {
          isValid: finalIsRecipientValid && finalIsAmountValid && isConfirmed,
          error: null,
          details: {
            recipientAddress: actualRecipientAddress,
            actualAmount: actualAmount,
            expectedAmount,
            isRecipientValid: finalIsRecipientValid,
            isAmountValid: finalIsAmountValid,
            isConfirmed,
            blockNumber: tx.blockNumber,
            gasUsed: tx.gas,
            network: 'Ethereum',
            verifiedVia: endpoint.name,
            tokenTransfers: tokenTransfers,
            isContractInteraction: tx.to !== tx.from && tx.input && tx.input.length > 2,
            contractAddress: tx.to
          }
        };

      } catch (error) {
        console.log(`❌ ${endpoint.name} verification failed: ${error.message}`);
        continue;
      }
    }
    
    // If all endpoints fail, return not found
    console.log(`❌ Ethereum transaction verification failed on all endpoints`);
    return {
      isValid: false,
      error: 'Transaction not found on Ethereum blockchain (all APIs failed)',
      details: null
    };
  }

  /**
   * Verify Polygon transaction
   */
  async verifyPolygonTransaction(transactionHash, expectedAddress, expectedAmount) {
    if (!this.apiKeys.polygonscan) {
      throw new Error('PolygonScan API key not configured');
    }

    const url = `https://api.polygonscan.com/api`;
    const params = {
      module: 'proxy',
      action: 'eth_getTransactionByHash',
      txhash: transactionHash,
      apikey: this.apiKeys.polygonscan
    };

    const response = await axios.get(url, { params });
    
    if (response.data.error) {
      throw new Error(`PolygonScan API error: ${response.data.error.message}`);
    }

    const tx = response.data.result;
    if (!tx) {
      return {
        isValid: false,
        error: 'Transaction not found',
        details: null
      };
    }

    // Verify recipient address
    const recipientAddress = tx.to;
    const isRecipientValid = recipientAddress && 
      recipientAddress.toLowerCase() === expectedAddress.toLowerCase();

    // Verify amount (value field in wei)
    const actualAmountWei = tx.value;
    const expectedAmountWei = this.convertToWei(expectedAmount, 18);
    const isAmountValid = actualAmountWei === expectedAmountWei;

    // Check transaction status
    const isConfirmed = tx.blockNumber && tx.blockNumber !== '0x0';

    return {
      isValid: isRecipientValid && isAmountValid && isConfirmed,
      error: null,
      details: {
        recipientAddress,
        actualAmount: this.convertFromWei(actualAmountWei, 18),
        expectedAmount,
        isRecipientValid,
        isAmountValid,
        isConfirmed,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gas,
        network: 'Polygon'
      }
    };
  }

  /**
   * Verify TRON transaction
   */
  async verifyTronTransaction(transactionHash, expectedAddress, expectedAmount) {
    // Try multiple TRON API endpoints
    const endpoints = [
      `https://api.trongrid.io/v1/transactions/${transactionHash}`,
      `https://api.trongrid.io/wallet/gettransactionbyid?value=${transactionHash}`,
      `https://api.trongrid.io/wallet/gettransactioninfobyid?value=${transactionHash}`
    ];
    
    for (const url of endpoints) {
      try {
        console.log(`🔍 Verifying TRON transaction via: ${url}`);
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TrinityMetroBike/1.0'
          }
        });
        
        let tx;
        if (url.includes('gettransactionbyid')) {
          tx = response.data;
        } else if (url.includes('gettransactioninfobyid')) {
          tx = response.data;
        } else {
          tx = response.data.data?.[0] || response.data;
        }
        
        if (!tx) {
          console.log(`🔍 No transaction data found in response`);
          continue;
        }

        // Verify recipient address
        const recipientAddress = tx.raw_data.contract[0].parameter.value.to_address;
        const recipientAddressHex = this.tronAddressToHex(recipientAddress);
        const isRecipientValid = recipientAddress && 
          recipientAddressHex === expectedAddress.toLowerCase();

        // Verify amount (TRON uses sun units, 1 TRX = 1,000,000 sun)
        const actualAmountSun = tx.raw_data.contract[0].parameter.value.amount;
        const expectedAmountSun = this.convertToSun(expectedAmount);
        const isAmountValid = actualAmountSun === expectedAmountSun;

        // Check transaction status
        const isConfirmed = tx.ret && tx.ret[0].contractRet === 'SUCCESS';

        console.log(`🔍 TRON verification details:`, {
          recipientAddress: recipientAddressHex,
          expectedAddress: expectedAddress.toLowerCase(),
          actualAmount: this.convertFromSun(actualAmountSun),
          expectedAmount,
          isRecipientValid,
          isAmountValid,
          isConfirmed
        });

        return {
          isValid: isRecipientValid && isAmountValid && isConfirmed,
          error: null,
          details: {
            recipientAddress: recipientAddressHex,
            actualAmount: this.convertFromSun(actualAmountSun),
            expectedAmount,
            isRecipientValid,
            isAmountValid,
            isConfirmed,
            blockNumber: tx.blockNumber,
            network: 'TRON'
          }
        };
      } catch (error) {
        console.log(`🔍 TRON API endpoint failed: ${url} - ${error.message}`);
        continue;
      }
    }
    
    // If all endpoints fail, try using Tronscan API as fallback
    try {
      console.log(`🔍 Trying Tronscan API for verification`);
      const tronscanUrl = `https://apilist.tronscanapi.com/api/transaction-info?hash=${transactionHash}`;
      const response = await axios.get(tronscanUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TrinityMetroBike/1.0'
        }
      });
      
      if (response.data && response.data.hash) {
        // Extract USDT transfer details from trc20TransferInfo
        const transferInfo = response.data.trc20TransferInfo?.[0] || response.data.tokenTransferInfo;
        
        if (transferInfo) {
          const recipientAddress = transferInfo.to_address;
          const actualAmount = parseFloat(transferInfo.amount_str) / Math.pow(10, transferInfo.decimals || 6);
          const isRecipientValid = recipientAddress.toLowerCase() === expectedAddress.toLowerCase();
          const isAmountValid = Math.abs(actualAmount - expectedAmount) < 0.01; // Allow small tolerance
          const isConfirmed = response.data.confirmed;

          console.log(`🔍 Tronscan verification details:`, {
            recipientAddress,
            expectedAddress: expectedAddress.toLowerCase(),
            actualAmount,
            expectedAmount,
            isRecipientValid,
            isAmountValid,
            isConfirmed
          });

          return {
            isValid: isRecipientValid && isAmountValid && isConfirmed,
            error: null,
            details: {
              recipientAddress,
              actualAmount,
              expectedAmount,
              isRecipientValid,
              isAmountValid,
              isConfirmed,
              blockNumber: response.data.block,
              network: 'TRON',
              contractAddress: transferInfo.contract_address,
              tokenSymbol: transferInfo.symbol
            }
          };
        }
      }
    } catch (error) {
      console.log(`🔍 Tronscan API verification also failed: ${error.message}`);
    }
    
    throw new Error(`TRON API error: All endpoints failed for transaction ${transactionHash}`);
  }

  /**
   * Decode ERC-20 token transfer data from transaction input
   */
  decodeERC20Transfer(input) {
    try {
      // ERC-20 transfer method signature: 0xa9059cbb
      // Function signature: transfer(address to, uint256 amount)
      if (!input || input.length < 138) {
        return null;
      }

      // Check if it's a transfer call
      const methodId = input.substring(0, 10);
      if (methodId !== '0xa9059cbb') {
        return null;
      }

      // Extract recipient address (32 bytes starting at position 10)
      const toAddress = '0x' + input.substring(34, 74);
      
      // Extract amount (last 64 characters = 32 bytes)
      const amountHex = input.substring(input.length - 64);
      const amount = BigInt('0x' + amountHex);

      return {
        to: toAddress,
        amount: amount.toString(),
        isTokenTransfer: true
      };
    } catch (error) {
      console.log('Error decoding ERC-20 transfer:', error.message);
      return null;
    }
  }

  /**
   * Convert amount to wei (for Ethereum-based networks)
   */
  convertToWei(amount, decimals = 18) {
    return (parseFloat(amount) * Math.pow(10, decimals)).toString();
  }

  /**
   * Convert wei to amount
   */
  convertFromWei(weiAmount, decimals = 18) {
    return (parseInt(weiAmount, 16) / Math.pow(10, decimals)).toFixed(6);
  }

  /**
   * Convert TRON amount to sun
   */
  convertToSun(amount) {
    return (parseFloat(amount) * 1000000).toString();
  }

  /**
   * Convert sun to TRON amount
   */
  convertFromSun(sunAmount) {
    return (parseInt(sunAmount) / 1000000).toFixed(6);
  }

  /**
   * Convert TRON address to hex format
   */
  tronAddressToHex(address) {
    // This is a simplified conversion - in production you'd use a proper TRON address library
    return address.toLowerCase();
  }

  /**
   * Get BSC transaction info (without validation) - Using RPC instead of API
   */
  async getBSCTransactionInfo(transactionHash) {
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
        let tokenTransferInfo = null;
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
            
            tokenTransferInfo = {
              contractAddress: transferLog.address,
              tokenSymbol: tokenSymbol,
              tokenDecimals: tokenDecimals,
              fromAddress: fromAddress,
              toAddress: toAddress,
              amount: actualAmount
            };
            
            console.log(`🔍 Token transfer detected:`, tokenTransferInfo);
          }
        }
        
        // Return transaction info
        return {
          exists: true,
          error: null,
          details: {
            recipientAddress: tokenTransferInfo ? tokenTransferInfo.toAddress : tx.to,
            senderAddress: tokenTransferInfo ? tokenTransferInfo.fromAddress : tx.from,
            amount: tokenTransferInfo ? tokenTransferInfo.amount.toString() : this.convertFromWei(tx.value, 18),
            blockNumber: tx.blockNumber,
            gasUsed: receipt ? receipt.gasUsed : tx.gas,
            gasPrice: tx.gasPrice,
            network: 'BSC',
            isConfirmed: tx.blockNumber && tx.blockNumber !== '0x0',
            timestamp: null, // RPC doesn't provide timestamp
            isTokenTransfer: !!tokenTransferInfo,
            tokenSymbol: tokenTransferInfo ? tokenTransferInfo.tokenSymbol : null,
            tokenName: tokenTransferInfo ? tokenTransferInfo.tokenSymbol : null,
            contractAddress: tokenTransferInfo ? tokenTransferInfo.contractAddress : null
          }
        };
        
      } catch (error) {
        console.log(`❌ BSC RPC endpoint ${endpoint} failed: ${error.message}`);
        continue;
      }
    }
    
    // If all RPC endpoints fail, try API as fallback
    try {
      console.log(`🔍 All RPC endpoints failed, trying BSCScan API as fallback...`);
      const url = `https://api.bscscan.com/api`;
      const params = {
        module: 'proxy',
        action: 'eth_getTransactionByHash',
        txhash: transactionHash,
        apikey: this.apiKeys.bscscan || 'YourApiKeyToken'
      };

      const response = await axios.get(url, { params });
      
      if (response.data.error || (response.data.status === "0" && response.data.message === "NOTOK")) {
        throw new Error(`BSCScan API error: ${response.data.error?.message || response.data.result}`);
      }

      const tx = response.data.result;
      
      if (!tx || !tx.hash || tx.hash === '0x') {
        return {
          exists: false,
          error: 'Transaction not found on BSC blockchain',
          details: null
        };
      }

      return {
        exists: true,
        error: null,
        details: {
          recipientAddress: tx.to,
          senderAddress: tx.from,
          amount: this.convertFromWei(tx.value, 18),
          blockNumber: tx.blockNumber,
          gasUsed: tx.gas,
          gasPrice: tx.gasPrice,
          network: 'BSC',
          isConfirmed: tx.blockNumber && tx.blockNumber !== '0x0',
          timestamp: tx.timestamp || null,
          isTokenTransfer: false
        }
      };
    } catch (error) {
      console.error(`❌ BSC API fallback also failed:`, error.message);
      throw new Error(`BSCScan API error: ${error.message}`);
    }
  }

  /**
   * Get Ethereum transaction info (without validation)
   */
  async getEthereumTransactionInfo(transactionHash) {
    // Try multiple Ethereum API endpoints for better reliability
    const endpoints = [
      {
        name: 'Etherscan',
        url: 'https://api.etherscan.io/api',
        params: {
          module: 'proxy',
          action: 'eth_getTransactionByHash',
          txhash: transactionHash,
          apikey: this.apiKeys.etherscan || 'YourApiKeyToken'
        }
      },
      {
        name: 'Etherscan Public',
        url: 'https://api.etherscan.io/api',
        params: {
          module: 'proxy',
          action: 'eth_getTransactionByHash',
          txhash: transactionHash
        }
      },
      {
        name: 'Alchemy',
        url: 'https://eth-mainnet.g.alchemy.com/v2/demo',
        method: 'POST',
        data: {
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [transactionHash],
          id: 1
        }
      },
      {
        name: 'Infura',
        url: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        method: 'POST',
        data: {
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [transactionHash],
          id: 1
        }
      }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Trying Ethereum ${endpoint.name} API...`);
        
        let response;
        if (endpoint.method === 'POST') {
          response = await axios.post(endpoint.url, endpoint.data, {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        } else {
          response = await axios.get(endpoint.url, { 
            params: endpoint.params,
            timeout: 10000
          });
        }
        
        console.log(`🔍 ${endpoint.name} API response status:`, response.status);
        console.log(`🔍 ${endpoint.name} API response data:`, JSON.stringify(response.data, null, 2));
        
        let tx;
        if (endpoint.name === 'Etherscan' || endpoint.name === 'Etherscan Public') {
          // Handle Etherscan response format
          if (response.data.error || (response.data.status === "0" && response.data.message === "NOTOK")) {
            if (response.data.error?.message?.includes('API key') || 
                response.data.result?.includes('Invalid API Key') ||
                response.data.status === "0") {
              console.log(`⚠️ ${endpoint.name} API key issue, trying next endpoint`);
              continue;
            }
            throw new Error(`${endpoint.name} API error: ${response.data.error?.message || response.data.result}`);
          }
          tx = response.data.result;
        } else {
          // Handle RPC response format (Alchemy, Infura)
          if (response.data.error) {
            throw new Error(`${endpoint.name} RPC error: ${response.data.error.message}`);
          }
          tx = response.data.result;
        }
        
        console.log(`🔍 ${endpoint.name} transaction data:`, tx);
        
        if (!tx || !tx.hash || tx.hash === '0x') {
          console.log(`🔍 No transaction found on ${endpoint.name}`);
          continue;
        }

        // Validate that this is actually a transaction (not just a response)
        if (!tx.to || !tx.from || !tx.value) {
          console.log(`🔍 Invalid transaction data on ${endpoint.name} - to: ${tx.to}, from: ${tx.from}, value: ${tx.value}`);
          continue;
        }

        console.log(`✅ Transaction found on ${endpoint.name}!`);
        
        // Try to get transaction receipt for more detailed information
        let receipt = null;
        let tokenTransfers = [];
        
        try {
          console.log(`🔍 Getting transaction receipt for detailed analysis...`);
          let receiptResponse;
          if (endpoint.method === 'POST') {
            receiptResponse = await axios.post(endpoint.url, {
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
          } else {
            const receiptParams = {
              module: 'proxy',
              action: 'eth_getTransactionReceipt',
              txhash: transactionHash,
              apikey: endpoint.params.apikey || 'YourApiKeyToken'
            };
            receiptResponse = await axios.get(endpoint.url, { 
              params: receiptParams,
              timeout: 10000
            });
          }
          
          if (endpoint.name === 'Etherscan' || endpoint.name === 'Etherscan Public') {
            receipt = receiptResponse.data.result;
          } else {
            receipt = receiptResponse.data.result;
          }
          
          console.log(`🔍 Transaction receipt:`, receipt);
          
          // Analyze logs for token transfers
          if (receipt && receipt.logs && receipt.logs.length > 0) {
            console.log(`🔍 Analyzing ${receipt.logs.length} log entries for token transfers...`);
            
            for (const log of receipt.logs) {
              // Look for ERC20 Transfer events (topic: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef)
              if (log.topics && log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                const fromAddress = '0x' + log.topics[1].substring(26);
                const toAddress = '0x' + log.topics[2].substring(26);
                const amount = BigInt(log.data);
                
                // Determine token type and decimals
                const contractAddress = log.address.toLowerCase();
                let tokenSymbol = 'UNKNOWN';
                let tokenDecimals = 18;
                
                // Common token contracts on Ethereum
                if (contractAddress === '0xdac17f958d2ee523a2206206994597c13d831ec7') {
                  tokenSymbol = 'USDT';
                  tokenDecimals = 6;
                } else if (contractAddress === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') {
                  tokenSymbol = 'USDC';
                  tokenDecimals = 6;
                } else if (contractAddress === '0x6b175474e89094c44da98b954eedeac495271d0f') {
                  tokenSymbol = 'DAI';
                  tokenDecimals = 18;
                }
                
                const actualAmount = Number(amount) / Math.pow(10, tokenDecimals);
                
                tokenTransfers.push({
                  from: fromAddress,
                  to: toAddress,
                  amount: actualAmount,
                  tokenSymbol,
                  contractAddress,
                  decimals: tokenDecimals
                });
                
                console.log(`🔍 Token transfer detected: ${actualAmount} ${tokenSymbol} from ${fromAddress} to ${toAddress}`);
              }
            }
          }
        } catch (receiptError) {
          console.log(`⚠️ Could not get transaction receipt: ${receiptError.message}`);
        }
        
        return {
          exists: true,
          error: null,
          details: {
            recipientAddress: tx.to,
            senderAddress: tx.from,
            amount: this.convertFromWei(tx.value, 18),
            blockNumber: tx.blockNumber,
            gasUsed: tx.gas,
            gasPrice: tx.gasPrice,
            network: 'Ethereum',
            isConfirmed: tx.blockNumber && tx.blockNumber !== '0x0',
            timestamp: tx.timestamp || null,
            foundVia: endpoint.name,
            tokenTransfers: tokenTransfers,
            isContractInteraction: tx.to !== tx.from && tx.input && tx.input.length > 2,
            contractAddress: tx.to
          }
        };

      } catch (error) {
        console.log(`❌ ${endpoint.name} API failed: ${error.message}`);
        continue;
      }
    }
    
    // If all endpoints fail, return not found
    console.log(`❌ Transaction not found on any Ethereum API endpoint`);
    return {
      exists: false,
      error: 'Transaction not found on Ethereum blockchain (all APIs failed)',
      details: null
    };
  }

  /**
   * Get Polygon transaction info (without validation)
   */
  async getPolygonTransactionInfo(transactionHash) {
    // Try PolygonScan first
    const polygonscanUrl = `https://api.polygonscan.com/api`;
    const params = {
      module: 'proxy',
      action: 'eth_getTransactionByHash',
      txhash: transactionHash,
      apikey: this.apiKeys.polygonscan || 'YourApiKeyToken' // Use default if no API key
    };

    try {
      console.log(`🔍 Making PolygonScan API call with params:`, params);
      const response = await axios.get(polygonscanUrl, { params });
      console.log(`🔍 PolygonScan API response status:`, response.status);
      console.log(`🔍 PolygonScan API response data:`, JSON.stringify(response.data, null, 2));
      
      if (response.data.error || (response.data.status === "0" && response.data.message === "NOTOK")) {
        // If API key error, try alternative APIs
        if (response.data.error?.message?.includes('API key') || 
            response.data.result?.includes('Invalid API Key') ||
            response.data.status === "0") {
          console.log('⚠️ PolygonScan API key not configured, trying alternative APIs...');
          
          // Try Alchemy API (free tier)
          try {
            console.log('🔍 Trying Alchemy Polygon API...');
            const alchemyUrl = 'https://polygon-mainnet.g.alchemy.com/v2/demo';
            const alchemyResponse = await axios.post(alchemyUrl, {
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getTransactionByHash',
              params: [transactionHash]
            }, {
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            console.log(`🔍 Alchemy API response:`, JSON.stringify(alchemyResponse.data, null, 2));
            
            if (alchemyResponse.data.result) {
              const tx = alchemyResponse.data.result;
              console.log(`🔍 Alchemy transaction data:`, tx);
              
              if (!tx || !tx.hash || tx.hash === '0x') {
                return {
                  exists: false,
                  error: 'Transaction not found on Polygon blockchain',
                  details: null
                };
              }

              // Check if this is an ERC-20 token transfer
              const tokenTransfer = this.decodeERC20Transfer(tx.input);
              let recipientAddress = tx.to;
              let amount = this.convertFromWei(tx.value, 18);
              let isTokenTransfer = false;

              if (tokenTransfer) {
                console.log(`🔍 ERC-20 token transfer detected:`, tokenTransfer);
                recipientAddress = tokenTransfer.to;
                amount = (BigInt(tokenTransfer.amount) / BigInt(10 ** 6)).toString() + '.000000'; // USDC has 6 decimals
                isTokenTransfer = true;
              }

              // Validate that this is actually a transaction (not just a response)
              if (!tx.to || !tx.from) {
                console.log(`🔍 Invalid transaction data - to: ${tx.to}, from: ${tx.from}`);
                return {
                  exists: false,
                  error: 'Invalid transaction data on Polygon blockchain',
                  details: null
                };
              }

              return {
                exists: true,
                error: null,
                details: {
                  recipientAddress,
                  senderAddress: tx.from,
                  amount,
                  blockNumber: tx.blockNumber,
                  gasUsed: tx.gas,
                  gasPrice: tx.gasPrice,
                  network: 'Polygon',
                  isConfirmed: tx.blockNumber && tx.blockNumber !== '0x0',
                  timestamp: tx.timestamp || null,
                  isTokenTransfer,
                  tokenContract: tx.to
                }
              };
            }
          } catch (alchemyError) {
            console.log(`❌ Alchemy API failed:`, alchemyError.message);
          }
          
          // Try Polygon RPC directly
          try {
            console.log('🔍 Trying Polygon RPC directly...');
            const polygonRpcUrl = 'https://polygon-rpc.com/';
            const polygonRpcResponse = await axios.post(polygonRpcUrl, {
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getTransactionByHash',
              params: [transactionHash]
            }, {
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            console.log(`🔍 Polygon RPC response:`, JSON.stringify(polygonRpcResponse.data, null, 2));
            
            if (polygonRpcResponse.data.result) {
              const tx = polygonRpcResponse.data.result;
              console.log(`🔍 Polygon RPC transaction data:`, tx);
              
              if (!tx || !tx.hash || tx.hash === '0x') {
                return {
                  exists: false,
                  error: 'Transaction not found on Polygon blockchain',
                  details: null
                };
              }

              // Check if this is an ERC-20 token transfer
              const tokenTransfer = this.decodeERC20Transfer(tx.input);
              let recipientAddress = tx.to;
              let amount = this.convertFromWei(tx.value, 18);
              let isTokenTransfer = false;

              if (tokenTransfer) {
                console.log(`🔍 ERC-20 token transfer detected:`, tokenTransfer);
                recipientAddress = tokenTransfer.to;
                amount = (BigInt(tokenTransfer.amount) / BigInt(10 ** 6)).toString() + '.000000'; // USDC has 6 decimals
                isTokenTransfer = true;
              }

              // Validate that this is actually a transaction (not just a response)
              if (!tx.to || !tx.from) {
                console.log(`🔍 Invalid transaction data - to: ${tx.to}, from: ${tx.from}`);
                return {
                  exists: false,
                  error: 'Invalid transaction data on Polygon blockchain',
                  details: null
                };
              }

              return {
                exists: true,
                error: null,
                details: {
                  recipientAddress,
                  senderAddress: tx.from,
                  amount,
                  blockNumber: tx.blockNumber,
                  gasUsed: tx.gas,
                  gasPrice: tx.gasPrice,
                  network: 'Polygon',
                  isConfirmed: tx.blockNumber && tx.blockNumber !== '0x0',
                  timestamp: tx.timestamp || null,
                  isTokenTransfer,
                  tokenContract: tx.to
                }
              };
            }
          } catch (polygonRpcError) {
            console.log(`❌ Polygon RPC failed:`, polygonRpcError.message);
          }
          
          // If all alternatives failed, return error
          return {
            exists: false,
            error: 'Transaction not found on Polygon blockchain (all APIs failed)',
            details: null
          };
        }
        throw new Error(`PolygonScan API error: ${response.data.error?.message || response.data.result}`);
      }

      const tx = response.data.result;
      console.log(`🔍 PolygonScan transaction data:`, tx);
      
      if (!tx || !tx.hash || tx.hash === '0x') {
        return {
          exists: false,
          error: 'Transaction not found on Polygon blockchain',
          details: null
        };
      }

      // Check if this is an ERC-20 token transfer
      const tokenTransfer = this.decodeERC20Transfer(tx.input);
      let recipientAddress = tx.to;
      let amount = this.convertFromWei(tx.value, 18);
      let isTokenTransfer = false;

      if (tokenTransfer) {
        console.log(`🔍 ERC-20 token transfer detected:`, tokenTransfer);
        recipientAddress = tokenTransfer.to;
        amount = (BigInt(tokenTransfer.amount) / BigInt(10 ** 6)).toString() + '.000000'; // USDC has 6 decimals
        isTokenTransfer = true;
      }

      // Validate that this is actually a transaction (not just a response)
      if (!tx.to || !tx.from) {
        console.log(`🔍 Invalid transaction data - to: ${tx.to}, from: ${tx.from}`);
        return {
          exists: false,
          error: 'Invalid transaction data on Polygon blockchain',
          details: null
        };
      }

      return {
        exists: true,
        error: null,
        details: {
          recipientAddress,
          senderAddress: tx.from,
          amount,
          blockNumber: tx.blockNumber,
          gasUsed: tx.gas,
          gasPrice: tx.gasPrice,
          network: 'Polygon',
          isConfirmed: tx.blockNumber && tx.blockNumber !== '0x0',
          timestamp: tx.timestamp || null,
          isTokenTransfer,
          tokenContract: tx.to
        }
      };
    } catch (error) {
      console.error(`❌ Polygon API error details:`, error.response?.data || error.message);
      throw new Error(`PolygonScan API error: ${error.message}`);
    }
  }

  /**
   * Get TRON transaction info (without validation)
   */
  async getTronTransactionInfo(transactionHash) {
    // Try multiple TRON API endpoints
    const endpoints = [
      `https://api.trongrid.io/v1/transactions/${transactionHash}`,
      `https://api.trongrid.io/wallet/gettransactionbyid?value=${transactionHash}`,
      `https://api.trongrid.io/wallet/gettransactioninfobyid?value=${transactionHash}`
    ];
    
    for (const url of endpoints) {
      try {
        console.log(`🔍 Trying TRON API endpoint: ${url}`);
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TrinityMetroBike/1.0'
          }
        });
        
        console.log(`🔍 TRON API response status: ${response.status}`);
        console.log(`🔍 TRON API response data:`, response.data);
        
        let tx;
        if (url.includes('gettransactionbyid')) {
          tx = response.data;
        } else if (url.includes('gettransactioninfobyid')) {
          tx = response.data;
        } else {
          tx = response.data.data?.[0] || response.data;
        }
        
        if (!tx || !tx.txID) {
          console.log(`🔍 No transaction data found in response`);
          continue;
        }

        // Validate that this is actually a transaction
        if (!tx.raw_data || !tx.raw_data.contract || !tx.raw_data.contract[0]) {
          console.log(`🔍 Invalid transaction structure`);
          continue;
        }

        const contract = tx.raw_data.contract[0];
        if (!contract.parameter || !contract.parameter.value) {
          console.log(`🔍 Invalid contract parameter structure`);
          continue;
        }

        // Extract transaction details
        const recipientAddress = this.tronAddressToHex(contract.parameter.value.to_address);
        const senderAddress = this.tronAddressToHex(contract.parameter.value.owner_address);
        const amount = this.convertFromSun(contract.parameter.value.amount);
        
        console.log(`🔍 TRON transaction details:`, {
          recipientAddress,
          senderAddress,
          amount,
          blockNumber: tx.blockNumber,
          isConfirmed: tx.ret && tx.ret[0].contractRet === 'SUCCESS'
        });

        return {
          exists: true,
          error: null,
          details: {
            recipientAddress,
            senderAddress,
            amount,
            blockNumber: tx.blockNumber,
            network: 'TRON',
            isConfirmed: tx.ret && tx.ret[0].contractRet === 'SUCCESS',
            timestamp: tx.blockTimeStamp || null
          }
        };
      } catch (error) {
        console.log(`🔍 TRON API endpoint failed: ${url} - ${error.message}`);
        continue;
      }
    }
    
    // If all endpoints fail, try using Tronscan API as fallback
    try {
      console.log(`🔍 Trying Tronscan API as fallback`);
      const tronscanUrl = `https://apilist.tronscanapi.com/api/transaction-info?hash=${transactionHash}`;
      const response = await axios.get(tronscanUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TrinityMetroBike/1.0'
        }
      });
      
      console.log(`🔍 Tronscan API response:`, response.data);
      
      if (response.data && response.data.hash) {
        // Extract USDT transfer details from trc20TransferInfo
        const transferInfo = response.data.trc20TransferInfo?.[0] || response.data.tokenTransferInfo;
        
        if (transferInfo) {
          const recipientAddress = transferInfo.to_address;
          const senderAddress = transferInfo.from_address;
          const amount = parseFloat(transferInfo.amount_str) / Math.pow(10, transferInfo.decimals || 6);
          
          return {
            exists: true,
            error: null,
            details: {
              recipientAddress,
              senderAddress,
              amount,
              blockNumber: response.data.block,
              network: 'TRON',
              isConfirmed: response.data.confirmed,
              timestamp: response.data.timestamp,
              contractAddress: transferInfo.contract_address,
              tokenSymbol: transferInfo.symbol
            }
          };
        } else {
          // Fallback to basic transaction info
          return {
            exists: true,
            error: null,
            details: {
              recipientAddress: response.data.toAddress || null,
              senderAddress: response.data.ownerAddress || null,
              amount: null,
              blockNumber: response.data.block,
              network: 'TRON',
              isConfirmed: response.data.confirmed,
              timestamp: response.data.timestamp
            }
          };
        }
      }
    } catch (error) {
      console.log(`🔍 Tronscan API also failed: ${error.message}`);
    }
    
    throw new Error(`TRON API error: All endpoints failed for transaction ${transactionHash}`);
  }
}

module.exports = new TransactionVerificationService();