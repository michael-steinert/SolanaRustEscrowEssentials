## Commands

* This Command will output the Location of the executable Program
```
cargo build-bpf
```

* To start the Validator with the executable Program
```
npm run setup-validator <EXECUTABLE_LOCATION>
```

* If necessary to call `solana-test-validator` from a specific Folder, then execute the following Command
* The `r` Flag will reset the Validator if there was a Validator started in another Folder
```
./solana-test-validator -r --mint E2F3fsS1HpsLb2VpEgsA5ztfo83CWFWW4jWpC6FvJ6qR --bpf-program 4yBTZXsuz7c1X3PJF4PPCJr8G6HnNAgRvzAWVoFZMncH <EXECUTABLE_LOCATION>
```

* To interact with the Escrow Program there are three scripts: `setup`, `alice`, and `bob` 
* `setup` initializes SOL Accounts as well as the necessary Token Accounts for Alice and Bob
* `alice` executes Alice's Transaction
* `bob` executes Bob's Transaction

* To set up and run the two Transactions the following `all` Script is needed:
```
npm run all
```

* Only execute the Setup for Alice:
```
npm run setup-alice
```
