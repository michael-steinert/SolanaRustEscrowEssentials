use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    msg,
    pubkey::Pubkey,
    program_pack::{Pack, IsInitialized},
    sysvar::{rent::Rent, Sysvar},
    program::invoke
};

use crate::{instruction::EscrowInstruction, error::EscrowError, state::Escrow};

pub struct Processor;

impl Processor {
    pub fn process(program_id: &Pubkey, accounts: &[AccountInfo], instruction_data: &[u8]) -> ProgramResult {
        // Passing the Reference to the Slice Holding the instruction_data from entrypoint.rs
        let instruction = EscrowInstruction::unpack(instruction_data)?;
        // Using "match" to figure out which Processing Function to call
        match instruction {
            EscrowInstruction::InitEscrow { amount } => {
                msg!("Instruction: InitEscrow");
                Self::process_init_escrow(accounts, amount, program_id)
            }
        }
    }

    fn process_init_escrow(
        accounts: &[AccountInfo],
        amount: u64,
        program_id: &Pubkey,
    ) -> ProgramResult {
        // Creating an Iterator of Accounts
        let account_info_iter = &mut accounts.iter();
        // First Account is the Escrow's Initializer - as defined in instruction.rs
        let initializer = next_account_info(account_info_iter)?;
        if !initializer.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        // Main Account needs to be the Signer
        // Temporary Token Account needs to be writable
        // Otherwise if the Main Account does not mark the Account as writeable the Transaction will fail
        let temp_token_account = next_account_info(account_info_iter)?;
        let token_to_receive_account = next_account_info(account_info_iter)?;
        // Checking that the token_to_receive_account is actually owned by the Token Program
        if *token_to_receive_account.owner != spl_token::id() {
            return Err(ProgramError::IncorrectProgramId);
        }
        let escrow_account = next_account_info(account_info_iter)?;
        // Rent is deducted from an Account's Balance according to their Space Requirements regularly
        let rent = &Rent::from_account_info(next_account_info(account_info_iter)?)?;

        if !rent.is_exempt(escrow_account.lamports(), escrow_account.data_len()) {
            return Err(EscrowError::NotRentExempt.into());
        }
        //  Data is an Array of u8 so it has to be deserialized
        let mut escrow_info = Escrow::unpack_unchecked(&escrow_account.try_borrow_data()?)?;
        if escrow_info.is_initialized() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        // Populate the Struct' Fields
        escrow_info.is_initialized = true;
        escrow_info.initializer_pubkey = *initializer.key;
        escrow_info.temp_token_account_pubkey = *temp_token_account.key;
        escrow_info.initializer_token_to_receive_account_pubkey = *token_to_receive_account.key;
        escrow_info.expected_amount = amount;
        // State Serialization - "pack" is Default Function which internally calls pack_into_slice function
        Escrow::pack(escrow_info, &mut escrow_account.try_borrow_mut_data()?)?;
        // Transferring Ownership of the temporary Token Account to the PDA (Program Derived Account)
        // One PDA can own N temporary Token Accounts for different Escrows occurring at any and possibly the same Point in Time
        // PDAs are Public Keys derived from the Program ID and the Seeds, pushed out of the elliptic Curve by the Bump Seed
        let (pda, _bump_seed) = Pubkey::find_program_address(&[b"escrow"], program_id);
        // Transferring the Ownership of the temporary Token Account to the PDA
        let token_program = next_account_info(account_info_iter)?;
        // Signature Extension: set_authority Function which is a Builder Function to create such an Instruction
        let owner_change_ix = spl_token::instruction::set_authority(
            token_program.key, // Token Program ID
            temp_token_account.key, // Account whose Authority is changed
            Some(&pda), // Account that is the new Authority
            spl_token::instruction::AuthorityType::AccountOwner, // Type of Authority Change
            initializer.key, // Current Account Owner (Main Account -> initializer.key)
            &[&initializer.key], // Public Keys signing the CPI (Cross-Program Invocation)
        )?;
        // Cross-Program Invocation: Calling the Token Program from Escrow Program
        // "invoke" takes two Arguments: an Instruction and an Array of Accounts
        msg!("Calling the Token Program to transfer Token Account Ownership");
        invoke(
            &owner_change_ix,
            &[
                temp_token_account.clone(),
                initializer.clone(),
                token_program.clone(),
            ],
        )?;
        Ok(())
    }
}