# Escrow Program

* An Escrow Program introduces a third Party C which both A and B trust
* A or B can now go first and send their Asset to C
* C then waits for the other party to send their asset and only then does C release both Assets

## Structure

* There are two Parties Alice and Bob which means there are two <code>system_program</code> Accounts
* Because Alice and Bob want to transfer Tokens, they will make use of <code>Token Programs</code>
* In <code>Token Programs</code>, to hold a Token, they need a <code>Token Account</code>
* Both Alice and Bob need an Account for each Token so there are 4 more Accounts
* __Tokens__ will be called __X__ and __Token__ will be called __Y__
* Alice gets an X and Y Account and so does Bob
* Since Escrow Creation and the Trade will not happen inside a single Transaction
* Therefore, is another Account to save some Escrow Data
* It will store how much of Token Y Alice wants in Exchange for her Token X - this Account is created for each Exchange

<p align="center">
  <img src="https://user-images.githubusercontent.com/29623199/146635613-81a99246-7cf6-4d6c-b231-2dea3b6cb41f.png" alt="Escrow Structure" width="75%"/>
</P>

## Token Ownership

* The <code>Token Program</code> allows Alice and Bob to have just one Private Key for all her / his Token Accounts
* It assigns each Token Account an Owner - this Token Account Owner Attribute is not the same as the Account Owner
* The Account Owner is an internal Solana Attribute that will always be a Program
* The new Token Owner Attribute is declared by the Token Program in User Space (that means in the Program they are building)
* The Token Owner Attribute is encoded inside a Token Account's Data, in addition to the following other Properties:

````rust
pub struct Account {
    /// The mint associated with this account
    pub mint: Pubkey,
    /// The owner of this account.
    pub owner: Pubkey,
    /// The amount of tokens this account holds.
    pub amount: u64,
    /// If `delegate` is `Some` then `delegated_amount` represents
    /// the amount authorized by the delegate
    pub delegate: COption<Pubkey>,
    /// The account's state
    pub state: AccountState,
    /// If is_some, this is a native token, and the value logs the rent-exempt reserve. An Account
    /// is required to be rent-exempt, so the value is used by the Processor to ensure that wrapped
    /// SOL accounts do not drop below this threshold.
    pub is_native: COption<u64>,
    /// The amount delegated
    pub delegated_amount: u64,
    /// Optional authority to close the account.
    pub close_authority: COption<Pubkey>,
}
````

* This means if once a Token Account has been set up, its Private Key is useless, only its Token Owner Attribute matters
* The Token Owner Attribute is going to be the Token Owner Attribute is going to be Alice's and Bob's Main Account 
* When making a Token Transfer Alice and Bob have to sign the Transaction with the Private Key of their Main Account

* The <code>mint</code> Field shows which Token the Token Account belongs to
* For each Token there is one Mint Account that holds the Token's Metadata such as the Supply
* This <code>mint</code> Field allows:
  * to verify that the Token Accounts Alice and Bob use really belong to Asset X and Y
  * and that neither Party is sneaking in a wrong Asset

<p align="center">
  <img src="https://user-images.githubusercontent.com/29623199/146636400-cdd5df74-c761-4e51-9f76-c91560d349db.png" alt="Token Ownership" width="75%"/>
</P>

## Transferring Ownership

* The only Way to own Units of a Token is to own a Token Account that holds some Token Balance of these Token referenced by the Account's <code>mint</code> Property.
* Hence, the Escrow Program needs an Account to hold Alice's X Tokens - one Way of Achieving this:
  * is to have Alice create a temporary X Token Account to which she transfers the X Tokens she wants to trade
  * then, using a Function in the Token Program, she transfers (Token Program) Ownership of the temporary X Token Account to the Escrow Program

<p align="center">
  <img src="https://user-images.githubusercontent.com/29623199/146636414-ea542135-b86c-4245-9f50-1a5aa2da5a74.png" alt="Transferring Ownership" width="75%"/>
</P>

## Token Program
* The Token Program owns Token Accounts which (inside their Data Field) hold relevant Information
* The Token Program also owns Token Mint Accounts with relevant Data
* Each Token Account holds a Reference to their Token Mint Account, thereby stating which Token Mint they belong to
* The Token Program allows the Owner of a Token Account to transfer its Ownership to another Address
* All internal Solana Internal Account Information are saved into Fields on the Account

## Program Derived Addresses (PDAs)
* Program Derived Addresses (PDAs) provide a Way for the Program to own the X Tokens while the Escrow Program is open and waiting for Bob's Transaction
* With PDAs can be Programs given User Space Ownership of a Token Account - therefore the Token Account Ownership is assign to a PDA of the Escrow Program
* This Addresses let a Program sign Transactions or assign it User Space Ownership of Accounts