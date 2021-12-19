// Defines an Error Type
use thiserror::Error;
use solana_program::program_error::ProgramError;

#[derive(Error, Debug, Copy, Clone)]
pub enum EscrowError {
    /// Invalid Instruction
    #[error("Invalid Instruction")]
    InvalidInstruction,
    /// Not Rent Exempt
    #[error("Not Rent Exempt")]
    NotRentExempt,
    /// Expected Amount Mismatch
    #[error("Expected Amount Mismatch")]
    ExpectedAmountMismatch,
    /// Amount Overflow
    #[error("Amount Overflow")]
    AmountOverflow,
}

// Value-to-Value Conversions while consuming the Input Value
impl From<EscrowError> for ProgramError {
    fn from(e: EscrowError) -> Self {
        ProgramError::Custom(e as u32)
    }
}