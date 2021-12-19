import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {
    Connection,
    PublicKey,
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
} from "./utils";

const bob = async () => {
    const bobKeypair = getKeypair("bob");
    const bobXTokenAccountPubKey = getPublicKey("bob_x");
    const bobYTokenAccountPubKey = getPublicKey("bob_y");
    const escrowStateAccountPubKey = getPublicKey("escrow");
    const escrowProgramId = getProgramId();
    const terms = getTerms();
    const connection = new Connection("http://localhost:8899", "confirmed");
    const escrowAccount = await connection.getAccountInfo(escrowStateAccountPubKey);
    if (escrowAccount === null) {
        logError("Could not find Escrow at given Address");
        process.exit(1);
    }
    const encodedEscrowState = escrowAccount.data;
    const decodedEscrowLayout = ESCROW_ACCOUNT_DATA_LAYOUT.decode(encodedEscrowState) as EscrowLayout;
    const escrowState = {
        escrowAccountPubKey: escrowStateAccountPubKey,
        isInitialized: !!decodedEscrowLayout.isInitialized,
        initializerAccountPubKey: new PublicKey(decodedEscrowLayout.initializerPubKey),
        XTokenTempAccountPubKey: new PublicKey(decodedEscrowLayout.initializerTempTokenAccountPubKey),
        initializerYTokenAccount: new PublicKey(decodedEscrowLayout.initializerReceivingTokenAccountPubKey),
        expectedAmount: new BN(decodedEscrowLayout.expectedAmount, 10, "le"),
    };
    // Using the Escrow Account Public KEy to get the Data from the Escrow Account, decodes it
    // and then uses the decoded Data plus Bob's Data to send the Transaction
    const PDA = await PublicKey.findProgramAddress([Buffer.from("escrow")], escrowProgramId);
    const exchangeInstruction = new TransactionInstruction({
        programId: escrowProgramId,
        data: Buffer.from(
            Uint8Array.of(1, ...new BN(terms.bobExpectedAmount).toArray("le", 8))
        ),
        keys: [
            {pubkey: bobKeypair.publicKey, isSigner: true, isWritable: false},
            {pubkey: bobYTokenAccountPubKey, isSigner: false, isWritable: true},
            {pubkey: bobXTokenAccountPubKey, isSigner: false, isWritable: true},
            {pubkey: escrowState.XTokenTempAccountPubKey, isSigner: false, isWritable: true},
            {pubkey: escrowState.initializerAccountPubKey, isSigner: false, isWritable: true},
            {pubkey: escrowState.initializerYTokenAccount, isSigner: false, isWritable: true},
            {pubkey: escrowStateAccountPubKey, isSigner: false, isWritable: true},
            {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
            {pubkey: PDA[0], isSigner: false, isWritable: false},
        ],
    });
    const aliceYTokenAccountPubKey = getPublicKey("alice_y");
    const [aliceYBalance, bobXBalance] = await Promise.all([
        getTokenBalance(aliceYTokenAccountPubKey, connection),
        getTokenBalance(bobXTokenAccountPubKey, connection),
    ]);    console.log("Sending Bob's Transaction");
    await connection.sendTransaction(
        new Transaction().add(exchangeInstruction),
        [bobKeypair],
        {skipPreflight: false, preflightCommitment: "confirmed"}
    );
    // Sleep to allow Time for Blockchain to update
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if ((await connection.getAccountInfo(escrowStateAccountPubKey)) !== null) {
        logError("Escrow Account has not been closed");
        process.exit(1);
    }
    if ((await connection.getAccountInfo(escrowState.XTokenTempAccountPubKey)) !== null) {
        logError("Temporary X Token Account has not been closed");
        process.exit(1);
    }
    const newAliceYBalance = await getTokenBalance(aliceYTokenAccountPubKey, connection);
    if (newAliceYBalance !== aliceYBalance + terms.aliceExpectedAmount) {
        logError(`Alice's Y Balance should be ${aliceYBalance + terms.aliceExpectedAmount} but is ${newAliceYBalance}`);
        process.exit(1);
    }
    const newBobXBalance = await getTokenBalance(bobXTokenAccountPubKey, connection);
    if (newBobXBalance !== bobXBalance + terms.bobExpectedAmount) {
        logError(`Bob's X Balance should be ${bobXBalance + terms.bobExpectedAmount} but is ${newBobXBalance}`);
        process.exit(1);
    }
    console.log("Trade successfully executed. All temporary Accounts closed\n");
    console.table([
        {
            "Alice Token Account X": await getTokenBalance(getPublicKey("alice_x"), connection),
            "Alice Token Account Y": newAliceYBalance,
            "Bob Token Account X": newBobXBalance,
            "Bob Token Account Y": await getTokenBalance(bobYTokenAccountPubKey, connection),
        },
    ]);
    console.log("");
};

bob();
