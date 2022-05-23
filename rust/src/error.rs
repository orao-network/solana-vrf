use solana_client::client_error::ClientError;
use thiserror::Error;

/// Errors associated with vrf functions.
#[derive(Debug, Error)]
pub enum Error {
  /// Unable to decode data from account into `Randomness` object.
  #[error(
    "Unable to decode Randomness Request from account data. Reason = `{0}`"
  )]
  RandomnessDecodeError(String),

  /// Unable to serialize Instructions in bytes form.
  #[error("Unable to serialize Instruction")]
  SerializationError,

  /// Solana rpc error
  #[error("Solana RPC error")]
  SolanaClientError(#[from] ClientError),

  /// Unable to find Public Key used to generate Randomness from instruction
  #[error("Unable to find Public Key from instruction")]
  PubkeyNotFoundError,

  #[error("Unable to verify Randomness. Reason = `{0}`")]
  RandomnessVerifyError(String),

  #[error("{0}")]
  NotFound(String),
}
