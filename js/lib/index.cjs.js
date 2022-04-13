'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var borsh = require('borsh');
var web3_js = require('@solana/web3.js');

const vrf_program = new web3_js.PublicKey("VRF2YJRMzJ1CrdEeTa9g55RGMBnvN3WG6PEuFNuPhjX");
const config_account_seed = Buffer.from("orao-vrf-network-configuration");
const randomness_account_seed = Buffer.from("orao-vrf-randomness-request");
class RandomnessRequested {
  constructor(seed) {
    this.seed = void 0;
    this.seed = seed;
  }

}
class RandomnessFullfilled {
  constructor(seed, randomness, pubkey) {
    this.seed = void 0;
    this.randomness = void 0;
    this.pubkey = void 0;
    this.seed = seed;
    this.randomness = randomness;
    this.pubkey = pubkey;
  }

}

const deriveAccountAddress = async seed => {
  let [pubkey, _] = await web3_js.PublicKey.findProgramAddress([randomness_account_seed, seed], vrf_program);
  return pubkey;
};

const deriveConfigAccountAddress = async () => {
  let [pubkey, _] = await web3_js.PublicKey.findProgramAddress([config_account_seed], vrf_program);
  return pubkey;
};

const decodeTreasuryFromConfig = buffer => {
  const reader = new borsh.BinaryReader(buffer);
  reader.readFixedArray(32); // authority

  return new web3_js.PublicKey(reader.readFixedArray(32));
};

const decodeRandomnessAccount = buffer => {
  const reader = new borsh.BinaryReader(buffer);
  const tag = reader.readU8();

  if (tag === 0) {
    return new RandomnessRequested(reader.readFixedArray(32));
  } else if (tag === 1) {
    return new RandomnessFullfilled(reader.readFixedArray(32), reader.readFixedArray(64), new web3_js.PublicKey(reader.readFixedArray(32)));
  } else {
    throw "Invalid account data";
  }
};

const createOrGetRandomnessRequest = async (payer, connection, seed = undefined) => {
  if (seed === undefined) {
    // generate random seed if none was provided
    seed = web3_js.Keypair.generate().publicKey.toBuffer();
    console.log("generated seed for randomness request: ", seed);
  } else {
    console.log("user user-provided seed for randomness request: ", seed);
  }

  const randomnessAddress = await deriveAccountAddress(seed);
  const randomnessAccount = await connection.getAccountInfo(randomnessAddress);

  if (randomnessAccount === null) {
    // no randomness yet for this seed,
    // request one and return the tx to the
    // user to sign and send
    const writer = new borsh.BinaryWriter();
    writer.writeU8(0); // RequestRandomness Instruction

    writer.writeFixedArray(seed);
    const configAddress = await deriveConfigAccountAddress();
    const configAccount = await connection.getAccountInfo(configAddress);
    const treasuryAddress = decodeTreasuryFromConfig(configAccount.data);
    const tx = new web3_js.TransactionInstruction({
      keys: [{
        pubkey: payer,
        isSigner: true,
        isWritable: true
      }, {
        pubkey: configAddress,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: treasuryAddress,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: randomnessAddress,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: web3_js.SystemProgram.programId,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: web3_js.SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false
      }],
      programId: vrf_program,
      data: Buffer.from(writer.toArray())
    });
    return new web3_js.Transaction().add(tx);
  } else {
    // there is already randomness generated for this seed
    return decodeRandomnessAccount(randomnessAccount.data);
  }
};

exports.RandomnessFullfilled = RandomnessFullfilled;
exports.RandomnessRequested = RandomnessRequested;
exports.createOrGetRandomnessRequest = createOrGetRandomnessRequest;
//# sourceMappingURL=index.cjs.js.map
