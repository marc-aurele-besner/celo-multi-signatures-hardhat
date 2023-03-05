module.export = {
    NOT_SELF: 'CeloMultiSig: only this contract can call this function',
    MAX_OWNERS_COUNT_EXCEEDED: 'CeloMultiSig: cannot add owner above 2^16 - 1',
    INVALID_SIGNATURE: 'CeloMultiSig: invalid signatures',
    INVALID_OWNER: 'CeloMultiSig: invalid owner',
    OWNER_ALREADY_SIGNED: 'CeloMultiSig: owner already signed',
    NOT_ENOUGH_GAS: 'CeloMultiSig: not enough gas',
    OWNER_COUNT_BELOW_THRESHOLD: 'CeloMultiSig: cannot remove owner below threshold',
    THRESHOLD_IS_ZERO: 'CeloMultiSig: threshold must be greater than 0',
    THRESHOLD_GREATER_THAN_OWNERS_COUNT: 'CeloMultiSig: threshold must be less than or equal to owner count',
    OLD_OWNER_NOT_OWNER: 'CeloMultiSig: old owner must be an owner',
    NEW_OWNER_ALREADY_OWNER: 'CeloMultiSig: new owner must not be an owner',
    NEW_OWNER_IS_ZERO_ADDRESS: 'CeloMultiSig: new owner must not be the zero address',
}