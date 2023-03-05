import { ethers, network, addressBook } from 'hardhat'

module.export = {
    deployContract: async function (owners, threshold) {
        const CeloMultiSig = await ethers.getContractFactory('CeloMultiSig')
        const contract = await CeloMultiSig.deploy(owners, threshold)
        await contract.deployed()
        return contract
    }
}