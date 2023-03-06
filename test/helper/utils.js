const { ethers, network, addressBook } = require('hardhat');

module.exports = {
    setupProviderAndWallets: async function () {
        const provider = ethers.provider;
        let owner01;
        let owner02;
        let owner03;

        let user01;
        let user02;
        let user03;

        if (network.config.accounts && network.config.accounts.mnemonic) {
            // If the network is configured with a mnemonic, use it to generate the wallets
            owner01 = new ethers.Wallet(ethers.Wallet.fromMnemonic(network.config.accounts.mnemonic, `m/44'/60'/0'/0/0`).privateKey, provider);
            owner02 = new ethers.Wallet(ethers.Wallet.fromMnemonic(network.config.accounts.mnemonic, `m/44'/60'/0'/0/1`).privateKey, provider);
            owner03 = new ethers.Wallet(ethers.Wallet.fromMnemonic(network.config.accounts.mnemonic, `m/44'/60'/0'/0/2`).privateKey, provider);

            user01 = new ethers.Wallet(ethers.Wallet.fromMnemonic(network.config.accounts.mnemonic, `m/44'/60'/0'/0/3`).privateKey, provider);
            user02 = new ethers.Wallet(ethers.Wallet.fromMnemonic(network.config.accounts.mnemonic, `m/44'/60'/0'/0/4`).privateKey, provider);
            user03 = new ethers.Wallet(ethers.Wallet.fromMnemonic(network.config.accounts.mnemonic, `m/44'/60'/0'/0/5`).privateKey, provider);
        } else {
            // If the network is not configured with a mnemonic, use the 3 first accounts as owners and the 3 next as users
            owner01 = new ethers.Wallet(network.config.accounts[0], provider);
            owner02 = new ethers.Wallet(network.config.accounts[1], provider);
            owner03 = new ethers.Wallet(network.config.accounts[2], provider);

            user01 = new ethers.Wallet(network.config.accounts[3], provider);
            user02 = new ethers.Wallet(network.config.accounts[4], provider);
            user03 = new ethers.Wallet(network.config.accounts[5], provider);
        }
        return [provider, owner01, owner02, owner03, user01, user02, user03]
    },
    deployContract: async function (owners, threshold) {
        // Retrieve the contract factory
        const CeloMultiSig = await ethers.getContractFactory('CeloMultiSig');
        // Deploy the contract with the specified parameters for the constructor
        const contract = await CeloMultiSig.deploy(owners, threshold, { gasLimit: 10000000 });
        // Wait for the contract to be deployed
        await contract.deployed();
        // Save the contract address in the address book
        await addressBook.saveContract(
            'CeloMultiSig',
            contract.address,
            network.name,
            contract.deployTransaction.from,
            network.config.chainId,
            contract.deployTransaction.blockHash,
            contract.deployTransaction.blockNumber,
            undefined,
            {
                owners,
                threshold,
            }
          );
        // Return the contract
        return contract;
    }
}