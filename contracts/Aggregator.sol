// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Aggregator
 * @dev A contract to batch query token balances and allowances for multiple addresses
 */
contract Aggregator {
    
    struct BalanceData {
        address account;
        uint256 balance;
    }
    
    struct AllowanceData {
        address owner;
        address spender;
        uint256 allowance;
    }
    
    struct AccountAllowances {
        address account;
        AllowanceData[] allowances;
    }
    
    /**
     * @dev Get balances for multiple addresses for a specific token
     * @param token The ERC20 token contract address
     * @param accounts Array of addresses to query balances for
     * @return balances Array of BalanceData structs containing address and balance
     */
    function getBalances(
        address token,
        address[] calldata accounts
    ) external view returns (BalanceData[] memory balances) {
        require(token != address(0), "Invalid token address");
        require(accounts.length > 0, "No accounts provided");
        
        IERC20 tokenContract = IERC20(token);
        balances = new BalanceData[](accounts.length);
        
        for (uint256 i = 0; i < accounts.length; i++) {
            balances[i] = BalanceData({
                account: accounts[i],
                balance: tokenContract.balanceOf(accounts[i])
            });
        }
    }
    
    /**
     * @dev Get allowances between all combinations of provided addresses for a specific token
     * @param token The ERC20 token contract address
     * @param accounts Array of addresses to query allowances between
     * @return allowances Array of AccountAllowances structs containing all allowances for each account
     */
    function getAllowances(
        address token,
        address[] calldata accounts
    ) external view returns (AccountAllowances[] memory allowances) {
        require(token != address(0), "Invalid token address");
        require(accounts.length > 0, "No accounts provided");
        
        IERC20 tokenContract = IERC20(token);
        allowances = new AccountAllowances[](accounts.length);
        
        for (uint256 i = 0; i < accounts.length; i++) {
            AllowanceData[] memory accountAllowances = new AllowanceData[](accounts.length - 1);
            uint256 allowanceIndex = 0;
            
            for (uint256 j = 0; j < accounts.length; j++) {
                if (i != j) {
                    accountAllowances[allowanceIndex] = AllowanceData({
                        owner: accounts[i],
                        spender: accounts[j],
                        allowance: tokenContract.allowance(accounts[i], accounts[j])
                    });
                    allowanceIndex++;
                }
            }
            
            allowances[i] = AccountAllowances({
                account: accounts[i],
                allowances: accountAllowances
            });
        }
    }
    
    /**
     * @dev Get allowances from specific owners to specific spenders
     * @param token The ERC20 token contract address
     * @param owners Array of owner addresses
     * @param spenders Array of spender addresses (must be same length as owners)
     * @return allowances Array of AllowanceData structs
     */
    function getSpecificAllowances(
        address token,
        address[] calldata owners,
        address[] calldata spenders
    ) external view returns (AllowanceData[] memory allowances) {
        require(token != address(0), "Invalid token address");
        require(owners.length == spenders.length, "Arrays length mismatch");
        require(owners.length > 0, "No addresses provided");
        
        IERC20 tokenContract = IERC20(token);
        allowances = new AllowanceData[](owners.length);
        
        for (uint256 i = 0; i < owners.length; i++) {
            allowances[i] = AllowanceData({
                owner: owners[i],
                spender: spenders[i],
                allowance: tokenContract.allowance(owners[i], spenders[i])
            });
        }
    }
    
    /**
     * @dev Get both balances and allowances for multiple addresses
     * @param token The ERC20 token contract address
     * @param accounts Array of addresses to query
     * @return balances Array of BalanceData structs
     * @return allowances Array of AccountAllowances structs
     */
    function getBalancesAndAllowances(
        address token,
        address[] calldata accounts
    ) external view returns (
        BalanceData[] memory balances,
        AccountAllowances[] memory allowances
    ) {
        require(token != address(0), "Invalid token address");
        require(accounts.length > 0, "No accounts provided");
        
        IERC20 tokenContract = IERC20(token);
        
        // Get balances
        balances = new BalanceData[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            balances[i] = BalanceData({
                account: accounts[i],
                balance: tokenContract.balanceOf(accounts[i])
            });
        }
        
        // Get allowances
        allowances = new AccountAllowances[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            AllowanceData[] memory accountAllowances = new AllowanceData[](accounts.length - 1);
            uint256 allowanceIndex = 0;
            
            for (uint256 j = 0; j < accounts.length; j++) {
                if (i != j) {
                    accountAllowances[allowanceIndex] = AllowanceData({
                        owner: accounts[i],
                        spender: accounts[j],
                        allowance: tokenContract.allowance(accounts[i], accounts[j])
                    });
                    allowanceIndex++;
                }
            }
            
            allowances[i] = AccountAllowances({
                account: accounts[i],
                allowances: accountAllowances
            });
        }
    }
    
    /**
     * @dev Get balances for multiple tokens for a single address
     * @param tokens Array of ERC20 token contract addresses
     * @param account The address to query balances for
     * @return balances Array of BalanceData structs (account will be the same, different tokens)
     */
    function getMultiTokenBalances(
        address[] calldata tokens,
        address account
    ) external view returns (BalanceData[] memory balances) {
        require(tokens.length > 0, "No tokens provided");
        require(account != address(0), "Invalid account address");
        
        balances = new BalanceData[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            require(tokens[i] != address(0), "Invalid token address");
            IERC20 tokenContract = IERC20(tokens[i]);
            balances[i] = BalanceData({
                account: account,
                balance: tokenContract.balanceOf(account)
            });
        }
    }
}
