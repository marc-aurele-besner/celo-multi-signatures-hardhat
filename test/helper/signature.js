const { network } = require('hardhat')

module.export = {
  signTransaction: async function (
    contractAddress,
    wallet,
    to,
    value,
    data,
    gas,
    nonce
  ) {
    const signature = await wallet._signTypedData(
      {
        name: 'CeloMultiSig',
        version: '1.0',
        chainId: network.config.chainId,
        verifyingContract: contractAddress,
      },
      {
        Transaction: [
          {
            name: 'to',
            type: 'address',
          },
          {
            name: 'value',
            type: 'uint256',
          },
          {
            name: 'data',
            type: 'bytes',
          },
          {
            name: 'gas',
            type: 'uint256',
          },
          {
            name: 'nonce',
            type: 'uint96',
          },
        ],
      },
      {
        to,
        value,
        data,
        gas,
        nonce,
      }
    )
    return signature
  }
}