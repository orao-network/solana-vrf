use std::{rc::Rc, thread::sleep, time::Duration};

use anchor_client::solana_sdk::{
    commitment_config::CommitmentConfig, signature::Signature, signer::keypair::read_keypair_file,
    signer::Signer,
};
use anchor_client::{Client, ClientError, Cluster, Program};
use indicatif::ProgressBar;
use orao_solana_vrf::{randomness_account_address, state::Randomness};
use russian_roulette::{
    player_state_account_address, spin_and_pull_the_trigger,
    state::{current_state, CurrentState, PlayerState},
};
use solana_cli_config::Config;
use structopt::StructOpt;

/// CLI action.
#[derive(Debug, Clone, Copy, PartialEq, Eq, StructOpt)]
enum Action {
    /// Prints the player state.
    State,
    /// Play one round.
    Play,
}

/// CLI options.
#[derive(Debug, StructOpt)]
struct Opts {
    /// Optional path to a configuration file (or use the default one).
    #[structopt(long)]
    config_file: Option<String>,
    /// Optional path to a player keypair (or use the one specified in the configuration).
    #[structopt(long)]
    player: Option<String>,
    /// Solana cluster to use (defaults to devnet)
    #[structopt(long, default_value = "devnet")]
    cluster: Cluster,
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
        "-- Using RPC {}, keypair {}",
        config.json_rpc_url, config.keypair_path
    );
    println!("-- ------");
    let keys = read_keypair_file(config.keypair_path).expect("unable to read keypair");
    let player = keys.pubkey();

    let client = Client::new_with_options(
        opts.cluster.clone(),
        Rc::new(keys),
        CommitmentConfig::finalized(),
    );

    let vrf = client.program(orao_solana_vrf::id());
    let roulette = client.program(russian_roulette::id());

    let state = roulette
        .account::<PlayerState>(player_state_account_address(&player))
        .unwrap_or_else(|_| PlayerState::new(player));
    let prevous_round = vrf
        .account::<Randomness>(randomness_account_address(&state.force))
        .ok();
    let round_outcome = prevous_round
        .as_ref()
        .map(current_state)
        .unwrap_or(CurrentState::Alive);

    match opts.action() {
        Action::State => describe_state(false, state, prevous_round.as_ref()),
        Action::Play => {
            if matches!(round_outcome, CurrentState::Alive) {
                play_a_round(&roulette, &vrf)?;
                let (round, player_state) = wait_for_result(&roulette, &vrf)?;
                describe_state(true, player_state, Some(&round));
            } else {
                print!("Can't play: ");
                describe_state(false, state, prevous_round.as_ref());
            }
        }
    }

    Ok(())
}

fn describe_state(sound_effects: bool, state: PlayerState, prevous_round: Option<&Randomness>) {
    match prevous_round {
        Some(round) => match current_state(&round) {
            CurrentState::Alive => println!(
                "{}Player {} is alive after {} round(s)",
                if sound_effects { "CLICK! " } else { "" },
                state.player,
                state.rounds
            ),
            CurrentState::Dead => println!(
                "{}Player {} is dead after {} round(s)",
                if sound_effects { "BANG! " } else { "" },
                state.player,
                state.rounds
            ),
            CurrentState::Playing => {
                println!("Player {} is playing round {}", state.player, state.rounds)
            }
        },
        None => println!("Player {} has never played", state.player),
    }
}

fn play_a_round(roulette: &Program, vrf: &Program) -> anyhow::Result<Signature> {
    println!("Loading a bullet and spinning the cylinder..");
    match spin_and_pull_the_trigger(roulette, vrf)?.send_with_spinner_and_config(Default::default())
    {
        Ok(signature) => Ok(signature),
        Err(ClientError::AccountNotFound) => {
            anyhow::bail!("The russian-roulette contract doesn't seem to be published")
        }
        Err(e) => Err(e.into()),
    }
}

fn wait_for_result(roulette: &Program, vrf: &Program) -> anyhow::Result<(Randomness, PlayerState)> {
    let progress = ProgressBar::new_spinner();
    progress.enable_steady_tick(std::time::Duration::from_millis(120));
    progress.set_message("Waiting for the round to finish..");

    let player_state_address = player_state_account_address(&roulette.payer());

    for i in 0..300 {
        let state = roulette.account::<PlayerState>(player_state_address)?;
        let previous_round = vrf.account::<Randomness>(randomness_account_address(&state.force))?;
        match current_state(&previous_round) {
            CurrentState::Alive | CurrentState::Dead => return Ok((previous_round, state)),
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
