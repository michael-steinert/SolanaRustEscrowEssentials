# Setup Environment

## Build and test for Program compiled natively

```shell
cargo build
cargo test
```

## Build and test the Program compiled for BPF

```shell
cargo build-bpf
cargo test-bpf
```

## Setup local Solana Network

| Command                                                 | Description                                                                                     |
|---------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| solana config get                                       | Getting current Network Configuration                                                           |
| solana-keygen new -o ~\.config\solana\id.json           | Generating a new Keypair (in ~/.config/solana/id.json) and deriving Public Key (Wallet Address) |
| solana config set --url localhost                       | Setting Network to localhost (Wallet has to have the same Network as the local Environment)     |
| solana config set --url devnet                          | Setting Network to devnet (Wallet has to have the same Network as the local Environment)        |
| solana address                                          | Getting current Address (lcoal Wallet)                                                          |
| solana account <address>                                | Getting Details about an Account                                                                |
| solana-test-validator                                   | Starting the local Network (first, change to the Home Directory - cd ~/)                        |
| solana airdrop 42 <address>                             | Airdropping some SOL Tokens to given Address                                                    |
| solana balance <address>                                | Showing Balance of given Address                                                                |
| solana address -k target/deploy/solana_app-keypair.json | Getting dynamically generated Program ID                                                        |
| solana deploy                                           | Deploying the compiled Program configured Network                                               |

# Rust

## Packages and Crates

* A Crate is a Binary or Library
* The Crate Root is a Source File that the Rust Compiler starts from and makes up the Root Module of the Crate 
* A Package is one or more Crates that provide a Set of Functionality
* A Package contains a Cargo.toml File that describes how to build those Crates
* The Keyword __use__ brings Paths (like required Crates) into Scope 

## Macros

* Fundamentally, Macros are a Way of writing Code that writes other Code, which is known as Metaprogramming
* Metaprogramming is useful for Reducing the Amount of Code to write and maintain, which is also one of the Roles of Functions
* However, Macros have some additional Powers that Functions do not:
  * A Function Signature must declare the Number and Type of Parameters the Function has
  * Macros, can take a variable Number of Parameters
* Macro refers to the following Family of Features:
* Declarative macros with macro_rules! and three kinds of procedural Macros:
  * Custom #[derive] Macros that specify code added with the derive Attribute used on Structs and Enums
  * Attribute-like Macros that define Custom Attributes usable on any Item
  * Function-like Macros that look like Function Calls but operate on the Tokens specified as their Argument

## Program Entrypoint

* All Accounts to be read or written to must be passed into the Entrypoint Function - this allows the Runtime to parallelize Transaction:
  * If the Runtime knows all the Accounts that will be written to and read by everyone at all Times it can run those Transactions in parallel that do not touch the same Accounts or touch the same Accounts but only read and do not write
  * If a Transaction violates this Constraint and reads or writes to an Account of which the Runtime has not been notified, the Transaction will fail
* Entrypoints are the only Way to call a Program - all Function Calls go through the Function declared as the Entrypoint
* Programs export a known Entrypoint Symbol which the Solana Runtime looks up and calls when invoking a Program
* Solana supports multiple Versions of the BPF Loader and the Entrypoints may vary between them
* Programs must be written for and deployed to the same Loader

## Loaders

* Programs are deployed with and executed by Runtime Loaders
* There are two supported Loaders __BPF Loader__ and __BPF Loader deprecated__
* Loaders support different Application Binary Interfaces (ABIs) therefore Programs have to be written and deployed to the same Loader

# Solana

## Clusters

* Solana maintains the following Clusters with different Purposes:
* __Devnet__: Devnet Serves as a Playground for anyone who wants to take Solana for a Test Drive, as a User, Token Holder, App Developer, or Validator
* __Testnet__: Testnet is where Stress Tests are made for recent Release Features on a live Cluster, particularly focused on Network Performance, Stability and Validator Behavior
* __Mainnet Beta__: A permissionless, persistent Cluster for early Token Holders

## Runtime

* The Runtime only permits the Owner program to debit the Account or modify its Data
* The Program then defines additional Rules for whether the Client can modify Accounts it owns
* In the Case of the System Program, it allows Users to transfer Lamports (a Number of Fractional native Tokens) by recognizing Transaction Signatures
* If it sees the Client signed the Transaction using the Keypair's Private Key, it knows the Client authorized the Token Transfer

* The entire Set of Accounts owned by a given Program can be regarded as a Key-Value Store where a Key is the Account Address and Value is program-specific Binary Data
* A Program Author can decide how to manage the Program's whole State as possibly many Accounts

* After the Runtime executes each of the Transaction's Instructions, it uses the Account Metadata to verify that the Access Policy was not violated
* If a Program violates the Policy, the Runtime discards all Account Changes made by all Instructions in the Transaction and marks the Transaction as failed

### Policy

* After a Program has processed an Instruction the Runtime verifies that the Program only performed Operations it was permitted to, and that the Results adhere to the following Runtime Policy:
  * Only the Owner of the Account may change Owner
  * An Account not assigned to the Program cannot have its Balance decrease
  * The Balance of read-only and executable Accounts may not change
  * Only the System Program can change the Size of the Data and only if the System Program owns the Account
  * Only the Owner may change Account Data
  * Executable is one-way (false->true) and only the Account Owner may set it

### Compute Budget

* To prevent a Program from abusing Computation Resources each Instruction in a Transaction is given a Compute Budget
* The Budget consists of Computation Units that are consumed as the Program performs various Operations and bounds that the Program may not exceed
* When the Program consumes its entire Budget or exceeds a Bound then the Runtime halts the Program and returns an Error

* For cross-program Invocations the Programs invoked inherit the Budget of their Parent
* If an invoked Program consume the Budget or exceeds a Bound the entire Invocation Chain and the Parent are halted

### Runtime Features

* Solana supports a Mechanism called Runtime Features to facilitate the smooth Adoption of Changes
* Runtime Features are Epoch coordinated Events where one or more Behavior Changes to the Cluster will occur

## Programming Model

* An Application interacts with a Solana Cluster by sending it Transactions with one or more Instructions
* The Solana Runtime passes those Instructions to the deployed Programs
* Instructions are executed sequentially and atomically for each Transaction
* If any Instruction is invalid, all Account Changes in the Transaction are discarded - a Rollback happens
* An Instruction might, for Example:
  * Tell a Program to transfer some Lamports (a Number of Fractional native Tokens) from one Account to another
  * Create an interactive Contract that governs how Lamports (a Number of Fractional native Tokens) are transferred

## Transactions

* Program Execution begins with a Transaction being submitted to the Cluster
* The Solana Runtime will execute a Program to process each of the Instructions contained in the Transaction, in Order, and atomically

### Transaction Format

* A Transaction contains a Compact-Array of Signatures, followed by a Message
* Each Item in the Signatures Array is a Digital Signature of the given Message
* The Solana Runtime verifies that the Number of Signatures matches the Number in the first 8 Bits of the Message Header
* It also verifies that each Signature was signed by the Private Key corresponding to the Public Key at the same Index in the Message's Account Addresses Array

### Message Format

* A Message contains a Header, followed by a Compact-Array of Account Addresses, followed by a recent Blockhash, followed by a Compact-Array of Instructions

## Instructions

* There can be several Instructions inside one Transaction in Solana
* These Instructions are executed out synchronously and the Transaction as a whole is executed atomically
* These instructions can call different Programs

* Each Instruction specifies a single Program, a Subset of the Transaction's Accounts that should be passed to the Program, and a Data Byte Array that is passed to the Program
* The Program interprets the Data Array and operates on the Accounts specified by the Instructions
* The Program can return successfully, or with an Error Code
* An Error Return causes the entire Transaction to fail immediately

* The smallest contiguous Unit of Execution Logic in a Program
* An Instruction specifies which Program it is calling, which Accounts it wants to read or modify, and additional Data that serves as auxiliary Input to the Program
* A Client can include one or multiple Instructions in a Transaction
* An Instruction may contain one or more cross-program Invocations

* The System Program is responsible for Allocating Account Space and Assigning (internal - not User Space) Account Ownership
* Programs provide Helper Functions to construct Instructions they support
* The System Program provides the following Rust Helper to construct a SystemInstruction::CreateAccount Instruction:

````rust
pub fn create_account(
    from_pubkey: &Pubkey,
    to_pubkey: &Pubkey,
    lamports: u64,
    space: u64,
    owner: &Pubkey,
) -> Instruction {
    let account_metas = vec![
        AccountMeta::new(*from_pubkey, true),
        AccountMeta::new(*to_pubkey, true),
    ];
    Instruction::new_with_bincode(
        system_program::id(),
        &SystemInstruction::CreateAccount {
            lamports,
            space,
            owner: *owner,
        },
        account_metas,
    )
}
````

### Instruction Format

* An Instruction contains a Program ID Index, followed by a Compact-Array of Account Address Indexes, followed by a Compact-Array of opaque 8-Bit Data
* The Program ID Index is used to identify an on-chain Program that can interpret the opaque Data

#### Program ID

* Program ID is the Public Key of the Account containing the Program
* The Instruction's Program ID specifies which Program will process this Instruction
* The Program's Account's Owner specifies which Loader should be used to load and execute the Program and the Data contains Information about how the Runtime should execute the Program

* The Owner is the BPF Loader and the Account Data holds the BPF Bytecode
* Program Accounts are permanently marked as executable by the Loader once they are successfully deployed
* The Runtime will reject Transactions that specify Programs that are not executable

#### Accounts

* The Accounts referenced by an Instruction represent on-chain State and serve as both the Inputs and Outputs of a Program

#### Instruction Data

* Each Instruction caries a general Purpose Byte Array that is passed to the Program along with the Accounts
* The Contents of the Instruction Data is program-specific and typically used to convey what Operations the Program should perform

### Signatures

* Each Transaction explicitly lists all Account Public Keys referenced by the Transaction's Instructions
* A Subset of those Public Keys are each accompanied by a Transaction Signature
* Those Signatures signal on-chain Programs that the Account Holder has authorized the Transaction
* The Program uses the Authorization to permit Debiting the Account or Modifying its Data

### Recent Blockhash

* A Transaction includes a Recent Blockhash to prevent Duplication and to give Transactions Lifetimes
* Any Transaction that is completely identical to a previous one is rejected, so adding a newer Blockhash allows multiple Transactions to repeat the exact same Action
* Transactions also have Lifetimes that are defined by the Blockhash, as any Transaction whose Blockhash is too old will be rejected

## Programs

* Programs themselves are stored in Accounts which are marked as executable
* Each Account can hold Data and SOL
* Each Account also has an Owner and only the Owner may debit the Account and adjust its Data, Crediting may be done by anyone
* Basic SOL Transfer Transactions are handled by the System Program on Solana - so Programs are owned by Programs
* Programs are stored in Accounts and these executable Accounts are owned by the BPF Loader
* The only Programs not owned by the BPF Loader are the BPF Loader itself and the System Program
* BPF Loader and System Program are owned by the NativeLoader and have special Privileges such as Allocating Memory or Marking Accounts as executable
* All Programs own Basic SOL Accounts, but they can only transfer SOL from an Account when the Transaction has been signed by the Private Key of the SOL Account being debited

## Accounts

* A Solana Client uses an Address to look up an Account - these Address is a 256-Bit Public Key
* Accounts convey to the Program that the Holder of the Private Key associated with the Account's Public Key signed the Transaction
* The Account's Public Key may be known to the Program or recorded in another Account

* The Security Model enforces that an Account's Data can only be modified by the Account's Owner Program
* This allows the Program to trust that the Data passed to them via Accounts they own
* The Runtime enforces this by rejecting any Transaction containing a Program that attempts to write to an Account it does not own

* Transactions can indicate that some Accounts it references to be treated as read-only Accounts in Order to enable parallel Account processing between Transactions
* The Runtime permits read-only Accounts to be read concurrently by multiple Programs
* If a Program attempts to modify a read-only Account, the Transaction is rejected by the Runtime

* If an Account is marked as executable in its Metadata, then it is considered a Program which can be executed by including the Account's Public Key in an Instruction's Program ID
* Accounts are marked as executable during a successful Program Deployment Process by the Loader that owns the Account
* When a Program is deployed to the Execution Engine (BPF Deployment), the Loader determines that the Bytecode in the Account's Data is valid
* If so, the Loader permanently marks the Program Account as executable
* If a Program is marked as final (non-upgradeable), the Runtime enforces that the Account's Data (the Program) is immutable
* Through the upgradeable Loader, it is possible to upload a totally new Program to an existing Program Address

* To create an Account, a Client generates a Keypair and registers its Public Key using the SystemProgram::CreateAccount Instruction with a fixed storage Size in Bytes preallocated
* Accounts that have never been created via the System Program can also be passed to Programs
* When an Instruction references an Account that has not been previously created, the Program will be passed an Account with no Data and zero Lamports that is owned by the System Program

### Storing State between Transactions

* If the Program needs to store State between Transactions, it does so using Accounts
* Accounts hold arbitrary Data that persists beyond the lifetime of a Program
* That Lifetime is expressed by a Number of Fractional native Tokens called __Lamports__
* An Account includes Metadata that tells the Runtime who is allowed to access the Data and how
* Accounts are held in Validator Memory and pay a Rent to stay there
* Each Validator periodically scans all Accounts and collects the Rent
* Any Account that drops to zero Lamports is purged
* Accounts can also be marked rent-exempt if they contain a sufficient Number of Lamports

### Signers

* Transactions may include Digital Signatures corresponding to the Accounts' Public Keys referenced by the Transaction
* Such Signatures signify that the Holder of the Account's Private Key signed and thus authorized the Transaction - in this Case is the Account referred to as a Signer
* Whether an Account is a Signer or not is communicated to the Program as Part of the Account's Metadata
* Programs can then use that Information to make authority Decisions

### Ownership and Assignment to Programs

* A created Account is initialized to be owned by a built-in Program called the __System Program__ and is called a __System Account__
* An Account includes Owner Metadata
* The Owner is a Program ID
* The Runtime grants the Program Write Access to the Account if its ID matches the Owner
* For the Case of the System Program, the Runtime allows Clients to transfer Lamports and importantly assign Account Ownership, meaning changing owner to different program ID
* If an Account is not owned by a Program, the Program is only permitted to read its Data and credit the Account

### Rent

* Keeping Accounts alive on Solana incurs a Storage Cost called __Rent__ (because the Blockchain Cluster must actively maintain the Data to process any future Transactions)
* The Rent is debited from an Account's Balance by the Runtime upon the first Access (including the initial Account Creation) in the current Epoch by Transactions or once per an Epoch if there are no Transactions
* The Fee (Rent) is a fixed Rate, measured in Bytes-Times-Epochs
* Rent is always collected for a single, full Epoch
* Rent is not pro-rated, meaning there are neither Fees nor Refunds for partial Epochs
* On Account Creation, the first Rent collected is not for the current Partial Epoch, but collected Up Front for the next Full Epoch
* If the Balance of an Account drops below under the Fee Rate, the Account will be purged immediately at the Start of the upcoming Epoch
* Accounts can be exempt from Paying Rent if they maintain a Minimum Balance
