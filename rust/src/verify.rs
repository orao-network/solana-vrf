use crate::error::Error;
use ed25519_dalek::{PublicKey, Signature, Verifier};
use solana_sdk::ed25519_instruction::DATA_START;
use solana_transaction_status::{
  EncodedConfirmedTransactionWithStatusMeta, EncodedTransaction, UiInstruction,
  UiMessage, UiParsedInstruction,
};

/// Returns true if Transaction contains instructions to Ed25519SigVerify and OraoSolanaVrf programs.
///
/// `Transaction` must be encoded in UiTransactionEncoding::JsonParsed. Otherwise it will return false.
pub fn is_vrf_fulfilled_transaction(
  tx: &EncodedConfirmedTransactionWithStatusMeta,
  vrf_program_id: String,
) -> bool {
  match &tx.transaction.transaction {
    EncodedTransaction::Json(json) => match &json.message {
      UiMessage::Parsed(msg) => {
        return is_vrf_fulfilled_instructions(
          &msg.instructions,
          vrf_program_id,
        );
      }
      _ => {}
    },
    _ => {}
  }
  false
}

/// Returns true if it is Fulfill instructions.
///
/// First instruction must be directed at EdSigVerify, followed by OraoVrfProgram.
fn is_vrf_fulfilled_instructions(
  instructions: &Vec<UiInstruction>,
  vrf_program_id: String,
) -> bool {
  if instructions.len() != 2 {
    return false;
  }

  let program_ids: Vec<String> = instructions
    .into_iter()
    .map(|instruction| {
      match instruction {
        UiInstruction::Parsed(parsed) => match parsed {
          UiParsedInstruction::PartiallyDecoded(decoded) => {
            return decoded.program_id.clone();
          }
          _ => {}
        },
        _ => {}
      }
      "".to_string()
    })
    .collect();
  // TODO: Check instruction of vrf_program_id
  program_ids[0] == solana_sdk::ed25519_program::id().to_string()
    && program_ids[1] == vrf_program_id
}

/// Verify randomness with `ed25519_dalek::PublicKey` used in native EdSigVerify program.
///
/// First, public key is extracted from transaction containing EdSigVerify instruction.
/// It is then used to verify randomness (signature) against seed (message).
pub fn verify_randomness_offchain(
  tx: &EncodedConfirmedTransactionWithStatusMeta,
  seed: &[u8],
  randomness: &[u8],
) -> Result<(), Error> {
  let public_key = extract_pubkey_from_edsigverify_tx(tx)?;
  let signature = Signature::from_bytes(randomness).unwrap();
  public_key
    .verify(seed, &signature)
    .map_err(|err| Error::RandomnessVerifyError(err.to_string()))?;
  Ok(())
}

/// Returns `ed25519_dalek::PublicKey` used in native EdSigVerify program.
///
/// Extracts public key bytes from instruction sent to EdSigVerify program and construction `ed25519_dalek::PublicKey`.
fn extract_pubkey_from_edsigverify_tx(
  tx: &EncodedConfirmedTransactionWithStatusMeta,
) -> Result<PublicKey, Error> {
  match &tx.transaction.transaction {
    EncodedTransaction::Json(json) => match &json.message {
      UiMessage::Parsed(msg) => match &msg.instructions[0] {
        UiInstruction::Parsed(parsed) => match parsed {
          UiParsedInstruction::PartiallyDecoded(decoded) => {
            return Ok(extract_pubkey_from_edsigverify_instruction_data(
              decoded.data.to_string(),
            ));
          }
          _ => {}
        },
        _ => {}
      },
      _ => {}
    },
    _ => {}
  }
  return Err(Error::PubkeyNotFoundError);
}

/// See `extract_pubkey_from_edsigverify_tx`
fn extract_pubkey_from_edsigverify_instruction_data(data: String) -> PublicKey {
  let bytes = bs58::decode(data).into_vec().unwrap();
  let public_key_offset = DATA_START;
  PublicKey::from_bytes(&bytes[public_key_offset..public_key_offset + 32])
    .unwrap()
}

#[cfg(test)]
mod tests {
  use super::*;
  use ed25519_dalek::PublicKey;
  use solana_transaction_status::{
    parse_accounts::ParsedAccount, EncodedConfirmedTransactionWithStatusMeta,
    EncodedTransaction, EncodedTransactionWithStatusMeta, UiInstruction,
    UiMessage, UiParsedInstruction, UiParsedMessage,
    UiPartiallyDecodedInstruction, UiTransaction,
  };

  const program_id: &str = "VRFUm3dhiqtyW6nj8XghcPLJbCXg9Hj85iABpxwq1Xz";

  fn new_verify_tx() -> EncodedConfirmedTransactionWithStatusMeta {
    EncodedConfirmedTransactionWithStatusMeta {
			slot: 135220546,
			transaction: EncodedTransactionWithStatusMeta {
				transaction: EncodedTransaction::Json(UiTransaction {
					signatures: vec!["5SfVFAcehi9kym2pFHBqfcfxn8Lw6KhzZv6eZsBaCYjik4rMzTSV5vG5RRARcd66NVU2ntgNdQJ9VJ6snNktvoe".to_string()],
					message: UiMessage::Parsed(
						UiParsedMessage {
							account_keys: vec![
								ParsedAccount { pubkey: "2V28D3jzn7XEuKSqVVzDyXB3YMg8mfWE9QVvvkNvxEWw".to_string(), writable: true, signer: true }, ParsedAccount { pubkey: "4e2XwTiqN9guw7nvKERMAFz38MCoB4SjFxkoJ7kX3oFb".to_string(), writable: true, signer: false }, ParsedAccount { pubkey: "Sysvar1nstructions1111111111111111111111111".to_string(), writable: false, signer: false }, ParsedAccount { pubkey: program_id.to_string(), writable: false, signer: false }, ParsedAccount { pubkey: "5kdHknoTfhuCU1g19ACnpJRFANbxAaaxKwigx25igS9J".to_string(), writable: false, signer: false }
							],
							recent_blockhash: "".to_string(),
							instructions: vec![
								UiInstruction::Parsed(
									UiParsedInstruction::PartiallyDecoded(
										UiPartiallyDecodedInstruction {
											program_id: "Ed25519SigVerify111111111111111111111111111".to_string(),
											accounts: vec![],
											data: "4Em4VK9kSwLdJbfKHSpHeP2NLFMnJpKVtwPiVeqKLJa8tmATUEUYTbk1PMWMBi8nKfyN3p9cYc4WWkCVy2hZegpvgvXHapPxX8JWUhTUaGZUEhx8PNHNwWJHpD3j9S82kYj6K3He2BJUEtejUHX241v9ApmiVnUpxNbN3J3dgYuvJHMqwF4wF21jcrAnfse571wK".to_string(),
										}
									)
								),
								UiInstruction::Parsed(
									UiParsedInstruction::PartiallyDecoded(
										UiPartiallyDecodedInstruction {
											program_id: program_id.to_string(),
											accounts: vec!["5kdHknoTfhuCU1g19ACnpJRFANbxAaaxKwigx25igS9J".to_string(), "5kdHknoTfhuCU1g19ACnpJRFANbxAaaxKwigx25igS9J".to_string(), "4e2XwTiqN9guw7nvKERMAFz38MCoB4SjFxkoJ7kX3oFb".to_string(), "Sysvar1nstructions1111111111111111111111111".to_string()],
											data: "2en2sz8msAEUowYpS7q6f19oDBqRFd6du2P2U6CtcPrXXYNSr5KiDbg5Xsyrv7vns6VabV9gMzAXnUNaYc1gfKqdBMjKhizESTQZdWbx4Ms4qwPsf8UKBxSFTWpXkyp577cu".to_string(),
										}
									)
								)
							],
							address_table_lookups: None
						}
					)
				}),
				meta: None,
				version: None,
			},
			block_time: Some(1652942324),
		}
  }

  fn new_request_tx() -> EncodedConfirmedTransactionWithStatusMeta {
    EncodedConfirmedTransactionWithStatusMeta {
			slot: 135220546,
			transaction: EncodedTransactionWithStatusMeta {
				transaction: EncodedTransaction::Json(UiTransaction {
					signatures: vec!["4v12e3pu7o3m32wL6KfcCgRMF1pzJ7baEhTeHHpgndjwsYPJQJuhu1PtxaDpoGgDe9Q776LPgHyMFh9ux2NLAi8x".to_string()],
					message: UiMessage::Parsed(
						UiParsedMessage {
							account_keys: vec![
								ParsedAccount { pubkey: "2V28D3jzn7XEuKSqVVzDyXB3YMg8mfWE9QVvvkNvxEWw".to_string(), writable: true, signer: true }, ParsedAccount { pubkey: "4e2XwTiqN9guw7nvKERMAFz38MCoB4SjFxkoJ7kX3oFb".to_string(), writable: true, signer: false }, ParsedAccount { pubkey: "11111111111111111111111111111111".to_string(), writable: false, signer: false }, ParsedAccount { pubkey: "SysvarRent111111111111111111111111111111111".to_string(), writable: false, signer: false }, ParsedAccount { pubkey: "VRFUm3dhiqtyW6nj8XghcPLJbCXg9Hj85iABpxwq1Xz".to_string(), writable: false, signer: false }, ParsedAccount { pubkey: "5kdHknoTfhuCU1g19ACnpJRFANbxAaaxKwigx25igS9J".to_string(), writable: false, signer: false }
							],
							recent_blockhash: "".to_string(),
							instructions: vec![
								UiInstruction::Parsed(
									UiParsedInstruction::PartiallyDecoded(
										UiPartiallyDecodedInstruction {
											program_id: "VRFUm3dhiqtyW6nj8XghcPLJbCXg9Hj85iABpxwq1Xz".to_string(),
											accounts: vec![
												"2V28D3jzn7XEuKSqVVzDyXB3YMg8mfWE9QVvvkNvxEWw".to_string(), "5kdHknoTfhuCU1g19ACnpJRFANbxAaaxKwigx25igS9J".to_string(), "2V28D3jzn7XEuKSqVVzDyXB3YMg8mfWE9QVvvkNvxEWw".to_string(), "4e2XwTiqN9guw7nvKERMAFz38MCoB4SjFxkoJ7kX3oFb".to_string(), "11111111111111111111111111111111".to_string(), "SysvarRent111111111111111111111111111111111".to_string()
											],
											data: "4Em4VK9kSwLdJbfKHSpHeP2NLFMnJpKVtwPiVeqKLJa8tmATUEUYTbk1PMWMBi8nKfyN3p9cYc4WWkCVy2hZegpvgvXHapPxX8JWUhTUaGZUEhx8PNHNwWJHpD3j9S82kYj6K3He2BJUEtejUHX241v9ApmiVnUpxNbN3J3dgYuvJHMqwF4wF21jcrAnfse571wK".to_string(),
										}
									)
								),
							],
							address_table_lookups: None
						}
					)
				}),
				meta: None,
				version: None,
			},
			block_time: Some(1652942324),
		}
  }

  #[test]
  fn test_is_vrf_fulfilled_transaction() {
    let verify_tx = new_verify_tx();
    assert_eq!(
      is_vrf_fulfilled_transaction(&verify_tx, program_id.to_string()),
      true
    );
    let request_tx = new_request_tx();
    assert_eq!(
      is_vrf_fulfilled_transaction(&request_tx, program_id.to_string()),
      false
    );
  }

  #[test]
  fn test_extract_pubkey() {
    let data = "4Em4VK9kSwLdJbfKHSpHeP2NLFMnJpKVtwPiVeqKLJa8tmATUEUYTbk1PMWMBi8nKfyN3p9cYc4WWkCVy2hZegpvgvXHapPxX8JWUhTUaGZUEhx8PNHNwWJHpD3j9S82kYj6K3He2BJUEtejUHX241v9ApmiVnUpxNbN3J3dgYuvJHMqwF4wF21jcrAnfse571wK".to_string();
    let expected_pubkey = PublicKey::from_bytes(
      vec![
        22, 9, 56, 134, 48, 255, 91, 50, 91, 100, 234, 229, 1, 85, 222, 13,
        136, 140, 147, 52, 139, 118, 42, 145, 105, 28, 180, 197, 75, 12, 124,
        228,
      ]
      .as_ref(),
    )
    .unwrap();
    let extracted_pubkey =
      extract_pubkey_from_edsigverify_instruction_data(data);
    assert_eq!(expected_pubkey, extracted_pubkey);
  }

  #[test]
  fn test_verify() {
    let verify_tx = new_verify_tx();
    let seed = vec![
      240, 76, 119, 173, 85, 132, 29, 69, 30, 159, 184, 65, 43, 241, 28, 248,
      97, 201, 145, 10, 67, 132, 18, 9, 218, 186, 126, 72, 25, 57, 120, 30,
    ];
    let randomness = vec![
      205, 235, 166, 115, 6, 150, 100, 51, 119, 192, 239, 49, 225, 84, 0, 134,
      54, 41, 137, 152, 217, 73, 1, 238, 109, 226, 212, 225, 127, 168, 205,
      149, 202, 44, 29, 236, 199, 104, 136, 54, 18, 251, 206, 202, 117, 28, 64,
      145, 220, 35, 103, 52, 255, 153, 28, 7, 159, 95, 10, 107, 164, 145, 234,
      10,
    ];
    let res = verify_randomness_offchain(
      &verify_tx,
      seed.as_ref(),
      randomness.as_ref(),
    );
    assert_eq!(res.is_ok(), true);
  }
}
