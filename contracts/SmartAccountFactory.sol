// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./SmartAccount.sol";

/**
 * @title SmartAccountFactory
 * @dev Factory contract for deploying new SmartAccount instances
 */
contract SmartAccountFactory {
    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/
    event SmartAccountCreated(address indexed owner, address indexed smartAccount);

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    IEntryPoint private immutable i_entryPoint;

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    constructor(address entryPoint) {
        i_entryPoint = IEntryPoint(entryPoint);
    }

    /**
     * @dev Creates a new SmartAccount instance using CREATE2
     * @param owner The address that will own the SmartAccount
     * @param salt A value to create deterministic address
     * @return smartAccount The address of the newly created SmartAccount
     */
    /**
     * @dev Predicts the address of a SmartAccount that would be created by this factory
     * @param owner The address that will own the SmartAccount
     * @param salt A value to create deterministic addresses
     * @return predicted The predicted address of the SmartAccount
     */
    function getAddress(address owner, uint256 salt) public view returns (address predicted) {
        bytes memory creationCode = abi.encodePacked(
            type(SmartAccount).creationCode,
            abi.encode(address(i_entryPoint), owner)
        );
        bytes32 salt_ = keccak256(abi.encodePacked(owner, salt));
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt_,
                keccak256(creationCode)
            )
        );
        predicted = address(uint160(uint256(hash)));
    }

    /**
     * @dev Creates a new SmartAccount instance using CREATE2 if it doesn't exist
     * @param owner The address that will own the SmartAccount
     * @param salt A value to create deterministic address
     * @return smartAccount The address of the newly created or existing SmartAccount
     */
    function createAccount(address owner, uint256 salt) external returns (address smartAccount) {
        // First check if the account already exists
        smartAccount = getAddress(owner, salt);
        uint256 codeSize;
        assembly { codeSize := extcodesize(smartAccount) }
        if(codeSize > 0) {
            return smartAccount;
        }

        // If not, create it
        bytes32 salt_ = keccak256(abi.encodePacked(owner, salt));
        smartAccount = address(new SmartAccount{salt: salt_}(address(i_entryPoint)));
        
        require(smartAccount != address(0), "SmartAccountFactory: create2 failed");
        emit SmartAccountCreated(owner, smartAccount);
    }

    /*//////////////////////////////////////////////////////////////
                                GETTERS
    //////////////////////////////////////////////////////////////*/
    function getEntryPoint() external view returns (address) {
        return address(i_entryPoint);
    }
}
