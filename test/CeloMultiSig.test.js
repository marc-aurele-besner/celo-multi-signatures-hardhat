const { expect } = require('chai');
const { ethers } = require('hardhat');

const Helper = require('./helper');

let provider;
let owner01;
let owner02;
let owner03;
let ownerCount;
let user01;
let user02;
let user03;
let contract;

describe('CeloMultiSig', function () {
  before(async function () {
    [provider, owner01, owner02, owner03, user01, user02, user03] = await Helper.setupProviderAndWallets()
  })

  beforeEach(async function () {
    const owners = [owner01.address, owner02.address, owner03.address]
    ownerCount = owners.length
    contract = await Helper.deployContract(
      [owner01.address, owner02.address, owner03.address],
      2
    )
  })

  it('Contract return correct contract name', async function () {
    expect(await contract.name()).to.be.equal('CeloMultiSig')
  })

  it('Contract return correct contract version', async function () {
    expect(await contract.version()).to.be.equal('1.0')
  })

  it('Contract return correct threshold', async function () {
    expect(await contract.threshold()).to.be.equal(2)
  })

  it('Contract return correct ownerCount', async function () {
    expect(await contract.ownerCount()).to.be.equal(ownerCount)
  })

  it('Contract return correct nonce', async function () {
    expect(await contract.nonce()).to.be.equal(0)
  })

  it('Contract return true when calling isOwner for the original owners addresses', async function () {
    expect(await contract.isOwner(owner01.address)).to.be.true
    expect(await contract.isOwner(owner02.address)).to.be.true
    expect(await contract.isOwner(owner03.address)).to.be.true
  })

  it('Contract return false when calling isOwner for non owners addresses', async function () {
    expect(await contract.isOwner(user01.address)).to.be.false
    expect(await contract.isOwner(user02.address)).to.be.false
    expect(await contract.isOwner(user03.address)).to.be.false
  })

  it('Can add a new owner', async function () {
    await Helper.test.addOwner(contract, owner01, [owner01, owner02, owner03], user01.address, undefined, undefined, ['OwnerAdded'])
  })

  it('Can add a new owner and then use it to sign a new transaction replaceOwner', async function () {
    await Helper.test.addOwner(contract, owner01, [owner01, owner02, owner03], user01.address, undefined, undefined, [
      'OwnerAdded',
    ])
    await Helper.test.replaceOwner(contract, owner01, [user01, owner02, owner03], user02.address, owner01.address, undefined, undefined, ['OwnerRemoved', 'OwnerAdded'])
  })

  it('Can add a new owner and then use it to sign a new transaction changeThreshold', async function () {
    await Helper.test.addOwner(contract, owner01, [owner01, owner02, owner03], user01.address, undefined, undefined, ['OwnerAdded'])
    await Helper.test.changeThreshold(contract, owner01, [user01, owner02, owner03], 3, undefined, undefined, ['ThresholdChanged'])
  })

  it('Can add a new owner and then use it to sign a new transaction removeOwner', async function () {
    await Helper.test.addOwner(contract, owner01, [owner01, owner02, owner03], user01.address, undefined, undefined, ['OwnerAdded'])
    await Helper.test.removeOwner(contract, owner01, [user01, owner02, owner03], owner01.address, undefined, undefined, ['OwnerRemoved'])
  })

  it('Cannot add a new owner with just 10k gas', async function () {
    await Helper.test.addOwner(contract, owner01, [owner01, owner02, owner03], user01.address, 10000, Helper.errors.NOT_ENOUGH_GAS)
  })

  it('Cannot add a new owner with 3x the signature of owner01', async function () {
    await Helper.test.addOwner(contract, owner01, [owner01, owner01, owner01], user01.address, 30000, Helper.errors.OWNER_ALREADY_SIGNED
    )
  })

  it('Cannot remove all owners', async function () {
    await Helper.test.removeOwner(contract, owner01, [owner02, owner03], owner01.address, undefined, undefined, ['OwnerRemoved'])
    await Helper.test.removeOwner(contract, owner02, [owner02, owner03], owner03.address, undefined, Helper.errors.OWNER_COUNT_BELOW_THRESHOLD, ['TransactionFailed'])
    await Helper.test.removeOwner(contract, owner03, [owner02, owner03], owner02.address, undefined, Helper.errors.OWNER_COUNT_BELOW_THRESHOLD, ['TransactionFailed'])
  })

  it('Cannot reuse a signature', async function () {
    const data = contract.interface.encodeFunctionData('addOwner(address)', [user02.address])
    const signatures = await Helper.test.prepareSignatures(contract, [owner01, owner02], contract.address, 0, data)
    await Helper.test.execTransaction(contract, owner01, [owner01, owner02], contract.address, 0, data, 30000, undefined, ['OwnerAdded'], signatures)
    await Helper.test.execTransaction(contract, owner01, [owner01, owner02], contract.address, 0, data, 30000, Helper.errors.INVALID_OWNER, undefined, signatures)
  })

  it('Execute transaction without data but 1 ETH in value', async function () {
    await owner01.sendTransaction({ to: contract.address, value: ethers.utils.parseEther('1'), data: '', gasLimit: 30000 })
    await Helper.test.execTransaction(contract, owner01, [owner01, owner02, owner03], owner01.address, ethers.utils.parseEther('1'), '0x', 30000)
  })

  it('Execute transaction without data but 2x 1 ETH in value', async function () {
    await owner01.sendTransaction({ to: contract.address, value: ethers.utils.parseEther('2'), data: '', gasLimit: 30000 })
    await Helper.test.execTransaction(contract, owner01, [owner01, owner02, owner03], owner01.address, ethers.utils.parseEther('1'), '0x', 30000)
    await Helper.test.execTransaction(contract, owner02, [owner01, owner02, owner03], owner01.address, ethers.utils.parseEther('1'), '0x', 30000)
  })

  it('Deploy MockERC20 contract and mint token using the multi-signatures', async function () {
    const MockERC20 = await ethers.getContractFactory('MockERC20')
    mockERC20 = await MockERC20.deploy()
    await mockERC20.deployed()

    const data = mockERC20.interface.encodeFunctionData('mint(address,uint256)', [user02.address, 1000000])
    const signatures = await Helper.test.prepareSignatures(contract, [owner01, owner02, owner03], mockERC20.address, 0, data, 50000)
    await Helper.test.execTransaction(contract, owner01, [owner01, owner02, owner03], mockERC20.address, 0, data, 50000, undefined, ['Transfer'], signatures)
    expect(await mockERC20.balanceOf(user02.address)).to.equal(1000000)
  })

  it('Deploy MockERC20 contract and mint token using the multi-signatures then burn them using the multi-signatures', async function () {
    const MockERC20 = await ethers.getContractFactory('MockERC20')
    mockERC20 = await MockERC20.deploy()
    await mockERC20.deployed()

    const data1 = mockERC20.interface.encodeFunctionData('mint(address,uint256)', [contract.address, 1000000])
    const signatures1 = await Helper.test.prepareSignatures(contract, [owner01, owner02, owner03], mockERC20.address, 0, data1, 50000)
    await Helper.test.execTransaction(contract, owner01, [owner01, owner02, owner03], mockERC20.address, 0, data1, 50000, undefined, ['Transfer'], signatures1)
    expect(await mockERC20.balanceOf(contract.address)).to.equal(1000000)

    const data2 = mockERC20.interface.encodeFunctionData('burn(uint256)', [1000000])
    const signatures2 = await Helper.test.prepareSignatures(contract, [owner01, owner02, owner03], mockERC20.address, 0, data2, 50000)
    await Helper.test.execTransaction(contract, owner01, [owner01, owner02, owner03], mockERC20.address, 0, data2, 50000, undefined, ['Transfer'], signatures2)
    expect(await mockERC20.balanceOf(contract.address)).to.equal(0)
  })
})
