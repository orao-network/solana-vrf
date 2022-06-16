use std::{thread::sleep, time::Duration};

use orao_solana_vrf::{Network, VrfRequestor};
use russian_roulette::{
    instructions::Instruction,
    state::{CurrentState, PlayerState},
};
use solana_cli_config::Config;
use solana_program::pubkey::Pubkey;
use solana_sdk::{
    signature::Signature,
    signature::Signer,
    signer::keypair::{read_keypair_file, Keypair},
    transaction::{Transaction, TransactionError},
};
use structopt::StructOpt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, StructOpt)]
enum Action {
    /// Prints the player state.
    State,
    /// Play one round.
    Play,
}

#[derive(Debug, StructOpt)]
struct Opts {
    /// Optional path to a configuration file (or use the default one).
    #[structopt(long)]
    config_file: Option<String>,
    /// Optional path to a player keypair (or use the one specified in the configuration).
    #[structopt(long)]
    player: Option<String>,
    /// Use the given VRF account id instead of default.
    #[structopt(long)]
    vrf_id: Option<String>,
    /// Default subcommand is `state`.
    #[structopt(subcommand)]
    action: Option<Action>,
}

impl Opts {
    fn config(&self) -> Config {
        let path = self
            .config_file
            .as_deref()
            .or_else(|| solana_cli_config::CONFIG_FILE.as_deref())
            .expect("unable to get config file path");
        Config::load(path).expect("unable to parse the config")
    }

    fn action(&self) -> Action {
        self.action.unwrap_or(Action::State)
    }
}

fn main() -> anyhow::Result<()> {
    env_logger::init();
    let opts: Opts = Opts::from_args();
    let mut config = opts.config();
    if let Some(keypair_path) = opts.player.clone() {
        config.keypair_path = keypair_path;
    }
    println!(
        "Using RPC {}, keypair {}",
        config.json_rpc_url, config.keypair_path
    );
    let keys = read_keypair_file(config.keypair_path).expect("unable to read keypair");
    let action = opts.action();
    let network = Network::from_rpc(config.json_rpc_url.clone(), opts.vrf_id.clone());
    let client = VrfRequestor::new(network)?;

    let state = PlayerState::load_from_account(&keys.pubkey(), &client.rpc_client)?;
    match action {
        Action::State => {
            println!("{}", state.describe(&client)?);
        }
        Action::Play => {
            if matches!(state.load_current_state(&client)?, CurrentState::Alive) {
                play_a_round(&keys, &client)?;
                let state = wait_for_result(&keys.pubkey(), &client)?;
                println!("{}", state.describe(&client)?);
            } else {
                println!("Can't play: {}", state.describe(&client)?);
            }
        }
    }

    Ok(())
}

fn play_a_round(player: &Keypair, client: &VrfRequestor) -> anyhow::Result<Signature> {
    let instruction = Instruction::spin_and_pull_the_trigger(client, &player.pubkey())?;

    println!("Loading a bullet and spinning the cylinder..");
    let recent_blockhash = client.rpc_client.get_latest_blockhash()?;
    let tx = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&player.pubkey()),
        &[player],
        recent_blockhash,
    );

    match client.rpc_client.send_and_confirm_transaction(&tx) {
        Ok(signature) => Ok(signature),
        Err(e) if e.get_transaction_error() == Some(TransactionError::ProgramAccountNotFound) => {
            anyhow::bail!("The russian-roulette contract doesn't seem to be published")
        }
        Err(e) => Err(e.into()),
    }
}

fn wait_for_result(player: &Pubkey, client: &VrfRequestor) -> anyhow::Result<PlayerState> {
    println!("Waiting for the round to finish..");
    for i in 0..300 {
        let state = PlayerState::load_from_account(player, &client.rpc_client)?;
        match state.load_current_state(&client)? {
            CurrentState::Alive | CurrentState::Dead => return Ok(state),
            CurrentState::Playing => {
                if i % 5 == 0 {
                    println!("The cylinder is still spinning..");
                }
            }
        }
        sleep(Duration::from_secs(1));
    }
    anyhow::bail!("The VRF is OFF")
}
