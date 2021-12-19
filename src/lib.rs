/*
    - Each Program is processed by its BPF Loader and has an entrypoint whose Structure depends on which BPF Loader is used
    - Accounts are used to store State
    - Accounts are owned by Programs
    - Only the Account Owner may debit an Account and adjust its Data
    - All Accounts to be written to or read must be passed into the Entrypoint
*/
/*
 lib.rs -> Registering Modules
 entrypoint.rs -> Entrypoint to the Program
 instruction.rs -> Program API, (De)Serializing Instruction Data
 processor.rs -> Program Logic
 state.rs -> Program Objects, (De)Serializing State
 error.rs -> Program specific Errors
*/
/*
The Flow of a Program using this Structure looks like this:
1) Someone calls the Entrypoint
2) The Entrypoint forwards the Arguments to the Processor
3) The Processor asks instruction.rs to decode the instruction_data Argument from the Entrypoint Function
4) Using the decoded Data, the Processor will now decide which Processing Function to use to process the Request
5) The Processor may use state.rs to encode State into or decode the State of an Account which has been passed into the Entrypoint
*/
#[cfg(not(feature = "no-entrypoint"))]
pub mod entrypoint;
pub mod instruction;
pub mod processor;
pub mod state;
pub mod error;
