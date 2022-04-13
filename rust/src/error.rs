use solana_client::client_error::ClientError;
use thiserror::Error;

/// Errors associated with vrf functions.
#[derive(Debug, Error)]
pub enum Error {
  /// Unable to decode data from account into `Randomness` object.
  #[error(
    "Unable to decode Randomness Request from account data. Reason = `{0}`"
  )]
  DecodeError(String),

  /// Unable to serialize Instructions in bytes form.
  #[error("Unable to serialize Instruction")]
  SerializationError,
  
  /// Solana rpc error
  #[error("Solana RPC error")]
  SolanaClientError(#[from] ClientError),
}
