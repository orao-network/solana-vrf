# Orao Solana VRF Javascript SDK
This repository provides the off-chain web3 SDK for requesting on-chain randomness using Orao VRF contract.

## Import ORAO's VRF library
```
import { createOrGetRandomnessRequest, RandomnessFullfilled, RandomnessRequested } from './lib/orao-vrf-solana-js/index.esm'; // path to copied library, includes VRF contract address
import { Keypair, PublicKey, Transaction, clusterApiUrl, Connection } from '@solana/web3.js';


// Create a connection to to Solana's devnet network
const connection = new Connection(clusterApiUrl('devnet'));


// Generate a new keypair
const payer = Keypair.generate();

// request an airdrop of 1 SOL for your new keypair  -- ** not applicable for mainnet
const airdroptx = await connection.requestAirdrop(payer.publicKey, 1 * LAMPORTS_PER_SOL);
await connection.confirmTransaction(airdroptx, "finalized");

const walletPublicKey = payer.publicKey;
const seed = new PublicKey('<public key>'); // public key can be generated using Keypair.generate().publicKey
const request = await createOrGetRandomnessRequest(walletPublicKey, connection, seed.toBuffer());

if (request instanceof Transaction) {
	//Request randomness
	request.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
	request.feePayer = publicKey;
	const tx = await connection.sendTransaction(request, [payer]);
	alert('randomness requested');
} else if (request instanceof RandomnessRequested) {
	//randomness has been requested but not fulfilled yet
	alert('Request pending...');
} else if (request instanceof RandomnessFullfilled) {
	//radnomness has been fulfilled
	alert('Randomness fulfulled');
}
```