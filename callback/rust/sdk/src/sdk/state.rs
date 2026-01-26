use std::sync::LazyLock;

use anchor_lang::Discriminator;
use solana_rpc_client_api::filter::{Memcmp, RpcFilterType};

use crate::state::{request::RequestAccount, request_alt::RequestAltAccount};

impl RequestAccount {
    pub fn pending_filters() -> Vec<RpcFilterType> {
        static FILTER: LazyLock<Vec<RpcFilterType>> = LazyLock::new(|| {
            vec![
                // only RequestAccount's
                RpcFilterType::Memcmp(Memcmp::new_raw_bytes(
                    0,
                    RequestAccount::DISCRIMINATOR.to_vec(),
                )),
                // only pending state
                RpcFilterType::Memcmp(Memcmp::new_raw_bytes(8 + 1 + 8 + 32 + 32, vec![0])),
            ]
        });

        FILTER.clone()
    }
}

impl RequestAltAccount {
    pub fn pending_filters() -> Vec<RpcFilterType> {
        static FILTER: LazyLock<Vec<RpcFilterType>> = LazyLock::new(|| {
            vec![
                // only RequestAltAccount
                RpcFilterType::Memcmp(Memcmp::new_raw_bytes(
                    0,
                    RequestAltAccount::DISCRIMINATOR.to_vec(),
                )),
                // only pending state
                RpcFilterType::Memcmp(Memcmp::new_raw_bytes(8 + 1 + 8 + 32 + 32, vec![0])),
            ]
        });

        FILTER.clone()
    }
}
