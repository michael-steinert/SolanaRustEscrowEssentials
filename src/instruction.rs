// Defines the API of the Program
use std::convert::TryInto;
use solana_program::program_error::ProgramError;
use crate::error::EscrowError::InvalidInstruction;

pub enum EscrowInstruction {
    /// Starts the Trade by creating and populating an Escrow Account and transferring Ownership of the given temporary Token Account to the PDA
    /// Accounts expected:
    ///
    /// 0. `[signer]` The Account of the Person initializing the Escrow Program
    /// 1. `[writable]` Temporary Token Account that should be created prior to this Instruction and owned by the Initializer
    /// 2. `[]` The Initializer's Token Account for the Token they will receive should the Trade go through
    /// 3. `[writable]` The Escrow Account, it will hold all necessary Information about the Trade
    /// 4. `[]` The Rent sysvar
    /// 5. `[]` The Token Program
    InitEscrow {
        /// The Amount Party A expects to receive of Token Y
        amount: u64
    }
    /*
    sysvars:
    Solana has sysvars that are Parameters of the Solana Cluster
    These sysvars can be accessed through Accounts and store Parameters such as what the current Fee or Rent is
    */
}

impl EscrowInstruction {
    /// Unpacks a byte buffer into a [EscrowInstruction](enum.EscrowInstruction.html)
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (tag, rest) = input.split_first().ok_or(InvalidInstruction)?;
        Ok(match tag {
            0 => Self::InitEscrow {
                amount: Self::unpack_amount(rest)?,
            },
            _ => return Err(InvalidInstruction.into()),
        })
    }

    fn unpack_amount(input: &[u8]) -> Result<u64, ProgramError> {
        let amount = input
            .get(..8)
            .and_then(|slice| slice.try_into().ok())
            .map(u64::from_le_bytes)
            .ok_or(InvalidInstruction)?;
        Ok(amount)
    }
}