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
})