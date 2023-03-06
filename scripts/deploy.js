const Helper = require('../test/helper');

async function main() {
  const [, owner01, owner02, owner03] = await Helper.setupProviderAndWallets();

  const owners = [owner01.address, owner02.address, owner03.address]
  const contract = await Helper.deployContract(owners, 2);

  console.log(`Contract CeloMultiSig deployed to ${contract.address}`);
  console.log(`Owners: ${owners}`);
  console.log(`Required confirmations (threshold): 2`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
