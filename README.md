# Basic CRUD app

This is an example of an on-chain CRUD dapp. This example is a journal dapp where you can create, read, update, and delete journal entries on the solana blockchain and interact with the solana program via a UI.

This project was created using the [create-solana-dapp](https://github.com/solana-developers/create-solana-dapp) generator.

## Getting Started

### Prerequisites

- Node v18.18.0 or higher
- Rust v1.70.0 or higher
- Anchor CLI 0.29.0 or higher
- Solana CLI 1.17.0 or higher

### Installation

#### Clone repo

```shell
git clone <repo-url>
cd <repo-name>
```

#### Install dependencies

```shell
npm install
```

#### Start the web app

```
npm run dev
```


### Web

This is a React app that uses the Anchor generated client to interact with the Solana program.

#### Commands

Start the web app

```shell
npm run dev
```

Build the web app

```shell
npm run build
```
