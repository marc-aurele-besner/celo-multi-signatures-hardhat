// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/cryptography/EIP712.sol';

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract CeloMultiSig is ReentrancyGuard, EIP712 {
    string private _name;
    uint96 private _nonce;
    uint16 private _threshold;
    uint16 private _ownerCount;

    mapping(address => bool) private _owners;
    mapping(uint256 => bool) private _ownerNonceUsed;

    bytes32 private constant _TRANSACTION_TYPEHASH = keccak256('Transaction(address to,uint256 value,bytes data,uint256 gas,uint96 nonce)');

    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event ThresholdChanged(uint256 indexed threshold);
    event TransactionExecuted(
        address indexed sender,
        address indexed to,
        uint256 indexed value,
        bytes data,
        uint256 txnGas,
        uint256 txnNonce
    );
    event TransactionFailed(
        address indexed sender,
        address indexed to,
        uint256 indexed value,
        bytes data,
        uint256 txnGas,
        uint256 txnNonce
    );

    modifier onlyThis() {
        require(msg.sender == address(this), 'CeloMultiSig: only this contract can call this function');
        _;
    }

    constructor(address[] memory owners_, uint16 threshold_) EIP712(name(), version()) {
        require(owners_.length <= 2 ** 16 - 1, 'CeloMultiSig: cannot add owner above 2^16 - 1');
        uint256 length = owners_.length;
        for (uint256 i = 0; i < length; ) {
            _owners[owners_[i]] = true;
            unchecked {
            ++i;
            }
        }
        _ownerCount = uint16(owners_.length);
        _changeThreshold(threshold_);
    }

    /// @notice Retrieves the contract name
    /// @return The name as a string memory.
    function name() public pure returns (string memory) {
        return 'CeloMultiSig';
    }

    /// @notice Retrieves the contract version
    /// @return The version as a string memory.
    function version() public pure returns (string memory) {
        return '1.0';
    }

    /// @notice Retrieves the current threshold value
    /// @return The current threshold value as a uint16.
    function threshold() public view returns (uint16) {
        return _threshold;
    }

    /// @notice Retrieves the amount of owners
    /// @return The amount of owners value as a uint16.
    function ownerCount() public view returns (uint16) {
        return _ownerCount;
    }

    /// @notice Retrieves the last txn nonce used
    /// @return The txn nonce value as a uint96.
    function nonce() public view returns (uint96) {
        return _nonce;
    }

    /// @notice Determines if the address is the owner
    /// @param owner The address to be checked.
    /// @return True if the address is the owner, false otherwise.
    function isOwner(address owner) public view returns (bool) {
        return _owners[owner];
    }

    /// @notice Executes a transaction
    /// @param to The address to which the transaction is made.
    /// @param value The amount of Ether to be transferred.
    /// @param data The data to be passed along with the transaction.
    /// @param txnGas The gas limit for the transaction.
    /// @param signatures The signatures to be used for the transaction.
    function execTransaction(
        address to,
        uint256 value,
        bytes memory data,
        uint256 txnGas,
        bytes memory signatures
    ) public payable nonReentrant returns (bool success) {
        uint16 threshold_ = _threshold;
        if (signatures.length < 65 * threshold_) revert('CeloMultiSig: invalid signatures');
        bytes32 txHash = _hashTypedDataV4(
            keccak256(abi.encode(_TRANSACTION_TYPEHASH, to, value, keccak256(data), txnGas, _nonce))
        );
        address currentOwner;
        uint256 currentOwnerNonce;
        for (uint16 i; i < threshold_; ) {
            unchecked {
                currentOwner = _getCurrentOwner(txHash, signatures, i);
                currentOwnerNonce = uint256(uint96(_nonce)) + uint256(uint160(currentOwner) << 96);
                require(_owners[currentOwner], 'CeloMultiSig: invalid owner');
                require(!_ownerNonceUsed[currentOwnerNonce], 'CeloMultiSig: owner already signed');
                _ownerNonceUsed[currentOwnerNonce] = true;
                ++i;
            }
        }
        _nonce++;
        uint256 gasBefore = gasleft();
        assembly {
            success := call(txnGas, to, value, add(data, 0x20), mload(data), 0, 0)
        }
        require(gasBefore - gasleft() < txnGas, 'CeloMultiSig: not enough gas');
        if (success) emit TransactionExecuted(msg.sender, to, value, data, txnGas, _nonce);
        else emit TransactionFailed(msg.sender, to, value, data, txnGas, _nonce);
        return success;
    }

    /// @notice Return the current owner address from the full signature at the id position
    /// @param txHash The transaction hash.
    /// @param signatures The signatures to be used for the transaction.
    /// @param id The id of the position of the owner in the full signature.
    /// @return currentOwner The current owner address.
    function _getCurrentOwner(
        bytes32 txHash,
        bytes memory signatures,
        uint16 id
    ) private pure returns (address currentOwner) {
        unchecked {
            uint8 v;
            bytes32 r;
            bytes32 s;
            assembly {
                let signaturePos := mul(0x41, id)
                r := mload(add(signatures, add(signaturePos, 32)))
                s := mload(add(signatures, add(signaturePos, 64)))
                v := and(mload(add(signatures, add(signaturePos, 65))), 255)
            }
            currentOwner = ecrecover(txHash, v, r, s);
        }
    }

    /// @notice Adds an owner
    /// @param owner The address to be added as an owner.
    /// @dev This function can only be called inside a multisig transaction.
    function addOwner(address owner) public onlyThis {
        require(_ownerCount < 2 ** 16 - 1, 'CeloMultiSig: cannot add owner above 2^16 - 1');
        _owners[owner] = true;
    }

    /// @notice Removes an owner
    /// @param owner The owner to be removed.
    /// @dev This function can only be called inside a multisig transaction.

    function removeOwner(address owner) public onlyThis {
        if (_ownerCount <= _threshold) revert('CeloMultiSig: cannot remove owner below threshold');
        _owners[owner] = false;
        _ownerCount--;
    }

    /// @notice Changes the threshold
    /// @param newThreshold The new threshold.
    /// @dev This function can only be called inside a multisig transaction.
    function _changeThreshold(uint16 newThreshold) private {
        require(newThreshold > 0, 'CeloMultiSig: threshold must be greater than 0');
        require(newThreshold <= _ownerCount, 'CeloMultiSig: threshold must be less than or equal to owner count');
        _threshold = newThreshold;
    }

    /// @notice Changes the threshold
    /// @param newThreshold The new threshold.
    /// @dev This function can only be called inside a multisig transaction.
    function changeThreshold(uint16 newThreshold) public onlyThis {
        _changeThreshold(newThreshold);
    }

    /// @notice Replaces an owner with a new owner
    /// @param oldOwner The owner to be replaced.
    /// @param newOwner The new owner.
    /// @dev This function can only be called inside a multisig transaction.
    function replaceOwner(address oldOwner, address newOwner) public onlyThis {
        require(_owners[oldOwner], 'CeloMultiSig: old owner must be an owner');
        require(!_owners[newOwner], 'CeloMultiSig: new owner must not be an owner');
        require(newOwner != address(0), 'CeloMultiSig: new owner must not be the zero address');
        _owners[oldOwner] = false;
        _owners[newOwner] = true;
    }
}
