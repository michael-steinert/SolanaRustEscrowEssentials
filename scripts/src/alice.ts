import {AccountLayout, Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";
import BN = require("bn.js");
import {
    EscrowLayout,
    ESCROW_ACCOUNT_DATA_LAYOUT,
    getKeypair,
    getProgramId,
    getPublicKey,
    getTerms,
    getTokenBalance,
    logError,
    writePublicKey,
} from "./utils";

/*
1. Create empty Account owned by Token Program
2. Initialize empty Account as Alice's X Token Account
3. Transfer X Tokens from Alice's Main X Token Account to her temporary X Token Account
4. Create empty Account owned by Escrow Program
5. Initialize empty Account as Escrow State and transfer temporary X Token Account Ownership to Program Derived Address (PDA)
*/
const alice = async () => {
    const escrowProgramId = getProgramId();
    const terms = getTerms();
    const aliceXTokenAccountPubkey = getPublicKey("alice_x");
    const aliceYTokenAccountPubkey = getPublicKey("alice_y");
    const XTokenMintPubkey = getPublicKey("mint_x");
    const aliceKeypair = getKeypair("alice");
    const tempXTokenAccountKeypair = new Keypair();
    const connection = new Connection("http://localhost:8899", "confirmed");
    const createTempTokenAccountIx = SystemProgram.createAccount({
        programId: TOKEN_PROGRAM_ID,
        space: AccountLayout.span,
        lamports: await connection.getMinimumBalanceForRentExemption(AccountLayout.span),
        fromPubKey: aliceKeypair.publicKey,
        newAccountPubKey: tempXTokenAccountKeypair.publicKey,
    });
    const initTempAccountIx = Token.createInitAccountInstruction(
        TOKEN_PROGRAM_ID,
        XTokenMintPubkey,
        tempXTokenAccountKeypair.publicKey,
        aliceKeypair.publicKey
    );
    const transferXTokensToTempAccIx = Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        aliceXTokenAccountPubkey,
        tempXTokenAccountKeypair.publicKey,
        aliceKeypair.publicKey,
        [],
        terms.bobExpectedAmount
    );
    const escrowKeypair = new Keypair();
    const createEscrowAccountIx = SystemProgram.createAccount({
        space: ESCROW_ACCOUNT_DATA_LAYOUT.span,
        lamports: await connection.getMinimumBalanceForRentExemption(ESCROW_ACCOUNT_DATA_LAYOUT.span),
        fromPubKey: aliceKeypair.publicKey,
        newAccountPubKey: escrowKeypair.publicKey,
        programId: escrowProgramId,
    });
    const initEscrowIx = new TransactionInstruction({
        programId: escrowProgramId,
        keys: [
            {pubKey: aliceKeypair.publicKey, isSigner: true, isWritable: false},
            {pubKey: tempXTokenAccountKeypair.publicKey, isSigner: false, isWritable: true},
            {pubKey: aliceYTokenAccountPubkey,isSigner: false,isWritable: false},
            {pubKey: escrowKeypair.publicKey, isSigner: false, isWritable: true},
            {pubKey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
            {pubKey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
        ],
        data: Buffer.from(
            Uint8Array.of(0, ...new BN(terms.aliceExpectedAmount).toArray("le", 8))
        ),
    });
    const tx = new Transaction().add(
        createTempTokenAccountIx,
        initTempAccountIx,
        transferXTokensToTempAccIx,
        createEscrowAccountIx,
        initEscrowIx
    );
    console.log("Sending Alice's Transaction");
    await connection.sendTransaction(
        tx,
        [aliceKeypair, tempXTokenAccountKeypair, escrowKeypair],
        {skipPreflight: false, preflightCommitment: "confirmed"}
    );
    // Sleep to allow Time for Blockchain to update
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const escrowAccount = await connection.getAccountInfo(escrowKeypair.publicKey);
    if (escrowAccount === null || escrowAccount.data.length === 0) {
        logError("Escrow State Account has not been initialized properly");
        process.exit(1);
    }
    const encodedEscrowState = escrowAccount.data;
    const decodedEscrowState = ESCROW_ACCOUNT_DATA_LAYOUT.decode(encodedEscrowState) as EscrowLayout;
    if (!decodedEscrowState.isInitialized) {
        logError("Escrow State Initialization Flag has not been set");
        process.exit(1);
    } else if (!new PublicKey(decodedEscrowState.initializerPubkey).equals(aliceKeypair.publicKey)) {
        logError("InitializerPubKey has not been set correctly or not been set to Alice's Public Key");
        process.exit(1);
    } else if (!new PublicKey(decodedEscrowState.initializerReceivingTokenAccountPubkey).equals(aliceYTokenAccountPubkey)) {
        logError("initializerReceivingTokenAccountPubKey has not been set correctly or not been set to Alice's Y Public Key");
        process.exit(1);
    } else if (!new PublicKey(decodedEscrowState.initializerTempTokenAccountPubkey).equals(tempXTokenAccountKeypair.publicKey)) {
        logError("initializerTempTokenAccountPubKey has not been set correctly or not been set to temp X token account Public Key");
        process.exit(1);
    }
    console.log(`Escrow successfully initialized. Alice is offering ${terms.bobExpectedAmount}X for ${terms.aliceExpectedAmount}Y\n`);
    writePublicKey(escrowKeypair.publicKey, "escrow");
    console.table([
        {
            "Alice Token Account X": await getTokenBalance(aliceXTokenAccountPubkey, connection),
            "Alice Token Account Y": await getTokenBalance(aliceYTokenAccountPubkey, connection),
            "Bob Token Account X": await getTokenBalance(getPublicKey("bob_x"), connection),
            "Bob Token Account Y": await getTokenBalance(getPublicKey("bob_y"), connection),
            "Temporary Token Account X": await getTokenBalance(tempXTokenAccountKeypair.publicKey, connection)
        },
    ]);
    console.log("");
};

alice();
