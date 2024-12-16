use std::{
    future::Future,
    ops::Deref,
    sync::{Arc, Mutex},
};

use anchor_client::solana_sdk::signer::Signer;
use anchor_lang::prelude::Pubkey;
use tokio::{sync::oneshot, task::JoinError};

use crate::{events, state::request::RequestAccount};

/// An errors associated with the [`wait_fulfilled`] function.
#[derive(Debug, thiserror::Error)]
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
#[non_exhaustive]
#[cfg(feature = "sdk")]
pub enum WaitFulfilledErrors {
    #[error(transparent)]
    Client(#[from] anchor_client::ClientError),
    #[error("Subscription was dropped without being resolved")]
    Dropped,
    #[error(transparent)]
    Join(#[from] JoinError),
}

/// Waits for the given randomness request to be fulfilled.
///
/// Note:
///
/// * it will use client's commitment level,
/// * it will use WS subscription to wait for the [`events::Fulfill`] event,
/// * it will fetch the randomness account to check whether it is already fulfilled
/// * this async function returns another future that one needs to await
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub async fn wait_fulfilled<C: Deref<Target = impl Signer> + Sync + Send + 'static + Clone>(
    client: Pubkey,
    seed: [u8; 32],
    orao_vrf_cb: Arc<anchor_client::Program<C>>,
) -> impl Future<Output = Result<[u8; 64], WaitFulfilledErrors>> {
    let (spawned_tx, spawned_rx) = oneshot::channel();

    let orao_vrf_clone = orao_vrf_cb.clone();
    let handle = tokio::spawn(async move {
        let (tx, rx) = oneshot::channel();
        // TODO: why anchor_client::Program::on requires Fn rather than FnMut?
        let tx = Mutex::new(Some(tx));

        let unsubscribe = orao_vrf_clone
            .on::<events::Fulfillment>(move |_ctx, event| {
                if event.seed == seed && event.client == client {
                    if let Some(tx2) = tx.lock().unwrap().take() {
                        let _ = tx2.send(event.randomness);
                    }
                }
            })
            .await?;

        let _ = spawned_tx.send(());

        let randomness = rx.await;
        unsubscribe.unsubscribe().await;
        randomness.map_err(|_| WaitFulfilledErrors::Dropped)
    });

    // Let's wait unit the subscription is actually spawned.
    let _ = spawned_rx.await;

    async move {
        // In case it is already fulfilled
        let request_account = RequestAccount::fetch(&client, &seed, &orao_vrf_cb).await?;
        if let Some(fulfilled) = request_account.fulfilled() {
            return Ok(fulfilled.randomness);
        }

        let randomness = handle.await??;

        assert_ne!(randomness, [0_u8; 64]);
        Ok(randomness)
    }
}
