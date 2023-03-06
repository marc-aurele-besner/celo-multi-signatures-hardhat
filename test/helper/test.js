const { ethers, network } = require('hardhat');
const { expect } = require('chai');

const signature = require('./signature');

const ZERO = ethers.BigNumber.from(0);

const sendRawTxn = async (input, sender, ethers, provider) => {
    // Get the nonce
    const txCount = await provider.getTransactionCount(sender.address)
    // Prepare the transaction
    const rawTx = {
        chainId: network.config.chainId,
        nonce: ethers.utils.hexlify(txCount),
        to: input.to,
        value: input.value || 0x00,
        gasLimit: ethers.utils.hexlify(3000000),
        gasPrice: ethers.utils.hexlify(25000000000),
        data: input.data,
    }
    // Sign the transaction
    const rawTransactionHex = await sender.signTransaction(rawTx)
    // Send the transaction
    const { hash } = await provider.sendTransaction(rawTransactionHex)
    // Wait for the transaction to be mined
    return await provider.waitForTransaction(hash)
  }
  
const checkRawTxnResult = async (input, sender, error) => {
    let result
    // Check if the transaction should fail or not
    if (error)
        if (network.name === 'hardhat' || network.name === 'localhost')
            await expect(sendRawTxn(input, sender, ethers, ethers.provider)).to.be.revertedWith(error)
        else expect.fail('AssertionError: ' + error)
    else {
        result = await sendRawTxn(input, sender, ethers, ethers.provider)
        expect(result.status).to.equal(1)
    }
    return result
}

const getEventFromReceipt = async (contract, receipt, eventName) => {
    // Parse the logs
    const log = receipt.logs.map((log) => {
        try {
            return contract.interface.parseLog(log)
        } catch (e) {
            console.log('e', e)
            return
        }
    })
    return log
}

const prepareSignatures = async (contract, owners, to, value, data, gas = 30000) => {
    // Query the next nonce
    const nonce = await contract.nonce()
    let signatures = '0x'
    for (var i = 0; i < owners.length; i++) {
        // For each owners, sign the transaction
        const sig = await signature.signTransaction(contract.address, owners[i], to, value, data, gas, nonce)
        // Concatenate the signatures
        signatures += sig.substring(2)
    }
    // Return signatures of all owners
    return signatures
}

const execTransaction = async (contract, submitter, owners, to, value, data, gas = 30000, errorMsg, extraEvents, signatures) => {
    // Prepare signatures if not provided
    if (!signatures) signatures = await prepareSignatures(contract, owners, to, value, data, gas)
    // Prepare transaction
    const input = await contract.connect(submitter).populateTransaction.execTransaction(to, value, data, gas, signatures)
  
    // Send the transaction and check the result
    const receipt = await checkRawTxnResult(input, submitter, errorMsg)
    if (!errorMsg) {
        // Check the event emitted (if transaction should succeed)
        const event = await getEventFromReceipt(contract, receipt, 'TransactionExecuted')
        for (var i = 0; i < event.length; i++) {
            if (event[i] && event[i].name === 'TransactionExecuted') {
                // If the event is found, check the parameters
                expect(event[i].args.sender).to.be.equal(submitter.address)
                expect(event[i].args.to).to.be.equal(to)
                expect(event[i].args.value).to.be.equal(value)
                expect(event[i].args.data).to.be.equal(data)
                expect(event[i].args.txnGas).to.be.equal(gas)
                return receipt
            } else {
                // If the event is not found, check if the transaction failed
                if (
                    extraEvents &&
                    extraEvents.find((extraEvent) => extraEvent === 'TransactionFailed') &&
                    event[i] &&
                    event[i].name === 'TransactionFailed'
                ) {
                    // If the transaction failed, check the parameters and if we expect a failure
                    expect(event[i].args.sender).to.be.equal(submitter.address)
                    expect(event[i].args.to).to.be.equal(to)
                    expect(event[i].args.value).to.be.equal(value)
                    expect(event[i].args.data).to.be.equal(data)
                    expect(event[i].args.txnGas).to.be.equal(gas)
                    return receipt
                } else {
                    // If the transaction failed but we don't expect it, throw an error
                    expect.fail('TransactionExecuted event not found')
                }
            }
        }
        // If the event is not found, throw an error
        if (event.length == 0) expect.fail('TransactionExecuted event not found')
        // If we expect an extra event, check if it is emitted
        if (extraEvents && extraEvents.length > 0) {
            for (let i = 1; i < extraEvents.length; i++) {
                const eventsFound = await getEventFromReceipt(contract, receipt, event)
                for (var ii = 0; i < eventsFound.length; ii++) {
                    if (eventsFound[ii]) {
                        expect(submitter.address).to.be.equal(eventsFound[ii].sender)
                        return receipt
                    }
                }
            }
        }
    }
}

const addOwner = async (contract, submitter, owners, ownerToAdd, gas = 30000, errorMsg, extraEvents) => {
    const data = contract.interface.encodeFunctionData('addOwner(address)', [ownerToAdd])

    await execTransaction(contract, submitter, owners, contract.address, ZERO, data, gas, errorMsg, extraEvents)

    if (!errorMsg) expect(await contract.isOwner(ownerToAdd)).to.be.true
}
  
const removeOwner = async (contract, submitter, owners, ownerToRemove, gas = 30000, errorMsg, extraEvents) => {
    const data = contract.interface.encodeFunctionData('removeOwner(address)', [ownerToRemove])

    await execTransaction(contract, submitter, owners, contract.address, ZERO, data, gas, undefined, extraEvents)

    if (!errorMsg) expect(await contract.isOwner(ownerToRemove)).to.be.false
    else expect(await contract.isOwner(ownerToRemove)).to.be.true
}
  
const changeThreshold = async (contract, submitter, owners, newThreshold, gas = 30000, errorMsg, extraEvents) => {
    const data = contract.interface.encodeFunctionData('changeThreshold(uint16)', [newThreshold])

    await execTransaction(contract, submitter, owners, contract.address, ZERO, data, gas, errorMsg, extraEvents)

    if (!errorMsg) expect(await contract.threshold()).to.be.equal(newThreshold)
}
  
const replaceOwner = async (contract, submitter, owners, ownerToAdd, ownerToRemove, gas = 30000, errorMsg, extraEvents) => {
    const data = contract.interface.encodeFunctionData('replaceOwner(address,address)', [ownerToRemove, ownerToAdd])

    await execTransaction(contract, submitter, owners, contract.address, ZERO, data, gas, errorMsg, extraEvents)

    if (!errorMsg) {
        expect(await contract.isOwner(ownerToAdd)).to.be.true
        expect(await contract.isOwner(ownerToRemove)).to.be.false
    }
}

module.exports = {
    checkRawTxnResult,
    prepareSignatures,
    execTransaction,
    addOwner,
    removeOwner,
    changeThreshold,
    replaceOwner,
}