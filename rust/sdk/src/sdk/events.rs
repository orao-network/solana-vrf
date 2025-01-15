use std::{fmt, io};

use anchor_lang::{prelude::borsh::BorshDeserialize, Discriminator};

use crate::events::{Fulfill, Request, Response};

/// Convenience wrapper.
#[derive(Debug, Clone, Eq, PartialEq)]
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub enum Event {
    Request(Request),
    Response(Response),
    Fulfill(Fulfill),
}

impl Event {
    /// Meant to deserialize an event from a representation written
    /// in the `Program Data: <base64...>` log record.
    ///
    /// Expects bytes decoded from base64.
    pub fn from_log(mut bytes: &[u8]) -> io::Result<Self> {
        let discriminator = <[u8; 8] as BorshDeserialize>::deserialize(&mut bytes)?;
        match discriminator {
            Request::DISCRIMINATOR => Request::deserialize(&mut bytes).map(Self::Request),
            Response::DISCRIMINATOR => Response::deserialize(&mut bytes).map(Self::Response),
            Fulfill::DISCRIMINATOR => Fulfill::deserialize(&mut bytes).map(Self::Fulfill),
            _ => Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "unknown discriminator for an event",
            )),
        }
    }
}

impl fmt::Display for Request {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Request: seed={} client={} paid_with_spl={}",
            bs58::encode(&self.seed[..]).into_string(),
            self.client,
            self.paid_with_spl,
        )
    }
}

impl fmt::Display for Fulfill {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Fulfill: seed={} randomness={}",
            bs58::encode(&self.seed[..]).into_string(),
            bs58::encode(&self.randomness[..]).into_string(),
        )
    }
}

impl fmt::Display for Response {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Response: seed={} authority={} randomness={}",
            bs58::encode(&self.seed[..]).into_string(),
            self.authority,
            bs58::encode(&self.randomness[..]).into_string(),
        )
    }
}
