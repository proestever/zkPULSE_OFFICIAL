// Relayer Configuration and Management
const relayerConfig = {
    // Default relayer registry (can be updated with your own relayers)
    relayers: [
        {
            name: "zkPULSE Relayer",
            address: "0x968DD9f833C58C0ADa629eF8f60180C7fEeF78d3", // Your relayer address
            url: "https://development-zkpulse-1.onrender.com", // Production relayer
            fee: 0.5, // Fee percentage (0.5%)
            status: "active",
            gasPrice: "standard",
            rating: 5,
            uptime: 99.9,
            supportedDenominations: ["1", "1M", "10M", "100M", "1B"]
        },
        {
            name: "zkPulse Official Relayer",
            address: "0x0000000000000000000000000000000000000000", // Update with actual relayer address
            url: "https://relayer.zkpulse.app", // Update with actual URL when deployed
            fee: 0.5, // Fee percentage (0.5%)
            status: "inactive", // Set to active when deployed
            gasPrice: "standard",
            rating: 5,
            uptime: 99.9,
            supportedDenominations: ["1M", "10M", "100M", "1B"]
        },
        // Add more relayers here as they become available
    ],

    // Fee structure (in percentage)
    feeStructure: {
        "1M": 0.5,    // 0.5% for 1M PLS
        "10M": 0.4,   // 0.4% for 10M PLS
        "100M": 0.3,  // 0.3% for 100M PLS
        "1B": 0.25    // 0.25% for 1B PLS
    },

    // Minimum fees to ensure relayers cover gas costs
    minFees: {
        "1M": 5000,      // 5000 PLS minimum
        "10M": 10000,    // 10000 PLS minimum
        "100M": 20000,   // 20000 PLS minimum
        "1B": 50000      // 50000 PLS minimum
    },

    // Gas price multipliers for different speeds
    gasPriceMultipliers: {
        slow: 0.8,
        standard: 1.0,
        fast: 1.3,
        instant: 2.0
    },

    // Relayer health check endpoints
    healthCheckEndpoints: {
        status: "/status",
        fee: "/v1/tornadoFee",
        withdraw: "/v1/tornadoWithdraw"
    }
};

// Calculate relayer fee based on amount and gas price
function calculateRelayerFee(denomination, gasPrice = "standard", customRelayer = null) {
    const denominationValue = {
        "1": 1,
        "1M": 1000000,
        "10M": 10000000,
        "100M": 100000000,
        "1B": 1000000000
    };

    const amount = denominationValue[denomination] || 1000000;
    
    // Get fee percentage from relayer or default config
    let feePercent = relayerConfig.feeStructure[denomination] || 0.5;
    if (customRelayer && customRelayer.fee) {
        feePercent = customRelayer.fee;
    }

    // Calculate percentage-based fee
    let fee = Math.floor(amount * (feePercent / 100));

    // Apply gas price multiplier
    const multiplier = relayerConfig.gasPriceMultipliers[gasPrice] || 1.0;
    fee = Math.floor(fee * multiplier);

    // Ensure minimum fee is met
    const minFee = relayerConfig.minFees[denomination] || 5000;
    fee = Math.max(fee, minFee);

    // Convert PLS to wei (multiply by 10^18)
    // The fee calculated above is in PLS, but contracts expect wei
    const feeInWei = BigInt(fee) * BigInt(10 ** 18);
    
    return feeInWei.toString();
}

// Get active relayers
function getActiveRelayers(denomination = null) {
    let relayers = relayerConfig.relayers.filter(r => r.status === "active");
    
    if (denomination) {
        relayers = relayers.filter(r => 
            r.supportedDenominations.includes(denomination)
        );
    }

    return relayers;
}

// Check relayer health
async function checkRelayerHealth(relayerUrl) {
    try {
        const response = await fetch(`${relayerUrl}${relayerConfig.healthCheckEndpoints.status}`, {
            method: 'GET',
            timeout: 5000
        });

        if (!response.ok) {
            return { healthy: false, error: 'Server error' };
        }

        const data = await response.json();
        return {
            healthy: true,
            data: data
        };
    } catch (error) {
        return { healthy: false, error: error.message };
    }
}

// Get relayer fee from API
async function getRelayerFee(relayerUrl, params) {
    try {
        const queryParams = new URLSearchParams({
            currency: 'pls',
            amount: params.amount,
            operation: 'withdraw',
            gasPrice: params.gasPrice || 'standard'
        });

        const response = await fetch(`${relayerUrl}${relayerConfig.healthCheckEndpoints.fee}?${queryParams}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch relayer fee');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching relayer fee:', error);
        // Fallback to calculated fee
        return {
            fee: calculateRelayerFee(params.amount, params.gasPrice),
            gasPrice: params.gasPrice || 'standard'
        };
    }
}

// Submit withdrawal through relayer
async function submitWithdrawalToRelayer(relayerUrl, withdrawalData) {
    try {
        const response = await fetch(`${relayerUrl}${relayerConfig.healthCheckEndpoints.withdraw}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                proof: withdrawalData.proof,
                args: withdrawalData.args,
                contract: withdrawalData.contractAddress,
                denomination: withdrawalData.denomination
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Relayer submission failed');
        }

        const result = await response.json();
        return {
            success: true,
            txHash: result.txHash,
            relayerJobId: result.jobId
        };
    } catch (error) {
        console.error('Error submitting to relayer:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Monitor relayer job status
async function checkRelayerJobStatus(relayerUrl, jobId) {
    try {
        const response = await fetch(`${relayerUrl}/v1/jobs/${jobId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Failed to check job status');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error checking job status:', error);
        return {
            status: 'unknown',
            error: error.message
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        relayerConfig,
        calculateRelayerFee,
        getActiveRelayers,
        checkRelayerHealth,
        getRelayerFee,
        submitWithdrawalToRelayer,
        checkRelayerJobStatus
    };
}