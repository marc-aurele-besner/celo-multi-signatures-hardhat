require("@nomicfoundation/hardhat-toolbox");
require("hardhat-awesome-cli");
require("dotenv").config();

const {
  CELO_MAINNET_MNEMONIC,
  CELO_TESTNET_MNEMONIC,
  CELO_API_KEY
} = process.env

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    localhost: {
      accounts: {
        mnemonic: 'test test test test test test test test test test test junk',
      },
      chainId: 31337,
    },
    celoMainnet: {
      url: `https://forno.celo.org`,
      accounts: {
        mnemonic: `${CELO_MAINNET_MNEMONIC}`,
      },
      chainId: 44787,
    },
    celoAlfajores: {
      url: `https://alfajores-forno.celo-testnet.org`,
      accounts: {
        mnemonic: `${CELO_TESTNET_MNEMONIC}`,
      },
      chainId: 44787,
    },
  },
  etherscan: {
    apiKey: {
      celoMainnet: `${CELO_API_KEY}`,
      celoAlfajores: `${CELO_API_KEY}`,
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.18',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
};
